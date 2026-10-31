import { db } from "@/lib/db";
import { CreditLot, CreditLotStatus, CreditOrigin, PlanTier, Prisma } from "@prisma/client";
import { EntitlementService } from "./entitlement.service";
import { CreditPricingService } from "./credit-pricing.service";
import { BillingPolicyService } from "./billing-policy.service";
import { CreditConsumptionOrderService } from "./credit-consumption-order.service";
import { CreditLotService } from "./credit-lot.service";

export interface CreditExecutionOptions {
  workspaceId: string;
  operationCode: string;
  description: string;
  metadata?: Record<string, any>;
  idempotencyKey?: string;
  projectId?: string;
  userId?: string;
}

export interface CreditExecutionResult<T> {
  success: boolean;
  result: T;
  creditCost: number;
  newBalance: number;
  operationCode: string;
  refunded?: boolean;
}

export interface UsedLotRecord {
  lotId: string;
  origin: CreditOrigin;
  category: string;
  deducted: number;
}

export class CreditConsumptionError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, code = "INSUFFICIENT_CREDITS", statusCode = 402) {
    super(message);
    this.name = "CreditConsumptionError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class CreditExecutionService {
  /**
   * Executa uma operação com resolução dinâmica de custos, validação de prioridades de lotes,
   * débito atômico multilot e estorno compensatório automático em caso de falha.
   */
  static async executeWithCredits<T>(
    options: CreditExecutionOptions,
    operationFn: (context: { creditCost: number; planTier: PlanTier }) => Promise<T>
  ): Promise<CreditExecutionResult<T>> {
    const { workspaceId, operationCode, description, metadata = {}, projectId, userId, idempotencyKey } = options;

    // 1. Obter assinatura e plano atual do workspace
    const sub = await EntitlementService.getWorkspaceSubscription(workspaceId);
    const planTier = (sub?.planTier as PlanTier) || PlanTier.FREE;

    // 2. Resolver o custo vigente no catálogo de preços (com suporte a override por plano)
    const costResolution = await CreditPricingService.resolveCost(operationCode, planTier);
    const creditCost = costResolution.isFree ? 0 : costResolution.creditCost;

    let balanceAfterDeduction = 0;
    const usedLots: UsedLotRecord[] = [];

    // 3. Se houver custo, debitar atômico respeitando a Ordem Global de Consumo e FEFO
    if (creditCost > 0) {
      const deductionResult = await this.deductViaConsumptionOrder({
        workspaceId,
        creditCost,
        operationCode,
        description: `${description} (${costResolution.operationName})`,
        costResolution,
        projectId,
        userId,
        idempotencyKey,
        metadata,
      });

      balanceAfterDeduction = deductionResult.newBalance;
      usedLots.push(...deductionResult.usedLots);
    } else {
      const ws = await db.workspace.findUnique({
        where: { id: workspaceId },
        select: { creditsBalance: true },
      });
      balanceAfterDeduction = ws?.creditsBalance ?? 0;
    }

    try {
      // 4. Executar a operação real (IA, criação de cena, personagem, ambiente, etc.)
      const result = await operationFn({ creditCost, planTier });

      return {
        success: true,
        result,
        creditCost,
        newBalance: balanceAfterDeduction,
        operationCode,
        refunded: false,
      };
    } catch (operationError: any) {
      // 5. Em caso de falha da operação, acionar estorno automático proporcional aos lotes utilizados
      if (creditCost > 0 && usedLots.length > 0) {
        try {
          const autoRefund = await BillingPolicyService.getPolicyValue<boolean>(
            "CREDIT_REFUND_ON_FAILURE",
            true
          );

          if (autoRefund) {
            await this.refundDeductedLots({
              workspaceId,
              usedLots,
              totalRefund: creditCost,
              operationCode,
              description,
              originalError: operationError?.message || String(operationError),
              projectId,
              userId,
              metadata,
            });
          }
        } catch (refundError) {
          console.error("Falha ao registrar estorno compensatório de créditos nos lotes:", refundError);
        }
      }

      throw operationError;
    }
  }

  /**
   * Realiza a dedução de créditos respeitando a Ordem Global de Consumo configurada no painel administrativo.
   */
  private static async deductViaConsumptionOrder(params: {
    workspaceId: string;
    creditCost: number;
    operationCode: string;
    description: string;
    costResolution: any;
    projectId?: string;
    userId?: string;
    idempotencyKey?: string;
    metadata: Record<string, any>;
  }): Promise<{ newBalance: number; usedLots: UsedLotRecord[] }> {
    const { workspaceId, creditCost, operationCode, description, costResolution, projectId, userId, idempotencyKey, metadata } = params;

    return await db.$transaction(async (tx) => {
      // 1. Obter o workspace atual
      const workspace = await tx.workspace.findUnique({
        where: { id: workspaceId },
        select: { id: true, creditsBalance: true },
      });

      if (!workspace) {
        throw new CreditConsumptionError("Workspace não encontrado.", "WORKSPACE_NOT_FOUND", 404);
      }

      if (workspace.creditsBalance < creditCost) {
        throw new CreditConsumptionError(
          `Saldo insuficiente de créditos (${workspace.creditsBalance} disponíveis, ${creditCost} necessários para ${operationCode}). Adquira novos créditos ou faça upgrade.`,
          "INSUFFICIENT_CREDITS",
          402
        );
      }

      // 2. Obter lotes elegíveis e configuração ativa de ordem de consumo
      const eligibleLots = await CreditLotService.getEligibleLotsForConsumption(workspaceId, tx);
      const consumptionConfig = await CreditConsumptionOrderService.getActiveConfig();

      // 3. Ordenar lotes pela prioridade global e FEFO
      const sortedLots = CreditConsumptionOrderService.sortLotsForConsumption(
        eligibleLots,
        consumptionConfig.categoryPriorities,
        consumptionConfig.protectedCategories
      );

      const availableInLots = sortedLots.reduce((acc, l) => acc + l.amountAvailable, 0);

      // Se não houver lotes suficientes cadastrados (ex: antes da migração de lotes legados), criar lote LEGACY dinâmico
      if (availableInLots < creditCost && workspace.creditsBalance >= creditCost) {
        const neededDeficit = creditCost - availableInLots;
        const legacyLot = await tx.creditLot.create({
          data: {
            workspaceId,
            origin: CreditOrigin.LEGACY,
            amountGranted: Math.max(neededDeficit, workspace.creditsBalance),
            amountAvailable: Math.max(neededDeficit, workspace.creditsBalance),
            amountConsumed: 0,
            status: CreditLotStatus.ACTIVE,
            isAccumulative: true,
            reason: "Criação de lote LEGACY automático para cobrir saldo pré-existente",
          },
        });
        sortedLots.push(legacyLot);
      }

      let remainingToDeduct = creditCost;
      let runningBalance = workspace.creditsBalance;
      const usedLots: UsedLotRecord[] = [];

      // 4. Consumir sequencialmente dos lotes ordenados
      for (const lot of sortedLots) {
        if (remainingToDeduct <= 0) break;
        if (lot.amountAvailable <= 0) continue;

        const deductFromThisLot = Math.min(lot.amountAvailable, remainingToDeduct);
        const newLotAvailable = lot.amountAvailable - deductFromThisLot;
        const newLotConsumed = lot.amountConsumed + deductFromThisLot;
        const isExhausted = newLotAvailable === 0;

        await tx.creditLot.update({
          where: { id: lot.id },
          data: {
            amountAvailable: newLotAvailable,
            amountConsumed: newLotConsumed,
            status: isExhausted ? CreditLotStatus.EXHAUSTED : CreditLotStatus.ACTIVE,
          },
        });

        runningBalance -= deductFromThisLot;
        remainingToDeduct -= deductFromThisLot;

        const category = CreditConsumptionOrderService.categorizeLot(lot);
        usedLots.push({
          lotId: lot.id,
          origin: lot.origin,
          category,
          deducted: deductFromThisLot,
        });

        // Lançamento no Ledger para cada lote debitado
        await tx.creditLedger.create({
          data: {
            workspaceId,
            amount: -deductFromThisLot,
            balanceAfter: runningBalance,
            lotId: lot.id,
            origin: lot.origin,
            operationCode,
            reason: `${description} [Lote: ${lot.origin}]`,
            userId: userId || null,
            idempotencyKey: idempotencyKey ? `${idempotencyKey}_${lot.id}` : null,
            metadata: {
              ...metadata,
              operationCode,
              category,
              lotId: lot.id,
              deductedFromLot: deductFromThisLot,
              appliedRule: costResolution.appliedRule,
              version: costResolution.version,
              consumptionOrderVersion: consumptionConfig.version,
              projectId,
              userId,
            },
          },
        });
      }

      if (remainingToDeduct > 0) {
        throw new CreditConsumptionError(
          `Não foi possível consumir a totalidade dos créditos necessários (${creditCost}) nos lotes disponíveis.`,
          "INSUFFICIENT_ELIGIBLE_LOTS",
          402
        );
      }

      // 5. Atualizar saldo agregado final do workspace
      await tx.workspace.update({
        where: { id: workspaceId },
        data: { creditsBalance: runningBalance },
      });

      return {
        newBalance: runningBalance,
        usedLots,
      };
    });
  }

  /**
   * Estorna proporcionalmente os lotes que foram debitados na operação que falhou.
   */
  private static async refundDeductedLots(params: {
    workspaceId: string;
    usedLots: UsedLotRecord[];
    totalRefund: number;
    operationCode: string;
    description: string;
    originalError: string;
    projectId?: string;
    userId?: string;
    metadata: Record<string, any>;
  }): Promise<void> {
    const { workspaceId, usedLots, totalRefund, operationCode, description, originalError, projectId, userId, metadata } = params;

    await db.$transaction(async (tx) => {
      const workspace = await tx.workspace.findUnique({
        where: { id: workspaceId },
        select: { creditsBalance: true },
      });

      if (!workspace) return;

      let runningBalance = workspace.creditsBalance;
      const now = new Date();

      for (const item of usedLots) {
        const lot = await tx.creditLot.findUnique({
          where: { id: item.lotId },
        });

        const isLotStillValid = lot && (!lot.expiresAt || lot.expiresAt > now);

        if (lot && isLotStillValid) {
          // Restaurar no lote original
          await tx.creditLot.update({
            where: { id: lot.id },
            data: {
              amountAvailable: { increment: item.deducted },
              amountConsumed: { decrement: item.deducted },
              status: CreditLotStatus.ACTIVE,
            },
          });
        } else {
          // Lote original expirou entre a dedução e a falha: criar novo lote de REFUND
          await tx.creditLot.create({
            data: {
              workspaceId,
              userId: userId || null,
              origin: CreditOrigin.REFUND,
              amountGranted: item.deducted,
              amountAvailable: item.deducted,
              amountConsumed: 0,
              status: CreditLotStatus.ACTIVE,
              isAccumulative: true,
              reason: `Estorno compensatório por expiração do lote original [${item.lotId}]`,
            },
          });
        }

        runningBalance += item.deducted;

        await tx.creditLedger.create({
          data: {
            workspaceId,
            amount: item.deducted,
            balanceAfter: runningBalance,
            lotId: item.lotId,
            origin: CreditOrigin.REFUND,
            operationCode,
            reason: `Estorno automático por falha na operação [${operationCode}]: ${description}`,
            userId: userId || null,
            metadata: {
              ...metadata,
              originalLotId: item.lotId,
              originalOrigin: item.origin,
              originalError,
              projectId,
              userId,
            },
          },
        });
      }

      await tx.workspace.update({
        where: { id: workspaceId },
        data: { creditsBalance: runningBalance },
      });
    });
  }
}
