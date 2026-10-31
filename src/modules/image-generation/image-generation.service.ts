import { db } from "@/lib/db";
import crypto from "crypto";
import { CreditExecutionService } from "@/modules/billing/credit-execution.service";
import { ImageProviderRegistryService } from "./image-provider-registry.service";
import { ImageEntitlementService } from "./image-entitlement.service";
import { ImageStorageService } from "./image-storage.service";
import { GeneratedImageService } from "./generated-image.service";
import {
  ImageGenerationOptions,
  ImageGenerationResult,
  ImageGenerationError,
} from "./image-generation.types";

export interface DirectImageGenerationInput {
  workspaceId: string;
  userId: string;
  prompt: string;
  model?: string;
  aspectRatio?: any;
  resolution?: string;
  negativePrompt?: string;
  referenceImageUrl?: string;
  seed?: number;
  projectId?: string;
  characterId?: string;
  environmentId?: string;
  sceneId?: string;
  promptVersionId?: string;
  providerId?: string;
  metadata?: Record<string, any>;
}

export interface DirectImageGenerationOutput {
  success: boolean;
  image: {
    id: string;
    imageUrl: string;
    prompt: string;
    revisedPrompt?: string;
    model: string;
    provider: string;
    aspectRatio?: string;
    resolution?: string;
    creditCost: number;
    createdAt: string;
    projectId?: string | null;
    characterId?: string | null;
    environmentId?: string | null;
    sceneId?: string | null;
  };
  credits: {
    deducted: number;
    newBalance: number;
  };
  limits: {
    dailyLimit: number | null;
    monthlyLimit: number | null;
    dailyUsed: number;
    monthlyUsed: number;
  };
}

export class ImageGenerationService {
  /**
   * Executa a geração direta de imagem com validação de limites do plano,
   * débito atômico via ledger/lotes com estorno automático e persistência no histórico.
   */
  static async generateDirectImage(input: DirectImageGenerationInput): Promise<DirectImageGenerationOutput> {
    const {
      workspaceId,
      userId,
      prompt,
      aspectRatio = "1:1",
      resolution,
      negativePrompt,
      referenceImageUrl,
      seed,
      projectId,
      characterId,
      environmentId,
      sceneId,
      promptVersionId,
      providerId = "pollinations",
      metadata = {},
    } = input;

    if (!prompt || prompt.trim().length === 0) {
      throw new ImageGenerationError("O prompt da imagem é obrigatório.", "EMPTY_PROMPT", 400);
    }

    // 1. Obter provedor e suas configurações
    const providerConfig = await ImageProviderRegistryService.getProviderConfig(providerId);
    if (!providerConfig.isActive) {
      throw new ImageGenerationError("O provedor de geração de imagens está temporariamente desativado.", "PROVIDER_DISABLED", 503);
    }

    const selectedModel = input.model || providerConfig.defaultModel || "flux";
    const provider = ImageProviderRegistryService.getProvider(providerId);

    // 2. Validação rigorosa de plano, permissões, limites de período e custo
    const entitlement = await ImageEntitlementService.validateAndCalculate({
      workspaceId,
      modelId: selectedModel,
      resolution,
    });

    const operationId = `img_op_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
    const startTime = Date.now();

    // 3. Execução transacional com débito de créditos e estorno automático garantido em caso de falha
    const creditExecution = await CreditExecutionService.executeWithCredits(
      {
        workspaceId,
        operationCode: "GEN_IMAGE_DIRECT",
        description: `Geração Direta de Imagem (${selectedModel})`,
        projectId,
        userId,
        idempotencyKey: operationId,
        metadata: {
          ...metadata,
          model: selectedModel,
          providerId,
          aspectRatio,
          resolution,
        },
      },
      async () => {
        // Chamada real ao provedor externo (Pollinations)
        const genOptions: ImageGenerationOptions = {
          prompt,
          model: selectedModel,
          aspectRatio,
          resolution,
          negativePrompt,
          referenceImageUrl,
          seed,
          responseFormat: "b64_json",
        };

        const result = await provider.generateImage(genOptions, providerConfig.apiKey, providerConfig.baseUrl);
        return result;
      }
    );

    const generationResult = creditExecution.result as ImageGenerationResult;
    const durationMs = Date.now() - startTime;

    // 4. Salvar imagem no armazenamento persistente
    const { publicUrl, storageKey } = await ImageStorageService.persistImage({
      b64Json: generationResult.b64Json,
      imageUrl: generationResult.imageUrl,
      userId,
      workspaceId,
    });

    // 5. Gravar registro definitivo no histórico de imagens geradas
    const generatedRecord = await GeneratedImageService.recordGeneratedImage({
      userId,
      workspaceId,
      projectId,
      characterId,
      environmentId,
      sceneId,
      promptVersionId,
      providerId,
      modelId: selectedModel,
      prompt,
      revisedPrompt: generationResult.revisedPrompt,
      negativePrompt,
      parameters: {
        aspectRatio,
        resolution,
        seed: generationResult.seed,
      },
      aspectRatio,
      resolution,
      imageUrl: publicUrl,
      storageKey,
      creditCost: creditExecution.creditCost,
      externalCost: generationResult.externalCost,
      externalCostUnit: generationResult.externalCostUnit,
      status: "SUCCEEDED",
      generationTimeMs: durationMs,
      metadata,
    });

    // 5.1 Atualizar vínculo visual nas entidades do projeto (personagem, ambiente, cena)
    try {
      if (characterId) {
        const char = await db.character.findUnique({ where: { id: characterId } });
        if (char) {
          const currentAttrs = (char.attributes as any) || {};
          await db.character.update({
            where: { id: characterId },
            data: {
              attributes: {
                ...currentAttrs,
                imageUrl: publicUrl,
                lastImageId: generatedRecord.id,
              },
            },
          });
        }
      }

      if (environmentId) {
        const env = await db.environment.findUnique({ where: { id: environmentId } });
        if (env) {
          const currentAttrs = (env.attributes as any) || {};
          await db.environment.update({
            where: { id: environmentId },
            data: {
              attributes: {
                ...currentAttrs,
                imageUrl: publicUrl,
                lastImageId: generatedRecord.id,
              },
            },
          });
        }
      }

      if (sceneId) {
        const sc = await db.scene.findUnique({ where: { id: sceneId } });
        if (sc) {
          const currentConfig = (sc.configuration as any) || {};
          const frameType = (metadata as any)?.frameType || "START_FRAME";
          const updatedConfig = {
            ...currentConfig,
            ...(frameType === "END_FRAME"
              ? { endFrameUrl: publicUrl, endFrameImageId: generatedRecord.id }
              : { startFrameUrl: publicUrl, startFrameImageId: generatedRecord.id }),
          };
          await db.scene.update({
            where: { id: sceneId },
            data: { configuration: updatedConfig },
          });
        }
      }
    } catch (bindErr) {
      console.warn("[ImageGenerationService] Aviso: Falha ao atualizar vínculo visual na entidade:", bindErr);
    }

    // 6. Atualizar contadores e métricas operacionais do provedor
    await db.imageProviderConfig.update({
      where: { id: providerConfig.id },
      data: {
        requestsCount: { increment: 1 },
        successCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
    }).catch(() => {});

    // 7. Registrar log de auditoria operacional
    await db.imageOperationLog.create({
      data: {
        operationId,
        providerId,
        modelId: selectedModel,
        workspaceId,
        userId,
        projectId,
        success: true,
        durationMs,
        externalCost: generationResult.externalCost,
        externalCostUnit: generationResult.externalCostUnit,
        creditCost: creditExecution.creditCost,
        requestPayload: {
          prompt: prompt.slice(0, 500),
          model: selectedModel,
          aspectRatio,
          resolution,
        },
      },
    }).catch(() => {});

    return {
      success: true,
      image: {
        id: generatedRecord.id,
        imageUrl: generatedRecord.imageUrl,
        prompt: generatedRecord.prompt,
        revisedPrompt: generatedRecord.revisedPrompt || undefined,
        model: generatedRecord.modelId,
        provider: generatedRecord.providerId,
        aspectRatio: generatedRecord.aspectRatio || undefined,
        resolution: generatedRecord.resolution || undefined,
        creditCost: generatedRecord.creditCost,
        createdAt: generatedRecord.createdAt.toISOString(),
        projectId: generatedRecord.projectId,
        characterId: generatedRecord.characterId,
        environmentId: generatedRecord.environmentId,
        sceneId: generatedRecord.sceneId,
      },
      credits: {
        deducted: creditExecution.creditCost,
        newBalance: creditExecution.newBalance,
      },
      limits: {
        dailyLimit: entitlement.limits.dailyLimit,
        monthlyLimit: entitlement.limits.monthlyLimit,
        dailyUsed: entitlement.limits.dailyUsed + 1,
        monthlyUsed: entitlement.limits.monthlyUsed + 1,
      },
    };
  }
}

