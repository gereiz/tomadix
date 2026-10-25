import { db } from "@/lib/db";
import { PlanTier, Prisma } from "@prisma/client";
import { AdminAuditService } from "@/modules/admin/admin-audit.service";

export interface DefaultOperationSeed {
  code: string;
  name: string;
  description: string;
  category: string;
  defaultCreditCost: number;
  isFree?: boolean;
}

export const SEED_CREDIT_OPERATIONS: DefaultOperationSeed[] = [
  {
    code: "GEN_CHARACTER",
    name: "Geração de Personagem",
    description: "Criação de perfil cinematográfico de personagem e ficha de atuação.",
    category: "CHARACTERS",
    defaultCreditCost: 5,
  },
  {
    code: "GEN_ENVIRONMENT",
    name: "Geração de Ambiente / Locação",
    description: "Concepção de ambientação visual, iluminação e espaço cênico.",
    category: "ENVIRONMENTS",
    defaultCreditCost: 3,
  },
  {
    code: "GEN_VISUAL_BIBLE",
    name: "Geração de Bíblia Visual",
    description: "Compilação estética completa do projeto cinematográfico com direção de arte.",
    category: "PREMIUM",
    defaultCreditCost: 10,
  },
  {
    code: "GEN_IMAGE_PROMPT",
    name: "Geração de Prompt de Imagem",
    description: "Prompt estruturado para geradores de imagem (Midjourney, Flux, SD).",
    category: "PROMPTS",
    defaultCreditCost: 2,
  },
  {
    code: "GEN_VIDEO_PROMPT",
    name: "Geração de Prompt de Vídeo",
    description: "Instruções cinematográficas dinâmicas para Runway Gen-3, Kling, Luma.",
    category: "PROMPTS",
    defaultCreditCost: 8,
  },
  {
    code: "GEN_SCENE_SEQUENCE",
    name: "Geração de Sequência de Cenas",
    description: "Estruturação seriada de cenas e enquadramentos contínuos.",
    category: "SCENES",
    defaultCreditCost: 12,
  },
  {
    code: "GEN_SCRIPT",
    name: "Geração de Roteiro Completo",
    description: "Criação de roteiro técnico com diálogos e rubricas de direção.",
    category: "SCENES",
    defaultCreditCost: 15,
  },
  {
    code: "REWRITE_ENHANCE",
    name: "Aprimoramento / Reescrita de Prompt",
    description: "Otimização de vocabulário de lente, iluminação e atmosfera.",
    category: "EXPANSIONS",
    defaultCreditCost: 2,
  },
  {
    code: "EXPAND_SCENE",
    name: "Expansão de Cena",
    description: "Desdobramento de sub-planos, planos detalhe e variações de ângulo.",
    category: "EXPANSIONS",
    defaultCreditCost: 4,
  },
  {
    code: "BATCH_GENERATION",
    name: "Geração em Lote",
    description: "Processamento paralelo simultâneo de múltiplos prompts ou cenas.",
    category: "BATCH",
    defaultCreditCost: 20,
  },
];

export class CreditPricingService {
  /**
   * Garante a inicialização das operações padrão cobradas se a tabela estiver vazia.
   */
  static async seedDefaultOperations() {
    const count = await db.creditOperation.count();
    if (count > 0) return;

    for (const op of SEED_CREDIT_OPERATIONS) {
      await db.creditOperation.upsert({
        where: { code: op.code },
        create: {
          code: op.code,
          name: op.name,
          description: op.description,
          category: op.category,
          defaultCreditCost: op.defaultCreditCost,
          isFree: op.isFree || false,
          isActive: true,
          version: 1,
        },
        update: {},
      });
    }
  }

  /**
   * Lista todas as operações cobradas com suas respectivas regras por plano.
   */
  static async listOperations(params?: { category?: string; onlyActive?: boolean }) {
    await this.seedDefaultOperations();

    const where: Prisma.CreditOperationWhereInput = {};
    if (params?.category && params.category !== "all") {
      where.category = params.category;
    }
    if (params?.onlyActive) {
      where.isActive = true;
    }

    return db.creditOperation.findMany({
      where,
      orderBy: [{ category: "asc" }, { defaultCreditCost: "asc" }],
      include: {
        pricingRules: {
          where: params?.onlyActive ? { isActive: true } : undefined,
          orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        },
      },
    });
  }

  /**
   * Cria ou atualiza uma operação cobrada no catálogo.
   */
  static async upsertOperation(
    adminUserId: string,
    data: {
      id?: string;
      code: string;
      name: string;
      description?: string;
      category: string;
      defaultCreditCost: number;
      isFree?: boolean;
      isActive?: boolean;
    },
    context?: { ip?: string; ua?: string }
  ) {
    if (data.defaultCreditCost < 0) {
      throw new Error("O custo padrão de créditos não pode ser negativo.");
    }

    const cleanCode = data.code.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");

    const existing = await db.creditOperation.findUnique({
      where: { code: cleanCode },
    });

    const operation = await db.creditOperation.upsert({
      where: { code: cleanCode },
      create: {
        code: cleanCode,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        category: data.category.trim().toUpperCase(),
        defaultCreditCost: data.defaultCreditCost,
        isFree: Boolean(data.isFree),
        isActive: data.isActive !== undefined ? data.isActive : true,
        version: 1,
      },
      update: {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        category: data.category.trim().toUpperCase(),
        defaultCreditCost: data.defaultCreditCost,
        isFree: Boolean(data.isFree),
        isActive: data.isActive !== undefined ? data.isActive : true,
        version: existing ? existing.version + 1 : 1,
      },
    });

    await AdminAuditService.logAction({
      adminUserId,
      action: existing ? "CREDIT_OPERATION_UPDATE" : "CREDIT_OPERATION_CREATE",
      targetType: "CreditOperation",
      targetId: operation.id,
      result: "SUCCESS",
      details: {
        code: cleanCode,
        name: data.name,
        defaultCreditCost: data.defaultCreditCost,
        isFree: data.isFree,
        previousCost: existing?.defaultCreditCost,
      },
      ipAddress: context?.ip,
      userAgent: context?.ua,
    });

    return operation;
  }

  /**
   * Adiciona ou atualiza uma regra de preço diferenciada para um plano específico.
   */
  static async setPricingRule(
    adminUserId: string,
    data: {
      operationId: string;
      planTier?: PlanTier | null;
      creditCost: number;
      isFree?: boolean;
      effectiveUntil?: string | Date | null;
      priority?: number;
      isActive?: boolean;
    },
    context?: { ip?: string; ua?: string }
  ) {
    const operation = await db.creditOperation.findUnique({
      where: { id: data.operationId },
    });

    if (!operation) {
      throw new Error("Operação de crédito não encontrada.");
    }

    if (data.creditCost < 0) {
      throw new Error("O custo de créditos não pode ser negativo.");
    }

    const rule = await db.creditPricingRule.create({
      data: {
        operationId: data.operationId,
        planTier: data.planTier || null,
        creditCost: data.creditCost,
        isFree: Boolean(data.isFree),
        effectiveFrom: new Date(),
        effectiveUntil: data.effectiveUntil ? new Date(data.effectiveUntil) : null,
        priority: data.priority ?? 1,
        isActive: data.isActive !== undefined ? data.isActive : true,
        version: 1,
      },
    });

    await AdminAuditService.logAction({
      adminUserId,
      action: "CREDIT_PRICING_RULE_CREATE",
      targetType: "CreditPricingRule",
      targetId: rule.id,
      result: "SUCCESS",
      details: {
        operationCode: operation.code,
        planTier: data.planTier,
        creditCost: data.creditCost,
        isFree: data.isFree,
      },
      ipAddress: context?.ip,
      userAgent: context?.ua,
    });

    return rule;
  }

  /**
   * Exclui ou desativa uma regra de preço.
   */
  static async deletePricingRule(
    adminUserId: string,
    ruleId: string,
    context?: { ip?: string; ua?: string }
  ) {
    const rule = await db.creditPricingRule.findUnique({
      where: { id: ruleId },
      include: { operation: true },
    });

    if (!rule) {
      throw new Error("Regra de preço não encontrada.");
    }

    await db.creditPricingRule.delete({ where: { id: ruleId } });

    await AdminAuditService.logAction({
      adminUserId,
      action: "CREDIT_PRICING_RULE_DELETE",
      targetType: "CreditPricingRule",
      targetId: ruleId,
      result: "SUCCESS",
      details: {
        operationCode: rule.operation.code,
        planTier: rule.planTier,
        creditCost: rule.creditCost,
      },
      ipAddress: context?.ip,
      userAgent: context?.ua,
    });

    return { success: true, deletedId: ruleId };
  }

  /**
   * Resolução hierárquica e determinística do custo em créditos (Seção 7.3 do requisito):
   * 1. Regra específica ativa vigente para (operação, plano).
   * 2. Regra padrão ativa da operação.
   * 3. Fallback controlado (NUNCA gratuidade silenciosa para operações tarifadas).
   */
  static async resolveCost(
    operationCode: string,
    planTier: PlanTier = PlanTier.FREE
  ): Promise<{
    operationCode: string;
    creditCost: number;
    isFree: boolean;
    appliedRule: "PLAN_SPECIFIC" | "OPERATION_DEFAULT" | "SYSTEM_FALLBACK";
    operationName: string;
    version: number;
  }> {
    const operation = await db.creditOperation.findUnique({
      where: { code: operationCode },
      include: {
        pricingRules: {
          where: {
            isActive: true,
            OR: [
              { effectiveUntil: null },
              { effectiveUntil: { gt: new Date() } },
            ],
          },
          orderBy: { priority: "desc" },
        },
      },
    });

    if (operation) {
      if (!operation.isActive) {
        throw new Error(`A operação '${operation.name}' está temporariamente desativada pela administração.`);
      }

      // 1. Procurar regra específica para o plano
      const planRule = operation.pricingRules.find((r) => r.planTier === planTier);
      if (planRule) {
        return {
          operationCode,
          creditCost: planRule.isFree ? 0 : planRule.creditCost,
          isFree: planRule.isFree || planRule.creditCost === 0,
          appliedRule: "PLAN_SPECIFIC",
          operationName: operation.name,
          version: planRule.version,
        };
      }

      // 2. Regra padrão da operação
      return {
        operationCode,
        creditCost: operation.isFree ? 0 : operation.defaultCreditCost,
        isFree: operation.isFree || operation.defaultCreditCost === 0,
        appliedRule: "OPERATION_DEFAULT",
        operationName: operation.name,
        version: operation.version,
      };
    }

    // 3. Fallback de segurança se a operação não foi cadastrada no catálogo
    return {
      operationCode,
      creditCost: 1, // Fallback mínimo seguro
      isFree: false,
      appliedRule: "SYSTEM_FALLBACK",
      operationName: operationCode,
      version: 1,
    };
  }

  /**
   * Simulação do custo para teste e conferência visual no painel administrativo.
   */
  static async simulateCost(operationCode: string, planTier: PlanTier) {
    const result = await this.resolveCost(operationCode, planTier);
    return {
      ...result,
      planTier,
      simulationTimestamp: new Date().toISOString(),
    };
  }
}
