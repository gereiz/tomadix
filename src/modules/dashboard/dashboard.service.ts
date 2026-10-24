import { db } from "@/lib/db";
import { EntitlementService } from "@/modules/billing/entitlement.service";
import { NotFoundError } from "@/lib/auth";

export interface ContextualAlert {
  id: string;
  type: "warning" | "info" | "action" | "danger";
  title: string;
  message: string;
  ctaText?: string;
  ctaHref?: string;
}

export class DashboardService {
  /**
   * Coleta todos os dados reais do workspace ativo e do usuário logado para o Dashboard.
   */
  static async getDashboardData(userId: string, workspaceId: string) {
    const [user, workspace] = await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          displayName: true,
          emailConfirmed: true,
          onboardingCompleted: true,
          onboardingStep: true,
        },
      }),
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
    ]);

    if (!user) throw new NotFoundError("Usuário não encontrado.");
    if (!workspace) throw new NotFoundError("Workspace não encontrado.");

    // Resumo de Entitlements & Assinatura
    const usageSummary = await EntitlementService.getWorkspaceUsageSummary(workspaceId);

    // Projetos Recentes do Workspace
    const recentProjects = await db.project.findMany({
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
        configuration: true,
        _count: {
          select: {
            characters: true,
            scenes: true,
            environments: true,
          },
        },
      },
    });

    // Buscar IDs de todos os projetos do workspace para agregar estatísticas e gerações
    const allWorkspaceProjects = await db.project.findMany({
      where: { workspaceId },
      select: { id: true },
    });
    const projectIds = allWorkspaceProjects.map((p) => p.id);

    // Últimas gerações de prompts do workspace
    const recentGenerations =
      projectIds.length > 0
        ? await db.promptVersion.findMany({
            where: { projectId: { in: projectIds } },
            orderBy: { createdAt: "desc" },
            take: 5,
            select: {
              id: true,
              projectId: true,
              templateKey: true,
              targetTool: true,
              modelName: true,
              outputText: true,
              outputJson: true,
              createdAt: true,
              scene: {
                select: {
                  title: true,
                  order: true,
                },
              },
            },
          })
        : [];

    // Últimos movimentos de crédito no razão contábil
    const recentCreditTransactions = await db.creditLedger.findMany({
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
    });

    // Convites pendentes recebidos pelo e-mail do usuário em qualquer workspace
    const pendingInvites = await db.workspaceInvite.findMany({
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
    });

    // Estatísticas reais agregadas
    const [totalScenes, totalCharacters, totalEnvironments, totalPromptsCount] =
      await Promise.all([
        projectIds.length > 0
          ? db.scene.count({ where: { projectId: { in: projectIds } } })
          : 0,
        projectIds.length > 0
          ? db.character.count({ where: { projectId: { in: projectIds } } })
          : 0,
        projectIds.length > 0
          ? db.environment.count({ where: { projectId: { in: projectIds } } })
          : 0,
        projectIds.length > 0
          ? db.promptVersion.count({ where: { projectId: { in: projectIds } } })
          : 0,
      ]);

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
    };
  }
}
