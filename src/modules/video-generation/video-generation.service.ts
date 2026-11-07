import crypto from "crypto";
import { db } from "@/lib/db";
import { PlanTier } from "@prisma/client";
import { EntitlementService } from "@/modules/billing/entitlement.service";
import { CreditPricingService } from "@/modules/billing/credit-pricing.service";
import { CreditExecutionService } from "@/modules/billing/credit-execution.service";
import { ImageProviderRegistryService } from "@/modules/image-generation/image-provider-registry.service";
import { CinematicPromptEnricher } from "@/modules/image-generation/cinematic-prompt-enricher";
import { PollinationsVideoProvider } from "./pollinations-video-provider";
import { VideoStorageService } from "./video-storage.service";
import {
  VideoGenerationOptions,
  VideoGenerationResult,
  VideoGenerationError,
} from "./video-generation.types";

export interface GenerateDirectVideoParams {
  workspaceId: string;
  userId: string;
  prompt: string;
  model?: string;
  durationSeconds?: number;
  aspectRatio?: string;
  resolution?: string;
  audio?: boolean;
  startFrameUrl?: string;
  endFrameUrl?: string;
  projectId?: string;
  sceneId?: string;
  seed?: number;
  metadata?: Record<string, any>;
}

export class VideoGenerationService {
  private static provider = new PollinationsVideoProvider();

  /**
   * Garante a existência da configuração do provedor de vídeo.
   */
  static async getVideoProviderConfig() {
    let config = await db.videoProviderConfig.findUnique({
      where: { providerId: "pollinations" },
    });

    if (!config) {
      // Herda a chave do ImageProviderConfig da Pollinations
      const imgConfig = await ImageProviderRegistryService.getProviderConfig("pollinations");
      config = await db.videoProviderConfig.create({
        data: {
          providerId: "pollinations",
          name: "Pollinations.ai Video",
          baseUrl: "https://gen.pollinations.ai",
          apiKeyEncrypted: imgConfig?.apiKey || process.env.POLLINATIONS_API_KEY || "",
          isEnabled: true,
        },
      });
    }

    return config;
  }

  /**
   * Sincroniza os modelos de vídeo disponíveis da Pollinations com o banco.
   */
  static async syncModels() {
    const config = await this.getVideoProviderConfig();
    const apiKey = config.apiKeyEncrypted || process.env.POLLINATIONS_API_KEY || "";

    const remoteModels = await this.provider.listModels(apiKey, config.baseUrl);

    let synced = 0;
    for (const m of remoteModels) {
      await db.videoModelConfig.upsert({
        where: {
          providerConfigId_modelId: {
            providerConfigId: config.id,
            modelId: m.modelId,
          },
        },
        create: {
          providerConfigId: config.id,
          modelId: m.modelId,
          name: m.name,
          publisher: m.publisher,
          description: m.description,
          creditCost: m.creditCost,
          isDefault: m.isDefault,
          isEnabled: true,
          isAvailable: true,
          supportedDurations: m.supportedDurations,
          supportedAspectRatios: m.supportedAspectRatios,
          displayOrder: synced,
        },
        update: {
          name: m.name,
          publisher: m.publisher,
          description: m.description,
          isAvailable: true,
          lastSyncedAt: new Date(),
        },
      });
      synced++;
    }

    return { synced };
  }

  /**
   * Lista os modelos de vídeo liberados para o workspace.
   */
  static async getAvailableModelsForWorkspace(workspaceId: string) {
    const config = await this.getVideoProviderConfig();

    let models = await db.videoModelConfig.findMany({
      where: {
        providerConfigId: config.id,
        isEnabled: true,
        isAvailable: true,
      },
      orderBy: [{ isDefault: "desc" }, { displayOrder: "asc" }, { name: "asc" }],
    });

    // Se ainda não sincronizou no banco, executa sincronização rápida
    if (models.length === 0) {
      await this.syncModels();
      models = await db.videoModelConfig.findMany({
        where: {
          providerConfigId: config.id,
          isEnabled: true,
          isAvailable: true,
        },
        orderBy: [{ isDefault: "desc" }, { displayOrder: "asc" }, { name: "asc" }],
      });
    }

    // Valida saldo atual do workspace
    const workspace = await db.workspace.findUnique({
      where: { id: workspaceId },
      select: { creditsBalance: true },
    });

    return {
      models: models.map((m) => ({
        id: m.modelId,
        name: m.name,
        publisher: m.publisher,
        description: m.description,
        creditCost: m.creditCost,
        isDefault: m.isDefault,
        supportedDurations: m.supportedDurations as number[],
        supportedAspectRatios: m.supportedAspectRatios as string[],
      })),
      creditsBalance: workspace?.creditsBalance ?? 0,
    };
  }

  /**
   * Executa a geração direta de vídeo com débito de créditos e estorno automático em falhas.
   */
  static async generateDirectVideo(params: GenerateDirectVideoParams) {
    const {
      workspaceId,
      userId,
      prompt,
      model,
      durationSeconds = 5,
      aspectRatio = "16:9",
      resolution,
      audio = true,
      startFrameUrl,
      endFrameUrl,
      projectId,
      sceneId,
      seed,
      metadata = {},
    } = params;

    const startTime = Date.now();
    const operationId = crypto.randomUUID();

    // 1. Validar plano e permissões
    const sub = await EntitlementService.getWorkspaceSubscription(workspaceId);
    const planTier = (sub?.planTier as PlanTier) || PlanTier.FREE;
    const plan = await db.plan.findUnique({ where: { tier: planTier } });

    // 2. Modelo e custo em créditos
    const config = await this.getVideoProviderConfig();
    const effectiveModelId = model || "bytedance/seedance-2.0-fast";

    let creditCost = 25;
    const modelRecord = await db.videoModelConfig.findFirst({
      where: { providerConfigId: config.id, modelId: effectiveModelId },
    });
    if (modelRecord) {
      creditCost = modelRecord.creditCost;
    }

    // 3. Obter chave da Pollinations
    const imgConfig = await ImageProviderRegistryService.getProviderConfig("pollinations");
    const apiKey = config.apiKeyEncrypted || imgConfig?.apiKey || process.env.POLLINATIONS_API_KEY || "";

    if (!apiKey) {
      throw new VideoGenerationError(
        "A API Key da Pollinations não está configurada no painel administrativo.",
        "UNCONFIGURED_KEY",
        500
      );
    }

    // 3.1 Enriquecimento cinemático do prompt (herança de granulação de película, estilo e iluminação)
    let effectivePrompt = prompt;
    let enrichmentApplied: any = null;
    if (projectId) {
      try {
        const enrichment = await CinematicPromptEnricher.enrich({
          userPrompt: prompt,
          projectId,
          workspaceId,
          sceneId,
          aspectRatio,
        });
        effectivePrompt = enrichment.enrichedPrompt;
        enrichmentApplied = enrichment;
      } catch (enrichErr) {
        console.warn("[VideoGenerationService] Erro ao enriquecer prompt cinemático:", enrichErr);
      }
    }

    // 4. Execução transacional com débito de créditos e estorno em caso de falha
    const creditExecution = await CreditExecutionService.executeWithCredits(
      {
        workspaceId,
        operationCode: "GEN_VIDEO_DIRECT",
        description: `Geração de Vídeo IA (${effectiveModelId})`,
        projectId,
        userId,
        idempotencyKey: operationId,
        metadata: {
          ...metadata,
          model: effectiveModelId,
          durationSeconds,
          aspectRatio,
          originalPrompt: prompt,
          appliedDirectives: enrichmentApplied?.appliedDirectives,
        },
      },
      async () => {
        const options: VideoGenerationOptions = {
          prompt: effectivePrompt,
          model: effectiveModelId,
          durationSeconds,
          aspectRatio,
          resolution,
          audio,
          startFrameUrl,
          endFrameUrl,
          seed,
        };

        const result = await this.provider.generateVideo(options, apiKey, config.baseUrl);
        return result;
      }
    );

    const generationResult = creditExecution.result as VideoGenerationResult & { buffer?: Buffer };
    const durationMs = Date.now() - startTime;

    // 5. Salvar vídeo no armazenamento
    const { publicUrl, storageKey } = await VideoStorageService.persistVideo({
      videoBuffer: generationResult.buffer,
      remoteUrl: generationResult.videoUrl,
      userId,
    });

    // 6. Registrar vídeo no banco de dados
    const videoRecord = await db.generatedVideo.create({
      data: {
        userId,
        workspaceId,
        projectId,
        sceneId,
        providerId: "pollinations",
        modelId: effectiveModelId,
        prompt: effectivePrompt,
        aspectRatio,
        durationSeconds,
        startFrameUrl,
        endFrameUrl,
        parameters: {
          aspectRatio,
          resolution,
          audio,
          seed: generationResult.seed,
        },
        videoUrl: publicUrl || generationResult.videoUrl,
        thumbnailUrl: startFrameUrl || null,
        storageKey,
        creditCost: creditExecution.creditCost,
        externalCost: generationResult.externalCost,
        externalCostUnit: generationResult.externalCostUnit,
        status: "SUCCEEDED",
        generationTimeMs: durationMs,
        metadata: {
          ...(metadata || {}),
          originalPrompt: prompt,
          appliedDirectives: enrichmentApplied?.appliedDirectives,
        },
      },
    });

    // 7. Log de auditoria
    await db.videoOperationLog.create({
      data: {
        operationId,
        providerId: "pollinations",
        modelId: effectiveModelId,
        workspaceId,
        userId,
        projectId,
        success: true,
        statusCode: 200,
        durationMs,
        creditCost: creditExecution.creditCost,
        externalCost: generationResult.externalCost,
        requestPayload: {
          model: effectiveModelId,
          durationSeconds,
          aspectRatio,
        },
      },
    });

    return {
      success: true,
      video: {
        id: videoRecord.id,
        videoUrl: videoRecord.videoUrl,
        thumbnailUrl: videoRecord.thumbnailUrl,
        prompt: videoRecord.prompt,
        modelId: videoRecord.modelId,
        durationSeconds: videoRecord.durationSeconds,
        aspectRatio: videoRecord.aspectRatio,
        creditCost: videoRecord.creditCost,
        createdAt: videoRecord.createdAt.toISOString(),
      },
      credits: {
        debited: creditExecution.creditCost,
        newBalance: creditExecution.newBalance,
      },
    };
  }

  /**
   * Lista vídeos gerados para visualização e galeria.
   */
  static async listVideos(params: { workspaceId: string; projectId?: string; limit?: number }) {
    const { workspaceId, projectId, limit = 40 } = params;

    const where: any = { workspaceId, status: "SUCCEEDED" };
    if (projectId) {
      where.projectId = projectId;
    }

    return db.generatedVideo.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        videoUrl: true,
        thumbnailUrl: true,
        prompt: true,
        modelId: true,
        durationSeconds: true,
        aspectRatio: true,
        creditCost: true,
        createdAt: true,
        projectId: true,
        sceneId: true,
      },
    });
  }
}

