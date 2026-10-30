import { db } from "@/lib/db";
import { getPlanConfig } from "./plans.config";
import { PlanTier, SubscriptionStatus, BillingInterval, WorkspaceUsageSummary } from "./billing.types";
import { WorkspaceRole } from "@prisma/client";

export class EntitlementError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, code = "PLAN_LIMIT_EXCEEDED", statusCode = 403) {
    super(message);
    this.name = "EntitlementError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class EntitlementService {
  /**
   * Obtém a assinatura ativa do workspace ou auto-provisiona o plano FREE caso ainda não exista.
   */
  static async getWorkspaceSubscription(workspaceId: string) {
    let sub = await db.subscription.findUnique({
      where: { workspaceId },
      include: { plan: true },
    });

    if (!sub) {
      // Auto-provisionar FREE
      sub = await db.subscription.create({
        data: {
          workspaceId,
          planTier: PlanTier.FREE,
          status: SubscriptionStatus.ACTIVE,
          interval: BillingInterval.MONTHLY,
          currentPeriodStart: new Date(),
        },
        include: { plan: true },
      });
    }

    return sub;
  }

  /**
   * Retorna o resumo consolidado de direitos e limites de uso do workspace.
   */
  static async getWorkspaceUsageSummary(workspaceId: string): Promise<WorkspaceUsageSummary> {
    const workspace = await db.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        subscription: {
          include: { plan: true },
        },
        _count: {
          select: {
            projects: true,
            memberships: true,
          },
        },
      },
    });

    if (!workspace) {
      throw new EntitlementError("Workspace não encontrado.", "WORKSPACE_NOT_FOUND", 404);
    }

    const sub = workspace.subscription || (await this.getWorkspaceSubscription(workspaceId));

    // 1. Identificar se há concessão administrativa (Override) ativa
    const activeOverride = await db.userEntitlementOverride.findFirst({
      where: {
        OR: [
          { workspaceId },
          {
            workspace: {
              memberships: {
                some: {
                  workspaceId,
                  role: WorkspaceRole.OWNER,
                },
              },
            },
          },
        ],
        isActive: true,
        AND: [
          {
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } },
            ],
          },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    const effectiveTier = activeOverride?.grantedPlanTier || sub.planTier;
    const dbPlan = await db.plan.findUnique({ where: { tier: effectiveTier } });
    const planConfig = dbPlan || getPlanConfig(effectiveTier);

    let grandfathered = (sub.metadata as any)?.grandfatheredContract;

    // Se o plano atual mudou e difere do snapshot grandfathered, o contrato anterior não se aplica
    if (grandfathered && grandfathered.previousPlanTier && grandfathered.previousPlanTier !== effectiveTier) {
      grandfathered = null;
    }

    if (!grandfathered) {
      const snapshot = await db.commercialSnapshot.findFirst({
        where: { workspaceId, planTier: effectiveTier },
        orderBy: { acceptedAt: "desc" },
      });

      if (snapshot?.snapshotData) {
        const data = snapshot.snapshotData as any;
        grandfathered = {
          previousMaxProjects: data.previousMaxProjects ?? data.maxProjects,
          previousMaxMembers: data.previousMaxMembers ?? data.maxMembers,
          previousMonthlyCredits: data.previousMonthlyCredits ?? data.monthlyCredits,
          previousPriceMonthly: data.previousPriceMonthly ?? data.priceMonthly,
          previousPriceYearly: data.previousPriceYearly ?? data.priceYearly,
        };
      }
    }

    // Validação de Ilimitado para Planos Superiores
    const isPlanUnlimitedProjects =
      effectiveTier === PlanTier.ENTERPRISE ||
      !!planConfig.unlimitedProjects ||
      planConfig.maxProjects === -1 ||
      planConfig.maxProjects === 0;

    const isPlanUnlimitedMembers =
      effectiveTier === PlanTier.ENTERPRISE ||
      !!planConfig.unlimitedMembers ||
      planConfig.maxMembers === -1 ||
      planConfig.maxMembers === 0;

    const maxProjects = isPlanUnlimitedProjects
      ? -1
      : grandfathered?.previousMaxProjects !== undefined
      ? grandfathered.previousMaxProjects
      : planConfig.maxProjects;

    const maxMembers = isPlanUnlimitedMembers
      ? -1
      : grandfathered?.previousMaxMembers !== undefined
      ? grandfathered.previousMaxMembers
      : planConfig.maxMembers;

    const projectsCount = workspace._count.projects;
    const membersCount = workspace._count.memberships;
    const creditsBalance = workspace.creditsBalance;

    const isUnlimitedProjects = maxProjects === -1;
    const isUnlimitedMembers = maxMembers === -1;

    const canCreateProject =
      sub.status === SubscriptionStatus.ACTIVE &&
      (isUnlimitedProjects || projectsCount < maxProjects);

    const canAddMember =
      sub.status === SubscriptionStatus.ACTIVE &&
      (isUnlimitedMembers || membersCount < maxMembers);

    return {
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      planTier: effectiveTier,
      planName: planConfig.name,
      status: sub.status,
      interval: sub.interval,
      currentPeriodEnd: sub.currentPeriodEnd,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      projectsCount,
      maxProjects,
      membersCount,
      maxMembers,
      creditsBalance,
      monthlyCredits: grandfathered?.previousMonthlyCredits ?? planConfig.monthlyCredits,
      canCreateProject,
      canAddMember,
      features: (planConfig.features as any) || [],
    };
  }

  /**
   * Valida se o workspace pode criar novos projetos.
   */
  static async assertCanCreateProject(workspaceId: string): Promise<void> {
    const summary = await this.getWorkspaceUsageSummary(workspaceId);

    if (summary.status === SubscriptionStatus.PAST_DUE || summary.status === SubscriptionStatus.UNPAID) {
      throw new EntitlementError(
        "A assinatura do seu workspace possui pagamentos pendentes. Atualize suas informações de cobrança para continuar criando projetos.",
        "PAYMENT_REQUIRED",
        402
      );
    }

    if (summary.status === SubscriptionStatus.CANCELED) {
      throw new EntitlementError(
        "A assinatura deste workspace está cancelada. Reative seu plano para criar novos projetos.",
        "SUBSCRIPTION_CANCELED",
        403
      );
    }

    if (summary.maxProjects !== -1 && summary.projectsCount >= summary.maxProjects) {
      throw new EntitlementError(
        `Limite de projetos atingido (${summary.projectsCount}/${summary.maxProjects}) para o plano ${summary.planName}. Faça upgrade para criar mais projetos.`,
        "PROJECT_LIMIT_REACHED",
        403
      );
    }
  }

  /**
   * Valida se o workspace pode adicionar novos membros.
   */
  static async assertCanAddMember(workspaceId: string): Promise<void> {
    const summary = await this.getWorkspaceUsageSummary(workspaceId);

    if (summary.status !== SubscriptionStatus.ACTIVE && summary.status !== SubscriptionStatus.TRIALING) {
      throw new EntitlementError(
        "A assinatura deste workspace não está ativa. Não é possível convidar novos membros.",
        "SUBSCRIPTION_INACTIVE",
        403
      );
    }

    if (summary.maxMembers !== -1 && summary.membersCount >= summary.maxMembers) {
      throw new EntitlementError(
        `Limite de membros da equipe atingido (${summary.membersCount}/${summary.maxMembers}) para o plano ${summary.planName}. Faça upgrade para o plano Team para colaborar com mais pessoas.`,
        "MEMBER_LIMIT_REACHED",
        403
      );
    }
  }

  /**
   * Obtém a cota de workspaces/estúdios permitidos para o usuário com base no plano mais alto de suas assinaturas ou concessões.
   */
  static async getUserWorkspaceQuota(userId: string): Promise<{
    currentCount: number;
    maxWorkspaces: number;
    highestPlanTier: PlanTier;
    canCreate: boolean;
  }> {
    const memberships = await db.membership.findMany({
      where: { userId, role: WorkspaceRole.OWNER },
      include: {
        workspace: {
          include: {
            subscription: true,
          },
        },
      },
    });

    const activeOverrides = await db.userEntitlementOverride.findMany({
      where: {
        userId,
        isActive: true,
        AND: [
          {
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } },
            ],
          },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    let highestPlanTier: PlanTier = PlanTier.FREE;
    const tierPriority: Record<PlanTier, number> = {
      FREE: 1,
      PRO: 2,
      TEAM: 3,
      ENTERPRISE: 4,
    };

    for (const m of memberships) {
      const subTier = m.workspace.subscription?.planTier || PlanTier.FREE;
      if (tierPriority[subTier] > tierPriority[highestPlanTier]) {
        highestPlanTier = subTier;
      }
    }

    for (const ov of activeOverrides) {
      if (ov.grantedPlanTier && tierPriority[ov.grantedPlanTier] > tierPriority[highestPlanTier]) {
        highestPlanTier = ov.grantedPlanTier;
      }
    }

    const quotaMap: Record<PlanTier, number> = {
      FREE: 1,
      PRO: 3,
      TEAM: 10,
      ENTERPRISE: -1,
    };

    const maxWorkspaces = quotaMap[highestPlanTier] ?? 1;
    const currentCount = memberships.length;
    const canCreate = maxWorkspaces === -1 || currentCount < maxWorkspaces;

    return {
      currentCount,
      maxWorkspaces,
      highestPlanTier,
      canCreate,
    };
  }

  /**
   * Valida se o usuário tem cota contratual para criar um novo workspace.
   */
  static async assertCanCreateWorkspace(userId: string): Promise<PlanTier> {
    const quota = await this.getUserWorkspaceQuota(userId);

    if (!quota.canCreate) {
      throw new EntitlementError(
        `Limite de estúdios atingido (${quota.currentCount}/${quota.maxWorkspaces}) para o plano ${quota.highestPlanTier}. Faça upgrade de plano para criar workspaces adicionais.`,
        "WORKSPACE_LIMIT_REACHED",
        403
      );
    }

    return quota.highestPlanTier;
  }

  /**
   * Valida se o workspace pode criar personagens adicionais no projeto.
   */
  static async assertCanCreateCharacter(workspaceId: string, projectId: string): Promise<void> {
    const sub = await this.getWorkspaceSubscription(workspaceId);
    const dbPlan = sub.plan || (await db.plan.findUnique({ where: { tier: sub.planTier } }));

    if (!dbPlan || dbPlan.unlimitedCharacters) return;

    if (typeof dbPlan.maxCharacters === "number" && dbPlan.maxCharacters > 0) {
      const charCount = await db.character.count({
        where: { projectId, isArchived: false },
      });
      if (charCount >= dbPlan.maxCharacters) {
        throw new EntitlementError(
          `Limite de personagens ativos atingido (${charCount}/${dbPlan.maxCharacters}) para o plano ${dbPlan.name}. Faça upgrade para desbloquear personagens ilimitados.`,
          "CHARACTER_LIMIT_REACHED",
          403
        );
      }
    }
  }

  /**
   * Valida se o workspace pode criar ambientes adicionais no projeto.
   */
  static async assertCanCreateEnvironment(workspaceId: string, projectId: string): Promise<void> {
    const sub = await this.getWorkspaceSubscription(workspaceId);
    const dbPlan = sub.plan || (await db.plan.findUnique({ where: { tier: sub.planTier } }));

    if (!dbPlan || dbPlan.unlimitedEnvironments) return;

    if (typeof dbPlan.maxEnvironments === "number" && dbPlan.maxEnvironments > 0) {
      const envCount = await db.environment.count({
        where: { projectId, isArchived: false },
      });
      if (envCount >= dbPlan.maxEnvironments) {
        throw new EntitlementError(
          `Limite de ambientes atingido (${envCount}/${dbPlan.maxEnvironments}) para o plano ${dbPlan.name}. Faça upgrade para criar mais locações.`,
          "ENVIRONMENT_LIMIT_REACHED",
          403
        );
      }
    }
  }

  /**
   * Valida se o workspace pode criar cenas adicionais no projeto.
   */
  static async assertCanCreateScene(workspaceId: string, projectId: string): Promise<void> {
    const sub = await this.getWorkspaceSubscription(workspaceId);
    const dbPlan = sub.plan || (await db.plan.findUnique({ where: { tier: sub.planTier } }));

    if (!dbPlan || dbPlan.unlimitedScenes) return;

    if (typeof dbPlan.maxScenes === "number" && dbPlan.maxScenes > 0) {
      const sceneCount = await db.scene.count({
        where: { projectId },
      });
      if (sceneCount >= dbPlan.maxScenes) {
        throw new EntitlementError(
          `Limite de cenas decupadas atingido (${sceneCount}/${dbPlan.maxScenes}) para o plano ${dbPlan.name}. Faça upgrade para decupar roteiros completos.`,
          "SCENE_LIMIT_REACHED",
          403
        );
      }
    }
  }

  /**
   * Valida se há créditos suficientes para realizar operações de geração.
   */
  static async assertCanConsumeCredits(workspaceId: string, amount: number): Promise<void> {
    const workspace = await db.workspace.findUnique({
      where: { id: workspaceId },
      select: { creditsBalance: true },
    });

    if (!workspace) {
      throw new EntitlementError("Workspace não encontrado.", "WORKSPACE_NOT_FOUND", 404);
    }

    if (workspace.creditsBalance < amount) {
      throw new EntitlementError(
        `Saldo insuficiente de créditos (${workspace.creditsBalance} disponíveis, ${amount} necessários). Faça upgrade ou adquira novos créditos.`,
        "INSUFFICIENT_CREDITS",
        402
      );
    }
  }

  /**
   * Deduz créditos do workspace e registra no razão de auditoria (CreditLedger).
   */
  static async deductCredits(
    workspaceId: string,
    amount: number,
    reason: string,
    metadata?: any
  ): Promise<number> {
    return await db.$transaction(async (tx) => {
      const workspace = await tx.workspace.findUnique({
        where: { id: workspaceId },
        select: { creditsBalance: true },
      });

      if (!workspace) {
        throw new EntitlementError("Workspace não encontrado.", "WORKSPACE_NOT_FOUND", 404);
      }

      if (workspace.creditsBalance < amount) {
        throw new EntitlementError(
          `Saldo insuficiente de créditos (${workspace.creditsBalance} disponíveis, ${amount} necessários).`,
          "INSUFFICIENT_CREDITS",
          402
        );
      }

      const newBalance = workspace.creditsBalance - amount;

      await tx.workspace.update({
        where: { id: workspaceId },
        data: { creditsBalance: newBalance },
      });

      await tx.creditLedger.create({
        data: {
          workspaceId,
          amount: -amount,
          balanceAfter: newBalance,
          reason,
          metadata: metadata || null,
        },
      });

      return newBalance;
    });
  }

  /**
   * Valida acesso a um template de prompt baseado no plano.
   */
  static async assertCanAccessTemplate(workspaceId: string, templateKey: string): Promise<void> {
    const sub = await this.getWorkspaceSubscription(workspaceId);
    const planConfig = getPlanConfig(sub.planTier);

    if (planConfig.enabledTemplates.includes("*")) {
      return; // Acesso total
    }

    if (!planConfig.enabledTemplates.includes(templateKey)) {
      throw new EntitlementError(
        `O template '${templateKey}' é exclusivo para planos superiores (${PlanTier.PRO} ou ${PlanTier.TEAM}). Faça upgrade para desbloquear.`,
        "PREMIUM_TEMPLATE_RESTRICTED",
        403
      );
    }
  }
}
