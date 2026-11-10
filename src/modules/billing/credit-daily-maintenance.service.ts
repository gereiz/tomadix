import { db } from "@/lib/db";
import { CreditLotService } from "./credit-lot.service";
import { CreditOrigin, SubscriptionStatus } from "@prisma/client";

export interface DailyMaintenanceResult {
  dateKey: string;
  timestamp: string;
  workspacesProcessed: number;
  dailyLotsGranted: number;
  totalDailyCreditsGranted: number;
  expiredLotsCount: number;
  totalExpiredCredits: number;
  errors: Array<{ workspaceId: string; error: string }>;
}

export class CreditDailyMaintenanceService {
  /**
   * Obtém a chave de data atual no fuso horário oficial (America/Sao_Paulo).
   */
  static getTodayDateKey(date = new Date()): string {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(date); // Retorna "YYYY-MM-DD"
  }

  /**
   * Obtém o timestamp do final do dia (23:59:59.999) em America/Sao_Paulo para lotes diários não-acumulativos.
   */
  static getEndOfDayDate(dateKey: string): Date {
    // Ex: "2026-10-30T23:59:59.999-03:00"
    return new Date(`${dateKey}T23:59:59.999-03:00`);
  }

  /**
   * Garante a concessão Just-In-Time (JIT) de créditos diários para um workspace individual.
   * Chamado transparentemente sempre que o workspace acessa o sistema, consulta saldo ou executa operações.
   */
  static async ensureDailyCreditsForWorkspace(workspaceId: string, customDateKey?: string) {
    if (!workspaceId) return null;

    const dateKey = customDateKey || this.getTodayDateKey();
    const eventId = `daily_${workspaceId}_${dateKey}`;

    // 0. Créditos diários não usados de dias anteriores expiram antes da nova concessão
    await CreditLotService.expireOverdueLots(workspaceId);

    // 1. Verificar se o lote diário de hoje já foi concedido
    const existingLot = await db.creditLot.findFirst({
      where: { eventId },
    });

    if (existingLot) {
      return existingLot;
    }

    // 2. Buscar assinatura ativa do workspace e o plano correspondente
    const sub = await db.subscription.findFirst({
      where: {
        workspaceId,
        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
      },
      include: { plan: true },
    });

    if (!sub || !sub.plan || sub.plan.dailyCredits <= 0) {
      return null;
    }

    const plan = sub.plan;
    const dailyAmount = plan.dailyCredits;
    const isAccumulative = Boolean(plan.dailyCreditsAccumulative);
    const endOfDay = this.getEndOfDayDate(dateKey);

    try {
      const lot = await CreditLotService.grantLot({
        workspaceId,
        origin: CreditOrigin.DAILY_RENEWAL,
        amount: dailyAmount,
        planTier: plan.tier,
        subscriptionId: sub.id,
        isAccumulative,
        expiresAt: isAccumulative ? null : endOfDay,
        eventId,
        reason: `Concessão de cota diária de créditos (${dateKey}) [Plano: ${plan.name}]`,
        metadata: {
          dateKey,
          dailyCreditsAccumulative: isAccumulative,
          planTier: plan.tier,
        },
      });

      return lot;
    } catch (err) {
      console.error(`[CreditDailyMaintenance] Erro ao conceder créditos diários JIT para ${workspaceId}:`, err);
      return null;
    }
  }

  /**
   * Executa a rotina unificada de manutenção diária de créditos:
   * 1. Concede créditos diários idempotentes a todos os workspaces com assinaturas ativas e dailyCredits > 0.
   * 2. Expira lotes vencidos e diários não-acumulativos cujo prazo se encerrou.
   */
  static async executeDailyMaintenance(customDateKey?: string): Promise<DailyMaintenanceResult> {
    const dateKey = customDateKey || this.getTodayDateKey();
    const endOfDay = this.getEndOfDayDate(dateKey);

    const errors: Array<{ workspaceId: string; error: string }> = [];
    let workspacesProcessed = 0;
    let dailyLotsGranted = 0;
    let totalDailyCreditsGranted = 0;

    // 1. Expiração automática de todos os lotes que já venceram
    const expirationResult = await CreditLotService.expireOverdueLots();

    // 2. Buscar todos os workspaces com assinatura ATIVA
    const activeSubscriptions = await db.subscription.findMany({
      where: {
        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
      },
      include: {
        workspace: true,
        plan: true,
      },
    });

    for (const sub of activeSubscriptions) {
      workspacesProcessed++;
      const plan = sub.plan;
      const workspaceId = sub.workspaceId;

      if (!plan || plan.dailyCredits <= 0) {
        continue;
      }

      const dailyAmount = plan.dailyCredits;
      const isAccumulative = Boolean(plan.dailyCreditsAccumulative);
      const eventId = `daily_${workspaceId}_${dateKey}`;

      try {
        const lot = await CreditLotService.grantLot({
          workspaceId,
          origin: CreditOrigin.DAILY_RENEWAL,
          amount: dailyAmount,
          planTier: plan.tier,
          subscriptionId: sub.id,
          isAccumulative,
          expiresAt: isAccumulative ? null : endOfDay,
          eventId,
          reason: `Concessão de cota diária de créditos (${dateKey}) [Plano: ${plan.name}]`,
          metadata: {
            dateKey,
            dailyCreditsAccumulative: isAccumulative,
            planTier: plan.tier,
          },
        });

        // Se o lote retornado tiver createdAt compatível com hoje, contamos
        if (lot.eventId === eventId) {
          dailyLotsGranted++;
          totalDailyCreditsGranted += dailyAmount;
        }
      } catch (err: any) {
        console.error(`Erro ao conceder créditos diários para workspace ${workspaceId}:`, err);
        errors.push({
          workspaceId,
          error: err?.message || String(err),
        });
      }
    }

    return {
      dateKey,
      timestamp: new Date().toISOString(),
      workspacesProcessed,
      dailyLotsGranted,
      totalDailyCreditsGranted,
      expiredLotsCount: expirationResult.expiredLotsCount,
      totalExpiredCredits: expirationResult.expiredCreditsTotal,
      errors,
    };
  }
}

