import { db } from "@/lib/db";
import { EntitlementService } from "@/modules/billing/entitlement.service";
import { getPlanConfig } from "@/modules/billing/plans.config";
import { SubscriptionStatus, WorkspaceUsageSummary } from "@/modules/billing/billing.types";
import { STARTER_TEMPLATES } from "@/modules/onboarding/onboarding.service";
import { NotFoundError } from "@/lib/auth";

export interface ContextualAlert {
  id: string;
  type: "warning" | "info" | "action" | "danger";
  title: string;
  message: string;
  ctaText?: string;
  ctaHref?: string;
}

export interface PreloadedDashboardUser {
  id: string;
  email: string;
  displayName?: string | null;
  emailConfirmed: boolean;
  onboardingCompleted: boolean;
  onboardingStep: number;
  preferences?: any;
}

export class DashboardService {
  /**
   * Coleta todos os dados reais do workspace ativo e do usuário logado para o Dashboard
   * em um único lote paralelo otimizado.
   */
  static async getDashboardData(
    userId: string,
    workspaceId: string,
    preloadedUser?: PreloadedDashboardUser
  ) {
    const userPromise = preloadedUser
      ? Promise.resolve(preloadedUser)
      : db.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            displayName: true,
            emailConfirmed: true,
            onboardingCompleted: true,
            onboardingStep: true,
            preferences: true,
          },
        });

    const [
      user,
      workspace,
      recentProjects,
      recentGenerationRows,
      recentCreditTransactions,
      countsRows,
      pendingInvitesPreloaded,
    ] = await Promise.all([
      userPromise,
      db.workspace.findUnique({
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
      }),
      db.project.findMany({
        where: { workspaceId, isArchived: false },
        orderBy: { updatedAt: "desc" },
        take: 4,
        select: {
          id: true,
          title: true,
          description: true,
          genre: true,
          updatedAt: true,
          createdAt: true,
          _count: {
            select: {
              characters: true,
              scenes: true,
              environments: true,
            },
          },
        },
      }),
      db.$queryRaw<
        Array<{
          id: string;
          projectId: string;
          templateKey: string;
          targetTool: string;
          modelName: string;
          outputText: string | null;
          createdAt: Date;
          sceneTitle: string | null;
          sceneOrder: number | null;
        }>
      >`
        SELECT
          pv.id,
          pv."projectId",
          pv."templateKey",
          pv."targetTool",
          pv."modelName",
          pv."outputText",
          pv."createdAt",
          s.title AS "sceneTitle",
          s."order" AS "sceneOrder"
        FROM "PromptVersion" pv
        INNER JOIN "Project" p ON pv."projectId" = p.id
        LEFT JOIN "Scene" s ON pv."sceneId" = s.id
        WHERE p."workspaceId" = ${workspaceId}
        ORDER BY pv."createdAt" DESC
        LIMIT 5
      `,
      db.creditLedger.findMany({
        where: { workspaceId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          amount: true,
          balanceAfter: true,
          reason: true,
          createdAt: true,
        },
      }),
      db.$queryRaw<
        Array<{
          totalScenes: number;
          totalCharacters: number;
          totalEnvironments: number;
          totalPromptsCount: number;
        }>
      >`
        SELECT
          (SELECT COUNT(*)::int FROM "Scene" s INNER JOIN "Project" p ON s."projectId" = p.id WHERE p."workspaceId" = ${workspaceId}) AS "totalScenes",
          (SELECT COUNT(*)::int FROM "Character" c INNER JOIN "Project" p ON c."projectId" = p.id WHERE p."workspaceId" = ${workspaceId}) AS "totalCharacters",
          (SELECT COUNT(*)::int FROM "Environment" e INNER JOIN "Project" p ON e."projectId" = p.id WHERE p."workspaceId" = ${workspaceId}) AS "totalEnvironments",
          (SELECT COUNT(*)::int FROM "PromptVersion" pv INNER JOIN "Project" p ON pv."projectId" = p.id WHERE p."workspaceId" = ${workspaceId}) AS "totalPromptsCount"
      `,
      preloadedUser?.email
        ? db.workspaceInvite.findMany({
            where: {
              email: preloadedUser.email,
              status: "PENDING",
              expiresAt: { gt: new Date() },
            },
            include: {
              workspace: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
              invitedBy: {
                select: {
                  displayName: true,
                  email: true,
                },
              },
            },
          })
        : Promise.resolve(null),
    ]);

    if (!user) throw new NotFoundError("Usuário não encontrado.");
    if (!workspace) throw new NotFoundError("Workspace não encontrado.");

    const pendingInvites =
      pendingInvitesPreloaded ??
      (await db.workspaceInvite.findMany({
        where: {
          email: user.email,
          status: "PENDING",
          expiresAt: { gt: new Date() },
        },
        include: {
          workspace: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          invitedBy: {
            select: {
              displayName: true,
              email: true,
            },
          },
        },
      }));

    // Computar resumo de Entitlements & Assinatura a partir do workspace já carregado
    const sub =
      workspace.subscription || (await EntitlementService.getWorkspaceSubscription(workspaceId));
    const planConfig = sub.plan || getPlanConfig(sub.planTier);
    const grandfathered = (sub.metadata as any)?.grandfatheredContract;

    const maxProjects =
      grandfathered?.previousMaxProjects !== undefined
        ? grandfathered.previousMaxProjects
        : planConfig.unlimitedProjects || planConfig.maxProjects === -1
        ? -1
        : planConfig.maxProjects;

    const maxMembers =
      grandfathered?.previousMaxMembers !== undefined
        ? grandfathered.previousMaxMembers
        : planConfig.unlimitedMembers || planConfig.maxMembers === -1
        ? -1
        : planConfig.maxMembers;

    const projectsCount = workspace._count.projects;
    const membersCount = workspace._count.memberships;
    const creditsBalance = workspace.creditsBalance;

    const isUnlimitedProjects = maxProjects === -1 || !!planConfig.unlimitedProjects;
    const isUnlimitedMembers = maxMembers === -1 || !!planConfig.unlimitedMembers;

    const usageSummary: WorkspaceUsageSummary = {
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      planTier: sub.planTier,
      planName: planConfig.name,
      status: sub.status as SubscriptionStatus,
      interval: sub.interval as any,
      currentPeriodEnd: sub.currentPeriodEnd,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      projectsCount,
      maxProjects,
      membersCount,
      maxMembers,
      creditsBalance,
      monthlyCredits: grandfathered?.previousMonthlyCredits ?? planConfig.monthlyCredits,
      canCreateProject:
        sub.status === SubscriptionStatus.ACTIVE &&
        (isUnlimitedProjects || projectsCount < maxProjects),
      canAddMember:
        sub.status === SubscriptionStatus.ACTIVE &&
        (isUnlimitedMembers || membersCount < maxMembers),
      features: (planConfig.features as any) || [],
    };

    const agg = countsRows?.[0] || {
      totalScenes: 0,
      totalCharacters: 0,
      totalEnvironments: 0,
      totalPromptsCount: 0,
    };
    const totalScenes = Number(agg.totalScenes || 0);
    const totalCharacters = Number(agg.totalCharacters || 0);
    const totalEnvironments = Number(agg.totalEnvironments || 0);
    const totalPromptsCount = Number(agg.totalPromptsCount || 0);

    const recentGenerations = (recentGenerationRows || []).map((row) => ({
      id: row.id,
      projectId: row.projectId,
      templateKey: row.templateKey,
      targetTool: row.targetTool,
      modelName: row.modelName,
      outputText: row.outputText,
      outputJson: null,
      createdAt: row.createdAt,
      scene:
        row.sceneTitle !== null
          ? {
              title: row.sceneTitle,
              order: Number(row.sceneOrder || 1),
            }
          : null,
    }));

    // Avisos Contextuais
    const alerts: ContextualAlert[] = [];

    // 1. Alerta de e-mail não confirmado
    if (!user.emailConfirmed) {
      alerts.push({
        id: "email_unconfirmed",
        type: "warning",
        title: "Confirmação de Conta Pendente",
        message:
          "Seu endereço de e-mail ainda não foi verificado. Confirme para garantir a segurança da sua conta.",
        ctaText: "Verificar Perfil",
        ctaHref: "/profile",
      });
    }

    // 2. Alerta de limite de projetos
    if (
      usageSummary.maxProjects !== -1 &&
      usageSummary.projectsCount >= usageSummary.maxProjects
    ) {
      alerts.push({
        id: "project_limit",
        type: "warning",
        title: "Cota de Projetos Atingida",
        message: `Você está utilizando ${usageSummary.projectsCount}/${usageSummary.maxProjects} projetos do ${usageSummary.planName}. Faça upgrade para continuar criando novos mundos.`,
        ctaText: "Fazer Upgrade",
        ctaHref: "/pricing",
      });
    }

    // 3. Alerta de saldo baixo de créditos
    if (usageSummary.creditsBalance <= 5) {
      alerts.push({
        id: "low_credits",
        type: usageSummary.creditsBalance === 0 ? "danger" : "warning",
        title:
          usageSummary.creditsBalance === 0
            ? "Créditos de IA Esgotados"
            : "Saldo de Créditos Baixo",
        message: `Você possui apenas ${usageSummary.creditsBalance} créditos disponíveis para gerar prompts e cenas com IA.`,
        ctaText: "Adquirir Mais Créditos",
        ctaHref: "/workspace/billing",
      });
    }

    // 4. Alerta de convites pendentes
    if (pendingInvites.length > 0) {
      alerts.push({
        id: "pending_invites",
        type: "info",
        title: "Convite de Equipe Recebido",
        message: `Você tem ${pendingInvites.length} convite(s) pendente(s) para colaborar em outros estúdios.`,
        ctaText: "Ver Convites",
        ctaHref: "/profile",
      });
    }

    return {
      user: {
        id: user.id,
        displayName: user.displayName || user.email.split("@")[0],
        email: user.email,
        emailConfirmed: user.emailConfirmed,
        onboardingCompleted: user.onboardingCompleted,
        onboardingStep: user.onboardingStep,
      },
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        isPersonal: workspace.isPersonal,
        creditsBalance: workspace.creditsBalance,
      },
      usageSummary,
      stats: {
        totalProjects: workspace._count.projects,
        totalScenes,
        totalCharacters,
        totalEnvironments,
        totalPromptsCount,
      },
      recentProjects,
      recentGenerations,
      recentCreditTransactions,
      pendingInvites,
      alerts,
      onboardingState: {
        userId: user.id,
        displayName: user.displayName || user.email.split("@")[0],
        email: user.email,
        emailConfirmed: user.emailConfirmed,
        onboardingCompleted: user.onboardingCompleted,
        onboardingStep: user.onboardingStep,
        preferences: ((user as any).preferences as Record<string, any>) || {},
        activeWorkspace: {
          id: workspace.id,
          name: workspace.name,
          slug: workspace.slug,
          planName: usageSummary.planName || "Plano Gratuito",
          projectsCount: workspace._count.projects,
          hasProjects: workspace._count.projects > 0,
        },
        starterTemplates: STARTER_TEMPLATES.map((t) => ({
          key: t.key,
          title: t.title,
          genre: t.genre,
          description: t.description,
          targetPlatform: t.targetPlatform,
          aspectRatio: t.aspectRatio,
        })),
      },
    };
  }
}
