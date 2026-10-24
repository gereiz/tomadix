import { db } from "@/lib/db";
import { PlatformRole, Prisma } from "@prisma/client";
import { AdminAuditService } from "./admin-audit.service";

export interface ListUsersParams {
  search?: string;
  status?: "all" | "active" | "suspended" | "unconfirmed";
  role?: string;
  page?: number;
  limit?: number;
}

export class AdminUsersService {
  /**
   * Lista usuários da plataforma com busca, filtros e paginação.
   */
  static async listUsers(params: ListUsersParams) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    if (params.search) {
      where.OR = [
        { email: { contains: params.search, mode: "insensitive" } },
        { displayName: { contains: params.search, mode: "insensitive" } },
      ];
    }

    if (params.status === "active") {
      where.isSuspended = false;
    } else if (params.status === "suspended") {
      where.isSuspended = true;
    } else if (params.status === "unconfirmed") {
      where.emailConfirmed = false;
    }

    if (params.role && Object.values(PlatformRole).includes(params.role as PlatformRole)) {
      where.platformRole = params.role as PlatformRole;
    }

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          displayName: true,
          platformRole: true,
          isSuspended: true,
          suspendedAt: true,
          suspensionReason: true,
          emailConfirmed: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              memberships: true,
              sessions: true,
            },
          },
          memberships: {
            take: 3,
            select: {
              role: true,
              workspace: {
                select: {
                  id: true,
                  name: true,
                  isPersonal: true,
                  creditsBalance: true,
                  subscription: {
                    select: {
                      planTier: true,
                      status: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      db.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obtém detalhes operacionais do usuário sem violar a privacidade de conteúdos privados.
   */
  static async getUserDetails(userId: string) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        authSubject: true,
        email: true,
        displayName: true,
        platformRole: true,
        isSuspended: true,
        suspendedAt: true,
        suspensionReason: true,
        emailConfirmed: true,
        createdAt: true,
        updatedAt: true,
        onboardingCompleted: true,
        onboardingStep: true,
        preferences: true,
        memberships: {
          include: {
            workspace: {
              include: {
                subscription: true,
                _count: {
                  select: {
                    projects: true,
                    memberships: true,
                  },
                },
              },
            },
          },
        },
        sessions: {
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            ipAddress: true,
            userAgent: true,
            expiresAt: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error("Usuário não encontrado.");
    }

    // Agrega contadores de projetos e gerações nos workspaces do usuário (apenas métricas numéricas)
    const workspaceIds = user.memberships.map((m) => m.workspaceId);

    const [totalProjects, totalGenerations] = await Promise.all([
      db.project.count({
        where: { workspaceId: { in: workspaceIds } },
      }),
      db.generationJob.count({
        where: {
          project: {
            workspaceId: { in: workspaceIds },
          },
        },
      }),
    ]);

    // Histórico de auditoria administrativa sobre este usuário
    const recentAuditLogs = await db.platformAuditLog.findMany({
      where: {
        OR: [
          { targetType: "User", targetId: userId },
          { adminUserId: userId },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return {
      user,
      metrics: {
        totalWorkspaces: user.memberships.length,
        totalProjects,
        totalGenerations,
        activeSessionsCount: user.sessions.length,
      },
      recentAuditLogs,
    };
  }

  /**
   * Suspende uma conta de usuário por violação de termos ou segurança.
   * Revoga imediatamente todas as sessões ativas e registra na auditoria.
   */
  static async suspendUser(
    adminUserId: string,
    targetUserId: string,
    reason: string,
    context?: { ip?: string; ua?: string }
  ) {
    if (!reason || reason.trim().length < 5) {
      throw new Error("É obrigatório fornecer uma justificativa clara para a suspensão.");
    }

    if (adminUserId === targetUserId) {
      throw new Error("Um administrador não pode suspender a própria conta.");
    }

    const targetUser = await db.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new Error("Usuário alvo não encontrado.");
    }

    // Se o usuário alvo for SUPER_ADMIN, não pode ser suspenso por outros
    if (targetUser.platformRole === PlatformRole.SUPER_ADMIN) {
      throw new Error("Contas com privilégio de SUPER_ADMIN não podem ser suspensas.");
    }

    // 1. Atualizar status de suspensão
    const updatedUser = await db.user.update({
      where: { id: targetUserId },
      data: {
        isSuspended: true,
        suspendedAt: new Date(),
        suspensionReason: reason.trim(),
      },
    });

    // 2. Revogar todas as sessões ativas imediatamente
    const revokedSessions = await db.session.deleteMany({
      where: { userId: targetUserId },
    });

    // 3. Registrar na auditoria da plataforma
    await AdminAuditService.logAction({
      adminUserId,
      action: "USER_SUSPEND",
      targetType: "User",
      targetId: targetUserId,
      result: "SUCCESS",
      details: {
        targetEmail: targetUser.email,
        targetDisplayName: targetUser.displayName,
        reason: reason.trim(),
        revokedSessionsCount: revokedSessions.count,
      },
      ipAddress: context?.ip,
      userAgent: context?.ua,
    });

    return updatedUser;
  }

  /**
   * Reativa uma conta de usuário previamente suspensa.
   */
  static async reactivateUser(
    adminUserId: string,
    targetUserId: string,
    reason?: string,
    context?: { ip?: string; ua?: string }
  ) {
    const targetUser = await db.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new Error("Usuário alvo não encontrado.");
    }

    if (!targetUser.isSuspended) {
      throw new Error("O usuário informado não se encontra suspenso.");
    }

    const updatedUser = await db.user.update({
      where: { id: targetUserId },
      data: {
        isSuspended: false,
        suspendedAt: null,
        suspensionReason: null,
      },
    });

    await AdminAuditService.logAction({
      adminUserId,
      action: "USER_REACTIVATE",
      targetType: "User",
      targetId: targetUserId,
      result: "SUCCESS",
      details: {
        targetEmail: targetUser.email,
        targetDisplayName: targetUser.displayName,
        reactivationReason: reason || "Reativação administrativa manual",
      },
      ipAddress: context?.ip,
      userAgent: context?.ua,
    });

    return updatedUser;
  }

  /**
   * Ajusta saldo de créditos de um workspace (concessão ou estorno) com auditoria.
   */
  static async adjustCredits(
    adminUserId: string,
    workspaceId: string,
    amount: number,
    reason: string,
    context?: { ip?: string; ua?: string }
  ) {
    if (amount === 0) {
      throw new Error("O valor do ajuste de créditos não pode ser zero.");
    }

    if (!reason || reason.trim().length < 3) {
      throw new Error("Informe uma justificativa para o ajuste de créditos.");
    }

    const workspace = await db.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new Error("Workspace não encontrado.");
    }

    const newBalance = Math.max(0, workspace.creditsBalance + amount);

    // Registra no livro razão de créditos
    const ledger = await db.creditLedger.create({
      data: {
        workspaceId,
        amount,
        balanceAfter: newBalance,
        reason: `Ajuste administrativo: ${reason.trim()}`,
        metadata: {
          adminUserId,
          previousBalance: workspace.creditsBalance,
          newBalance,
        },
      },
    });

    // Atualiza saldo no workspace
    await db.workspace.update({
      where: { id: workspaceId },
      data: { creditsBalance: newBalance },
    });

    // Log na auditoria administrativa
    await AdminAuditService.logAction({
      adminUserId,
      action: "CREDIT_ADJUST",
      targetType: "Workspace",
      targetId: workspaceId,
      result: "SUCCESS",
      details: {
        workspaceName: workspace.name,
        amount,
        previousBalance: workspace.creditsBalance,
        newBalance,
        reason: reason.trim(),
        ledgerId: ledger.id,
      },
      ipAddress: context?.ip,
      userAgent: context?.ua,
    });

    return {
      workspaceId,
      previousBalance: workspace.creditsBalance,
      newBalance,
      adjustment: amount,
    };
  }

  /**
   * Altera o papel de plataforma de um usuário (apenas SUPER_ADMIN).
   */
  static async updatePlatformRole(
    adminUserId: string,
    targetUserId: string,
    newRole: PlatformRole,
    context?: { ip?: string; ua?: string }
  ) {
    const adminUser = await db.user.findUnique({ where: { id: adminUserId } });
    if (adminUser?.platformRole !== PlatformRole.SUPER_ADMIN) {
      throw new Error("Apenas usuários com privilégio SUPER_ADMIN podem alterar papéis administrativos.");
    }

    const targetUser = await db.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) {
      throw new Error("Usuário alvo não encontrado.");
    }

    const updatedUser = await db.user.update({
      where: { id: targetUserId },
      data: { platformRole: newRole },
    });

    await AdminAuditService.logAction({
      adminUserId,
      action: "USER_ROLE_CHANGE",
      targetType: "User",
      targetId: targetUserId,
      result: "SUCCESS",
      details: {
        targetEmail: targetUser.email,
        oldRole: targetUser.platformRole,
        newRole,
      },
      ipAddress: context?.ip,
      userAgent: context?.ua,
    });

    return updatedUser;
  }
}
