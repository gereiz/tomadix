import { db } from "@/lib/db";
import { GeneratedImage, Prisma } from "@prisma/client";

export interface CreateGeneratedImageParams {
  userId: string;
  workspaceId: string;
  projectId?: string;
  characterId?: string;
  environmentId?: string;
  sceneId?: string;
  promptVersionId?: string;
  providerId: string;
  modelId: string;
  prompt: string;
  revisedPrompt?: string;
  negativePrompt?: string;
  parameters?: Record<string, any>;
  aspectRatio?: string;
  resolution?: string;
  imageUrl: string;
  storageKey?: string;
  creditCost: number;
  externalCost?: number;
  externalCostUnit?: string;
  status?: string;
  errorMessage?: string;
  generationTimeMs?: number;
  metadata?: Record<string, any>;
}

export interface ListGeneratedImagesFilters {
  workspaceId: string;
  userId?: string;
  projectId?: string;
  characterId?: string;
  environmentId?: string;
  sceneId?: string;
  entityType?: "ALL" | "CHARACTERS" | "ENVIRONMENTS" | "SCENES";
  modelId?: string;
  status?: string;
  limit?: number;
  page?: number;
}

export class GeneratedImageService {
  /**
   * Registra a imagem gerada no banco de dados.
   */
  static async recordGeneratedImage(params: CreateGeneratedImageParams): Promise<GeneratedImage> {
    const {
      userId,
      workspaceId,
      projectId,
      characterId,
      environmentId,
      sceneId,
      promptVersionId,
      providerId,
      modelId,
      prompt,
      revisedPrompt,
      negativePrompt,
      parameters = {},
      aspectRatio,
      resolution,
      imageUrl,
      storageKey,
      creditCost,
      externalCost,
      externalCostUnit,
      status = "SUCCEEDED",
      errorMessage,
      generationTimeMs = 0,
      metadata = {},
    } = params;

    return await db.generatedImage.create({
      data: {
        userId,
        workspaceId,
        projectId,
        characterId,
        environmentId,
        sceneId,
        promptVersionId,
        providerId,
        modelId,
        prompt,
        revisedPrompt,
        negativePrompt,
        parameters,
        aspectRatio,
        resolution,
        imageUrl,
        storageKey,
        creditCost,
        externalCost,
        externalCostUnit,
        status,
        errorMessage,
        generationTimeMs,
        metadata,
      },
      include: {
        project: { select: { id: true, title: true } },
        character: { select: { id: true, name: true } },
        environment: { select: { id: true, name: true } },
        scene: { select: { id: true, title: true, order: true } },
        user: { select: { id: true, displayName: true, email: true } },
      },
    });
  }

  /**
   * Lista o histórico de imagens geradas do workspace com filtros e paginação.
   */
  static async listImages(filters: ListGeneratedImagesFilters) {
    const {
      workspaceId,
      userId,
      projectId,
      characterId,
      environmentId,
      sceneId,
      entityType,
      modelId,
      status,
      limit = 20,
      page = 1,
    } = filters;

    const where: Prisma.GeneratedImageWhereInput = {
      workspaceId,
    };

    if (userId) where.userId = userId;
    if (projectId) where.projectId = projectId;
    if (characterId) where.characterId = characterId;
    if (environmentId) where.environmentId = environmentId;
    if (sceneId) where.sceneId = sceneId;
    if (modelId) where.modelId = modelId;
    if (status) where.status = status;

    if (entityType === "CHARACTERS") {
      where.characterId = { not: null };
    } else if (entityType === "ENVIRONMENTS") {
      where.environmentId = { not: null };
    } else if (entityType === "SCENES") {
      where.sceneId = { not: null };
    }

    const safeLimit = Math.max(1, Math.min(100, limit));
    const skip = (Math.max(1, page) - 1) * safeLimit;

    const [items, total] = await Promise.all([
      db.generatedImage.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: safeLimit,
        include: {
          project: { select: { id: true, title: true } },
          character: { select: { id: true, name: true } },
          environment: { select: { id: true, name: true } },
          scene: { select: { id: true, title: true, order: true } },
          user: { select: { id: true, displayName: true, email: true } },
        },
      }),
      db.generatedImage.count({ where }),
    ]);

    // Buscar mapa de nomes cadastrados no catálogo para exibir o nome completo
    const uniqueModelIds = Array.from(new Set(items.map((i) => i.modelId)));
    const modelConfigs = await db.imageModelConfig.findMany({
      where: { modelId: { in: uniqueModelIds } },
      select: { modelId: true, name: true },
    });
    const modelNameMap = new Map(modelConfigs.map((m) => [m.modelId, m.name]));

    const enrichedItems = items.map((item) => {
      const friendlyName = modelNameMap.get(item.modelId) || this.formatFriendlyModelName(item.modelId);
      return {
        ...item,
        modelName: friendlyName,
      };
    });

    return {
      items: enrichedItems,
      total,
      page,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  /**
   * Converte IDs técnicos em nomes amigáveis legíveis caso não esteja cadastrado no catálogo.
   */
  static formatFriendlyModelName(modelId: string): string {
    if (!modelId) return "Modelo Desconhecido";
    const clean = modelId.split("/").pop() || modelId;
    if (clean === "flux") return "FLUX.1 Schnell";
    if (clean === "flux-realism") return "FLUX Realism";
    if (clean === "flux-anime") return "FLUX Anime";
    if (clean === "flux-3-max" || clean === "flux.3-max") return "FLUX 3 Max";
    if (clean === "flux-2-max" || clean === "flux.2-max") return "FLUX.2 Max";
    if (clean === "flux-1.1-pro" || clean === "flux.1.1-pro") return "FLUX 1.1 Pro";
    if (clean === "flux-3-image-klein") return "FLUX.3 Image Klein";
    if (clean === "flux-3-image") return "FLUX.3 Image";
    if (clean === "z-image-turbo" || clean === "turbo") return "Z-Image Turbo";
    if (clean === "seedream-5.0-flash") return "Seedream 5.0 Flash";
    if (clean === "seedream-5.0-pro") return "Seedream 5.0 Pro";
    if (clean === "seedream-3.0-lite") return "Seedream 3.0 Lite";
    if (clean === "qwen-image-2.1-pro") return "Qwen Image 2.1 Pro";
    if (clean === "qwen-image-2.1-turbo") return "Qwen Image 2.1 Turbo";
    if (clean === "grok-imagine-2.0") return "Grok Imagine Image 2.0";
    if (clean === "grok-imagine-pro") return "Grok Imagine Pro";

    return clean
      .replace(/[-_.]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  /**
   * Obtém detalhes de uma imagem verificando que pertence ao workspace.
   */
  static async getImageById(id: string, workspaceId: string): Promise<GeneratedImage | null> {
    return await db.generatedImage.findFirst({
      where: { id, workspaceId },
      include: {
        project: { select: { id: true, title: true } },
        character: { select: { id: true, name: true } },
        environment: { select: { id: true, name: true } },
        scene: { select: { id: true, title: true, order: true } },
        user: { select: { id: true, displayName: true, email: true } },
      },
    });
  }

  /**
   * Conta a quantidade de gerações de imagem concluídas com sucesso no período para o workspace.
   */
  static async countSuccessfulGenerations(workspaceId: string, sinceDate: Date): Promise<number> {
    return await db.generatedImage.count({
      where: {
        workspaceId,
        status: "SUCCEEDED",
        createdAt: { gte: sinceDate },
      },
    });
  }
}

