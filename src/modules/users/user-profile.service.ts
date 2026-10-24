import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { NotFoundError, AuthorizationError } from "@/lib/auth";

export interface UserPreferences {
  theme?: "dark" | "system";
  compactView?: boolean;
  defaultViewMode?: "cards" | "table";
  language?: "pt-BR" | "en-US";
  emailNotifications?: boolean;
  billingAlerts?: boolean;
  teamInvites?: boolean;
  productUpdates?: boolean;
  defaultPlatform?: string;
  defaultAspectRatio?: string;
  defaultColorGrade?: string;
}

export class UserProfileService {
  /**
   * Obtém os detalhes completos do perfil do usuário e suas preferências.
   */
  static async getProfile(userId: string) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        emailConfirmed: true,
        preferences: true,
        onboardingCompleted: true,
        onboardingStep: true,
        createdAt: true,
        updatedAt: true,
        memberships: {
          include: {
            workspace: {
              select: {
                id: true,
                name: true,
                slug: true,
                isPersonal: true,
              },
            },
          },
        },
      },
    });

    if (!user) throw new NotFoundError("Usuário não encontrado.");

    return user;
  }

  /**
   * Atualiza dados de exibição e preferências do usuário.
   */
  static async updateProfile(
    userId: string,
    data: { displayName?: string; preferences?: UserPreferences }
  ) {
    const existing = await db.user.findUnique({ where: { id: userId } });
    if (!existing) throw new NotFoundError("Usuário não encontrado.");

    const currentPrefs = (existing.preferences as Record<string, any>) || {};
    const mergedPrefs = data.preferences
      ? { ...currentPrefs, ...data.preferences }
      : currentPrefs;

    const updated = await db.user.update({
      where: { id: userId },
      data: {
        ...(data.displayName !== undefined
          ? { displayName: data.displayName.trim() }
          : {}),
        preferences: mergedPrefs,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        preferences: true,
        updatedAt: true,
      },
    });

    await db.auditLog.create({
      data: {
        userId,
        action: "PROFILE_UPDATED",
        details: { displayName: data.displayName, preferencesUpdated: Boolean(data.preferences) },
      },
    });

    return updated;
  }

  /**
   * Altera a senha do usuário de forma segura, validando a senha atual.
   */
  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    currentSessionToken?: string
  ) {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user || !user.passwordHash) {
      throw new NotFoundError("Conta não encontrada ou método de autenticação externo.");
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new AuthorizationError("A senha atual informada está incorreta.");
    }

    if (!newPassword || newPassword.length < 8) {
      throw new Error("A nova senha deve ter no mínimo 8 caracteres.");
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    await db.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    // Revoga outras sessões ativas por segurança
    if (currentSessionToken) {
      const currentTokenHash = crypto
        .createHash("sha256")
        .update(currentSessionToken)
        .digest("hex");

      await db.session.deleteMany({
        where: {
          userId,
          tokenHash: { not: currentTokenHash },
        },
      });
    }

    await db.auditLog.create({
      data: {
        userId,
        action: "PASSWORD_CHANGED",
        details: { timestamp: new Date().toISOString() },
      },
    });

    return { success: true };
  }

  /**
   * Lista as sessões ativas do usuário com identificação da sessão atual.
   */
  static async listSessions(userId: string, currentSessionToken?: string) {
    const currentTokenHash = currentSessionToken
      ? crypto.createHash("sha256").update(currentSessionToken).digest("hex")
      : null;

    const sessions = await db.session.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    return sessions.map((s) => ({
      id: s.id,
      ipAddress: s.ipAddress || "Desconhecido",
      userAgent: s.userAgent || "Navegador Desconhecido",
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      isCurrent: currentTokenHash ? s.tokenHash === currentTokenHash : false,
    }));
  }

  /**
   * Revoga uma sessão específica do usuário.
   */
  static async revokeSession(userId: string, sessionId: string) {
    const session = await db.session.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundError("Sessão não encontrada.");
    }

    await db.session.delete({ where: { id: sessionId } });

    await db.auditLog.create({
      data: {
        userId,
        action: "SESSION_REVOKED",
        details: { sessionId },
      },
    });

    return { success: true };
  }

  /**
   * Revoga todas as outras sessões ativas do usuário exceto a atual.
   */
  static async revokeOtherSessions(userId: string, currentSessionToken: string) {
    const currentTokenHash = crypto
      .createHash("sha256")
      .update(currentSessionToken)
      .digest("hex");

    const result = await db.session.deleteMany({
      where: {
        userId,
        tokenHash: { not: currentTokenHash },
      },
    });

    await db.auditLog.create({
      data: {
        userId,
        action: "OTHER_SESSIONS_REVOKED",
        details: { count: result.count },
      },
    });

    return { revokedCount: result.count };
  }

  /**
   * Exporta os dados pessoais do usuário em formato JSON estruturado (LGPD / GDPR).
   */
  static async exportUserData(userId: string) {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: {
            workspace: {
              select: {
                id: true,
                name: true,
                slug: true,
                isPersonal: true,
                createdAt: true,
              },
            },
          },
        },
        sessions: {
          select: {
            id: true,
            ipAddress: true,
            userAgent: true,
            createdAt: true,
            expiresAt: true,
          },
        },
        auditLogs: {
          orderBy: { createdAt: "desc" },
          take: 50,
          select: {
            id: true,
            action: true,
            details: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundError("Usuário não encontrado.");

    const userWorkspaceIds = user.memberships.map((m) => m.workspaceId);

    // Projetos dos workspaces associados ao usuário
    const authoredProjects =
      userWorkspaceIds.length > 0
        ? await db.project.findMany({
            where: { workspaceId: { in: userWorkspaceIds } },
            select: {
              id: true,
              workspaceId: true,
              title: true,
              genre: true,
              description: true,
              createdAt: true,
              updatedAt: true,
            },
          })
        : [];

    const exportPayload = {
      exportMetadata: {
        application: "Tomadix",
        exportDate: new Date().toISOString(),
        regulationCompliance: "LGPD (Lei 13.709/2018) / GDPR Art. 20",
      },
      account: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        emailConfirmed: user.emailConfirmed,
        onboardingCompleted: user.onboardingCompleted,
        preferences: user.preferences,
        accountCreatedAt: user.createdAt,
        accountUpdatedAt: user.updatedAt,
      },
      workspacesAndTeams: user.memberships.map((m) => ({
        workspaceId: m.workspaceId,
        workspaceName: m.workspace.name,
        isPersonalStudio: m.workspace.isPersonal,
        assignedRole: m.role,
        memberSince: m.createdAt,
      })),
      authoredProjects,
      activeSessions: user.sessions,
      recentAuditLogs: user.auditLogs,
    };

    return exportPayload;
  }

  /**
   * Exclui a conta do usuário de forma permanente após validação segura de senha.
   */
  static async deleteAccount(userId: string, passwordConfirmation: string) {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: {
            workspace: {
              include: {
                memberships: true,
              },
            },
          },
        },
      },
    });

    if (!user || !user.passwordHash) {
      throw new NotFoundError("Conta de usuário não encontrada.");
    }

    const isMatch = await bcrypt.compare(passwordConfirmation, user.passwordHash);
    if (!isMatch) {
      throw new AuthorizationError(
        "A senha digitada está incorreta. A exclusão de conta foi cancelada."
      );
    }

    // Verifica se o usuário é o único OWNER de um workspace com outros membros
    for (const membership of user.memberships) {
      if (membership.role === "OWNER" && !membership.workspace.isPersonal) {
        const otherMembers = membership.workspace.memberships.filter(
          (m: any) => m.userId !== userId
        );
        if (otherMembers.length > 0) {
          throw new AuthorizationError(
            `Você é o proprietário do workspace "${membership.workspace.name}", que possui outros membros ativos. Transfira a propriedade do workspace antes de excluir sua conta.`
          );
        }
      }
    }

    // Registra a auditoria antes da exclusão
    await db.auditLog.create({
      data: {
        action: "ACCOUNT_DELETED",
        details: {
          deletedUserId: userId,
          email: user.email,
          timestamp: new Date().toISOString(),
        },
      },
    });

    // Exclui workspaces pessoais onde o usuário era o único membro
    for (const membership of user.memberships) {
      if (membership.workspace.isPersonal) {
        await db.workspace.delete({ where: { id: membership.workspaceId } });
      }
    }

    // Exclui o usuário (em cascata, remove sessões e filiações remanescentes)
    await db.user.delete({ where: { id: userId } });

    return { success: true };
  }
}
