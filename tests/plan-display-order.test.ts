import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { PlatformRole, PlanTier } from "@prisma/client";
import { AdminBillingService, PlanInput } from "@/modules/admin/admin-billing.service";
import { BillingService } from "@/modules/billing/billing.service";

describe("Reordenação e Vitrine dos Planos Comerciais", () => {
  let adminUserId: string;

  beforeEach(async () => {
    const passwordHash = await bcrypt.hash("AdminPass123!", 10);
    const rand = Math.random().toString(36).substring(7);

    const admin = await db.user.create({
      data: {
        authSubject: `auth_admin_order_${Date.now()}_${rand}`,
        email: `admin_order_${Date.now()}_${rand}@example.com`,
        displayName: "Admin Order Tester",
        passwordHash,
        platformRole: PlatformRole.SUPER_ADMIN,
      },
    });
    adminUserId = admin.id;

    // Garante que os planos existam no banco e sejam públicos para o teste da vitrine
    await AdminBillingService.listAllPlans();
    await db.plan.updateMany({
      data: { isPublic: true, isActive: true, commercialStatus: "ACTIVE" },
    });
  });

  it("deve reordenar os planos para a ordem convencional (FREE -> PRO -> TEAM -> ENTERPRISE)", async () => {
    const desiredOrder = [PlanTier.FREE, PlanTier.PRO, PlanTier.TEAM, PlanTier.ENTERPRISE];

    const updatedPlans = await AdminBillingService.reorderPlans(adminUserId, desiredOrder);
    expect(updatedPlans).toBeDefined();

    const publicPlans = await BillingService.listPlans();
    const publicTiers = publicPlans.map((p) => p.tier);

    expect(publicTiers[0]).toBe(PlanTier.FREE);
    expect(publicTiers[1]).toBe(PlanTier.PRO);
    expect(publicTiers[2]).toBe(PlanTier.TEAM);
    expect(publicTiers[3]).toBe(PlanTier.ENTERPRISE);

    // Verifica que displayOrder foi gravado consecutivamente
    const freePlan = await db.plan.findUnique({ where: { tier: PlanTier.FREE } });
    const proPlan = await db.plan.findUnique({ where: { tier: PlanTier.PRO } });
    const teamPlan = await db.plan.findUnique({ where: { tier: PlanTier.TEAM } });
    const enterprisePlan = await db.plan.findUnique({ where: { tier: PlanTier.ENTERPRISE } });

    expect(freePlan?.displayOrder).toBe(1);
    expect(proPlan?.displayOrder).toBe(2);
    expect(teamPlan?.displayOrder).toBe(3);
    expect(enterprisePlan?.displayOrder).toBe(4);
  });

  it("deve permitir inverter ou personalizar a ordem da vitrine para destacar planos pagos primeiro", async () => {
    // Nova ordem customizada: PRO primeiro, depois TEAM, depois ENTERPRISE, depois FREE
    const customOrder = [PlanTier.PRO, PlanTier.TEAM, PlanTier.ENTERPRISE, PlanTier.FREE];

    await AdminBillingService.reorderPlans(adminUserId, customOrder);

    const publicPlans = await BillingService.listPlans();
    const publicTiers = publicPlans.map((p) => p.tier);

    expect(publicTiers[0]).toBe(PlanTier.PRO);
    expect(publicTiers[1]).toBe(PlanTier.TEAM);
    expect(publicTiers[2]).toBe(PlanTier.ENTERPRISE);
    expect(publicTiers[3]).toBe(PlanTier.FREE);
  });

  it("deve preservar o displayOrder ao salvar edição de plano via upsertPlan", async () => {
    // Define ordem inicial
    await AdminBillingService.reorderPlans(adminUserId, [
      PlanTier.FREE,
      PlanTier.PRO,
      PlanTier.TEAM,
      PlanTier.ENTERPRISE,
    ]);

    // Edita apenas o nome e descrição do plano PRO sem enviar displayOrder
    const existingPro = await db.plan.findUnique({ where: { tier: PlanTier.PRO } });
    expect(existingPro?.displayOrder).toBe(2);

    const updatePayload: PlanInput = {
      tier: PlanTier.PRO,
      name: "Plano Pro Turbo Atualizado",
      description: "Descrição editada sem mexer na ordem",
      priceMonthly: existingPro?.priceMonthly || 8900,
      priceYearly: existingPro?.priceYearly || 89000,
      maxProjects: 20,
      maxMembers: 3,
      monthlyCredits: 500,
    };

    await AdminBillingService.upsertPlan(adminUserId, updatePayload);

    const afterUpdatePro = await db.plan.findUnique({ where: { tier: PlanTier.PRO } });
    expect(afterUpdatePro?.name).toBe("Plano Pro Turbo Atualizado");
    expect(afterUpdatePro?.displayOrder).toBe(2); // Preservou 2!
  });

  it("deve atualizar displayOrder quando fornecido explicitamente no upsertPlan", async () => {
    const existingFree = await db.plan.findUnique({ where: { tier: PlanTier.FREE } });

    const updatePayload: PlanInput = {
      tier: PlanTier.FREE,
      name: "Plano Gratuito",
      description: existingFree?.description || "",
      displayOrder: 99,
      priceMonthly: 0,
      priceYearly: 0,
      maxProjects: 2,
      maxMembers: 1,
      monthlyCredits: 0,
    };

    await AdminBillingService.upsertPlan(adminUserId, updatePayload);

    const afterUpdateFree = await db.plan.findUnique({ where: { tier: PlanTier.FREE } });
    expect(afterUpdateFree?.displayOrder).toBe(99);
  });
});
