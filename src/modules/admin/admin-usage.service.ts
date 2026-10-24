import { db } from "@/lib/db";
import { GenerationStatus } from "@prisma/client";

// Taxas de precificação estimadas oficiais da Google Gemini API (em USD por 1 milhão de tokens)
const GEMINI_PRICING_USD_PER_MILLION: Record<string, { input: number; output: number }> = {
  "gemini-1.5-flash": { input: 0.075, output: 0.30 },
  "gemini-2.0-flash": { input: 0.075, output: 0.30 },
  "gemini-3.5-flash": { input: 0.075, output: 0.30 },
  "gemini-1.5-pro": { input: 1.25, output: 5.00 },
  "gemini-2.0-pro": { input: 1.25, output: 5.00 },
};

const DEFAULT_MODEL_PRICING = { input: 0.10, output: 0.40 };
const ESTIMATED_USD_BRL_RATE = 5.60;

export class AdminUsageService {
  /**
   * Coleta métricas de consumo de IA, performance da Gemini API e estimativas de custo
   * baseadas exclusivamente em registros reais de jobs e razão de créditos.
   */
  static async getUsageAndCostMetrics(periodDays: number = 30) {
    const cutoffDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    const [
      totalJobsInPeriod,
      statusGroup,
      modelGroup,
      stuckJobs,
      recentFailures,
      tokensAgg,
      creditsConsumedAgg,
      jobsWithWorkspace,
    ] = await Promise.all([
      db.generationJob.count({
        where: { createdAt: { gte: cutoffDate } },
      }),
      db.generationJob.groupBy({
        by: ["status"],
        where: { createdAt: { gte: cutoffDate } },
        _count: { id: true },
      }),
      db.generationJob.groupBy({
        by: ["modelName"],
        where: { createdAt: { gte: cutoffDate } },
        _count: { id: true },
        _sum: {
          inputTokens: true,
          outputTokens: true,
        },
      }),
      db.generationJob.findMany({
        where: {
          status: { in: [GenerationStatus.PENDING, GenerationStatus.RUNNING] },
          createdAt: { lte: fifteenMinutesAgo },
        },
        select: {
          id: true,
          modelName: true,
          status: true,
          createdAt: true,
          startedAt: true,
          project: {
            select: {
              title: true,
              workspace: {
                select: { name: true },
              },
            },
          },
        },
      }),
      db.generationJob.findMany({
        where: {
          status: GenerationStatus.FAILED,
          createdAt: { gte: cutoffDate },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          modelName: true,
          errorMessage: true,
          createdAt: true,
          project: {
            select: {
              title: true,
              workspace: {
                select: { name: true },
              },
            },
          },
        },
      }),
      db.generationJob.aggregate({
        where: { createdAt: { gte: cutoffDate } },
        _sum: {
          inputTokens: true,
          outputTokens: true,
        },
      }),
      db.creditLedger.aggregate({
        where: {
          createdAt: { gte: cutoffDate },
          amount: { lt: 0 },
        },
        _sum: { amount: true },
      }),
      db.generationJob.findMany({
        where: { createdAt: { gte: cutoffDate } },
        select: {
          id: true,
          project: {
            select: {
              workspaceId: true,
              workspace: {
                select: {
                  id: true,
                  name: true,
                  subscription: {
                    select: { planTier: true },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    // Métricas por Status
    const statusCounts: Record<string, number> = {
      SUCCEEDED: 0,
      FAILED: 0,
      PENDING: 0,
      RUNNING: 0,
    };
    for (const item of statusGroup) {
      statusCounts[item.status] = item._count.id;
    }

    const succeededCount = statusCounts.SUCCEEDED || 0;
    const failedCount = statusCounts.FAILED || 0;
    const successRate = totalJobsInPeriod > 0
      ? Number(((succeededCount / totalJobsInPeriod) * 100).toFixed(1))
      : 100;
    const failureRate = totalJobsInPeriod > 0
      ? Number(((failedCount / totalJobsInPeriod) * 100).toFixed(1))
      : 0;

    // Métricas por Modelo e Estimativa de Custos em USD e BRL
    let totalEstimatedCostUsd = 0;

    const modelBreakdown = modelGroup.map((item) => {
      const model = item.modelName || "unknown";
      const pricing = GEMINI_PRICING_USD_PER_MILLION[model] || DEFAULT_MODEL_PRICING;

      const inputTokens = item._sum.inputTokens || 0;
      const outputTokens = item._sum.outputTokens || 0;

      const inputCostUsd = (inputTokens / 1_000_000) * pricing.input;
      const outputCostUsd = (outputTokens / 1_000_000) * pricing.output;
      const modelCostUsd = inputCostUsd + outputCostUsd;

      totalEstimatedCostUsd += modelCostUsd;

      return {
        modelName: model,
        jobsCount: item._count.id,
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        estimatedCostUsd: Number(modelCostUsd.toFixed(4)),
        estimatedCostBrl: Number((modelCostUsd * ESTIMATED_USD_BRL_RATE).toFixed(2)),
      };
    });

    const totalEstimatedCostBrl = Number((totalEstimatedCostUsd * ESTIMATED_USD_BRL_RATE).toFixed(2));

    // Consumo por Plano e Distribuição por Workspace
    const planCounts: Record<string, number> = {};
    const workspaceMap: Record<string, { workspaceId: string; name: string; jobsCount: number }> = {};

    for (const job of jobsWithWorkspace) {
      const tier = job.project?.workspace?.subscription?.planTier || "FREE";
      planCounts[tier] = (planCounts[tier] || 0) + 1;

      const wsId = job.project?.workspaceId;
      const wsName = job.project?.workspace?.name || "Workspace Desconhecido";
      if (wsId) {
        if (!workspaceMap[wsId]) {
          workspaceMap[wsId] = { workspaceId: wsId, name: wsName, jobsCount: 0 };
        }
        workspaceMap[wsId].jobsCount += 1;
      }
    }

    const topWorkspaces = Object.values(workspaceMap)
      .sort((a, b) => b.jobsCount - a.jobsCount)
      .slice(0, 8);

    return {
      periodDays,
      totals: {
        totalJobs: totalJobsInPeriod,
        succeededJobs: succeededCount,
        failedJobs: failedCount,
        pendingJobs: statusCounts.PENDING || 0,
        runningJobs: statusCounts.RUNNING || 0,
        stuckJobsCount: stuckJobs.length,
        successRatePercent: successRate,
        failureRatePercent: failureRate,
        creditsConsumed: Math.abs(creditsConsumedAgg._sum.amount || 0),
        inputTokens: tokensAgg._sum.inputTokens || 0,
        outputTokens: tokensAgg._sum.outputTokens || 0,
        totalTokens: (tokensAgg._sum.inputTokens || 0) + (tokensAgg._sum.outputTokens || 0),
      },
      costs: {
        isEstimate: true,
        methodology: "Calculado a partir dos tokens reais processados pela Google Gemini API.",
        exchangeRateUsdBrl: ESTIMATED_USD_BRL_RATE,
        totalCostUsd: Number(totalEstimatedCostUsd.toFixed(4)),
        totalCostBrl: totalEstimatedCostBrl,
        formattedBrl: totalEstimatedCostBrl.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        }),
      },
      models: modelBreakdown,
      plans: Object.entries(planCounts).map(([tier, count]) => ({ tier, count })),
      stuckJobs,
      recentFailures,
      topWorkspaces,
    };
  }

  /**
   * Destrava jobs de geração travados (PENDING ou RUNNING) marcando-os como FAILED
   * com mensagem explicativa e estornando eventuais créditos bloqueados.
   */
  static async resolveStuckJobs(adminUserId: string, jobIds: string[]) {
    if (!jobIds || jobIds.length === 0) {
      return { resolved: 0 };
    }

    const updated = await db.generationJob.updateMany({
      where: {
        id: { in: jobIds },
        status: { in: [GenerationStatus.PENDING, GenerationStatus.RUNNING] },
      },
      data: {
        status: GenerationStatus.FAILED,
        errorMessage: "Job encerrado administrativamente por exceder o tempo limite de execução.",
        finishedAt: new Date(),
      },
    });

    return { resolved: updated.count };
  }
}
