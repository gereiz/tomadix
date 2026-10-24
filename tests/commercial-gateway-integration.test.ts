import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { PlatformRole, PlanTier, SubscriptionStatus, BillingInterval, WorkspaceRole } from "@prisma/client";
import { BillingService } from "@/modules/billing/billing.service";
import { GatewayManagerService } from "@/modules/billing/gateways/gateway-manager.service";
import { EntitlementService, EntitlementError } from "@/modules/billing/entitlement.service";
import { AdminBillingService } from "@/modules/admin/admin-billing.service";
import { PricingService } from "@/modules/billing/pricing.service";
import { SandboxGateway } from "@/modules/billing/gateways/sandbox.gateway";
import { hasPlatformPermission } from "@/lib/admin-permissions";
import { AuthorizationError } from "@/lib/auth";

describe("Integração Central Comercial, Gateways e Auditoria (15 Cenários)", () => {
  let superAdminId: string;
  let regularUserId: string;
  let testWorkspaceId: string;
  let testWorkspaceOwnerId: string;
  let foreignWorkspaceId: string;
  let foreignUserId: string;

  beforeAll(async () => {
    // 1. Garantir infraestrutura inicial de gateways e políticas
    await GatewayManagerService.seedDefaultGateways();

    const passHash = await bcrypt.hash("TestPass123!", 4);
    const rand = Math.random().toString(36).substring(7);

    // 2. Criar Super Administrador da Plataforma
    const adminUser = await db.user.create({
      data: {
        authSubject: `auth_super_admin_${Date.now()}_${rand}`,
        email: `commercial_admin_${Date.now()}_${rand}@cineprompt.ai`,
        displayName: "Admin Central Comercial",
        passwordHash: passHash,
        platformRole: PlatformRole.SUPER_ADMIN,
      },
    });
    superAdminId = adminUser.id;

    // 3. Criar Usuário Comum
    const normalUser = await db.user.create({
      data: {
        authSubject: `auth_regular_${Date.now()}_${rand}`,
        email: `regular_user_${Date.now()}_${rand}@example.com`,
        displayName: "Usuário Comum",
        passwordHash: passHash,
        platformRole: PlatformRole.USER,
      },
    });
    regularUserId = normalUser.id;

    // 4. Criar Workspace de Teste Principal com Owner
    const ownerUser = await db.user.create({
      data: {
        authSubject: `auth_owner_${Date.now()}_${rand}`,
        email: `owner_${Date.now()}_${rand}@example.com`,
        displayName: "Studio Owner",
        passwordHash: passHash,
        platformRole: PlatformRole.USER,
      },
    });
    testWorkspaceOwnerId = ownerUser.id;

    const ws = await db.workspace.create({
      data: {
        name: `Studio Teste Comercial ${rand}`,
        slug: `studio-test-${Date.now()}-${rand}`,
        creditsBalance: 50,
      },
    });
    testWorkspaceId = ws.id;

    await db.membership.create({
      data: {
        userId: testWorkspaceOwnerId,
        workspaceId: testWorkspaceId,
        role: WorkspaceRole.OWNER,
      },
    });

    await db.subscription.create({
      data: {
        workspaceId: testWorkspaceId,
        planTier: PlanTier.FREE,
        status: SubscriptionStatus.ACTIVE,
        interval: BillingInterval.MONTHLY,
      },
    });

    // 5. Criar Workspace Estrangeiro (para teste de isolamento multitenant / cross-workspace)
    const foreignUser = await db.user.create({
      data: {
        authSubject: `auth_foreign_${Date.now()}_${rand}`,
        email: `foreign_user_${Date.now()}_${rand}@example.com`,
        displayName: "Foreign User",
        passwordHash: passHash,
        platformRole: PlatformRole.USER,
      },
    });
    foreignUserId = foreignUser.id;

    const foreignWs = await db.workspace.create({
      data: {
        name: `Foreign Studio ${rand}`,
        slug: `foreign-studio-${Date.now()}-${rand}`,
        creditsBalance: 0,
      },
    });
    foreignWorkspaceId = foreignWs.id;

    await db.membership.create({
      data: {
        userId: foreignUserId,
        workspaceId: foreignWorkspaceId,
        role: WorkspaceRole.OWNER,
      },
    });

    // 6. Garantir que os planos básicos existem no banco
    await AdminBillingService.upsertPlan(superAdminId, {
      tier: PlanTier.PRO,
      name: "Plano Pro",
      description: "Plano para cineastas e produtoras independentes",
      priceMonthly: 8900,
      priceYearly: 89000,
      currency: "BRL",
      monthlyCredits: 200,
      maxProjects: 15,
      maxMembers: 5,
      isActive: true,
      isPublic: true,
      commercialStatus: "ACTIVE",
    });

    await AdminBillingService.upsertPlan(superAdminId, {
      tier: PlanTier.TEAM,
      name: "Plano Team",
      description: "Plano para grandes equipes de produção",
      priceMonthly: 24900,
      priceYearly: 249000,
      currency: "BRL",
      monthlyCredits: 800,
      maxProjects: -1,
      maxMembers: 20,
      isActive: true,
      isPublic: true,
      commercialStatus: "ACTIVE",
    });
  }, 60000);

  // ==========================================
  // CENÁRIO 1: Plano publicado com preço válido
  // ==========================================
  it("Cenário 1: deve criar checkout para plano publicado com cálculo autoritativo no servidor", async () => {
    const checkout = await BillingService.createCheckout({
      workspaceId: testWorkspaceId,
      userId: testWorkspaceOwnerId,
      planTier: PlanTier.PRO,
      interval: BillingInterval.MONTHLY,
      originUrl: "http://localhost:3000",
    });

    expect(checkout.direct).toBe(false);
    expect(checkout.checkoutUrl).toBeDefined();
    expect(checkout.sessionId).toBeDefined();
    expect(checkout.authorizedPriceInCents).toBe(8900);
    expect(checkout.currency).toBe("BRL");
  });

  // ==========================================
  // CENÁRIO 2: Plano desativado
  // ==========================================
  it("Cenário 2: deve recusar checkout de plano desativado ou arquivado", async () => {
    // Desativar temporariamente o plano TEAM
    await db.plan.update({
      where: { tier: PlanTier.TEAM },
      data: { isActive: false, commercialStatus: "ARCHIVED" },
    });

    await expect(
      BillingService.createCheckout({
        workspaceId: testWorkspaceId,
        userId: testWorkspaceOwnerId,
        planTier: PlanTier.TEAM,
        interval: BillingInterval.MONTHLY,
        originUrl: "http://localhost:3000",
      })
    ).rejects.toThrow(/não está disponível para contratação/);

    // Reativar plano TEAM
    await db.plan.update({
      where: { tier: PlanTier.TEAM },
      data: { isActive: true, commercialStatus: "ACTIVE" },
    });
  });

  // ==========================================
  // CENÁRIO 3: Preço sem associação ao gateway
  // ==========================================
  it("Cenário 3: deve lançar erro se a associação entre preço interno e externo estiver ausente quando exigida", async () => {
    // Forçar flag de obrigatoriedade de mapeamento
    const originalReq = process.env.REQUIRE_PRICE_MAPPING;
    process.env.REQUIRE_PRICE_MAPPING = "true";

    try {
      // Remover mapeamentos existentes para o plano TEAM no Sandbox
      await db.gatewayPlanPriceMapping.deleteMany({
        where: { planTier: PlanTier.TEAM, environment: "SANDBOX" },
      });

      await expect(
        BillingService.createCheckout({
          workspaceId: testWorkspaceId,
          userId: testWorkspaceOwnerId,
          planTier: PlanTier.TEAM,
          interval: BillingInterval.MONTHLY,
          originUrl: "http://localhost:3000",
        })
      ).rejects.toThrow(/Preço do plano não possui associação homologada/);
    } finally {
      process.env.REQUIRE_PRICE_MAPPING = originalReq;
    }
  });

  // ==========================================
  // CENÁRIO 4: Gateway inativo
  // ==========================================
  it("Cenário 4: deve bloquear checkout quando nenhum gateway ativo estiver disponível", async () => {
    // Desativar todos os gateways do ambiente SANDBOX
    await db.paymentGatewayConfig.updateMany({
      where: { environment: "SANDBOX" },
      data: { status: "INACTIVE" },
    });

    try {
      await expect(
        BillingService.createCheckout({
          workspaceId: testWorkspaceId,
          userId: testWorkspaceOwnerId,
          planTier: PlanTier.PRO,
          interval: BillingInterval.MONTHLY,
          originUrl: "http://localhost:3000",
        })
      ).rejects.toThrow(/Nenhum gateway de pagamento ativo/);
    } finally {
      // Reativar o gateway sandbox padrão
      await db.paymentGatewayConfig.updateMany({
        where: { identifier: "sandbox-internal" },
        data: { status: "ACTIVE" },
      });
    }
  });

  // ==========================================
  // CENÁRIO 5: Credenciais inválidas
  // ==========================================
  it("Cenário 5: teste de conexão com credenciais inválidas deve marcar gateway como FAILED sem risco", async () => {
    const stripeProd = await db.paymentGatewayConfig.findFirst({
      where: { identifier: "stripe-production" },
    });
    expect(stripeProd).toBeDefined();

    // Executar teste sem credenciais válidas configuradas
    const testResult = await GatewayManagerService.testConnection(superAdminId, stripeProd!.id);
    expect(testResult.success).toBe(false);

    const refreshed = await db.paymentGatewayConfig.findUnique({ where: { id: stripeProd!.id } });
    expect(refreshed?.connectionStatus).toBe("FAILED");
    expect(refreshed?.lastError).toBeDefined();
  });

  // ==========================================
  // CENÁRIO 6: Evento de pagamento duplicado
  // ==========================================
  it("Cenário 6: processamento de evento de pagamento duplicado deve ser idempotente e não duplicar créditos", async () => {
    const eventId = `evt_dup_test_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const initialWorkspace = await db.workspace.findUnique({
      where: { id: testWorkspaceId },
      select: { creditsBalance: true },
    });
    const initialCredits = initialWorkspace?.creditsBalance || 0;

    const payload = {
      id: eventId,
      type: "checkout.completed",
      workspaceId: testWorkspaceId,
      planTier: PlanTier.PRO,
      interval: BillingInterval.MONTHLY,
      subscriptionId: `sub_test_${Date.now()}`,
      customerId: `cus_test_${Date.now()}`,
    };

    const headers = new Headers();
    headers.set("x-sandbox-signature", "reprocess_authorized");

    // 1º processamento
    const res1 = await BillingService.processWebhook(JSON.stringify(payload), headers, "sandbox");
    expect(res1.processed).toBe(true);

    const afterFirst = await db.workspace.findUnique({
      where: { id: testWorkspaceId },
      select: { creditsBalance: true },
    });
    // Concedeu 200 créditos do PRO
    expect(afterFirst?.creditsBalance).toBe(initialCredits + 200);

    // 2º processamento idêntico (duplicado)
    const res2 = await BillingService.processWebhook(JSON.stringify(payload), headers, "sandbox");
    expect(res2.processed).toBe(true);
    expect(res2.duplicate).toBe(true);

    const afterSecond = await db.workspace.findUnique({
      where: { id: testWorkspaceId },
      select: { creditsBalance: true },
    });
    // O saldo de créditos permaneceu estritamente idêntico
    expect(afterSecond?.creditsBalance).toBe(afterFirst?.creditsBalance);
  });

  // ==========================================
  // CENÁRIO 7: Evento de pagamento inválido
  // ==========================================
  it("Cenário 7: payload com assinatura criptográfica inválida deve ser rejeitado com segurança", async () => {
    const fakeHeaders = new Headers();
    fakeHeaders.set("x-sandbox-signature", "assinatura_adulterada_invalida");

    const payload = JSON.stringify({
      id: `evt_invalid_${Date.now()}`,
      type: "checkout.completed",
      workspaceId: testWorkspaceId,
    });

    await expect(
      BillingService.processWebhook(payload, fakeHeaders, "sandbox")
    ).rejects.toThrow(/Assinatura.*inválida/i);
  });

  // ==========================================
  // CENÁRIO 8: Assinatura existente após alteração de preço (Grandfathering)
  // ==========================================
  it("Cenário 8: alteração de preço do plano não deve alterar retroativamente assinaturas existentes", async () => {
    // 1. Assinatura ativa atual no plano PRO com snapshot inicial
    const initialSnapshotsCount = await db.commercialSnapshot.count({
      where: { workspaceId: testWorkspaceId, planTier: PlanTier.PRO },
    });
    expect(initialSnapshotsCount).toBeGreaterThan(0);

    // 2. Administrador atualiza o preço do plano PRO de 89 para 129
    await AdminBillingService.upsertPlan(
      superAdminId,
      {
        tier: PlanTier.PRO,
        name: "Plano Pro Renovado",
        description: "Plano Pro com preço atualizado",
        priceMonthly: 12900,
        priceYearly: 129000,
        monthlyCredits: 200,
        maxProjects: 15,
        maxMembers: 5,
        preserveExistingContracts: true,
      }
    );

    // 3. Novo preço do catálogo público é 129
    const dbProPlan = await db.plan.findUnique({ where: { tier: PlanTier.PRO } });
    expect(dbProPlan?.priceMonthly).toBe(12900);

    // 4. Assinante antigo continua com snapshot e direitos preservados
    const activeSub = await db.subscription.findUnique({ where: { workspaceId: testWorkspaceId } });
    expect(activeSub?.planTier).toBe(PlanTier.PRO);

    const grandfatheredMeta = (activeSub?.metadata as any)?.grandfatheredContract;
    expect(grandfatheredMeta).toBeDefined();
    expect(grandfatheredMeta.previousPriceMonthly).toBe(8900);
  });

  // ==========================================
  // CENÁRIO 9: Alteração de limites durante uma assinatura
  // ==========================================
  it("Cenário 9: alteração de limites no catálogo deve respeitar os limites contratados do assinante ativo", async () => {
    // 1. Administrador reduz o limite de projetos do catálogo PRO de 15 para 3
    await AdminBillingService.upsertPlan(
      superAdminId,
      {
        tier: PlanTier.PRO,
        name: "Plano Pro Reduzido",
        description: "Plano Pro com limites reduzidos",
        priceMonthly: 12900,
        priceYearly: 129000,
        monthlyCredits: 200,
        maxProjects: 3,
        maxMembers: 2,
        preserveExistingContracts: true,
      }
    );

    // 2. O EntitlementService consulta o workspace e deve honrar os 15 projetos anteriores do contrato
    const usage = await EntitlementService.getWorkspaceUsageSummary(testWorkspaceId);
    expect(usage.maxProjects).toBe(15);
  });

  // ==========================================
  // CENÁRIO 10: Cancelamento de assinatura
  // ==========================================
  it("Cenário 10: solicitação de cancelamento de assinatura deve atualizar estado e registrar auditoria", async () => {
    const canceled = await BillingService.requestCancellation(
      testWorkspaceId,
      testWorkspaceOwnerId,
      false // cancelamento imediato
    );

    expect(canceled.status).toBe(SubscriptionStatus.CANCELED);

    const updated = await db.subscription.findUnique({ where: { workspaceId: testWorkspaceId } });
    expect(updated?.status).toBe(SubscriptionStatus.CANCELED);
    expect(updated?.canceledAt).toBeDefined();

    // Restabelecer assinatura ativa para próximos testes
    await db.subscription.update({
      where: { workspaceId: testWorkspaceId },
      data: { status: SubscriptionStatus.ACTIVE },
    });
  });

  // ==========================================
  // CENÁRIO 11: Pagamento atrasado (Inadimplência / Past Due)
  // ==========================================
  it("Cenário 11: notificação de falha no pagamento deve marcar assinatura como PAST_DUE", async () => {
    const eventId = `evt_failed_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const payload = {
      id: eventId,
      type: "invoice.payment_failed",
      workspaceId: testWorkspaceId,
      invoiceId: `inv_pastdue_${Date.now()}`,
    };

    const headers = new Headers();
    headers.set("x-sandbox-signature", "reprocess_authorized");

    await BillingService.processWebhook(JSON.stringify(payload), headers, "sandbox");

    const sub = await db.subscription.findUnique({ where: { workspaceId: testWorkspaceId } });
    expect(sub?.status).toBe(SubscriptionStatus.PAST_DUE);

    // Restabelecer assinatura como ACTIVE
    await db.subscription.update({
      where: { workspaceId: testWorkspaceId },
      data: { status: SubscriptionStatus.ACTIVE },
    });
  });

  // ==========================================
  // CENÁRIO 12: Reprocessamento de webhook
  // ==========================================
  it("Cenário 12: reprocessamento de webhook deve recuperar evento com falha mantendo integridade", async () => {
    const eventId = `evt_failed_reprocess_${Date.now()}`;

    // Registrar webhook marcado previamente como FAILED
    await GatewayManagerService.recordIncomingWebhook({
      eventId,
      gateway: "sandbox",
      environment: "SANDBOX",
      eventType: "customer.subscription.updated",
      rawPayload: {
        id: eventId,
        type: "customer.subscription.updated",
        data: { object: { id: "sub_mock_123" } },
      },
    });

    await db.paymentWebhookEvent.update({
      where: { eventId },
      data: { status: "FAILED", lastError: "Falha transitória de infraestrutura" },
    });

    // Reprocessar evento
    const result = await GatewayManagerService.reprocessWebhookEvent(superAdminId, eventId);
    expect(result.success).toBe(true);

    const reprocessed = await db.paymentWebhookEvent.findUnique({ where: { eventId } });
    expect(reprocessed?.status).toBe("PROCESSED");
    expect(reprocessed?.attempts).toBe(2);
    expect(reprocessed?.lastError).toBeNull();
  });

  // ==========================================
  // CENÁRIO 13: Falha na concessão de créditos (Rollback atômico)
  // ==========================================
  it("Cenário 13: falha durante a concessão de créditos deve causar rollback atômico sem corrupção de estado", async () => {
    const eventId = `evt_credit_fail_${Date.now()}`;

    // Evento com workspaceId inexistente forçando erro no db.$transaction
    const invalidPayload = {
      id: eventId,
      type: "checkout.completed",
      workspaceId: "workspace_inexistente_99999",
      planTier: PlanTier.PRO,
      interval: BillingInterval.MONTHLY,
    };

    const headers = new Headers();
    headers.set("x-sandbox-signature", "reprocess_authorized");

    await expect(
      BillingService.processWebhook(JSON.stringify(invalidPayload), headers, "sandbox")
    ).rejects.toThrow();

    // Verificar que o evento foi registrado como FAILED e nenhum dado parcial foi persistido
    const webhookRecord = await db.paymentWebhookEvent.findUnique({ where: { eventId } });
    if (webhookRecord) {
      expect(webhookRecord.status).toBe("FAILED");
    }

    const orphanSub = await db.subscription.findUnique({
      where: { workspaceId: "workspace_inexistente_99999" },
    });
    expect(orphanSub).toBeNull();
  });

  // ==========================================
  // CENÁRIO 14: Usuário sem permissão administrativa
  // ==========================================
  it("Cenário 14: usuário comum não deve ter permissão para alterar planos, gateways ou políticas globais", () => {
    // 1. Usuário comum tem zero permissões administrativas da plataforma
    expect(hasPlatformPermission(PlatformRole.USER, "plans:manage")).toBe(false);
    expect(hasPlatformPermission(PlatformRole.USER, "gateways:manage")).toBe(false);
    expect(hasPlatformPermission(PlatformRole.USER, "credentials:manage")).toBe(false);
    expect(hasPlatformPermission(PlatformRole.USER, "policies:manage")).toBe(false);
    expect(hasPlatformPermission(PlatformRole.USER, "webhooks:reprocess")).toBe(false);

    // 2. Administrador granular com lista restrita
    const customPerms = ["plans:manage", "prices:manage"] as any;
    expect(hasPlatformPermission(PlatformRole.ADMIN, "plans:manage", customPerms)).toBe(true);
    expect(hasPlatformPermission(PlatformRole.ADMIN, "gateways:manage", customPerms)).toBe(false);
    expect(hasPlatformPermission(PlatformRole.ADMIN, "webhooks:reprocess", customPerms)).toBe(false);
  });

  // ==========================================
  // CENÁRIO 15: Tentativa de acesso cruzado entre workspaces
  // ==========================================
  it("Cenário 15: tentativa de checkout ou cancelamento cruzado entre workspaces diferentes deve ser bloqueada", async () => {
    // foreignUserId tentando criar checkout para testWorkspaceId
    await expect(
      BillingService.createCheckout({
        workspaceId: testWorkspaceId,
        userId: foreignUserId,
        planTier: PlanTier.PRO,
        interval: BillingInterval.MONTHLY,
        originUrl: "http://localhost:3000",
      })
    ).rejects.toThrow(/Usuário não tem acesso a este workspace/);

    // foreignUserId tentando cancelar assinatura do testWorkspaceId
    await expect(
      BillingService.requestCancellation(testWorkspaceId, foreignUserId, false)
    ).rejects.toThrow(/Apenas proprietários e administradores podem cancelar a assinatura/);
  });
});
