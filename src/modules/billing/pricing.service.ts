import { BillingInterval } from "@prisma/client";

export interface PricingCalculationResult {
  baseMonthlyInCents: number;
  baseYearlyInCents: number;
  selectedInterval: BillingInterval;
  rawPriceInCents: number;
  finalPriceInCents: number;
  discountAmountInCents: number;
  discountPercent: number;
  isPromotional: boolean;
  currency: string;
  formattedMonthly: string;
  formattedTotal: string;
}

export class PricingService {
  /**
   * Formata valores em centavos para moeda legível (ex: R$ 89,00).
   */
  static formatCurrency(amountInCents: number, currency = "BRL"): string {
    const value = (amountInCents || 0) / 100;
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    });
  }

  /**
   * Calcula o preço final a ser cobrado considerando ciclo e promoções ativas.
   * Não utiliza ponto flutuante para valores monetários críticos.
   */
  static calculatePlanPricing(
    plan: {
      priceMonthly: number;
      priceYearly: number;
      currency?: string;
      annualDiscountPercent?: number;
      promoPriceMonthly?: number | null;
      promoPriceYearly?: number | null;
      promoStartsAt?: Date | string | null;
      promoEndsAt?: Date | string | null;
      isOfferAvailable?: boolean;
    },
    interval: BillingInterval = BillingInterval.MONTHLY
  ): PricingCalculationResult {
    const currency = plan.currency || "BRL";
    const now = new Date();

    // Verifica se a promoção está no período de vigência
    let isPromoActive = false;
    if (plan.isOfferAvailable !== false) {
      const starts = plan.promoStartsAt ? new Date(plan.promoStartsAt) : null;
      const ends = plan.promoEndsAt ? new Date(plan.promoEndsAt) : null;

      const afterStart = !starts || now >= starts;
      const beforeEnd = !ends || now <= ends;
      isPromoActive = afterStart && beforeEnd;
    }

    const baseMonthly = Math.max(0, Math.round(plan.priceMonthly || 0));
    const baseYearly = Math.max(0, Math.round(plan.priceYearly || baseMonthly * 12));

    let finalMonthly = baseMonthly;
    let finalYearly = baseYearly;

    if (isPromoActive) {
      if (typeof plan.promoPriceMonthly === "number" && plan.promoPriceMonthly >= 0) {
        finalMonthly = Math.round(plan.promoPriceMonthly);
      }
      if (typeof plan.promoPriceYearly === "number" && plan.promoPriceYearly >= 0) {
        finalYearly = Math.round(plan.promoPriceYearly);
      }
    }

    const isYearly = interval === BillingInterval.YEARLY;
    const rawPriceInCents = isYearly ? baseYearly : baseMonthly;
    const finalPriceInCents = isYearly ? finalYearly : finalMonthly;

    const discountAmountInCents = Math.max(0, rawPriceInCents - finalPriceInCents);
    const discountPercent =
      rawPriceInCents > 0
        ? Math.round((discountAmountInCents / rawPriceInCents) * 100)
        : (isYearly ? plan.annualDiscountPercent || 0 : 0);

    const equivalentMonthlyInCents = isYearly
      ? Math.round(finalPriceInCents / 12)
      : finalPriceInCents;

    return {
      baseMonthlyInCents: baseMonthly,
      baseYearlyInCents: baseYearly,
      selectedInterval: interval,
      rawPriceInCents,
      finalPriceInCents,
      discountAmountInCents,
      discountPercent,
      isPromotional: isPromoActive && (finalPriceInCents < rawPriceInCents),
      currency,
      formattedMonthly: this.formatCurrency(equivalentMonthlyInCents, currency),
      formattedTotal: this.formatCurrency(finalPriceInCents, currency),
    };
  }

  /**
   * Valida compatibilidade entre preço do catálogo e provedores externos (ex: Stripe / Mercado Pago).
   */
  static validateGatewayPriceCompatibility(params: {
    currency: string;
    priceMonthlyInCents: number;
    priceYearlyInCents: number;
    gatewayPriceIdMonthly?: string | null;
    gatewayPriceIdYearly?: string | null;
  }): { valid: boolean; warnings: string[] } {
    const warnings: string[] = [];

    if (params.priceMonthlyInCents > 0 && !params.gatewayPriceIdMonthly) {
      warnings.push("O plano possui preço mensal cadastrado mas nenhum Price ID do gateway associado.");
    }

    if (params.priceYearlyInCents > 0 && !params.gatewayPriceIdYearly) {
      warnings.push("O plano possui preço anual cadastrado mas nenhum Price ID anual do gateway associado.");
    }

    if (!["BRL", "USD", "EUR"].includes(params.currency.toUpperCase())) {
      warnings.push(`Moeda '${params.currency}' não homologada para pagamentos recorrentes automáticos.`);
    }

    return {
      valid: warnings.length === 0,
      warnings,
    };
  }
}
