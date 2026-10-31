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

    return {
      items,
      total,
      page,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
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

