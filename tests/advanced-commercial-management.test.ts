import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { PlatformRole, WorkspaceRole, PlanTier, SubscriptionStatus } from "@prisma/client";
import { AdminBillingService, PlanInput } from "@/modules/admin/admin-billing.service";
import { BillingPolicyService } from "@/modules/billing/billing-policy.service";
import { PricingService } from "@/modules/billing/pricing.service";
import { EntitlementService, EntitlementError } from "@/modules/billing/entitlement.service";
import { BillingService } from "@/modules/billing/billing.service";

describe("Gestão Avançada de Planos e Configurações Comerciais", () => {
  let adminUserId: string;
  let testWorkspaceId: string;
  let regularUserId: string;

  beforeEach(async () => {
    const passwordHash = await bcrypt.hash("AdminPass123!", 10);
    const rand = Math.random().toString(36).substring(7);

    // 1. Usuário Administrador
    const admin = await db.user.create({
      data: {
        authSubject: `auth_admin_comm_${Date.now()}_${rand}`,
        email: `comm_admin_${Date.now()}_${rand}@example.com`,
        displayName: "Admin Comercial",
        passwordHash,
        platformRole: PlatformRole.SUPER_ADMIN,
      },
    });
    adminUserId = admin.id;

    // 2. Usuário Comum com Workspace e Assinatura Ativa
    const user = await db.user.create({
      data: {
        authSubject: `auth_user_comm_${Date.now()}_${rand}`,
        email: `client_comm_${Date.now()}_${rand}@example.com`,
        displayName: "Cliente Estúdio",
        passwordHash,
        platformRole: PlatformRole.USER,
      },
    });
    regularUserId = user.id;

    const ws = await db.workspace.create({
      data: {
        name: `Estúdio Comercial ${rand}`,
        slug: `estudio-comm-${Date.now()}-${rand}`,
        isPersonal: true,
        creditsBalance: 50,
        memberships: {
          create: {
            userId: user.id,
            role: WorkspaceRole.OWNER,
          },
        },
      },
    });
    testWorkspaceId = ws.id;

    // Garante planos iniciais no banco
    await AdminBillingService.listAllPlans();
  });

  describe("1. Gestão e Ciclo de Vida de Planos Comerciais", () => {
    it("deve listar todos os planos do catálogo ordenados", async () => {
      const plans = await AdminBillingService.listAllPlans();
      expect(plans.length).toBeGreaterThanOrEqual(4);
      const tiers = plans.map((p) => p.tier);
      expect(tiers).toContain(PlanTier.FREE);
      expect(tiers).toContain(PlanTier.PRO);
      expect(tiers).toContain(PlanTier.TEAM);
    });

    it("deve criar ou atualizar plano com preços em centavos e limites explícitos", async () => {
      const planData: PlanInput = {
        tier: PlanTier.PRO,
        name: "CinePrompt Pro Plus",
        description: "Versão aprimorada do plano profissional.",
        priceMonthly: 9900, // R$ 99,00
        priceYearly: 99000, // R$ 990,00
        currency: "BRL",
        maxProjects: 25,
        unlimitedProjects: false,
        maxMembers: 4,
        unlimitedMembers: false,
        monthlyCredits: 600,
        hasPremiumTemplates: true,
        hasAdvancedParameters: true,
        isActive: true,
        commercialStatus: "ACTIVE",
        preserveExistingContracts: true,
      };

      const updated = await AdminBillingService.upsertPlan(adminUserId, planData);
      expect(updated.name).toBe("CinePrompt Pro Plus");
      expect(updated.priceMonthly).toBe(9900);
      expect(updated.maxProjects).toBe(25);
      expect(updated.monthlyCredits).toBe(600);
    });

    it("deve permitir ativar e desativar planos comerciais", async () => {
      const disabled = await AdminBillingService.togglePlanStatus(adminUserId, PlanTier.TEAM, false);
      expect(disabled.isActive).toBe(false);

      const enabled = await AdminBillingService.togglePlanStatus(adminUserId, PlanTier.TEAM, true);
      expect(enabled.isActive).toBe(true);
    });

    it("deve arquivar um plano sem quebrar integridade referencial", async () => {
      const archived = await AdminBillingService.archivePlan(adminUserId, PlanTier.ENTERPRISE);
      expect(archived.commercialStatus).toBe("ARCHIVED");
      expect(archived.isActive).toBe(false);
      expect(archived.isPublic).toBe(false);

      // Catálogo público não deve mais retornar o plano arquivado
      const publicPlans = await BillingService.listPlans();
      const tiers = publicPlans.map((p) => p.tier);
      expect(tiers).not.toContain(PlanTier.ENTERPRISE);
    });
  });

  describe("2. Versionamento Contratual e Preservação de Preços (Grandfathering)", () => {
    it("deve preservar condições antigas em snapshot quando o preço do plano for reajustado", async () => {
      // 1. Cria assinatura PRO ativa com condições originais
      const sub = await db.subscription.create({
        data: {
          workspaceId: testWorkspaceId,
          planTier: PlanTier.PRO,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: new Date(),
        },
      });

      // 2. Administrador reajusta o preço e créditos do plano PRO
      await AdminBillingService.upsertPlan(adminUserId, {
        tier: PlanTier.PRO,
        name: "CinePrompt Pro Reajustado",
        description: "Reajuste anual de planos.",
        priceMonthly: 12900, // Reajustado para R$ 129,00
        priceYearly: 129000,
        monthlyCredits: 700,
        maxProjects: 30,
        maxMembers: 5,
        preserveExistingContracts: true,
      });

      // 3. Verifica se foi gerado o CommercialSnapshot para o workspace existente
      const snapshots = await AdminBillingService.listCommercialSnapshots({ workspaceId: testWorkspaceId });
      expect(snapshots.snapshots.length).toBeGreaterThanOrEqual(1);

      const snap = snapshots.snapshots[0];
      expect(snap.planTier).toBe(PlanTier.PRO);
      expect((snap.snapshotData as any).previousPriceMonthly).toBeDefined();

      // 4. Verifica se a assinatura armazena o contrato anterior preservado
      const updatedSub = await db.subscription.findUnique({
        where: { id: sub.id },
      });
      const grandContract = (updatedSub?.metadata as any)?.grandfatheredContract;
      expect(grandContract).toBeDefined();
      expect(grandContract.previousPriceMonthly).toBeDefined();
    });
  });

  describe("3. Aplicação de Limites no Servidor (Entitlement Service)", () => {
    it("deve bloquear criação de projetos quando o limite contratado for atingido", async () => {
      // Garante assinatura no plano FREE (limite: 2 projetos)
      await db.subscription.upsert({
        where: { workspaceId: testWorkspaceId },
        create: {
          workspaceId: testWorkspaceId,
          planTier: PlanTier.FREE,
          status: SubscriptionStatus.ACTIVE,
        },
        update: {
          planTier: PlanTier.FREE,
          status: SubscriptionStatus.ACTIVE,
        },
      });

      // Cria 2 projetos (atinge o teto)
      await db.project.create({
        data: {
          workspaceId: testWorkspaceId,
          title: "Projeto 1",
        },
      });
      await db.project.create({
        data: {
          workspaceId: testWorkspaceId,
          title: "Projeto 2",
        },
      });

      // A próxima verificação deve disparar EntitlementError
      await expect(EntitlementService.assertCanCreateProject(testWorkspaceId)).rejects.toThrow(
        EntitlementError
      );
    });

    it("deve permitir projetos ilimitados quando o plano possuir unlimitedProjects = true", async () => {
      // Configura plano TEAM como ilimitado
      await AdminBillingService.upsertPlan(adminUserId, {
        tier: PlanTier.TEAM,
        name: "CinePrompt Team Ilimitado",
        description: "Estúdios de alta demanda.",
        priceMonthly: 24900,
        priceYearly: 249000,
        maxProjects: 0,
        unlimitedProjects: true,
        maxMembers: 10,
        monthlyCredits: 2500,
      });

      await db.subscription.upsert({
        where: { workspaceId: testWorkspaceId },
        create: {
          workspaceId: testWorkspaceId,
          planTier: PlanTier.TEAM,
          status: SubscriptionStatus.ACTIVE,
        },
        update: {
          planTier: PlanTier.TEAM,
          status: SubscriptionStatus.ACTIVE,
        },
      });

      // Não deve lançar erro mesmo com projetos existentes
      await expect(EntitlementService.assertCanCreateProject(testWorkspaceId)).resolves.not.toThrow();
    });
  });

  describe("4. Políticas Comerciais Declarativas e Auditoria", () => {
    it("deve listar políticas comerciais padrão com suas categorias", async () => {
      const policies = await BillingPolicyService.listAllPolicies();
      expect(policies.length).toBeGreaterThanOrEqual(10);

      const keys = policies.map((p) => p.key);
      expect(keys).toContain("CREDIT_MONTHLY_RESET_MODE");
      expect(keys).toContain("SUB_DEFAULT_TRIAL_DAYS");
      expect(keys).toContain("GLOBAL_MAX_CONCURRENT_JOBS");
    });

    it("deve atualizar política comercial com validação de tipo e auditoria", async () => {
      const updated = await BillingPolicyService.updatePolicy(
        adminUserId,
        "SUB_DEFAULT_TRIAL_DAYS",
        14,
        "Aumento do período de teste promocional"
      );

      expect(updated.value).toBe(14);

      // Consulta via cache
      const cachedVal = await BillingPolicyService.getPolicyValue<number>("SUB_DEFAULT_TRIAL_DAYS");
      expect(cachedVal).toBe(14);

      // Deve rejeitar valor fora do intervalo de validação (max: 60)
      await expect(
        BillingPolicyService.updatePolicy(adminUserId, "SUB_DEFAULT_TRIAL_DAYS", 999)
      ).rejects.toThrow();
    });
  });

  describe("5. Cálculo Preciso de Preços (Pricing Service)", () => {
    it("deve calcular preços anuais com desconto de forma exata em centavos", () => {
      const plan = {
        priceMonthly: 8900, // R$ 89,00
        priceYearly: 89000, // R$ 890,00 (2 meses grátis)
        currency: "BRL",
        annualDiscountPercent: 17,
      };

      const monthlyPricing = PricingService.calculatePlanPricing(plan, "MONTHLY" as any);
      expect(monthlyPricing.finalPriceInCents).toBe(8900);
      expect(monthlyPricing.formattedMonthly).toContain("89,00");

      const yearlyPricing = PricingService.calculatePlanPricing(plan, "YEARLY" as any);
      expect(yearlyPricing.finalPriceInCents).toBe(89000);
      expect(yearlyPricing.formattedTotal).toContain("890,00");
    });

    it("deve aplicar preço promocional quando estiver dentro da janela de vigência", () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 3600 * 1000);
      const nextWeek = new Date(now.getTime() + 7 * 24 * 3600 * 1000);

      const promoPlan = {
        priceMonthly: 8900,
        priceYearly: 89000,
        promoPriceMonthly: 6900, // R$ 69,00
        promoPriceYearly: 69000,
        promoStartsAt: yesterday,
        promoEndsAt: nextWeek,
        isOfferAvailable: true,
      };

      const pricing = PricingService.calculatePlanPricing(promoPlan, "MONTHLY" as any);
      expect(pricing.isPromotional).toBe(true);
      expect(pricing.finalPriceInCents).toBe(6900);
      expect(pricing.discountAmountInCents).toBe(2000);
    });
  });
});
