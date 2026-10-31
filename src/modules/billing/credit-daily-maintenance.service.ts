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

