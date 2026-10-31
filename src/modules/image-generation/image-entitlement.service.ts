import { db } from "@/lib/db";
import { PlanTier } from "@prisma/client";
import { EntitlementService } from "@/modules/billing/entitlement.service";
import { CreditPricingService } from "@/modules/billing/credit-pricing.service";
import { GeneratedImageService } from "./generated-image.service";
import { ImageGenerationError } from "./image-generation.types";

export interface ImageEntitlementCheckResult {
  planTier: PlanTier;
  creditCost: number;
  availableBalance: number;
  limits: {
    dailyLimit: number | null;
    monthlyLimit: number | null;
    dailyUsed: number;
    monthlyUsed: number;
  };
}

export class ImageEntitlementService {
  /**
   * Valida permissões, modelo, limites de período e calcula o custo em créditos.
   */
  static async validateAndCalculate(params: {
    workspaceId: string;
    modelId: string;
    resolution?: string;
  }): Promise<ImageEntitlementCheckResult> {
    const { workspaceId, modelId, resolution } = params;

    // 1. Obter assinatura e plano efetivo do workspace
    const sub = await EntitlementService.getWorkspaceSubscription(workspaceId);
    const planTier = (sub?.planTier as PlanTier) || PlanTier.FREE;

    const plan = await db.plan.findUnique({
      where: { tier: planTier },
    });

    if (!plan) {
      throw new ImageGenerationError("Plano do workspace não encontrado.", "PLAN_NOT_FOUND", 404);
    }

    // 2. Verificar se o plano possui a geração direta de imagem habilitada
    if (!plan.hasImageGeneration) {
      throw new ImageGenerationError(
        `A geração direta de imagens não está disponível no plano ${plan.name}. Faça upgrade para o plano Pro ou superior para gerar imagens com IA.`,
        "IMAGE_GENERATION_DISABLED",
        403
      );
    }

    // 3. Validar se o modelo solicitado está liberado para o plano
    const allowedModels = (plan.imageAllowedModels as string[]) || [];
    const isModelAllowed =
      allowedModels.length === 0 ||
      allowedModels.includes("*") ||
      allowedModels.includes(modelId);

    if (!isModelAllowed) {
      throw new ImageGenerationError(
        `O modelo de imagem "${modelId}" não está disponível para o plano ${plan.name}.`,
        "MODEL_NOT_PERMITTED_FOR_PLAN",
        403
      );
    }

    // 4. Validar se o modelo está ativo no provedor
    const modelConfig = await db.imageModelConfig.findFirst({
      where: { modelId },
    });

    if (modelConfig && (!modelConfig.isEnabled || !modelConfig.isAvailable)) {
      throw new ImageGenerationError(
        `O modelo de imagem "${modelId}" está temporariamente desativado pelo administrador.`,
        "MODEL_DISABLED_BY_ADMIN",
        400
      );
    }

    // 5. Validar resoluções permitidas
    if (resolution) {
      const allowedResolutions = (plan.imageAllowedResolutions as string[]) || [];
      if (allowedResolutions.length > 0 && !allowedResolutions.includes("*") && !allowedResolutions.includes(resolution)) {
        throw new ImageGenerationError(
          `A resolução "${resolution}" não é permitida no plano ${plan.name}.`,
          "RESOLUTION_NOT_PERMITTED",
          403
        );
      }
    }

    // 6. Validar limites de uso por período (apenas gerações bem-sucedidas são contabilizadas)
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [dailyUsed, monthlyUsed] = await Promise.all([
      GeneratedImageService.countSuccessfulGenerations(workspaceId, startOfDay),
      GeneratedImageService.countSuccessfulGenerations(workspaceId, startOfMonth),
    ]);

    if (plan.imageDailyLimit !== null && plan.imageDailyLimit > 0) {
      if (dailyUsed >= plan.imageDailyLimit) {
        throw new ImageGenerationError(
          `Limite diário de gerações de imagem atingido (${dailyUsed}/${plan.imageDailyLimit}). Tente novamente amanhã ou faça upgrade.`,
          "DAILY_LIMIT_EXCEEDED",
          429
        );
      }
    }

    if (plan.imageMonthlyLimit !== null && plan.imageMonthlyLimit > 0) {
      if (monthlyUsed >= plan.imageMonthlyLimit) {
        throw new ImageGenerationError(
          `Limite mensal de gerações de imagem atingido (${monthlyUsed}/${plan.imageMonthlyLimit}). Aguarde o próximo ciclo ou faça upgrade.`,
          "MONTHLY_LIMIT_EXCEEDED",
          429
        );
      }
    }

    // 7. Calcular o custo em créditos
    let creditCost = plan.imageDefaultCost ?? 10;

    // Se o modelo tiver override de custo específico
    if (modelConfig?.defaultCreditCost !== null && modelConfig?.defaultCreditCost !== undefined && modelConfig.defaultCreditCost >= 0) {
      creditCost = modelConfig.defaultCreditCost;
    } else {
      // Verificar se há regra de preços em CreditPricingRule para GEN_IMAGE_DIRECT
      try {
        const costResolution = await CreditPricingService.resolveCost("GEN_IMAGE_DIRECT", planTier);
        if (!costResolution.isFree && costResolution.creditCost > 0) {
          creditCost = costResolution.creditCost;
        }
      } catch (err) {
        // Fallback para imageDefaultCost do plano
      }
    }

    // 8. Validar saldo do workspace
    const workspace = await db.workspace.findUnique({
      where: { id: workspaceId },
      select: { creditsBalance: true },
    });

    const availableBalance = workspace?.creditsBalance ?? 0;
    if (availableBalance < creditCost) {
      throw new ImageGenerationError(
        `Saldo insuficiente de créditos. Esta geração requer ${creditCost} créditos, mas seu saldo atual é de ${availableBalance}.`,
        "INSUFFICIENT_CREDITS",
        402
      );
    }

    return {
      planTier,
      creditCost,
      availableBalance,
      limits: {
        dailyLimit: plan.imageDailyLimit,
        monthlyLimit: plan.imageMonthlyLimit,
        dailyUsed,
        monthlyUsed,
      },
    };
  }

  /**
   * Retorna os modelos de imagem permitidos e seus custos para o workspace atual.
   */
  static async getAvailableModelsForWorkspace(workspaceId: string) {
    const sub = await EntitlementService.getWorkspaceSubscription(workspaceId);
    const planTier = (sub?.planTier as PlanTier) || PlanTier.FREE;

    const plan = await db.plan.findUnique({
      where: { tier: planTier },
    });

    if (!plan || !plan.hasImageGeneration) {
      return {
        enabled: false,
        planName: plan?.name || "Free",
        models: [],
        message: "Geração direta de imagens não habilitada para o seu plano.",
      };
    }

    const allModels = await db.imageModelConfig.findMany({
      where: { isEnabled: true, isAvailable: true },
      orderBy: [{ isDefault: "desc" }, { displayOrder: "asc" }, { name: "asc" }],
    });

    const allowedList = (plan.imageAllowedModels as string[]) || [];
    const isAllowAll = allowedList.length === 0 || allowedList.includes("*");

    const filtered = allModels.filter((m) => isAllowAll || allowedList.includes(m.modelId));

    return {
      enabled: true,
      planName: plan.name,
      planTier,
      imageDailyLimit: plan.imageDailyLimit,
      imageMonthlyLimit: plan.imageMonthlyLimit,
      defaultCreditCost: plan.imageDefaultCost,
      models: filtered.map((m) => ({
        id: m.modelId,
        name: m.name,
        publisher: m.publisher,
        description: m.description,
        capabilities: m.capabilities,
        supportedSizes: m.supportedSizes,
        supportsReferenceImage: m.supportsReferenceImage,
        isDefault: m.isDefault,
        creditCost: m.defaultCreditCost ?? plan.imageDefaultCost ?? 10,
      })),
    };
  }
}

