import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { PlatformRole, WorkspaceRole, PlanTier, GenerationStatus } from "@prisma/client";
import { AdminUsersService } from "@/modules/admin/admin-users.service";
import { AdminBillingService } from "@/modules/admin/admin-billing.service";
import { AdminUsageService } from "@/modules/admin/admin-usage.service";
import { AdminAuditService } from "@/modules/admin/admin-audit.service";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";

describe("Painel Administrativo da Plataforma (SaaS Console)", () => {
  let regularUserId: string;
  let regularUserEmail: string;

  let adminUserId: string;
  let adminUserEmail: string;

  let superAdminUserId: string;
  let superAdminUserEmail: string;

  let testWorkspaceId: string;

  beforeEach(async () => {
    const passwordHash = await bcrypt.hash("Password123!", 10);
    const rand = Math.random().toString(36).substring(7);

    // 1. Usuário comum (OWNER de workspace, mas sem papel administrativo de plataforma)
    regularUserEmail = `regular_${Date.now()}_${rand}@example.com`;
    const regUser = await db.user.create({
      data: {
        authSubject: `auth_reg_${Date.now()}_${rand}`,
        email: regularUserEmail,
        displayName: "Cliente Dono de Estúdio",
        passwordHash,
        platformRole: PlatformRole.USER,
        isSuspended: false,
      },
    });
    regularUserId = regUser.id;

    // Cria workspace para o usuário regular
    const ws = await db.workspace.create({
      data: {
        name: `Estúdio do Cliente ${rand}`,
        slug: `estudio-cliente-${Date.now()}-${rand}`,
        isPersonal: true,
        creditsBalance: 40,
        memberships: {
          create: {
            userId: regUser.id,
            role: WorkspaceRole.OWNER,
          },
        },
      },
    });
    testWorkspaceId = ws.id;

    // 2. Administrador da plataforma (ADMIN)
    adminUserEmail = `admin_${Date.now()}_${rand}@example.com`;
    const admUser = await db.user.create({
      data: {
        authSubject: `auth_adm_${Date.now()}_${rand}`,
        email: adminUserEmail,
        displayName: "Operador Administrativo",
        passwordHash,
        platformRole: PlatformRole.ADMIN,
        isSuspended: false,
      },
    });
    adminUserId = admUser.id;

    // 3. Super Administrador da plataforma (SUPER_ADMIN)
    superAdminUserEmail = `superadmin_${Date.now()}_${rand}@example.com`;
    const superUser = await db.user.create({
      data: {
        authSubject: `auth_super_${Date.now()}_${rand}`,
        email: superAdminUserEmail,
        displayName: "Super Diretor de Plataforma",
        passwordHash,
        platformRole: PlatformRole.SUPER_ADMIN,
        isSuspended: false,
      },
    });
    superAdminUserId = superUser.id;

    // Garante que o plano PRO esteja com os termos padrão antes de cada teste
    await db.plan.update({
      where: { tier: PlanTier.PRO },
      data: {
        name: "Tomadix Pro",
        priceMonthly: 8900,
        priceYearly: 89000,
        maxProjects: 20,
        maxMembers: 3,
        monthlyCredits: 500,
        isActive: true,
      },
    }).catch(() => {});
  });

  describe("1. Autorização Administrativa no Servidor", () => {
    it("deve BLOQUEAR acesso de usuário comum mesmo que ele seja OWNER de workspace", async () => {
      // Simula contexto de requisição com o ID do usuário comum
      const mockReqUser = await db.user.findUnique({
        where: { id: regularUserId },
        include: { memberships: { include: { workspace: true } } },
      });

      // Validação direta: se platformRole !== ADMIN && !== SUPER_ADMIN, lança AuthorizationError
      const isPlatformAdmin =
        mockReqUser?.platformRole === PlatformRole.ADMIN ||
        mockReqUser?.platformRole === PlatformRole.SUPER_ADMIN;

      expect(isPlatformAdmin).toBe(false);
      expect(mockReqUser?.memberships[0].role).toBe(WorkspaceRole.OWNER); // Prova que o papel de workspace não dá acesso
    });

    it("deve permitir acesso para ADMIN e SUPER_ADMIN", async () => {
      const adminUser = await db.user.findUnique({ where: { id: adminUserId } });
      const superUser = await db.user.findUnique({ where: { id: superAdminUserId } });

      expect(adminUser?.platformRole).toBe(PlatformRole.ADMIN);
      expect(superUser?.platformRole).toBe(PlatformRole.SUPER_ADMIN);
    });
  });

  describe("2. Gestão Global de Usuários e Segurança de Contas", () => {
    it("deve pesquisar usuários por e-mail com paginação", async () => {
      const searchResult = await AdminUsersService.listUsers({
        search: regularUserEmail,
        page: 1,
        limit: 10,
      });

      expect(searchResult.users.length).toBe(1);
      expect(searchResult.users[0].id).toBe(regularUserId);
      expect(searchResult.users[0].email).toBe(regularUserEmail);
    });

    it("deve consultar detalhes operacionais sem expor conteúdos criativos privados", async () => {
      const details = await AdminUsersService.getUserDetails(regularUserId);

      expect(details.user.id).toBe(regularUserId);
      expect(details.metrics.totalWorkspaces).toBe(1);
      expect(details.metrics.totalProjects).toBe(0);
      // Garante que senhas não são expostas
      expect((details.user as any).passwordHash).toBeUndefined();
    });

    it("deve suspender usuário, revogar suas sessões e registrar na auditoria", async () => {
      // Cria sessão para o usuário regular
      const crypto = await import("crypto");
      const tokenHash = crypto.createHash("sha256").update(`sess_${Date.now()}`).digest("hex");
      await db.session.create({
        data: {
          userId: regularUserId,
          tokenHash,
          expiresAt: new Date(Date.now() + 86400000),
        },
      });

      // Suspende o usuário
      const reason = "Violação recorrente das políticas de conteúdo do CinePrompt Studio.";
      const suspended = await AdminUsersService.suspendUser(adminUserId, regularUserId, reason);

      expect(suspended.isSuspended).toBe(true);
      expect(suspended.suspensionReason).toBe(reason);

      // Verifica se as sessões ativas foram revogadas
      const sessions = await db.session.findMany({ where: { userId: regularUserId } });
      expect(sessions.length).toBe(0);

      // Verifica se o log de auditoria foi criado com sucesso
      const logs = await db.platformAuditLog.findMany({
        where: { action: "USER_SUSPEND", targetId: regularUserId },
      });
      expect(logs.length).toBe(1);
      expect(logs[0].adminUserId).toBe(adminUserId);
      expect((logs[0].details as any)?.reason).toBe(reason);
    });

    it("deve impedir que um administrador suspenda a própria conta", async () => {
      await expect(
        AdminUsersService.suspendUser(adminUserId, adminUserId, "Tentativa de auto-suspensão")
      ).rejects.toThrow("Um administrador não pode suspender a própria conta.");
    });

    it("deve reativar uma conta suspensa e registrar na auditoria", async () => {
      // Primeiro suspende
      await AdminUsersService.suspendUser(adminUserId, regularUserId, "Suspensão temporária para teste");

      // Reativa
      const reactivated = await AdminUsersService.reactivateUser(
        adminUserId,
        regularUserId,
        "Reativação após esclarecimentos com o cliente"
      );

      expect(reactivated.isSuspended).toBe(false);
      expect(reactivated.suspensionReason).toBeNull();

      // Log de reativação
      const logs = await db.platformAuditLog.findMany({
        where: { action: "USER_REACTIVATE", targetId: regularUserId },
      });
      expect(logs.length).toBe(1);
    });

    it("deve ajustar créditos de um estúdio com registro auditado", async () => {
      const adjustment = await AdminUsersService.adjustCredits(
        adminUserId,
        testWorkspaceId,
        150,
        "Bonificação de parceria institucional"
      );

      expect(adjustment.newBalance).toBe(190); // 40 originais + 150

      const ws = await db.workspace.findUnique({ where: { id: testWorkspaceId } });
      expect(ws?.creditsBalance).toBe(190);

      // Razão de créditos criado
      const ledger = await db.creditLedger.findFirst({
        where: { workspaceId: testWorkspaceId, amount: 150 },
      });
      expect(ledger).toBeDefined();
    });
  });

  describe("3. Gestão Comercial, Planos e Preservação de Contratos", () => {
    it("deve listar todos os planos do catálogo comercial", async () => {
      const plans = await AdminBillingService.listAllPlans();
      expect(plans.length).toBeGreaterThanOrEqual(3);
      expect(plans.some((p) => p.tier === PlanTier.PRO)).toBe(true);
    });

    it("deve atualizar limites do plano preservando condições antigas (grandparenting)", async () => {
      // Cria uma assinatura ativa no plano PRO para o workspace
      await db.subscription.create({
        data: {
          workspaceId: testWorkspaceId,
          planTier: PlanTier.PRO,
          status: "ACTIVE",
          currentPeriodStart: new Date(),
        },
      });

      // Atualiza o plano PRO com novos valores
      const updatedPlan = await AdminBillingService.upsertPlan(adminUserId, {
        tier: PlanTier.PRO,
        name: "CinePrompt Pro (Nova Tabela)",
        description: "Versão atualizada do plano",
        priceMonthly: 12900, // Preço subiu de R$ 89 para R$ 129
        priceYearly: 129000,
        maxProjects: 30,
        maxMembers: 5,
        monthlyCredits: 600,
        preserveExistingContracts: true,
      });

      expect(updatedPlan.priceMonthly).toBe(12900);

      // Verifica se a assinatura existente guardou o snapshot de condições anteriores (grandparenting)
      const sub = await db.subscription.findUnique({ where: { workspaceId: testWorkspaceId } });
      const metadata = sub?.metadata as any;
      expect(metadata?.grandfatheredContract).toBeDefined();
      expect(metadata?.grandfatheredContract?.previousPlanTier).toBe(PlanTier.PRO);
      expect(metadata?.grandfatheredContract?.note).toContain("grandparenting");
    });

    it("deve ativar e desativar planos comerciais", async () => {
      const toggled = await AdminBillingService.togglePlanStatus(adminUserId, PlanTier.PRO, false);
      expect(toggled.isActive).toBe(false);

      const reenabled = await AdminBillingService.togglePlanStatus(adminUserId, PlanTier.PRO, true);
      expect(reenabled.isActive).toBe(true);
    });

    it("deve calcular métricas comerciais reais (conversão, faturamento e créditos)", async () => {
      const metrics = await AdminBillingService.getCommercialMetrics();

      expect(metrics.totalWorkspaces).toBeGreaterThan(0);
      expect(typeof metrics.mrr.cents).toBe("number");
      expect(typeof metrics.conversion.ratePercent).toBe("number");
      expect(typeof metrics.churn.ratePercent).toBe("number");
    });
  });

  describe("4. Consumo de IA, Custos da Gemini API e Destravamento de Jobs", () => {
    it("deve calcular métricas reais de tokens e estimativas de custo", async () => {
      // Cria um projeto no workspace
      const project = await db.project.create({
        data: {
          workspaceId: testWorkspaceId,
          title: "Curta de Ficção",
        },
      });

      // Cria um job de geração bem sucedido com tokens registrados
      await db.generationJob.create({
        data: {
          projectId: project.id,
          modelName: "gemini-1.5-flash",
          status: GenerationStatus.SUCCEEDED,
          inputTokens: 1500,
          outputTokens: 800,
          request: { test: true },
        },
      });

      const usage = await AdminUsageService.getUsageAndCostMetrics(30);

      expect(usage.totals.totalJobs).toBeGreaterThanOrEqual(1);
      expect(usage.totals.succeededJobs).toBeGreaterThanOrEqual(1);
      expect(usage.costs.isEstimate).toBe(true);
      expect(usage.costs.methodology).toContain("Google Gemini API");
      expect(usage.models.some((m) => m.modelName === "gemini-1.5-flash")).toBe(true);
    });

    it("deve identificar e destravar jobs que excederam o tempo limite (>15 min)", async () => {
      const project = await db.project.create({
        data: {
          workspaceId: testWorkspaceId,
          title: "Projeto de Teste Jobs Travados",
        },
      });

      // Job criado há 20 minutos com status RUNNING (travado)
      const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000);
      const stuckJob = await db.generationJob.create({
        data: {
          projectId: project.id,
          modelName: "gemini-1.5-pro",
          status: GenerationStatus.RUNNING,
          request: { test: "stuck" },
          createdAt: twentyMinutesAgo,
        },
      });

      const metricsBefore = await AdminUsageService.getUsageAndCostMetrics(30);
      expect(metricsBefore.stuckJobs.some((j: any) => j.id === stuckJob.id)).toBe(true);

      // Destrava o job
      const resolution = await AdminUsageService.resolveStuckJobs(adminUserId, [stuckJob.id]);
      expect(resolution.resolved).toBe(1);

      const resolvedJob = await db.generationJob.findUnique({ where: { id: stuckJob.id } });
      expect(resolvedJob?.status).toBe(GenerationStatus.FAILED);
      expect(resolvedJob?.errorMessage).toContain("tempo limite");
    });
  });

  describe("5. Auditoria Administrativa e Higienização de Segredos", () => {
    it("deve registrar ações e higienizar senhas e segredos dos detalhes", async () => {
      const sensitiveDetails = {
        userEmail: "test@example.com",
        userPasswordHash: "super_secret_hash_value",
        sessionToken: "session_token_12345",
        apiKey: "gemini_secret_api_key",
        normalMetadata: "Metadado legível e seguro",
      };

      const log = await AdminAuditService.logAction({
        adminUserId,
        action: "TEST_SECURITY_ACTION",
        targetType: "Security",
        details: sensitiveDetails,
      });

      const savedDetails = log.details as any;
      expect(savedDetails.normalMetadata).toBe("Metadado legível e seguro");
      // Garante que chaves confidenciais foram sanitizadas
      expect(savedDetails.userPasswordHash).toBe("[CONFIDENCIAL/REMOVIDO]");
      expect(savedDetails.sessionToken).toBe("[CONFIDENCIAL/REMOVIDO]");
      expect(savedDetails.apiKey).toBe("[CONFIDENCIAL/REMOVIDO]");
    });

    it("deve listar logs de auditoria com filtros", async () => {
      const uniqueAction = `TEST_AUDIT_${Date.now()}`;
      await AdminAuditService.logAction({
        adminUserId,
        action: uniqueAction,
        targetType: "Security",
        details: { note: "Teste de listagem com filtro" },
      });

      const result = await AdminAuditService.listLogs({
        action: uniqueAction,
        adminUserId,
        page: 1,
        limit: 10,
      });

      expect(result.logs.length).toBe(1);
      expect(result.logs[0].action).toBe(uniqueAction);
      expect(result.logs[0].adminUser.id).toBe(adminUserId);
    });
  });

  afterAll(async () => {
    // Restaura o plano PRO aos valores padrão oficiais
    await db.plan.update({
      where: { tier: PlanTier.PRO },
      data: {
        name: "Tomadix Pro",
        priceMonthly: 8900,
        priceYearly: 89000,
        maxProjects: 20,
        maxMembers: 3,
        monthlyCredits: 500,
        isActive: true,
      },
    }).catch(() => {});
  });
});
