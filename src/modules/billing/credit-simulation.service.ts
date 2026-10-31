import { db } from "@/lib/db";
import { PlanTier } from "@prisma/client";
import { CreditPricingService } from "./credit-pricing.service";

export interface PlanServiceCapacity {
  operationCode: string;
  operationName: string;
  category: string;
  costInCredits: number;
  isFree: boolean;
  adhesionPossibleUses: number;
  monthlyPossibleUses: number;
  dailyPossibleUses: number;
  totalMonthlyEstimatedUses: number;
}

export interface PlanCapacitySimulation {
  planTier: PlanTier;
  planName: string;
  monthlyPriceCents: number;
  isFreePlan: boolean;
  credits: {
    adhesion: number;
    monthly: number;
    daily: number;
    dailyAccumulative: boolean;
    totalEstimatedMonthly: number;
  };
  services: PlanServiceCapacity[];
  disclaimer: string;
}

export class CreditSimulationService {
  /**
   * Gera a simulação dinâmica e transparente de capacidade de utilização para um plano
   * consultando exclusivamente os custos reais do catálogo de operações no banco de dados.
   */
  static async simulateCapacityForPlan(planConfig: {
    tier: PlanTier;
    name?: string;
    priceMonthly?: number;
    isFreePlan?: boolean;
    adhesionCredits?: number;
    monthlyCredits?: number;
    dailyCredits?: number;
    dailyCreditsAccumulative?: boolean;
  }): Promise<PlanCapacitySimulation> {
    const tier = planConfig.tier;
    const adhesionCredits = Math.max(0, planConfig.adhesionCredits ?? 0);
    const monthlyCredits = Math.max(0, planConfig.monthlyCredits ?? 0);
    const dailyCredits = Math.max(0, planConfig.dailyCredits ?? 0);
    const dailyAccumulative = Boolean(planConfig.dailyCreditsAccumulative);

    // Estimativa de créditos no ciclo mensal de 30 dias (mensais + diários * 30)
    const totalEstimatedMonthly = monthlyCredits + dailyCredits * 30;

    // Buscar todas as operações ativas registradas no sistema
    const operations = await CreditPricingService.listOperations({ onlyActive: true });

    const services: PlanServiceCapacity[] = operations.map((op) => {
      // Verificar se há regra de precificação específica para o plano
      const rule = op.pricingRules.find((r) => r.planTier === tier && r.isActive);
      const costInCredits = rule ? rule.creditCost : op.defaultCreditCost;
      const isFree = rule ? rule.isFree : op.isFree;

      if (isFree || costInCredits <= 0) {
        return {
          operationCode: op.code,
          operationName: op.name,
          category: op.category,
          costInCredits: 0,
          isFree: true,
          adhesionPossibleUses: 999999, // Ilimitado
          monthlyPossibleUses: 999999,
          dailyPossibleUses: 999999,
          totalMonthlyEstimatedUses: 999999,
        };
      }

      return {
        operationCode: op.code,
        operationName: op.name,
        category: op.category,
        costInCredits,
        isFree: false,
        adhesionPossibleUses: Math.floor(adhesionCredits / costInCredits),
        monthlyPossibleUses: Math.floor(monthlyCredits / costInCredits),
        dailyPossibleUses: Math.floor(dailyCredits / costInCredits),
        totalMonthlyEstimatedUses: Math.floor(totalEstimatedMonthly / costInCredits),
      };
    });

    return {
      planTier: tier,
      planName: planConfig.name || `Plano ${tier}`,
      monthlyPriceCents: planConfig.priceMonthly ?? 0,
      isFreePlan: Boolean(planConfig.isFreePlan),
      credits: {
        adhesion: adhesionCredits,
        monthly: monthlyCredits,
        daily: dailyCredits,
        dailyAccumulative: dailyAccumulative,
        totalEstimatedMonthly,
      },
      services,
      disclaimer:
        "Estimativa ilustrativa: cada linha representa a capacidade máxima de utilização caso todos os créditos do período sejam alocados exclusivamente naquela operação. Os usuários podem combinar livremente múltiplos serviços ao longo do ciclo.",
    };
  }

  /**
   * Gera simulações completas para todos os planos cadastrados no banco de dados.
   */
  static async simulateAllPlans(): Promise<PlanCapacitySimulation[]> {
    const plans = await db.plan.findMany({
      where: { isActive: true },
      orderBy: [{ displayOrder: "asc" }, { priceMonthly: "asc" }],
    });

    const simulations: PlanCapacitySimulation[] = [];

    for (const plan of plans) {
      const sim = await this.simulateCapacityForPlan({
        tier: plan.tier,
        name: plan.name,
        priceMonthly: plan.priceMonthly,
        isFreePlan: plan.isFreePlan,
        adhesionCredits: plan.adhesionCredits,
        monthlyCredits: plan.monthlyCredits,
        dailyCredits: plan.dailyCredits,
        dailyCreditsAccumulative: plan.dailyCreditsAccumulative,
      });
      simulations.push(sim);
    }

    return simulations;
  }
}
