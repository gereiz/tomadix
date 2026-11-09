import crypto from "crypto";
import { TransactionalEmailService } from "@/modules/email/transactional-email.service";
import { db } from "@/lib/db";
import { WorkspaceRole, InviteStatus } from "@prisma/client";
import { AuthorizationError, NotFoundError } from "@/lib/auth";
import { WorkspaceService } from "./workspace.service";
import { EntitlementService, EntitlementError } from "@/modules/billing/entitlement.service";
import { getPlanConfig } from "@/modules/billing/plans.config";

export class InviteService {
  /**
   * Cria um novo convite seguro por e-mail para o workspace.
   */
  static async createInvite(
    workspaceId: string,
    currentUserId: string,
    email: string,
    role: WorkspaceRole
  ) {
    const actorMembership = await WorkspaceService.assertUserHasPermission(
      workspaceId,
      currentUserId,
      "members:manage"
    );

    // Se o ator for ADMIN, não pode convidar alguém como OWNER
    if (actorMembership.role !== WorkspaceRole.OWNER && role === WorkspaceRole.OWNER) {
      throw new AuthorizationError("Apenas o proprietário atual pode convidar alguém como OWNER.");
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      throw new Error("Endereço de e-mail inválido.");
    }

    // 1. Verificar se o usuário já é membro do workspace
    const existingMember = await db.membership.findFirst({
      where: {
        workspaceId,
        user: { email: normalizedEmail },
      },
    });

    if (existingMember) {
      throw new Error("Este usuário já é membro deste workspace.");
    }

    // 2. Validar limite do plano (assentos disponíveis)
    const summary = await EntitlementService.getWorkspaceUsageSummary(workspaceId);
    const planConfig = getPlanConfig(summary.planTier);

    const pendingInvitesCount = await db.workspaceInvite.count({
      where: {
        workspaceId,
        status: InviteStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
    });

    if (
      planConfig.maxMembers !== -1 &&
      summary.membersCount + pendingInvitesCount >= planConfig.maxMembers
    ) {
      throw new EntitlementError(
        `Limite de membros da equipe atingido (${summary.membersCount} ativos + ${pendingInvitesCount} pendentes / máx ${planConfig.maxMembers}) para o plano ${summary.planName}. Cancele convites pendentes ou faça upgrade para o plano Team.`,
        "MEMBER_LIMIT_REACHED",
        403
      );
    }

    // 3. Cancelar convites pendentes anteriores para o mesmo e-mail neste workspace
    await db.workspaceInvite.updateMany({
      where: {
        workspaceId,
        email: normalizedEmail,
        status: InviteStatus.PENDING,
      },
      data: { status: InviteStatus.CANCELED },
    });

    // 4. Gerar identificador criptográfico seguro e expiração em 7 dias
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invite = await db.workspaceInvite.create({
      data: {
        workspaceId,
        email: normalizedEmail,
        role,
        token,
        status: InviteStatus.PENDING,
        invitedById: currentUserId,
        expiresAt,
      },
      include: {
        workspace: {
          select: { id: true, name: true, slug: true },
        },
        invitedBy: {
          select: { id: true, displayName: true, email: true },
        },
      },
    });

    // 5. Registrar auditoria
    await db.auditLog.create({
      data: {
        userId: currentUserId,
        workspaceId,
        action: "INVITE_CREATED",
        details: {
          inviteId: invite.id,
          email: normalizedEmail,
          role,
          expiresAt,
        },
      },
    });

    // Convite por e-mail (não bloqueia a criação do convite)
    await TransactionalEmailService.sendWorkspaceInvite({
      to: normalizedEmail,
      inviterName: invite.invitedBy?.displayName || invite.invitedBy?.email,
      workspaceName: invite.workspace.name,
      role,
      inviteToken: token,
    });

    return {
      ...invite,
      inviteUrl: `/invite/${token}`,
    };
  }

  /**
   * Lista todos os convites do workspace com expiração automática.
   */
  static async listInvites(workspaceId: string, currentUserId: string) {
    await WorkspaceService.assertUserHasPermission(workspaceId, currentUserId, "members:read");

    // Atualizar convites expirados em lote
    await db.workspaceInvite.updateMany({
      where: {
        workspaceId,
        status: InviteStatus.PENDING,
        expiresAt: { lte: new Date() },
      },
      data: { status: InviteStatus.EXPIRED },
    });

    return db.workspaceInvite.findMany({
      where: { workspaceId },
      include: {
        invitedBy: {
          select: { id: true, displayName: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Recupera os detalhes públicos/autenticados de um convite a partir do token.
   */
  static async getInviteByToken(token: string) {
    const invite = await db.workspaceInvite.findUnique({
      where: { token },
      include: {
        workspace: {
          select: { id: true, name: true, slug: true, isArchived: true },
        },
        invitedBy: {
          select: { displayName: true, email: true },
        },
      },
    });

    if (!invite) {
      throw new NotFoundError("Convite não encontrado ou token inválido.");
    }

    // Se estiver PENDING mas com data expirada, marcar como EXPIRED
    if (invite.status === InviteStatus.PENDING && invite.expiresAt <= new Date()) {
      await db.workspaceInvite.update({
        where: { id: invite.id },
        data: { status: InviteStatus.EXPIRED },
      });
      invite.status = InviteStatus.EXPIRED;
    }

    return invite;
  }

  /**
   * Aceita um convite pendente e adiciona o usuário autenticado ao workspace.
   */
  static async acceptInvite(token: string, userId: string) {
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AuthorizationError("Usuário autenticado não encontrado.");
    }

    const invite = await this.getInviteByToken(token);

    if (invite.status !== InviteStatus.PENDING) {
      if (invite.status === InviteStatus.EXPIRED) {
        throw new Error("Este convite já expirou. Solicite um novo envio.");
      }
      if (invite.status === InviteStatus.CANCELED) {
        throw new Error("Este convite foi cancelado pelo administrador do workspace.");
      }
      if (invite.status === InviteStatus.ACCEPTED) {
        throw new Error("Este convite já foi aceito anteriormente.");
      }
      throw new Error(`Convite em estado inválido: ${invite.status}.`);
    }

    if (invite.workspace.isArchived) {
      throw new Error("O workspace deste convite foi arquivado.");
    }

    // Revalidar limite de membros do plano
    await EntitlementService.assertCanAddMember(invite.workspaceId);

    // Verificar se já é membro
    const existing = await db.membership.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId: invite.workspaceId,
        },
      },
    });

    if (existing) {
      // Já é membro, marcar convite como aceito
      await db.workspaceInvite.update({
        where: { id: invite.id },
        data: { status: InviteStatus.ACCEPTED },
      });
      return { success: true, workspaceId: invite.workspaceId, alreadyMember: true };
    }

    return await db.$transaction(async (tx) => {
      // Criar a filiação com o papel do convite
      const membership = await tx.membership.create({
        data: {
          userId,
          workspaceId: invite.workspaceId,
          role: invite.role,
        },
      });

      // Atualizar status do convite para ACCEPTED
      await tx.workspaceInvite.update({
        where: { id: invite.id },
        data: { status: InviteStatus.ACCEPTED },
      });

      // Registrar auditoria
      await tx.auditLog.create({
        data: {
          userId,
          workspaceId: invite.workspaceId,
          action: "INVITE_ACCEPTED",
          details: {
            inviteId: invite.id,
            email: user.email,
            role: invite.role,
          },
        },
      });

      return {
        success: true,
        workspaceId: invite.workspaceId,
        membership,
      };
    });
  }

  /**
   * Recusa um convite pendente.
   */
  static async declineInvite(token: string, userId: string) {
    const invite = await this.getInviteByToken(token);

    if (invite.status !== InviteStatus.PENDING) {
      throw new Error(`Não é possível recusar um convite em estado ${invite.status}.`);
    }

    await db.workspaceInvite.update({
      where: { id: invite.id },
      data: { status: InviteStatus.DECLINED },
    });

    await db.auditLog.create({
      data: {
        userId,
        workspaceId: invite.workspaceId,
        action: "INVITE_DECLINED",
        details: { inviteId: invite.id, email: invite.email },
      },
    });

    return { success: true };
  }

  /**
   * Cancela ou revoga um convite pendente no workspace.
   */
  static async cancelInvite(workspaceId: string, currentUserId: string, inviteId: string) {
    await WorkspaceService.assertUserHasPermission(workspaceId, currentUserId, "members:manage");

    const invite = await db.workspaceInvite.findUnique({
      where: { id: inviteId },
    });

    if (!invite || invite.workspaceId !== workspaceId) {
      throw new NotFoundError("Convite não encontrado no workspace.");
    }

    if (invite.status !== InviteStatus.PENDING) {
      throw new Error("Apenas convites pendentes podem ser revogados.");
    }

    const updated = await db.workspaceInvite.update({
      where: { id: inviteId },
      data: { status: InviteStatus.CANCELED },
    });

    await db.auditLog.create({
      data: {
        userId: currentUserId,
        workspaceId,
        action: "INVITE_CANCELED",
        details: { inviteId, email: invite.email },
      },
    });

    return updated;
  }

  /**
   * Reenvia um convite expirado ou pendente gerando um novo token seguro e renovando o prazo.
   */
  static async resendInvite(workspaceId: string, currentUserId: string, inviteId: string) {
    await WorkspaceService.assertUserHasPermission(workspaceId, currentUserId, "members:manage");

    const invite = await db.workspaceInvite.findUnique({
      where: { id: inviteId },
    });

    if (!invite || invite.workspaceId !== workspaceId) {
      throw new NotFoundError("Convite não encontrado no workspace.");
    }

    if (invite.status === InviteStatus.ACCEPTED) {
      throw new Error("Este convite já foi aceito.");
    }

    const newToken = crypto.randomBytes(32).toString("hex");
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const updated = await db.workspaceInvite.update({
      where: { id: inviteId },
      data: {
        token: newToken,
        expiresAt: newExpiresAt,
        status: InviteStatus.PENDING,
      },
    });

    await db.auditLog.create({
      data: {
        userId: currentUserId,
        workspaceId,
        action: "INVITE_RESENT",
        details: { inviteId, email: invite.email, expiresAt: newExpiresAt },
      },
    });

    return {
      ...updated,
      inviteUrl: `/invite/${newToken}`,
    };
  }
}
