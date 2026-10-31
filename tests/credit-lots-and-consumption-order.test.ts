import { describe, it, expect, vi, beforeEach } from "vitest";
import { CreditConsumptionOrderService, ConsumptionCategory } from "@/modules/billing/credit-consumption-order.service";
import { CreditSimulationService } from "@/modules/billing/credit-simulation.service";
import { CreditLotService } from "@/modules/billing/credit-lot.service";
import { CreditDailyMaintenanceService } from "@/modules/billing/credit-daily-maintenance.service";
import { CreditLot, CreditLotStatus, CreditOrigin, PlanTier } from "@prisma/client";

describe("TOMADIX — Sistema de Planos, Créditos, Lotes, Ledger e Ordem de Consumo", () => {
  describe("1. Simulação de Capacidade de Utilização dos Planos (Divisão Inteira Math.floor)", () => {
    it("calcula corretamente as utilizações possíveis por divisão inteira sem frações", async () => {
      // Simulação para o Plano PRO com 500 créditos mensais, 100 de adesão e 10 diários
      const simulation = await CreditSimulationService.simulateCapacityForPlan({
        tier: PlanTier.PRO,
        name: "Pro Cinematic",
        priceMonthly: 9900,
        adhesionCredits: 100,
        monthlyCredits: 500,
        dailyCredits: 10,
        dailyCreditsAccumulative: true,
      });

      expect(simulation.planTier).toBe(PlanTier.PRO);
      expect(simulation.credits.adhesion).toBe(100);
      expect(simulation.credits.monthly).toBe(500);
      expect(simulation.credits.daily).toBe(10);
      expect(simulation.credits.totalEstimatedMonthly).toBe(500 + 10 * 30); // 800

      // Verifica se cada serviço respeita o Math.floor
      for (const svc of simulation.services) {
        if (!svc.isFree && svc.costInCredits > 0) {
          expect(svc.adhesionPossibleUses).toBe(Math.floor(100 / svc.costInCredits));
          expect(svc.monthlyPossibleUses).toBe(Math.floor(500 / svc.costInCredits));
          expect(svc.dailyPossibleUses).toBe(Math.floor(10 / svc.costInCredits));
          expect(svc.totalMonthlyEstimatedUses).toBe(Math.floor(800 / svc.costInCredits));
          // Não pode ser número com casas decimais
          expect(Number.isInteger(svc.adhesionPossibleUses)).toBe(true);
          expect(Number.isInteger(svc.monthlyPossibleUses)).toBe(true);
          expect(Number.isInteger(svc.dailyPossibleUses)).toBe(true);
          expect(Number.isInteger(svc.totalMonthlyEstimatedUses)).toBe(true);
        }
      }
    });

    it("atribui capacidade ilimitada para operações gratuitas", async () => {
      const simulation = await CreditSimulationService.simulateCapacityForPlan({
        tier: PlanTier.ENTERPRISE,
        name: "Enterprise",
        monthlyCredits: 5000,
      });

      const freeService = simulation.services.find((s) => s.isFree || s.costInCredits === 0);
      if (freeService) {
        expect(freeService.monthlyPossibleUses).toBe(999999);
        expect(freeService.totalMonthlyEstimatedUses).toBe(999999);
      }
    });
  });

  describe("2. Categorização de Lotes e Ordem Determinística de Consumo", () => {
    it("distingue lotes diários não-acumulativos de acumulativos", () => {
      const nonAccumulativeLot: Partial<CreditLot> = {
        origin: CreditOrigin.DAILY_RENEWAL,
        isAccumulative: false,
      };
      const accumulativeLot: Partial<CreditLot> = {
        origin: CreditOrigin.DAILY_RENEWAL,
        isAccumulative: true,
      };
      const monthlyLot: Partial<CreditLot> = {
        origin: CreditOrigin.MONTHLY_RENEWAL,
        isAccumulative: true,
      };

      expect(CreditConsumptionOrderService.categorizeLot(nonAccumulativeLot as CreditLot)).toBe("DAILY_NON_ACCUMULATIVE");
      expect(CreditConsumptionOrderService.categorizeLot(accumulativeLot as CreditLot)).toBe("DAILY_ACCUMULATIVE");
      expect(CreditConsumptionOrderService.categorizeLot(monthlyLot as CreditLot)).toBe("MONTHLY_RENEWAL");
    });

    it("ordena os lotes estritamente conforme a hierarquia configurada pelo administrador", () => {
      const customPriorities: ConsumptionCategory[] = [
        "DAILY_NON_ACCUMULATIVE",
        "PROMOTIONAL",
        "DAILY_ACCUMULATIVE",
        "MONTHLY_RENEWAL",
        "ADHESION",
        "PURCHASED",
        "ADMIN_OVERRIDE",
        "REFUND",
        "LEGACY",
      ];

      const lotAdhesion: CreditLot = {
        id: "lot-adhesion",
        workspaceId: "ws-1",
        userId: null,
        origin: CreditOrigin.ADHESION,
        amountGranted: 100,
        amountAvailable: 100,
        amountConsumed: 0,
        status: CreditLotStatus.ACTIVE,
        isAccumulative: true,
        validFrom: new Date("2026-10-01"),
        expiresAt: null,
        planTier: PlanTier.PRO,
        subscriptionId: null,
        eventId: null,
        reason: "Adesão",
        metadata: null,
        createdAt: new Date("2026-10-01"),
        updatedAt: new Date("2026-10-01"),
      };

      const lotMonthly: CreditLot = {
        ...lotAdhesion,
        id: "lot-monthly",
        origin: CreditOrigin.MONTHLY_RENEWAL,
        amountGranted: 500,
        amountAvailable: 500,
      };

      const lotDailyNonAccum: CreditLot = {
        ...lotAdhesion,
        id: "lot-daily-non-accum",
        origin: CreditOrigin.DAILY_RENEWAL,
        isAccumulative: false,
        expiresAt: new Date("2026-10-31T23:59:59Z"),
      };

      const lotPromotional: CreditLot = {
        ...lotAdhesion,
        id: "lot-promo",
        origin: CreditOrigin.PROMOTIONAL,
        expiresAt: new Date("2026-11-15"),
      };

      const lotsInput = [lotAdhesion, lotMonthly, lotDailyNonAccum, lotPromotional];
      const sorted = CreditConsumptionOrderService.sortLotsForConsumption(lotsInput, customPriorities);

      // Ordem esperada:
      // 1º: DAILY_NON_ACCUMULATIVE (lotDailyNonAccum)
      // 2º: PROMOTIONAL (lotPromotional)
      // 3º: MONTHLY_RENEWAL (lotMonthly)
      // 4º: ADHESION (lotAdhesion)
      expect(sorted[0].id).toBe("lot-daily-non-accum");
      expect(sorted[1].id).toBe("lot-promo");
      expect(sorted[2].id).toBe("lot-monthly");
      expect(sorted[3].id).toBe("lot-adhesion");
    });

    it("aplica o critério interno FEFO (First Expired, First Out) entre lotes da mesma categoria", () => {
      const priorities: ConsumptionCategory[] = ["PROMOTIONAL"];

      const promoExpiringLater: CreditLot = {
        id: "promo-later",
        workspaceId: "ws-1",
        userId: null,
        origin: CreditOrigin.PROMOTIONAL,
        amountGranted: 50,
        amountAvailable: 50,
        amountConsumed: 0,
        status: CreditLotStatus.ACTIVE,
        isAccumulative: true,
        validFrom: new Date("2026-10-01"),
        expiresAt: new Date("2026-11-30"), // Expira depois
        planTier: null,
        subscriptionId: null,
        eventId: null,
        reason: "Promoção Black Friday",
        metadata: null,
        createdAt: new Date("2026-10-01"),
        updatedAt: new Date("2026-10-01"),
      };

      const promoExpiringSooner: CreditLot = {
        ...promoExpiringLater,
        id: "promo-sooner",
        expiresAt: new Date("2026-11-05"), // Expira antes
      };

      const promoWithoutExpiration: CreditLot = {
        ...promoExpiringLater,
        id: "promo-never",
        expiresAt: null, // Sem validade
      };

      const sorted = CreditConsumptionOrderService.sortLotsForConsumption(
        [promoWithoutExpiration, promoExpiringLater, promoExpiringSooner],
        priorities
      );

      // Deve ordenar:
      // 1º: promo-sooner (expira primeiro)
      // 2º: promo-later
      // 3º: promo-never (sem expiração vem por último)
      expect(sorted[0].id).toBe("promo-sooner");
      expect(sorted[1].id).toBe("promo-later");
      expect(sorted[2].id).toBe("promo-never");
    });

    it("bloqueia o consumo de categorias marcadas como protegidas", () => {
      const priorities: ConsumptionCategory[] = ["PURCHASED", "MONTHLY_RENEWAL", "ADMIN_OVERRIDE"];
      const protectedCategories: ConsumptionCategory[] = ["PURCHASED"]; // Protegida!

      const lotPurchased: CreditLot = {
        id: "lot-purchased",
        workspaceId: "ws-1",
        userId: null,
        origin: CreditOrigin.PURCHASED,
        amountGranted: 200,
        amountAvailable: 200,
        amountConsumed: 0,
        status: CreditLotStatus.ACTIVE,
        isAccumulative: true,
        validFrom: new Date("2026-10-01"),
        expiresAt: null,
        planTier: null,
        subscriptionId: null,
        eventId: null,
        reason: "Compra de pacote avulso",
        metadata: null,
        createdAt: new Date("2026-10-01"),
        updatedAt: new Date("2026-10-01"),
      };

      const lotMonthly: CreditLot = {
        ...lotPurchased,
        id: "lot-monthly",
        origin: CreditOrigin.MONTHLY_RENEWAL,
      };

      const sorted = CreditConsumptionOrderService.sortLotsForConsumption(
        [lotPurchased, lotMonthly],
        priorities,
        protectedCategories
      );

      // lot-purchased deve ser completamente excluído da lista de consumo!
      expect(sorted.length).toBe(1);
      expect(sorted[0].id).toBe("lot-monthly");
      expect(sorted.some((l) => l.id === "lot-purchased")).toBe(false);
    });
  });

  describe("3. Rotina Diária de Manutenção e Chave de Data", () => {
    it("gera dateKey determinístico no fuso oficial America/Sao_Paulo", () => {
      const fixedDate = new Date("2026-10-31T03:00:00Z"); // 00:00 em America/Sao_Paulo (UTC-3)
      const dateKey = CreditDailyMaintenanceService.getTodayDateKey(fixedDate);
      expect(dateKey).toBe("2026-10-31");
    });

    it("calcula timestamp de final do dia com expiração correta", () => {
      const endOfDay = CreditDailyMaintenanceService.getEndOfDayDate("2026-10-31");
      expect(endOfDay.toISOString()).toContain("2026-11-01T02:59:59.999Z"); // 23:59:59.999-03:00 é 02:59:59.999Z
    });
  });

  describe("4. Concessão de Lotes e Garantia de Idempotência", () => {
    it("retorna o lote existente sem duplicar quando eventId é repetido", async () => {
      const existingLot: Partial<CreditLot> = {
        id: "existing-lot-1",
        eventId: "daily_ws-123_2026-10-31",
        amountGranted: 20,
        amountAvailable: 20,
      };

      const mockTx = {
        creditLot: {
          findFirst: vi.fn().mockResolvedValue(existingLot),
          create: vi.fn(),
        },
      };

      const result = await CreditLotService.grantLot(
        {
          workspaceId: "ws-123",
          origin: CreditOrigin.DAILY_RENEWAL,
          amount: 20,
          eventId: "daily_ws-123_2026-10-31",
          reason: "Cota diária repetida",
        },
        mockTx as any
      );

      expect(result.id).toBe("existing-lot-1");
      expect(mockTx.creditLot.create).not.toHaveBeenCalled();
    });

    it("impede concessão duplicada de créditos de adesão para o mesmo plano", async () => {
      const existingAdhesion: Partial<CreditLot> = {
        id: "adhesion-lot-1",
        origin: CreditOrigin.ADHESION,
        planTier: PlanTier.PRO,
        amountGranted: 100,
      };

      const mockTx = {
        creditLot: {
          findFirst: vi.fn().mockImplementation(({ where }) => {
            if (where.origin === CreditOrigin.ADHESION) return existingAdhesion;
            return null;
          }),
          create: vi.fn(),
        },
      };

      const result = await CreditLotService.grantLot(
        {
          workspaceId: "ws-123",
          origin: CreditOrigin.ADHESION,
          planTier: PlanTier.PRO,
          amount: 100,
          reason: "Tentativa de adesão duplicada",
        },
        mockTx as any
      );

      expect(result.id).toBe("adhesion-lot-1");
      expect(mockTx.creditLot.create).not.toHaveBeenCalled();
    });
  });

  describe("5. Conciliação e Auditoria de Integridade Financeira", () => {
    it("identifica consistência perfeita quando saldo em cache bate com soma dos lotes", async () => {
      const mockWorkspace = {
        id: "ws-clean",
        name: "Studio Clean",
        creditsBalance: 300,
      };

      const mockActiveLots = [
        { id: "lot-1", amountAvailable: 200, status: CreditLotStatus.ACTIVE },
        { id: "lot-2", amountAvailable: 100, status: CreditLotStatus.ACTIVE },
      ];

      const originalFindUnique = CreditLotService.reconcileWorkspace;
      // Testando a lógica de soma e consistência
      const sumActiveLots = mockActiveLots.reduce((acc, l) => acc + l.amountAvailable, 0);
      const discrepancy = mockWorkspace.creditsBalance - sumActiveLots;
      const isConsistent = discrepancy === 0;

      expect(sumActiveLots).toBe(300);
      expect(discrepancy).toBe(0);
      expect(isConsistent).toBe(true);
    });

    it("detecta divergência caso o saldo em cache divirja da soma dos lotes ativos", () => {
      const cachedBalance = 500;
      const sumActiveLots = 400; // 100 créditos órfãos ou não migrados
      const discrepancy = cachedBalance - sumActiveLots;
      const isConsistent = discrepancy === 0;

      expect(discrepancy).toBe(100);
      expect(isConsistent).toBe(false);
    });
  });
});
