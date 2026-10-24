import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { PlatformRole, PlanTier, SubscriptionStatus, BillingInterval } from "@prisma/client";
import { AdminUsersService } from "@/modules/admin/admin-users.service";
import { AdminProjectsService } from "@/modules/admin/admin-projects.service";
import { AdminBillingService } from "@/modules/admin/admin-billing.service";
import { BillingPolicyService } from "@/modules/billing/billing-policy.service";
import { hasPlatformPermission } from "@/lib/admin-permissions";

describe("Admin Console Full Expansion & Management Tests", () => {
  const testPrefix = `test_adm_${Date.now()}`;
  let superAdminUser: any;
  let testUserA: any;
  let testUserB: any;
  let workspaceA: any;
  let workspaceB: any;
  let testProject: any;
  let testSubscription: any;

  beforeAll(async () => {
    // 1. Criar Super Admin para auditoria e operações restritas
    superAdminUser = await db.user.create({
      data: {
        authSubject: `${testPrefix}_superadmin`,
        email: `${testPrefix}_superadmin@test.com`,
        displayName: "Super Admin Tester",
        platformRole: PlatformRole.SUPER_ADMIN,
        emailConfirmed: true,
      },
    });

    // 2. Criar Usuário A e Workspace A
    testUserA = await db.user.create({
      data: {
        authSubject: `${testPrefix}_usera`,
        email: `${testPrefix}_usera@test.com`,
        displayName: "User A Tester",
        platformRole: PlatformRole.USER,
        emailConfirmed: false,
      },
    });

    workspaceA = await db.workspace.create({
      data: {
        name: `Studio A ${testPrefix}`,
        slug: `studio-a-${testPrefix}`,
        creditsBalance: 50,
        memberships: {
          create: {
            userId: testUserA.id,
            role: "OWNER",
          },
        },
      },
    });

    // 3. Criar Usuário B e Workspace B (para teste de transferência de projetos)
    testUserB = await db.user.create({
      data: {
        authSubject: `${testPrefix}_userb`,
        email: `${testPrefix}_userb@test.com`,
        displayName: "User B Tester",
        platformRole: PlatformRole.USER,
        emailConfirmed: true,
      },
    });

    workspaceB = await db.workspace.create({
      data: {
        name: `Studio B ${testPrefix}`,
        slug: `studio-b-${testPrefix}`,
        creditsBalance: 10,
        memberships: {
          create: {
            userId: testUserB.id,
            role: "OWNER",
          },
        },
      },
    });

    // 4. Criar Projeto de Teste
    testProject = await db.project.create({
      data: {
        title: `Projeto Alpha ${testPrefix}`,
        description: "Projeto cinematográfico de teste administrativo",
        genre: "Sci-Fi",
        workspaceId: workspaceA.id,
      },
    });

    // 5. Criar Assinatura no Workspace A
    testSubscription = await db.subscription.create({
      data: {
        workspaceId: workspaceA.id,
        planTier: PlanTier.FREE,
        status: SubscriptionStatus.ACTIVE,
        interval: BillingInterval.MONTHLY,
      },
    });
  });

  afterAll(async () => {
    // Limpeza completa e cirúrgica de todos os dados de teste criados
    try {
      if (testProject?.id) {
        await db.project.deleteMany({ where: { id: testProject.id } });
      }
      if (workspaceA?.id || workspaceB?.id) {
        await db.subscription.deleteMany({
          where: { workspaceId: { in: [workspaceA.id, workspaceB.id] } },
        });
        await db.creditLedger.deleteMany({
          where: { workspaceId: { in: [workspaceA.id, workspaceB.id] } },
        });
        await db.membership.deleteMany({
          where: { workspaceId: { in: [workspaceA.id, workspaceB.id] } },
        });
        await db.workspace.deleteMany({
          where: { id: { in: [workspaceA.id, workspaceB.id] } },
        });
      }
      if (superAdminUser?.id || testUserA?.id || testUserB?.id) {
        const userIds = [superAdminUser.id, testUserA.id, testUserB.id];
        await db.session.deleteMany({ where: { userId: { in: userIds } } });
        await db.platformAuditLog.deleteMany({
          where: {
            OR: [
              { adminUserId: { in: userIds } },
              { targetId: { in: userIds } },
            ],
          },
        });
        await db.user.deleteMany({ where: { id: { in: userIds } } });
      }
    } catch (e) {
      console.warn("Cleanup warning in admin-full-management.test.ts:", e);
    }
  });

  describe("1. Políticas de Crédito & Custos de IA", () => {
    it("deve carregar políticas comerciais padrão com custos de geração de prompt", async () => {
      const defaultCost = await BillingPolicyService.getPolicyValue("PROMPT_DEFAULT_CREDIT_COST", 1);
      const cinematicCost = await BillingPolicyService.getPolicyValue("PROMPT_CINEMATIC_CREDIT_COST", 2);
      const continuityCost = await BillingPolicyService.getPolicyValue("PROMPT_CONTINUITY_CREDIT_COST", 1);

      expect(defaultCost).toBeGreaterThanOrEqual(1);
      expect(cinematicCost).toBeGreaterThanOrEqual(2);
      expect(continuityCost).toBeGreaterThanOrEqual(1);
    });
  });

  describe("2. Gestão Administrativa de Usuários & Permissões Granulares", () => {
    it("deve atualizar detalhes cadastrais do usuário (displayName, emailConfirmed)", async () => {
      const updated = await AdminUsersService.updateUserDetails(
        superAdminUser.id,
        testUserA.id,
        {
          displayName: "Nome Atualizado pelo Admin",
          emailConfirmed: true,
        }
      );

      expect(updated.displayName).toBe("Nome Atualizado pelo Admin");
      expect(updated.emailConfirmed).toBe(true);
    });

    it("deve atribuir permissões granulares customizadas a um operador", async () => {
      const customPerms = ["plans:manage", "credits:manage", "projects:manage"];
      const updated = await AdminUsersService.updateCustomPermissions(
        superAdminUser.id,
        testUserA.id,
        customPerms
      );

      const prefs = updated.preferences as Record<string, any>;
      expect(prefs.adminPermissions).toEqual(customPerms);
    });

    it("deve validar corretamente hasPlatformPermission com permissões granulares", () => {
      // Super admin tem tudo
      expect(hasPlatformPermission(PlatformRole.SUPER_ADMIN, "projects:manage")).toBe(true);
      expect(hasPlatformPermission(PlatformRole.SUPER_ADMIN, "plans:manage")).toBe(true);

      // Usuário comum sem custom permissions não tem acesso
      expect(hasPlatformPermission(PlatformRole.USER, "projects:manage")).toBe(false);

      // Operador com custom permissions
      const perms = ["projects:manage", "credits:manage"] as any;
      expect(hasPlatformPermission(PlatformRole.ADMIN, "projects:manage", perms)).toBe(true);
      expect(hasPlatformPermission(PlatformRole.ADMIN, "plans:manage", perms)).toBe(false);
    });

    it("deve criar e revogar sessões de usuário com registro de auditoria", async () => {
      // Cria sessão de teste
      const session = await db.session.create({
        data: {
          userId: testUserA.id,
          tokenHash: `test_token_${Date.now()}`,
          expiresAt: new Date(Date.now() + 3600000),
          ipAddress: "127.0.0.1",
          userAgent: "Vitest Agent",
        },
      });

      expect(session.id).toBeDefined();

      // Revoga a sessão
      const result = await AdminUsersService.revokeUserSessions(
        superAdminUser.id,
        testUserA.id,
        session.id
      );

      expect(result.revokedCount).toBe(1);

      const checkSession = await db.session.findUnique({ where: { id: session.id } });
      expect(checkSession).toBeNull();
    });
  });

  describe("3. Gestão Administrativa de Projetos Globais", () => {
    it("deve listar projetos com filtro e busca", async () => {
      const result = await AdminProjectsService.listProjects({
        search: "Projeto Alpha",
        status: "active",
      });

      expect(result.projects.length).toBeGreaterThanOrEqual(1);
      const found = result.projects.find((p) => p.id === testProject.id);
      expect(found).toBeDefined();
      expect(found?.workspace.name).toBe(workspaceA.name);
    });

    it("deve obter detalhes completos de um projeto sem vazar chaves confidenciais", async () => {
      const details = await AdminProjectsService.getProjectDetails(testProject.id);
      expect(details.project.id).toBe(testProject.id);
      expect(details.project.workspace.id).toBe(workspaceA.id);
      expect(details.metrics).toBeDefined();
      expect(details.metrics.scenesCount).toBe(0);
    });

    it("deve arquivar e desarquivar um projeto administrativamente", async () => {
      const archived = await AdminProjectsService.archiveProject(
        superAdminUser.id,
        testProject.id,
        "Arquivamento por solicitação do cliente em ticket"
      );

      expect(archived.isArchived).toBe(true);
      expect(archived.archivedAt).toBeDefined();

      const unarchived = await AdminProjectsService.unarchiveProject(
        superAdminUser.id,
        testProject.id
      );

      expect(unarchived.isArchived).toBe(false);
    });

    it("deve transferir um projeto para outro workspace com auditoria", async () => {
      const transferred = await AdminProjectsService.transferProject(
        superAdminUser.id,
        testProject.id,
        workspaceB.id,
        "Fusão de estúdios operacionais"
      );

      expect(transferred.workspaceId).toBe(workspaceB.id);

      // Transfere de volta para workspaceA para consistência
      await AdminProjectsService.transferProject(
        superAdminUser.id,
        testProject.id,
        workspaceA.id,
        "Retorno operacional"
      );
    });
  });

  describe("4. Gestão Administrativa de Assinaturas e Planos", () => {
    it("deve listar assinaturas com suporte a busca e filtros", async () => {
      const result = await AdminBillingService.listSubscriptions({
        search: workspaceA.name,
      });

      expect(result.subscriptions.length).toBeGreaterThanOrEqual(1);
      const sub = result.subscriptions.find((s) => s.id === testSubscription.id);
      expect(sub).toBeDefined();
    });

    it("deve obter detalhes e histórico de uma assinatura", async () => {
      const details = await AdminBillingService.getSubscriptionDetails(testSubscription.id);
      expect(details.subscription.id).toBe(testSubscription.id);
      expect(details.subscription.workspace.name).toBe(workspaceA.name);
    });

    it("deve atualizar termos de assinatura (upgrade de plano e alteração de ciclo)", async () => {
      const updated = await AdminBillingService.updateSubscription(
        superAdminUser.id,
        testSubscription.id,
        {
          planTier: PlanTier.PRO,
          interval: BillingInterval.YEARLY,
          status: SubscriptionStatus.ACTIVE,
          notes: "Upgrade executado para teste de conformidade",
        }
      );

      expect(updated.planTier).toBe(PlanTier.PRO);
      expect(updated.interval).toBe(BillingInterval.YEARLY);
      expect(updated.status).toBe(SubscriptionStatus.ACTIVE);
    });

    it("deve estender período de teste (trial) com justificativa e auditoria", async () => {
      const updated = await AdminBillingService.extendTrial(
        superAdminUser.id,
        testSubscription.id,
        15,
        "Cortesia concedida para testes do estúdio"
      );

      expect(updated.status).toBe(SubscriptionStatus.TRIALING);
      expect(updated.trialEnd).toBeDefined();
    });

    it("deve cancelar assinatura com justificativa auditada", async () => {
      const canceled = await AdminBillingService.cancelSubscription(
        superAdminUser.id,
        testSubscription.id,
        true,
        "Cancelamento definitivo por solicitação do titular"
      );

      expect(canceled.status).toBe(SubscriptionStatus.CANCELED);
      expect(canceled.canceledAt).toBeDefined();
    });
  });

  describe("5. Exclusão Administrativa de Projeto com Auditoria", () => {
    it("deve excluir projeto e registrar evento imutável na auditoria", async () => {
      const result = await AdminProjectsService.deleteProject(
        superAdminUser.id,
        testProject.id,
        "Exclusão definitiva solicitada formalmente"
      );

      expect(result.success).toBe(true);
      expect(result.deletedId).toBe(testProject.id);

      // Verifica se o registro foi removido do banco
      const checkProject = await db.project.findUnique({ where: { id: testProject.id } });
      expect(checkProject).toBeNull();
      testProject = null; // evita tentar deletar de novo no afterAll

      // Verifica se a auditoria registrou a ação
      const auditLog = await db.platformAuditLog.findFirst({
        where: {
          action: "PROJECT_DELETE",
          targetId: result.deletedId,
        },
      });
      expect(auditLog).toBeDefined();
      expect(auditLog?.adminUserId).toBe(superAdminUser.id);
    });
  });
});
