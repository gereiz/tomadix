import { db } from "@/lib/db";
import { PlanTier } from "@prisma/client";
import { EntitlementService } from "./entitlement.service";
import { CreditPricingService } from "./credit-pricing.service";
import { BillingPolicyService } from "./billing-policy.service";

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
   * Executa uma operação com validação prévia de créditos, débito atômico e estorno automático garantido em falhas.
   */
  static async executeWithCredits<T>(
    options: CreditExecutionOptions,
    operationFn: (context: { creditCost: number; planTier: PlanTier }) => Promise<T>
  ): Promise<CreditExecutionResult<T>> {
    const { workspaceId, operationCode, description, metadata = {}, projectId, userId } = options;

    // 1. Obter assinatura e plano atual do workspace
    const sub = await EntitlementService.getWorkspaceSubscription(workspaceId);
    const planTier = (sub?.planTier as PlanTier) || PlanTier.FREE;

    // 2. Resolver o custo vigente no catálogo de preços (com suporte a override por plano)
    const costResolution = await CreditPricingService.resolveCost(operationCode, planTier);
    const creditCost = costResolution.isFree ? 0 : costResolution.creditCost;

    let balanceAfterDeduction = 0;

    // 3. Se houver custo, verificar saldo e debitar de forma atômica com trava transacional
    if (creditCost > 0) {
      await EntitlementService.assertCanConsumeCredits(workspaceId, creditCost);
      balanceAfterDeduction = await EntitlementService.deductCredits(
        workspaceId,
        creditCost,
        `${description} (${costResolution.operationName})`,
        {
          ...metadata,
          operationCode,
          appliedRule: costResolution.appliedRule,
          version: costResolution.version,
          projectId,
          userId,
        }
      );
    } else {
      const ws = await db.workspace.findUnique({
        where: { id: workspaceId },
        select: { creditsBalance: true },
      });
      balanceAfterDeduction = ws?.creditsBalance ?? 0;
    }

    try {
      // 4. Executar a operação real (IA, criação, decupagem, etc)
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
      // 5. Em caso de falha da operação, acionar política de estorno automático
      if (creditCost > 0) {
        try {
          const autoRefund = await BillingPolicyService.getPolicyValue<boolean>(
            "CREDIT_REFUND_ON_FAILURE",
            true
          );

          if (autoRefund) {
            const refundedWs = await db.workspace.update({
              where: { id: workspaceId },
              data: { creditsBalance: { increment: creditCost } },
              select: { creditsBalance: true },
            });

            await db.creditLedger.create({
              data: {
                workspaceId,
                amount: creditCost,
                balanceAfter: refundedWs.creditsBalance,
                reason: `Estorno automático por falha na operação [${operationCode}]: ${operationError?.message || "Erro interno"}`,
                metadata: {
                  ...metadata,
                  operationCode,
                  refundFor: description,
                  projectId,
                  userId,
                  originalError: operationError?.message || String(operationError),
                },
              },
            });
          }
        } catch (refundError) {
          console.error("Falha ao registrar estorno de créditos:", refundError);
        }
      }

      throw operationError;
    }
  }
}

