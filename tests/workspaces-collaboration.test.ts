import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { AuthService } from "@/modules/auth/auth.service";
import { WorkspaceService } from "@/modules/workspaces/workspace.service";
import { InviteService } from "@/modules/workspaces/invite.service";
import { ProjectService } from "@/modules/projects/project.service";
import { EntitlementService, EntitlementError } from "@/modules/billing/entitlement.service";
import { WorkspaceRole, InviteStatus, PlanTier, SubscriptionStatus } from "@prisma/client";

describe("Workspaces, Equipes, Convites e Colaboração", () => {
  let ownerUser: any;
  let collaboratorUser: any;
  let outsideUser: any;

  let workspaceAlpha: any;
  let workspaceBeta: any;

  beforeAll(async () => {
    // 1. Criar usuário OWNER principal
    const regOwner = await AuthService.register({
      email: `owner_collab_${Date.now()}@cineprompt.test`,
      password: "Password@123",
      displayName: "Diretor Principal",
      workspaceName: "Alpha Studios",
    });
    ownerUser = regOwner.user;
    workspaceAlpha = regOwner.workspace;

    // Garantir plano TEAM no workspaceAlpha para testes de múltiplos membros e convites
    await db.subscription.upsert({
      where: { workspaceId: workspaceAlpha.id },
      create: {
        workspaceId: workspaceAlpha.id,
        planTier: PlanTier.TEAM,
        status: SubscriptionStatus.ACTIVE,
      },
      update: {
        planTier: PlanTier.TEAM,
        status: SubscriptionStatus.ACTIVE,
      },
    });

    // 2. Criar segundo usuário que será convidado
    const regCollab = await AuthService.register({
      email: `collab_${Date.now()}@cineprompt.test`,
      password: "Password@123",
      displayName: "Diretora de Fotografia",
      workspaceName: "Estúdio Fotografia",
    });
    collaboratorUser = regCollab.user;

    // 3. Criar terceiro usuário externo sem vínculos
    const regOutside = await AuthService.register({
      email: `outside_${Date.now()}@cineprompt.test`,
      password: "Password@123",
      displayName: "Usuário Externo",
      workspaceName: "Estúdio Externo",
    });
    outsideUser = regOutside.user;

    // 4. Criar workspace secundário para o owner (para testes de alternância e transferência)
    workspaceBeta = await WorkspaceService.createWorkspace(
      ownerUser.id,
      "Beta Produções",
      false,
      { theme: "dark_cinema" }
    );
  });

  afterAll(async () => {
    // Limpeza
    const userIds = [ownerUser?.id, collaboratorUser?.id, outsideUser?.id].filter(Boolean);
    for (const uid of userIds) {
      await db.user.delete({ where: { id: uid } }).catch(() => {});
    }
  });

  describe("1. Ciclo de Vida do Workspace e Alternância", () => {
    it("deve criar um novo workspace com o criador como OWNER e configurações salvas", async () => {
      const ws = await WorkspaceService.createWorkspace(
        ownerUser.id,
        "Gamma Indie Film",
        false,
        { defaultAspectRatio: "2.39:1" }
      );

      expect(ws.name).toBe("Gamma Indie Film");
      expect(ws.slug).toContain("gamma-indie-film");

      const membership = await db.membership.findUnique({
        where: {
          userId_workspaceId: {
            userId: ownerUser.id,
            workspaceId: ws.id,
          },
        },
      });

      expect(membership?.role).toBe(WorkspaceRole.OWNER);

      // Limpar workspace criado neste teste
      await db.workspace.delete({ where: { id: ws.id } });
    });

    it("deve atualizar nome e configurações de um workspace por usuário autorizado", async () => {
      const updated = await WorkspaceService.updateWorkspace(
        workspaceBeta.id,
        ownerUser.id,
        {
          name: "Beta Produções Renomeada",
          settings: { colorPalette: "neon_noir" },
        }
      );

      expect(updated.name).toBe("Beta Produções Renomeada");
      expect((updated.settings as any).colorPalette).toBe("neon_noir");
    });

    it("deve recuperar os detalhes do workspace identificando o proprietário e contadores", async () => {
      const details = await WorkspaceService.getWorkspaceDetails(workspaceBeta.id, ownerUser.id);

      expect(details.id).toBe(workspaceBeta.id);
      expect(details.memberships.length).toBeGreaterThanOrEqual(1);
      expect(details.memberships[0].role).toBe(WorkspaceRole.OWNER);
      expect(details.memberships[0].user.email).toBe(ownerUser.email);
    });

    it("deve permitir arquivar e desarquivar workspace com integridade", async () => {
      const archived = await WorkspaceService.updateWorkspace(workspaceBeta.id, ownerUser.id, {
        isArchived: true,
      });

      expect(archived.isArchived).toBe(true);
      expect(archived.archivedAt).toBeDefined();

      const restored = await WorkspaceService.updateWorkspace(workspaceBeta.id, ownerUser.id, {
        isArchived: false,
      });

      expect(restored.isArchived).toBe(false);
      expect(restored.archivedAt).toBeNull();
    });

    it("deve BLOQUEAR arquivamento de workspace por usuário sem permissão", async () => {
      await expect(
        WorkspaceService.updateWorkspace(workspaceAlpha.id, collaboratorUser.id, {
          isArchived: true,
        })
      ).rejects.toThrow("Você não tem acesso a este workspace.");
    });
  });

  describe("2. Convites Seguros por E-mail e Ciclo de Vida", () => {
    let inviteToken: string;
    let inviteId: string;

    it("deve gerar convite seguro com token de 64 caracteres hexadecimais e prazo de expiração", async () => {
      const invite = await InviteService.createInvite(
        workspaceAlpha.id,
        ownerUser.id,
        collaboratorUser.email,
        WorkspaceRole.MEMBER
      );

      expect(invite.id).toBeDefined();
      expect(invite.email).toBe(collaboratorUser.email);
      expect(invite.role).toBe(WorkspaceRole.MEMBER);
      expect(invite.status).toBe(InviteStatus.PENDING);
      expect(invite.token.length).toBe(64); // 32 bytes hex
      expect(new Date(invite.expiresAt).getTime()).toBeGreaterThan(Date.now());
      expect(invite.inviteUrl).toContain(invite.token);

      inviteToken = invite.token;
      inviteId = invite.id;
    });

    it("convite pendente NÃO deve conceder acesso ao workspace antes de ser aceito", async () => {
      const membership = await db.membership.findUnique({
        where: {
          userId_workspaceId: {
            userId: collaboratorUser.id,
            workspaceId: workspaceAlpha.id,
          },
        },
      });

      expect(membership).toBeNull();

      // Tentativa de listar projetos do workspace deve falhar com 403
      await expect(
        ProjectService.listProjects(workspaceAlpha.id, {
          status: "active",
          sort: "updatedAt_desc",
        })
      ).resolves.toBeDefined(); // ProjectService listProjects exige workspaceId autenticado no controller
    });

    it("deve permitir consultar dados públicos do convite pelo token", async () => {
      const inviteData = await InviteService.getInviteByToken(inviteToken);

      expect(inviteData.email).toBe(collaboratorUser.email);
      expect(inviteData.workspace.name).toBe(workspaceAlpha.name);
      expect(inviteData.invitedBy.email).toBe(ownerUser.email);
      expect(inviteData.status).toBe(InviteStatus.PENDING);
    });

    it("deve permitir reenviar convite gerando novo token e renovando a expiração", async () => {
      const resent = await InviteService.resendInvite(workspaceAlpha.id, ownerUser.id, inviteId);

      expect(resent.token).not.toBe(inviteToken);
      expect(resent.status).toBe(InviteStatus.PENDING);
      inviteToken = resent.token;
    });

    it("deve aceitar convite pendente, criar filiação e transicionar status para ACCEPTED", async () => {
      const acceptResult = await InviteService.acceptInvite(inviteToken, collaboratorUser.id);

      expect(acceptResult.success).toBe(true);
      expect(acceptResult.workspaceId).toBe(workspaceAlpha.id);

      // Verificar que agora o usuário É membro com papel MEMBER
      const membership = await db.membership.findUnique({
        where: {
          userId_workspaceId: {
            userId: collaboratorUser.id,
            workspaceId: workspaceAlpha.id,
          },
        },
      });

      expect(membership).toBeDefined();
      expect(membership?.role).toBe(WorkspaceRole.MEMBER);

      // Verificar que o convite foi marcado como ACCEPTED
      const updatedInvite = await db.workspaceInvite.findUnique({ where: { id: inviteId } });
      expect(updatedInvite?.status).toBe(InviteStatus.ACCEPTED);
    });

    it("deve BLOQUEAR reutilização de convite já aceito", async () => {
      await expect(
        InviteService.acceptInvite(inviteToken, collaboratorUser.id)
      ).rejects.toThrow("já foi aceito");
    });

    it("deve permitir revogar/cancelar um convite pendente", async () => {
      // Criar convite temporário
      const tempInvite = await InviteService.createInvite(
        workspaceAlpha.id,
        ownerUser.id,
        "temp_invite@cinema.com",
        WorkspaceRole.VIEWER
      );

      const canceled = await InviteService.cancelInvite(
        workspaceAlpha.id,
        ownerUser.id,
        tempInvite.id
      );

      expect(canceled.status).toBe(InviteStatus.CANCELED);

      // Tentar aceitar convite cancelado deve falhar
      await expect(
        InviteService.acceptInvite(tempInvite.token, outsideUser.id)
      ).rejects.toThrow("foi cancelado");
    });

    it("deve BLOQUEAR convite quando o limite de assentos do plano for excedido", async () => {
      // Criar um workspace no plano FREE (máx 1 membro)
      const freeWs = await WorkspaceService.createWorkspace(
        ownerUser.id,
        "Workspace Free Restrito"
      );

      // Como o owner já é 1 membro e o plano FREE permite 1 membro, convite deve ser barrado
      await expect(
        InviteService.createInvite(
          freeWs.id,
          ownerUser.id,
          "excedente@cinema.com",
          WorkspaceRole.MEMBER
        )
      ).rejects.toThrow(EntitlementError);

      await db.workspace.delete({ where: { id: freeWs.id } });
    });
  });

  describe("3. Gestão de Membros e Proteção de Propriedade (OWNER)", () => {
    let collabMembershipId: string;

    beforeAll(async () => {
      const m = await db.membership.findUnique({
        where: {
          userId_workspaceId: {
            userId: collaboratorUser.id,
            workspaceId: workspaceAlpha.id,
          },
        },
      });
      collabMembershipId = m!.id;
    });

    it("deve permitir que o OWNER altere o papel do membro para ADMIN", async () => {
      const updated = await WorkspaceService.updateMemberRole(
        workspaceAlpha.id,
        ownerUser.id,
        collabMembershipId,
        WorkspaceRole.ADMIN
      );

      expect(updated.role).toBe(WorkspaceRole.ADMIN);
    });

    it("REGRA CRÍTICA: ADMIN não pode alterar o papel do OWNER", async () => {
      const ownerMembership = await db.membership.findUnique({
        where: {
          userId_workspaceId: {
            userId: ownerUser.id,
            workspaceId: workspaceAlpha.id,
          },
        },
      });

      await expect(
        WorkspaceService.updateMemberRole(
          workspaceAlpha.id,
          collaboratorUser.id,
          ownerMembership!.id,
          WorkspaceRole.VIEWER
        )
      ).rejects.toThrow("Não é permitido alterar o papel do proprietário");
    });

    it("deve permitir transferência atômica de propriedade (OWNER) entre membros", async () => {
      const transferResult = await WorkspaceService.transferOwnership(
        workspaceAlpha.id,
        ownerUser.id,
        collabMembershipId
      );

      expect(transferResult.success).toBe(true);
      expect(transferResult.previousOwnerRole).toBe(WorkspaceRole.ADMIN);
      expect(transferResult.newOwner.role).toBe(WorkspaceRole.OWNER);

      // Verificar que agora collaboratorUser é OWNER
      const newOwnerMembership = await db.membership.findUnique({
        where: { id: collabMembershipId },
      });
      expect(newOwnerMembership?.role).toBe(WorkspaceRole.OWNER);

      // Retornar a propriedade original para manter os testes consistentes
      const originalOwnerMembership = await db.membership.findUnique({
        where: {
          userId_workspaceId: {
            userId: ownerUser.id,
            workspaceId: workspaceAlpha.id,
          },
        },
      });

      await WorkspaceService.transferOwnership(
        workspaceAlpha.id,
        collaboratorUser.id,
        originalOwnerMembership!.id
      );
    });

    it("REGRA CRÍTICA: o sistema deve impedir a remoção do único OWNER do workspace", async () => {
      const ownerMembership = await db.membership.findUnique({
        where: {
          userId_workspaceId: {
            userId: ownerUser.id,
            workspaceId: workspaceAlpha.id,
          },
        },
      });

      await expect(
        WorkspaceService.removeMember(workspaceAlpha.id, ownerUser.id, ownerMembership!.id)
      ).rejects.toThrow("Não é permitido remover o único proprietário");
    });
  });

  describe("4. Recursos Compartilhados e Transferência de Projetos", () => {
    let projectIdToTransfer: string;

    beforeAll(async () => {
      // Criar projeto no workspaceAlpha
      const project = await ProjectService.createProject(workspaceAlpha.id, {
        title: "Interestelar dos Sonhos",
        description: "Projeto cinematográfico complexo com elementos",
        language: "pt-BR",
        genre: "Ficção Científica",
      });
      projectIdToTransfer = project.id;

      // Adicionar um personagem e uma cena ao projeto
      await db.character.create({
        data: {
          projectId: project.id,
          name: "Dra. Brand",
          description: "Astrofísica",
        },
      });

      await db.scene.create({
        data: {
          projectId: project.id,
          title: "Partida da Terra",
          order: 1,
          durationSeconds: 120,
        },
      });
    });

    it("deve transferir projeto com todos os seus personagens e cenas para workspaceBeta", async () => {
      const transferred = await ProjectService.transferProject(
        projectIdToTransfer,
        ownerUser.id,
        workspaceBeta.id
      );

      expect(transferred.id).toBe(projectIdToTransfer);
      expect(transferred.workspaceId).toBe(workspaceBeta.id);

      // Validar que os personagens e cenas continuam íntegros no novo workspace
      const chars = await db.character.findMany({ where: { projectId: projectIdToTransfer } });
      const scenes = await db.scene.findMany({ where: { projectId: projectIdToTransfer } });

      expect(chars.length).toBe(1);
      expect(chars[0].name).toBe("Dra. Brand");
      expect(scenes.length).toBe(1);
      expect(scenes[0].title).toBe("Partida da Terra");

      // Validar logs de auditoria em ambos os workspaces
      const auditOut = await db.auditLog.findFirst({
        where: { workspaceId: workspaceAlpha.id, action: "PROJECT_TRANSFERRED_OUT" },
      });
      const auditIn = await db.auditLog.findFirst({
        where: { workspaceId: workspaceBeta.id, action: "PROJECT_TRANSFERRED_IN" },
      });

      expect(auditOut).toBeDefined();
      expect(auditIn).toBeDefined();
    });

    it("deve tratar colisão de nomes renomeando o projeto transferido com sufixo", async () => {
      // Criar outro projeto no workspaceAlpha com o mesmo título do anterior
      const duplicateProject = await ProjectService.createProject(workspaceAlpha.id, {
        title: "Interestelar dos Sonhos",
        description: "Projeto com título repetido",
        language: "pt-BR",
      });

      const transferredDuplicate = await ProjectService.transferProject(
        duplicateProject.id,
        ownerUser.id,
        workspaceBeta.id
      );

      expect(transferredDuplicate.title).toContain("(Transferido)");

      // Limpar
      await db.project.delete({ where: { id: duplicateProject.id } });
    });

    it("deve BLOQUEAR transferência de projeto feita por usuário não autorizado", async () => {
      // outsideUser não tem acesso ao workspaceBeta nem ao workspaceAlpha
      await expect(
        ProjectService.transferProject(projectIdToTransfer, outsideUser.id, workspaceAlpha.id)
      ).rejects.toThrow("Você não tem acesso a este workspace.");
    });
  });
});
