import { db } from "@/lib/db";
import { WorkspaceRole, PlanTier, SubscriptionStatus, BillingInterval } from "@prisma/client";
import { hasPermission, Permission } from "@/lib/permissions";
import { AuthorizationError, NotFoundError } from "@/lib/auth";
import { EntitlementService } from "@/modules/billing/entitlement.service";

export class WorkspaceService {
  /**
   * Lista todos os workspaces aos quais o usuário pertence.
   */
  static async getUserWorkspaces(userId: string) {
    const memberships = await db.membership.findMany({
      where: { userId },
      include: {
        workspace: {
          include: {
            _count: {
              select: {
                projects: true,
                memberships: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return memberships.map((m) => ({
      ...m.workspace,
      role: m.role,
    }));
  }

  /**
   * Cria um novo workspace e vincula o usuário como OWNER.
   */
  static async createWorkspace(
    userId: string,
    name: string,
    isPersonal = false,
    settings: Record<string, any> = {},
    initialPlanTier: PlanTier = PlanTier.FREE
  ) {
    const baseSlug = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const uniqueSlug = `${baseSlug || "workspace"}-${Date.now().toString().slice(-6)}`;

    const workspace = await db.workspace.create({
      data: {
        name,
        slug: uniqueSlug,
        isPersonal,
        settings,
        memberships: {
          create: {
            userId,
            role: WorkspaceRole.OWNER,
          },
        },
        subscription: {
          create: {
            planTier: initialPlanTier,
            status: SubscriptionStatus.ACTIVE,
            interval: BillingInterval.MONTHLY,
            currentPeriodStart: new Date(),
          },
        },
      },
    });

    await db.auditLog.create({
      data: {
        userId,
        workspaceId: workspace.id,
        action: "WORKSPACE_CREATED",
        details: { name, slug: uniqueSlug, isPersonal },
      },
    });

    return workspace;
  }

  /**
   * Lista todos os membros de um workspace com validação de permissão.
   */
  static async listMembers(workspaceId: string, currentUserId: string) {
    await this.assertUserHasPermission(workspaceId, currentUserId, "members:read");

    return db.membership.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  /**
   * Adiciona ou convida um membro pelo e-mail para o workspace.
   */
  static async addMember(
    workspaceId: string,
    currentUserId: string,
    email: string,
    role: WorkspaceRole
  ) {
    const actorMembership = await this.assertUserHasPermission(
      workspaceId,
      currentUserId,
      "members:manage"
    );

    // Validar limites comerciais de membros no plano (Entitlement)
    await EntitlementService.assertCanAddMember(workspaceId);

    // Se o ator for ADMIN, não pode convidar alguém como OWNER
    if (actorMembership.role !== WorkspaceRole.OWNER && role === WorkspaceRole.OWNER) {
      throw new AuthorizationError("Apenas o proprietário atual pode conceder papel de OWNER.");
    }

    const targetUser = await db.user.findUnique({
      where: { email },
    });

    if (!targetUser) {
      throw new NotFoundError("Usuário não encontrado com este e-mail.");
    }

    const existingMembership = await db.membership.findUnique({
      where: {
        userId_workspaceId: {
          userId: targetUser.id,
          workspaceId,
        },
      },
    });

    if (existingMembership) {
      throw new Error("Este usuário já é membro deste workspace.");
    }

    const membership = await db.membership.create({
      data: {
        userId: targetUser.id,
        workspaceId,
        role,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
    });

    await db.auditLog.create({
      data: {
        userId: currentUserId,
        workspaceId,
        action: "MEMBER_ADDED",
        details: { targetUserId: targetUser.id, email, role },
      },
    });

    return membership;
  }

  /**
   * Atualiza o papel de um membro do workspace com proteção estrita do OWNER.
   */
  static async updateMemberRole(
    workspaceId: string,
    currentUserId: string,
    membershipId: string,
    newRole: WorkspaceRole
  ) {
    const actorMembership = await this.assertUserHasPermission(
      workspaceId,
      currentUserId,
      "members:manage"
    );

    const targetMembership = await db.membership.findUnique({
      where: { id: membershipId },
    });

    if (!targetMembership || targetMembership.workspaceId !== workspaceId) {
      throw new NotFoundError("Membro não encontrado neste workspace.");
    }

    // Se o membro alvo for OWNER, apenas outro OWNER pode alterar (ou transferir posse)
    if (targetMembership.role === WorkspaceRole.OWNER && actorMembership.role !== WorkspaceRole.OWNER) {
      throw new AuthorizationError("Não é permitido alterar o papel do proprietário do workspace.");
    }

    // Se estiver rebaixando o OWNER, verificar se há outro OWNER no workspace
    if (targetMembership.role === WorkspaceRole.OWNER && newRole !== WorkspaceRole.OWNER) {
      const ownerCount = await db.membership.count({
        where: {
          workspaceId,
          role: WorkspaceRole.OWNER,
        },
      });

      if (ownerCount <= 1) {
        throw new AuthorizationError(
          "O workspace não pode ficar sem um proprietário ativo. Nomeie outro proprietário antes de alterar este papel."
        );
      }
    }

    const updated = await db.membership.update({
      where: { id: membershipId },
      data: { role: newRole },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
    });

    await db.auditLog.create({
      data: {
        userId: currentUserId,
        workspaceId,
        action: "MEMBER_ROLE_UPDATED",
        details: { targetUserId: targetMembership.userId, previousRole: targetMembership.role, newRole },
      },
    });

    return updated;
  }

  /**
   * Remove um membro do workspace com proteção contra remoção acidental do OWNER.
   */
  static async removeMember(workspaceId: string, currentUserId: string, membershipId: string) {
    const actorMembership = await this.assertUserHasPermission(
      workspaceId,
      currentUserId,
      "members:manage"
    );

    const targetMembership = await db.membership.findUnique({
      where: { id: membershipId },
    });

    if (!targetMembership || targetMembership.workspaceId !== workspaceId) {
      throw new NotFoundError("Membro não encontrado no workspace.");
    }

    // Regra crítica: Proteção do OWNER contra remoção acidental
    if (targetMembership.role === WorkspaceRole.OWNER) {
      const ownerCount = await db.membership.count({
        where: {
          workspaceId,
          role: WorkspaceRole.OWNER,
        },
      });

      if (ownerCount <= 1) {
        throw new AuthorizationError(
          "Não é permitido remover o único proprietário do workspace. Transfira a propriedade antes de remover este membro."
        );
      }

      if (actorMembership.role !== WorkspaceRole.OWNER) {
        throw new AuthorizationError("Apenas outro proprietário pode remover um membro proprietário.");
      }
    }

    await db.membership.delete({
      where: { id: membershipId },
    });

    await db.auditLog.create({
      data: {
        userId: currentUserId,
        workspaceId,
        action: "MEMBER_REMOVED",
        details: { targetUserId: targetMembership.userId, role: targetMembership.role },
      },
    });

    return { success: true };
  }

  /**
   * Recupera os logs de auditoria do workspace para OWNERs e ADMINs.
   */
  static async getAuditLogs(workspaceId: string, currentUserId: string, limit = 50) {
    await this.assertUserHasPermission(workspaceId, currentUserId, "audit:read");

    return db.auditLog.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  /**
   * Recupera os detalhes completos de um workspace, incluindo dono e contadores.
   */
  static async getWorkspaceDetails(workspaceId: string, currentUserId: string) {
    await this.assertUserHasPermission(workspaceId, currentUserId, "workspace:read");

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
            invites: {
              where: { status: "PENDING" },
            },
          },
        },
        memberships: {
          where: { role: WorkspaceRole.OWNER },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                displayName: true,
              },
            },
          },
        },
      },
    });

    if (!workspace) {
      throw new NotFoundError("Workspace não encontrado.");
    }

    return workspace;
  }

  /**
   * Atualiza configurações, nome e arquivamento controlado de um workspace.
   */
  static async updateWorkspace(
    workspaceId: string,
    currentUserId: string,
    data: { name?: string; settings?: any; isArchived?: boolean }
  ) {
    await this.assertUserHasPermission(workspaceId, currentUserId, "workspace:update");

    const existing = await db.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        memberships: true,
      },
    });

    if (!existing) {
      throw new NotFoundError("Workspace não encontrado.");
    }

    if (data.isArchived === true && existing.isPersonal) {
      const activeWorkspacesCount = await db.membership.count({
        where: {
          userId: currentUserId,
          workspace: { isArchived: false },
        },
      });

      if (activeWorkspacesCount <= 1) {
        throw new AuthorizationError(
          "Não é possível arquivar seu único workspace pessoal ativo."
        );
      }
    }

    const updated = await db.workspace.update({
      where: { id: workspaceId },
      data: {
        name: data.name ?? undefined,
        settings: data.settings !== undefined ? data.settings : undefined,
        isArchived: data.isArchived !== undefined ? data.isArchived : undefined,
        archivedAt: data.isArchived === true ? new Date() : data.isArchived === false ? null : undefined,
      },
    });

    await db.auditLog.create({
      data: {
        userId: currentUserId,
        workspaceId,
        action: "WORKSPACE_UPDATED",
        details: data,
      },
    });

    return updated;
  }

  /**
   * Transfere a propriedade (OWNER) do workspace para outro membro de forma atômica e segura.
   */
  static async transferOwnership(
    workspaceId: string,
    currentUserId: string,
    newOwnerMembershipId: string
  ) {
    const actorMembership = await db.membership.findUnique({
      where: {
        userId_workspaceId: {
          userId: currentUserId,
          workspaceId,
        },
      },
    });

    if (!actorMembership || actorMembership.role !== WorkspaceRole.OWNER) {
      throw new AuthorizationError(
        "Apenas o proprietário atual (OWNER) pode transferir a propriedade do workspace."
      );
    }

    const targetMembership = await db.membership.findUnique({
      where: { id: newOwnerMembershipId },
      include: { user: true },
    });

    if (!targetMembership || targetMembership.workspaceId !== workspaceId) {
      throw new NotFoundError("Membro alvo não encontrado neste workspace.");
    }

    if (targetMembership.userId === currentUserId) {
      throw new Error("Você já é o proprietário deste workspace.");
    }

    return await db.$transaction(async (tx) => {
      // 1. Promover o novo membro a OWNER
      const promoted = await tx.membership.update({
        where: { id: newOwnerMembershipId },
        data: { role: WorkspaceRole.OWNER },
      });

      // 2. Transicionar o proprietário anterior para ADMIN
      await tx.membership.update({
        where: { id: actorMembership.id },
        data: { role: WorkspaceRole.ADMIN },
      });

      // 3. Registrar auditoria
      await tx.auditLog.create({
        data: {
          userId: currentUserId,
          workspaceId,
          action: "WORKSPACE_OWNERSHIP_TRANSFERRED",
          details: {
            previousOwnerId: currentUserId,
            newOwnerUserId: targetMembership.userId,
            newOwnerEmail: targetMembership.user.email,
          },
        },
      });

      return {
        success: true,
        previousOwnerRole: WorkspaceRole.ADMIN,
        newOwner: promoted,
      };
    });
  }

  /**
   * Valida se o usuário informado possui a permissão requerida no workspace especificado.
   */
  static async assertUserHasPermission(
    workspaceId: string,
    userId: string,
    permission: Permission
  ) {
    const membership = await db.membership.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        },
      },
    });

    if (!membership) {
      throw new AuthorizationError("Você não tem acesso a este workspace.");
    }

    if (!hasPermission(membership.role, permission)) {
      throw new AuthorizationError(
        `Seu papel (${membership.role}) não possui a permissão necessária (${permission}).`
      );
    }

    return membership;
  }
}
