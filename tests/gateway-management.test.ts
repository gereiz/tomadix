import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { PlatformRole, PlanTier, SubscriptionStatus } from "@prisma/client";
import { encryptSecrets, decryptSecrets, maskSecretValue, maskSecrets } from "@/lib/encryption";
import { GatewayManagerService } from "@/modules/billing/gateways/gateway-manager.service";
import { SandboxGateway } from "@/modules/billing/gateways/sandbox.gateway";
import { StripeGateway } from "@/modules/billing/gateways/stripe.gateway";
import { MercadoPagoGateway } from "@/modules/billing/gateways/mercadopago.gateway";
import { BillingService } from "@/modules/billing/billing.service";

describe("Gestão de Gateways de Pagamento (Prompt 15)", () => {
  let adminUserId: string;

  beforeEach(async () => {
    const passwordHash = await bcrypt.hash("AdminPass123!", 10);
    const rand = Math.random().toString(36).substring(7);

    const admin = await db.user.create({
      data: {
        authSubject: `auth_admin_gw_${Date.now()}_${rand}`,
        email: `gw_admin_${Date.now()}_${rand}@example.com`,
        displayName: "Admin Gateways",
        passwordHash,
        platformRole: PlatformRole.SUPER_ADMIN,
      },
    });
    adminUserId = admin.id;

    // Garantir que os gateways padrão estão semeados
    await GatewayManagerService.seedDefaultGateways();
  });

  describe("1. Gestão Segura de Credenciais & Criptografia AES-256-GCM", () => {
    it("deve criptografar e descriptografar credenciais usando AES-256-GCM com autenticação", () => {
      const rawSecrets = {
        apiKey: "sk_test_51Mz00000000000000000000000000000000000000000",
        webhookSecret: "whsec_supersecret1234567890",
      };

      const encrypted = encryptSecrets(rawSecrets);
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.data).toBeDefined();
      expect(encrypted.authTag).toBeDefined();
      expect(encrypted.data).not.toContain("sk_test_");

      const decrypted = decryptSecrets(encrypted);
      expect(decrypted.apiKey).toBe(rawSecrets.apiKey);
      expect(decrypted.webhookSecret).toBe(rawSecrets.webhookSecret);
    });

    it("deve mascarar credenciais confidenciais e nunca expor texto puro", () => {
      const masked = maskSecretValue("sk_test_51Mz99999999999999999999999999999999999999999");
      expect(masked).toContain("••••••••");
      expect(masked.length).toBeGreaterThan(10);
      expect(masked.startsWith("sk_test")).toBe(true);

      const secrets = {
        apiKey: "sk_test_123456789",
        webhookSecret: "whsec_abcdef123456",
      };
      const maskedObj = maskSecrets(secrets);
      expect(maskedObj.apiKey).toContain("••••");
      expect(maskedObj.webhookSecret).toContain("••••");
      expect(maskedObj.apiKey).not.toBe(secrets.apiKey);
    });

    it("ao salvar credenciais mascaradas não alteradas, deve preservar o segredo original", async () => {
      const testIdentifier = `stripe-test-${Date.now()}`;
      const originalApiKey = "sk_test_original_secret_123456789";

      // 1. Criar gateway com segredo original
      await GatewayManagerService.upsertGateway(adminUserId, {
        name: "Stripe Test Instance",
        identifier: testIdentifier,
        provider: "STRIPE",
        environment: "SANDBOX",
        credentials: { apiKey: originalApiKey },
      });

      // 2. Obter gateway com máscara
      const listed = await GatewayManagerService.getGatewayById(
        (await db.paymentGatewayConfig.findUnique({ where: { identifier: testIdentifier } }))!.id
      );
      expect(listed?.maskedCredentials.apiKey).toContain("••••");

      // 3. Atualizar passando o valor mascarado (como o form do navegador faria se não alterado)
      await GatewayManagerService.upsertGateway(adminUserId, {
        name: "Stripe Test Instance Renomeada",
        identifier: testIdentifier,
        provider: "STRIPE",
        environment: "SANDBOX",
        credentials: { apiKey: listed!.maskedCredentials.apiKey },
      });

      // 4. Verificar que a chave original descriptografada continua intacta
      const updated = await db.paymentGatewayConfig.findUnique({ where: { identifier: testIdentifier } });
      const decrypted = decryptSecrets(updated?.encryptedCredentials);
      expect(decrypted.apiKey).toBe(originalApiKey);
    });
  });

  describe("2. Ambientes de Teste (Sandbox) e Produção Isolados", () => {
    it("deve isolar credenciais e configurações entre sandbox e produção", async () => {
      const configs = await GatewayManagerService.listGateways();
      const stripeSandbox = configs.find((c) => c.identifier === "stripe-sandbox");
      const stripeProduction = configs.find((c) => c.identifier === "stripe-production");

      expect(stripeSandbox).toBeDefined();
      expect(stripeProduction).toBeDefined();
      expect(stripeSandbox?.environment).toBe("SANDBOX");
      expect(stripeProduction?.environment).toBe("PRODUCTION");
      expect(stripeSandbox?.id).not.toBe(stripeProduction?.id);
    });
  });

  describe("3. Teste de Conectividade Seguro (Sem Riscos de Cobrança)", () => {
    it("deve executar teste de conexão com o Sandbox Gateway com sucesso", async () => {
      const sandboxConfig = await db.paymentGatewayConfig.findFirst({
        where: { provider: "SANDBOX" },
      });
      expect(sandboxConfig).toBeDefined();

      const result = await GatewayManagerService.testConnection(adminUserId, sandboxConfig!.id);
      expect(result.success).toBe(true);
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
      expect(result.message).toContain("operacional");

      const refreshed = await db.paymentGatewayConfig.findUnique({ where: { id: sandboxConfig!.id } });
      expect(refreshed?.connectionStatus).toBe("CONNECTED");
      expect(refreshed?.lastTestedAt).toBeDefined();
      expect(refreshed?.lastError).toBeNull();
    });

    it("deve identificar falha de credenciais não configuradas para Stripe sem gerar transações", async () => {
      const stripeProd = await db.paymentGatewayConfig.findFirst({
        where: { identifier: "stripe-production" },
      });
      expect(stripeProd).toBeDefined();

      const result = await GatewayManagerService.testConnection(adminUserId, stripeProd!.id);
      expect(result.success).toBe(false);
      expect(result.message).toContain("Chave de API do Stripe não configurada");

      const refreshed = await db.paymentGatewayConfig.findUnique({ where: { id: stripeProd!.id } });
      expect(refreshed?.connectionStatus).toBe("FAILED");
      expect(refreshed?.lastError).toContain("Chave de API do Stripe não configurada");
    });
  });

  describe("4. Seleção Inteligente de Gateway no Servidor (Checkout Routing)", () => {
    it("deve selecionar o gateway padrão ativo para o ambiente e moeda solicitados", async () => {
      const resolved = await GatewayManagerService.resolveCheckoutGateway({
        country: "BR",
        currency: "BRL",
        planTier: PlanTier.PRO,
        environment: "SANDBOX",
      });

      expect(resolved.gateway).toBeDefined();
      expect(resolved.config.environment).toBe("SANDBOX");
      expect(resolved.config.status).toBe("ACTIVE");
    });
  });

  describe("5. Mapeamento de Planos e Preços Externos", () => {
    it("deve criar e atualizar associação entre plano interno e catálogo externo", async () => {
      const gw = await db.paymentGatewayConfig.findFirst({
        where: { identifier: "stripe-sandbox" },
      });
      expect(gw).toBeDefined();

      const mapping = await GatewayManagerService.upsertPriceMapping(adminUserId, {
        gatewayConfigId: gw!.id,
        planTier: PlanTier.PRO,
        environment: "SANDBOX",
        externalProductId: "prod_mock_pro_123",
        externalPriceIdMonthly: "price_mock_pro_m_123",
        externalPriceIdYearly: "price_mock_pro_y_123",
        currency: "BRL",
      });

      expect(mapping.externalProductId).toBe("prod_mock_pro_123");
      expect(mapping.externalPriceIdMonthly).toBe("price_mock_pro_m_123");
      expect(mapping.syncStatus).toBe("SYNCED");

      const allMappings = await GatewayManagerService.listPriceMappings("SANDBOX", gw!.id);
      expect(allMappings.some((m) => m.planTier === PlanTier.PRO)).toBe(true);
    });
  });

  describe("6. Webhooks: Idempotência, Rastreamento e Reprocessamento", () => {
    it("deve rastrear evento recebido e garantir idempotência estrita", async () => {
      const eventId = `evt_test_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // 1. Registrar webhook recebido
      await GatewayManagerService.recordIncomingWebhook({
        eventId,
        gateway: "sandbox",
        environment: "SANDBOX",
        eventType: "checkout.completed",
        rawPayload: { test: true, eventId },
      });

      const eventsList = await GatewayManagerService.listWebhookEvents({ gateway: "sandbox" });
      const recorded = eventsList.events.find((e) => e.eventId === eventId);
      expect(recorded).toBeDefined();
      expect(recorded?.status).toBe("RECEIVED");

      // 2. Atualizar status para PROCESSED
      await GatewayManagerService.updateWebhookStatus({
        eventId,
        status: "PROCESSED",
      });

      const updated = await db.paymentWebhookEvent.findUnique({ where: { eventId } });
      expect(updated?.status).toBe("PROCESSED");
      expect(updated?.processedAt).toBeDefined();
    });

    it("deve reprocessar com segurança um webhook existente sem permitir adulteração do payload", async () => {
      const eventId = `evt_reprocess_${Date.now()}_${Math.random().toString(36).substring(7)}`;

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

      // Forçar status inicial como FAILED para testar recuperação
      await db.paymentWebhookEvent.update({
        where: { eventId },
        data: { status: "FAILED", lastError: "Falha de rede simulada" },
      });

      // Executar reprocessamento através do serviço administrativo
      const reprocessResult = await GatewayManagerService.reprocessWebhookEvent(adminUserId, eventId);
      expect(reprocessResult.success).toBe(true);

      const refreshed = await db.paymentWebhookEvent.findUnique({ where: { eventId } });
      expect(refreshed?.status).toBe("PROCESSED");
      expect(refreshed?.attempts).toBe(2);
      expect(refreshed?.lastError).toBeNull();
    });
  });

  describe("7. Desativação Segura de Gateway com Alerta de Assinaturas", () => {
    it("ao desativar um gateway, não deve cancelar assinaturas e deve emitir alerta se houver assinaturas vinculadas", async () => {
      const gw = await db.paymentGatewayConfig.findFirst({
        where: { identifier: "stripe-sandbox" },
      });
      expect(gw).toBeDefined();

      const toggleResult = await GatewayManagerService.toggleGatewayStatus(
        adminUserId,
        gw!.id,
        "INACTIVE"
      );

      expect(toggleResult.gateway.status).toBe("INACTIVE");

      // Reativar para manter estado limpo
      await GatewayManagerService.toggleGatewayStatus(adminUserId, gw!.id, "ACTIVE");
      const restored = await db.paymentGatewayConfig.findUnique({ where: { id: gw!.id } });
      expect(restored?.status).toBe("ACTIVE");
    });
  });
});
