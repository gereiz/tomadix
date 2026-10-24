import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { AuthService } from "@/modules/auth/auth.service";
import { BillingService } from "@/modules/billing/billing.service";
import { EntitlementService, EntitlementError } from "@/modules/billing/entitlement.service";
import { ProjectService } from "@/modules/projects/project.service";
import { WorkspaceService } from "@/modules/workspaces/workspace.service";
import { SandboxGateway } from "@/modules/billing/gateways/sandbox.gateway";
import { PlanTier, SubscriptionStatus, BillingInterval } from "@/modules/billing/billing.types";
import { WorkspaceRole } from "@prisma/client";

describe("Planos Comerciais, Assinaturas, Pagamentos e Entitlements", () => {
  let ownerUserId: string;
  let ownerEmail: string;
  let workspaceId: string;

  let memberUserId: string;
  let memberEmail: string;

  const testSecret = "test_webhook_hmac_secret_key_456";

  beforeAll(async () => {
    ownerEmail = `owner_billing_${Date.now()}@cineprompt.test`;
    memberEmail = `member_billing_${Date.now()}@cineprompt.test`;

    // 1. Criar usuário OWNER e seu Workspace
    const regOwner = await AuthService.register({
      email: ownerEmail,
      password: "Password@123",
      displayName: "Diretor Comercial",
      workspaceName: "Estúdio Cinema Teste",
    });

    ownerUserId = regOwner.user.id;
    workspaceId = regOwner.workspace.id;

    // 2. Criar segundo usuário para testes de papéis
    const regMember = await AuthService.register({
      email: memberEmail,
      password: "Password@123",
      displayName: "Assistente de Produção",
      workspaceName: "Estúdio Secundário",
    });

    memberUserId = regMember.user.id;

    // Garantir preços padrão no banco para o teste de ciclo de vida
    await db.plan.updateMany({
      where: { tier: PlanTier.PRO },
      data: { priceMonthly: 8900, maxProjects: 20, monthlyCredits: 500 },
    });
    await db.plan.updateMany({
      where: { tier: PlanTier.TEAM },
      data: { maxProjects: -1 },
    });
  });

  afterAll(async () => {
    // Limpeza dos usuários de teste e seus workspaces
    const emails = [ownerEmail, memberEmail];
    const users = await db.user.findMany({ where: { email: { in: emails } } });
    for (const u of users) {
      await db.user.delete({ where: { id: u.id } }).catch(() => {});
    }
  });

  describe("1. Catálogo de Planos e Configurações Comerciais", () => {
    it("deve retornar o catálogo de planos com FREE, PRO e TEAM com limites e preços corretos", async () => {
      const plans: any[] = await BillingService.listPlans();
      expect(plans.length).toBeGreaterThanOrEqual(3);

      const freePlan = plans.find((p: any) => p.tier === PlanTier.FREE);
      const proPlan = plans.find((p: any) => p.tier === PlanTier.PRO);
      const teamPlan = plans.find((p: any) => p.tier === PlanTier.TEAM);

      expect(freePlan).toBeDefined();
      expect(freePlan?.priceMonthly).toBe(0);
      expect(freePlan?.maxProjects).toBe(2);
      expect(freePlan?.maxMembers).toBe(1);

      expect(proPlan).toBeDefined();
      expect(proPlan?.priceMonthly).toBe(8900); // R$ 89,00 em centavos
      expect(proPlan?.maxProjects).toBe(20);
      expect(proPlan?.monthlyCredits).toBe(500);

      expect(teamPlan).toBeDefined();
      expect(teamPlan?.priceMonthly).toBe(24900); // R$ 249,00
      expect(teamPlan?.maxProjects).toBe(-1); // Ilimitado
      expect(teamPlan?.maxMembers).toBe(10);
      expect(teamPlan?.monthlyCredits).toBe(2500);
    });
  });

  describe("2. Criação de Checkout e Controle de Acesso", () => {
    it("deve permitir que o OWNER inicie um checkout para o plano PRO", async () => {
      const checkout = await BillingService.createCheckout({
        workspaceId,
        userId: ownerUserId,
        planTier: PlanTier.PRO,
        interval: BillingInterval.MONTHLY,
        originUrl: "http://localhost:3000",
      });

      expect(checkout.direct).toBe(false);
      expect(checkout.checkoutUrl).toBeDefined();
      expect(checkout.sessionId).toBeDefined();
      expect(checkout.gateway).toBeDefined();
    });

    it("deve permitir mudar para o plano FREE diretamente sem necessidade de gateway externo", async () => {
      const downgrade = await BillingService.createCheckout({
        workspaceId,
        userId: ownerUserId,
        planTier: PlanTier.FREE,
        interval: BillingInterval.MONTHLY,
        originUrl: "http://localhost:3000",
      });

      expect(downgrade.direct).toBe(true);
      expect(downgrade.planTier).toBe(PlanTier.FREE);
    });

    it("deve rejeitar solicitação de checkout feita por um usuário sem papel de OWNER ou ADMIN", async () => {
      await expect(
        BillingService.createCheckout({
          workspaceId,
          userId: memberUserId, // Não é membro deste workspace
          planTier: PlanTier.PRO,
          interval: BillingInterval.MONTHLY,
          originUrl: "http://localhost:3000",
        })
      ).rejects.toThrow(EntitlementError);
    });
  });

  describe("3. Segurança Criptográfica de Webhooks (HMAC-SHA256)", () => {
    it("deve validar com sucesso um evento assinado com HMAC-SHA256 correto", async () => {
      const payload = {
        id: `evt_valid_${Date.now()}`,
        type: "checkout.completed",
        workspaceId,
        planTier: "PRO",
        status: "ACTIVE",
      };

      const { rawBody, signatureHeader } = SandboxGateway.createSignedPayload(payload, testSecret);
      const gateway = new SandboxGateway(testSecret);

      const headers = new Headers();
      headers.set("x-sandbox-signature", signatureHeader);

      const result = await gateway.validateWebhook(rawBody, headers);
      expect(result.isValid).toBe(true);
      expect(result.event?.id).toBe(payload.id);
      expect(result.event?.workspaceId).toBe(workspaceId);
    });

    it("deve rejeitar evento com assinatura criptográfica adulterada ou inválida", async () => {
      const payload = {
        id: `evt_fake_${Date.now()}`,
        type: "checkout.completed",
      };

      const { rawBody } = SandboxGateway.createSignedPayload(payload, testSecret);
      const gateway = new SandboxGateway(testSecret);

      const headers = new Headers();
      headers.set("x-sandbox-signature", "t=123456,v1=bad_signature_hash_0000000000000000000000000000000000000000000000000000000000000000");

      const result = await gateway.validateWebhook(rawBody, headers);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("inválida");
    });
  });

  describe("4. Idempotência e Tratamento de Eventos Duplicados", () => {
    it("deve registrar o primeiro evento e não processar nem conceder créditos repetidos na segunda chamada", async () => {
      const eventId = `evt_idempotency_${Date.now()}`;
      const payload = {
        id: eventId,
        type: "checkout.completed",
        workspaceId,
        planTier: PlanTier.PRO,
        interval: BillingInterval.MONTHLY,
        subscriptionId: `sub_idem_${Date.now()}`,
        customerId: `cus_idem_${Date.now()}`,
        amountPaid: 8900,
      };

      const { rawBody, signatureHeader } = SandboxGateway.createSignedPayload(payload, "sandbox_super_secret_key_123");
      const headers = new Headers();
      headers.set("x-sandbox-signature", signatureHeader);

      const initialWorkspace = await db.workspace.findUnique({
        where: { id: workspaceId },
        select: { creditsBalance: true },
      });
      const initialCredits = initialWorkspace?.creditsBalance || 0;

      // 1ª execução
      const firstResult: any = await BillingService.processWebhook(rawBody, headers, "sandbox");
      expect(firstResult.processed).toBe(true);
      expect(firstResult.duplicate).toBeUndefined();

      const afterFirst = await db.workspace.findUnique({
        where: { id: workspaceId },
        select: { creditsBalance: true },
      });
      expect(afterFirst?.creditsBalance).toBe(initialCredits + 500); // 500 créditos do PRO

      // 2ª execução com exatamente o mesmo payload e ID
      const secondResult: any = await BillingService.processWebhook(rawBody, headers, "sandbox");
      expect(secondResult.processed).toBe(true);
      expect(secondResult.duplicate).toBe(true);

      const afterSecond = await db.workspace.findUnique({
        where: { id: workspaceId },
        select: { creditsBalance: true },
      });
      // Saldo NÃO deve ter sido duplicado
      expect(afterSecond?.creditsBalance).toBe(afterFirst?.creditsBalance);
    });
  });

  describe("5. Ciclo de Vida Completo da Assinatura e Faturamento", () => {
    const subGatewayId = `sub_lifecycle_${Date.now()}`;
    const invoiceGatewayId = `in_lifecycle_${Date.now()}`;

    it("deve transicionar assinatura para ACTIVE e registrar invoice via evento invoice.paid", async () => {
      const payload = {
        id: `evt_inv_paid_${Date.now()}`,
        type: "invoice.paid",
        workspaceId,
        subscriptionId: subGatewayId,
        invoiceId: invoiceGatewayId,
        amountPaid: 8900,
        currency: "BRL",
        hostedInvoiceUrl: "https://stripe.com/invoice/test_123",
      };

      const { rawBody, signatureHeader } = SandboxGateway.createSignedPayload(payload, "sandbox_super_secret_key_123");
      const headers = new Headers();
      headers.set("x-sandbox-signature", signatureHeader);

      await BillingService.processWebhook(rawBody, headers, "sandbox");

      const invoice = await db.invoice.findUnique({
        where: { gatewayInvoiceId: invoiceGatewayId },
      });

      expect(invoice).toBeDefined();
      expect(invoice?.amountPaid).toBe(8900);
      expect(invoice?.status).toBe("paid");
      expect(invoice?.hostedInvoiceUrl).toBe("https://stripe.com/invoice/test_123");
    });

    it("deve alterar status para PAST_DUE em caso de falha de pagamento (invoice.payment_failed)", async () => {
      const payload = {
        id: `evt_inv_failed_${Date.now()}`,
        type: "invoice.payment_failed",
        workspaceId,
        subscriptionId: subGatewayId,
        invoiceId: `in_failed_${Date.now()}`,
        amountPaid: 8900,
      };

      const { rawBody, signatureHeader } = SandboxGateway.createSignedPayload(payload, "sandbox_super_secret_key_123");
      const headers = new Headers();
      headers.set("x-sandbox-signature", signatureHeader);

      await BillingService.processWebhook(rawBody, headers, "sandbox");

      const sub = await db.subscription.findUnique({
        where: { workspaceId },
      });

      expect(sub?.status).toBe(SubscriptionStatus.PAST_DUE);
    });

    it("deve permitir solicitar cancelamento ao final do período (atPeriodEnd: true)", async () => {
      const updated = await BillingService.requestCancellation(workspaceId, ownerUserId, true);

      expect(updated.cancelAtPeriodEnd).toBe(true);
      expect(updated.status).toBe(SubscriptionStatus.CANCELING);
    });

    it("deve marcar assinatura como CANCELED ao receber evento subscription.canceled", async () => {
      const payload = {
        id: `evt_canceled_${Date.now()}`,
        type: "subscription.canceled",
        workspaceId,
        subscriptionId: subGatewayId,
      };

      const { rawBody, signatureHeader } = SandboxGateway.createSignedPayload(payload, "sandbox_super_secret_key_123");
      const headers = new Headers();
      headers.set("x-sandbox-signature", signatureHeader);

      await BillingService.processWebhook(rawBody, headers, "sandbox");

      const sub = await db.subscription.findUnique({
        where: { workspaceId },
      });

      expect(sub?.status).toBe(SubscriptionStatus.CANCELED);
      expect(sub?.canceledAt).toBeDefined();
    });
  });

  describe("6. Entitlements e Direitos de Uso no Servidor", () => {
    let freeWorkspaceId: string;

    beforeAll(async () => {
      // Reativar plano FREE com limites estritos para validar bloqueios
      await db.subscription.upsert({
        where: { workspaceId },
        create: {
          workspaceId,
          planTier: PlanTier.FREE,
          status: SubscriptionStatus.ACTIVE,
        },
        update: {
          planTier: PlanTier.FREE,
          status: SubscriptionStatus.ACTIVE,
          cancelAtPeriodEnd: false,
        },
      });

      // Limpar projetos anteriores deste workspace para teste determinístico
      await db.project.deleteMany({ where: { workspaceId } });
    });

    it("deve permitir criar projetos dentro do limite do plano FREE (máx 2 projetos)", async () => {
      const p1 = await ProjectService.createProject(workspaceId, {
        title: "Curta Metragem 1",
        description: "Projeto 1",
        language: "pt-BR",
      });
      const p2 = await ProjectService.createProject(workspaceId, {
        title: "Curta Metragem 2",
        description: "Projeto 2",
        language: "pt-BR",
      });

      expect(p1.id).toBeDefined();
      expect(p2.id).toBeDefined();
    });

    it("deve BLOQUEAR a criação do 3º projeto no plano FREE com EntitlementError 403", async () => {
      await expect(
        ProjectService.createProject(workspaceId, {
          title: "Curta Metragem 3 Excedente",
          description: "Tentativa de ultrapassar limite",
          language: "pt-BR",
        })
      ).rejects.toThrow(EntitlementError);
    });

    it("deve BLOQUEAR a criação de projetos se a assinatura estiver em PAST_DUE", async () => {
      await db.subscription.update({
        where: { workspaceId },
        data: { status: SubscriptionStatus.PAST_DUE },
      });

      await expect(
        ProjectService.createProject(workspaceId, {
          title: "Projeto Durante Inadimplência",
          description: "Bloqueio financeiro",
          language: "pt-BR",
        })
      ).rejects.toThrow("pagamentos pendentes");

      // Restaurar para ACTIVE
      await db.subscription.update({
        where: { workspaceId },
        data: { status: SubscriptionStatus.ACTIVE },
      });
    });

    it("deve BLOQUEAR adição de membro além do limite do plano FREE (máx 1 membro)", async () => {
      await expect(
        WorkspaceService.addMember(workspaceId, ownerUserId, memberEmail, WorkspaceRole.MEMBER)
      ).rejects.toThrow("Limite de membros da equipe atingido");
    });

    it("deve controlar saldo e deduzir créditos no razão auditado (CreditLedger)", async () => {
      // Ajustar saldo para teste
      await db.workspace.update({
        where: { id: workspaceId },
        data: { creditsBalance: 50 },
      });

      await EntitlementService.assertCanConsumeCredits(workspaceId, 20);

      const newBalance = await EntitlementService.deductCredits(
        workspaceId,
        20,
        "Geração de Roteiro Cinematográfico AI",
        { model: "gemini-2.5-pro" }
      );

      expect(newBalance).toBe(30);

      const ledger = await db.creditLedger.findFirst({
        where: { workspaceId, reason: "Geração de Roteiro Cinematográfico AI" },
      });
      expect(ledger).toBeDefined();
      expect(ledger?.amount).toBe(-20);
      expect(ledger?.balanceAfter).toBe(30);
    });

    it("deve BLOQUEAR operação quando saldo de créditos for insuficiente", async () => {
      await expect(
        EntitlementService.assertCanConsumeCredits(workspaceId, 9999)
      ).rejects.toThrow("Saldo insuficiente de créditos");
    });

    it("deve restringir templates premium no plano FREE e liberar quando aplicável", async () => {
      // No plano FREE, enabledTemplates é ["standard_director", "basic_scene"]
      await expect(
        EntitlementService.assertCanAccessTemplate(workspaceId, "hollywood_master_v3")
      ).rejects.toThrow("exclusivo para planos superiores");

      // Template padrão permitido
      await expect(
        EntitlementService.assertCanAccessTemplate(workspaceId, "individual_scene")
      ).resolves.not.toThrow();
    });
  });
});
