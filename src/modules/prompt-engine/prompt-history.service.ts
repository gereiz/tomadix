import { db } from "@/lib/db";
import { Prisma, GenerationStatus } from "@prisma/client";
import {
  PromptHistoryFilter,
  RegeneratePromptRequest,
  ExportSequenceOptions,
} from "./prompt-engine.schema";
import { PromptEngineService } from "./prompt-engine.service";

export interface UnifiedPromptHistoryItem {
  id: string;
  projectId: string;
  sceneId: string | null;
  sceneTitle?: string | null;
  sceneOrder?: number | null;
  templateKey: string;
  templateVersion: number;
  targetTool: string;
  modelName: string;
  versionNumber: number;
  status: "SUCCEEDED" | "FAILED";
  errorMessage?: string | null;
  outputJson?: any;
  outputText?: string | null;
  tokens?: {
    inputTokens: number;
    outputTokens: number;
  } | null;
  durationMs?: number | null;
  parentVersionId?: string | null;
  createdAt: string;
}

export interface VersionComparisonResult {
  versionA: {
    id: string;
    versionNumber: number;
    templateKey: string;
    targetTool: string;
    modelName: string;
    createdAt: string;
    outputText: string | null;
    outputJson: any;
    parameters: Record<string, any>;
  };
  versionB: {
    id: string;
    versionNumber: number;
    templateKey: string;
    targetTool: string;
    modelName: string;
    createdAt: string;
    outputText: string | null;
    outputJson: any;
    parameters: Record<string, any>;
  };
  jsonDiff: {
    addedKeys: string[];
    removedKeys: string[];
    modifiedKeys: { key: string; from: any; to: any }[];
  };
  parameterDiff: {
    added: Record<string, any>;
    removed: Record<string, any>;
    changed: Record<string, { from: any; to: any }>;
  };
  textDiff: {
    identical: boolean;
    characterLengthDiff: number;
  };
  identical: boolean;
}

export class PromptHistoryService {
  /**
   * Valida se o projeto pertence ao workspace do usuário (isolamento multitenant estrito).
   */
  private static async assertProjectOwnership(projectId: string, workspaceId: string) {
    const project = await db.project.findFirst({
      where: { id: projectId, workspaceId },
    });
    if (!project) {
      throw new Error("Projeto não encontrado ou acesso não permitido.");
    }
    return project;
  }

  /**
   * 1 & 2. Lista os prompts gerados com filtros avançados (projeto, template, data, status).
   */
  static async listHistory(
    projectId: string,
    workspaceId: string,
    filters?: PromptHistoryFilter
  ): Promise<UnifiedPromptHistoryItem[]> {
    await this.assertProjectOwnership(projectId, workspaceId);

    const items: UnifiedPromptHistoryItem[] = [];

    // 1. Buscar versões com sucesso se o filtro permitir
    if (!filters?.status || filters.status === "ALL" || filters.status === "SUCCEEDED") {
      const where: Prisma.PromptVersionWhereInput = {
        projectId,
      };

      if (filters?.templateKey) where.templateKey = filters.templateKey;
      if (filters?.sceneId) where.sceneId = filters.sceneId;
      if (filters?.targetTool) where.targetTool = filters.targetTool;

      if (filters?.startDate || filters?.endDate) {
        where.createdAt = {};
        if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
        if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
      }

      const versions = await db.promptVersion.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          scene: {
            select: {
              id: true,
              title: true,
              order: true,
            },
          },
        },
      });

      // Mapear versões bem-sucedidas
      for (const v of versions) {
        const snapshot = (v.inputSnapshot as any) || {};
        const techMeta = snapshot.technicalMetadata || {};

        items.push({
          id: v.id,
          projectId: v.projectId,
          sceneId: v.sceneId,
          sceneTitle: v.scene?.title || snapshot.elementsSnapshot?.scene?.title || null,
          sceneOrder: v.scene?.order || snapshot.elementsSnapshot?.scene?.order || null,
          templateKey: v.templateKey,
          templateVersion: v.templateVersion,
          targetTool: v.targetTool,
          modelName: v.modelName,
          versionNumber: snapshot.versionNumber || 1,
          status: "SUCCEEDED",
          outputJson: v.outputJson,
          outputText: v.outputText,
          tokens: techMeta.tokens || null,
          durationMs: techMeta.durationMs || null,
          parentVersionId: snapshot.parentVersionId || null,
          createdAt: v.createdAt.toISOString(),
        });
      }
    }

    // 2. Buscar falhas de geração registradas se solicitado
    if (!filters?.status || filters.status === "ALL" || filters.status === "FAILED") {
      const jobWhere: Prisma.GenerationJobWhereInput = {
        projectId,
        status: GenerationStatus.FAILED,
      };

      if (filters?.startDate || filters?.endDate) {
        jobWhere.createdAt = {};
        if (filters.startDate) jobWhere.createdAt.gte = new Date(filters.startDate);
        if (filters.endDate) jobWhere.createdAt.lte = new Date(filters.endDate);
      }

      const failedJobs = await db.generationJob.findMany({
        where: jobWhere,
        orderBy: { createdAt: "desc" },
      });

      for (const job of failedJobs) {
        const req = (job.request as any) || {};
        if (filters?.templateKey && req.templateKey !== filters.templateKey) continue;
        if (filters?.sceneId && req.sceneId !== filters.sceneId) continue;
        if (filters?.targetTool && req.targetTool !== filters.targetTool) continue;

        items.push({
          id: job.id,
          projectId: job.projectId,
          sceneId: req.sceneId || null,
          templateKey: req.templateKey || "unknown",
          templateVersion: 1,
          targetTool: req.targetTool || "generic",
          modelName: job.modelName,
          versionNumber: 0,
          status: "FAILED",
          errorMessage: job.errorMessage || "Erro desconhecido na geração do prompt.",
          outputJson: null,
          outputText: null,
          tokens: null,
          durationMs:
            job.startedAt && job.finishedAt
              ? job.finishedAt.getTime() - job.startedAt.getTime()
              : null,
          parentVersionId: null,
          createdAt: job.createdAt.toISOString(),
        });
      }
    }

    // Ordenar por data mais recente
    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * 3. Abre uma versão específica com integridade multitenant.
   */
  static async getVersionById(versionId: string, projectId: string, workspaceId: string) {
    await this.assertProjectOwnership(projectId, workspaceId);

    const version = await db.promptVersion.findFirst({
      where: { id: versionId, projectId },
      include: {
        scene: {
          select: {
            id: true,
            title: true,
            order: true,
          },
        },
      },
    });

    if (!version) {
      throw new Error("Versão de prompt não encontrada ou acesso não permitido.");
    }

    return version;
  }

  /**
   * 4. Compara duas versões de prompt geradas (diff de parâmetros, JSON e texto).
   */
  static async compareVersions(
    versionIdA: string,
    versionIdB: string,
    projectId: string,
    workspaceId: string
  ): Promise<VersionComparisonResult> {
    const [vA, vB] = await Promise.all([
      this.getVersionById(versionIdA, projectId, workspaceId),
      this.getVersionById(versionIdB, projectId, workspaceId),
    ]);

    const snapA = (vA.inputSnapshot as any) || {};
    const snapB = (vB.inputSnapshot as any) || {};

    const paramsA: Record<string, any> = snapA.resolvedParameters || {};
    const paramsB: Record<string, any> = snapB.resolvedParameters || {};

    const jsonA: Record<string, any> = (vA.outputJson as any) || {};
    const jsonB: Record<string, any> = (vB.outputJson as any) || {};

    // 1. Diferenças de chaves JSON
    const allJsonKeys = Array.from(new Set([...Object.keys(jsonA), ...Object.keys(jsonB)]));
    const addedKeys: string[] = [];
    const removedKeys: string[] = [];
    const modifiedKeys: { key: string; from: any; to: any }[] = [];

    for (const key of allJsonKeys) {
      if (!(key in jsonA)) {
        addedKeys.push(key);
      } else if (!(key in jsonB)) {
        removedKeys.push(key);
      } else if (JSON.stringify(jsonA[key]) !== JSON.stringify(jsonB[key])) {
        modifiedKeys.push({ key, from: jsonA[key], to: jsonB[key] });
      }
    }

    // 2. Diferenças de parâmetros resolvidos
    const allParamKeys = Array.from(new Set([...Object.keys(paramsA), ...Object.keys(paramsB)]));
    const addedParams: Record<string, any> = {};
    const removedParams: Record<string, any> = {};
    const changedParams: Record<string, { from: any; to: any }> = {};

    for (const pKey of allParamKeys) {
      if (!(pKey in paramsA)) {
        addedParams[pKey] = paramsB[pKey];
      } else if (!(pKey in paramsB)) {
        removedParams[pKey] = paramsA[pKey];
      } else if (paramsA[pKey] !== paramsB[pKey]) {
        changedParams[pKey] = { from: paramsA[pKey], to: paramsB[pKey] };
      }
    }

    const isIdentical =
      addedKeys.length === 0 &&
      removedKeys.length === 0 &&
      modifiedKeys.length === 0 &&
      (vA.outputText || "") === (vB.outputText || "");

    return {
      versionA: {
        id: vA.id,
        versionNumber: snapA.versionNumber || 1,
        templateKey: vA.templateKey,
        targetTool: vA.targetTool,
        modelName: vA.modelName,
        createdAt: vA.createdAt.toISOString(),
        outputText: vA.outputText,
        outputJson: vA.outputJson,
        parameters: paramsA,
      },
      versionB: {
        id: vB.id,
        versionNumber: snapB.versionNumber || 1,
        templateKey: vB.templateKey,
        targetTool: vB.targetTool,
        modelName: vB.modelName,
        createdAt: vB.createdAt.toISOString(),
        outputText: vB.outputText,
        outputJson: vB.outputJson,
        parameters: paramsB,
      },
      jsonDiff: {
        addedKeys,
        removedKeys,
        modifiedKeys,
      },
      parameterDiff: {
        added: addedParams,
        removed: removedParams,
        changed: changedParams,
      },
      textDiff: {
        identical: (vA.outputText || "") === (vB.outputText || ""),
        characterLengthDiff: (vB.outputText || "").length - (vA.outputText || "").length,
      },
      identical: isIdentical,
    };
  }

  /**
   * 7 & 8. Regenera a partir de uma versão anterior, criando uma nova versão sem apagar a anterior.
   */
  static async regenerate(
    versionId: string,
    projectId: string,
    workspaceId: string,
    options?: RegeneratePromptRequest
  ) {
    const oldVersion = await this.getVersionById(versionId, projectId, workspaceId);
    const snap = (oldVersion.inputSnapshot as any) || {};
    const elements = snap.elementsSnapshot || {};

    // Compor nova requisição a partir do snapshot prévio
    const combinedInstructions = options?.customInstructions
      ? snap.customInstructions
        ? `${snap.customInstructions}\n\n[Regeneração - Ajustes do Diretor]: ${options.customInstructions}`
        : options.customInstructions
      : snap.customInstructions;

    const generateReq = {
      templateKey: oldVersion.templateKey as any,
      targetTool: (options?.targetTool || oldVersion.targetTool) as any,
      sceneId: oldVersion.sceneId || undefined,
      characterId: elements.character?.id || snap.characterId || undefined,
      environmentId: elements.environment?.id || snap.environmentId || undefined,
      customInstructions: combinedInstructions,
      model: options?.model || oldVersion.modelName,
      parentVersionId: oldVersion.id,
    };

    // Executa a geração via PromptEngineService
    const result = await PromptEngineService.generate(projectId, workspaceId, generateReq);

    return result;
  }

  /**
   * 6. Exporta uma versão específica em JSON limpo e formatado em UTF-8.
   */
  static async exportVersion(versionId: string, projectId: string, workspaceId: string) {
    const version = await this.getVersionById(versionId, projectId, workspaceId);
    const project = await this.assertProjectOwnership(projectId, workspaceId);

    const snapshot = (version.inputSnapshot as any) || {};
    const techMeta = snapshot.technicalMetadata || {};

    // Estrutura limpa sem dados confidenciais do servidor ou do banco
    return {
      tomadixVersion: "1.0",
      cinepromptStudioVersion: "1.0",
      exportTimestamp: new Date().toISOString(),
      project: {
        id: project.id,
        title: project.title,
        genre: project.genre,
        language: project.language,
      },
      template: {
        key: version.templateKey,
        version: version.templateVersion,
      },
      targetTool: version.targetTool,
      versionNumber: snapshot.versionNumber || 1,
      parentVersionId: snapshot.parentVersionId || null,
      compiledPromptText: version.outputText || null,
      promptStructuredJson: version.outputJson,
      contextSnapshot: {
        parameters: snapshot.resolvedParameters || {},
        directorInstructions: snapshot.customInstructions || null,
        sceneTitle: snapshot.sceneTitle || version.scene?.title || null,
        characterName: snapshot.characterName || null,
        environmentName: snapshot.environmentName || null,
      },
      technicalMetadata: {
        model: version.modelName,
        tokens: techMeta.tokens || null,
        durationMs: techMeta.durationMs || null,
        generatedAt: version.createdAt.toISOString(),
      },
    };
  }

  /**
   * Exporta a Sequência Completa de Cenas do Projeto com a ordem, continuidade e prompts gerados.
   */
  static async exportSceneSequence(
    projectId: string,
    workspaceId: string,
    _options?: ExportSequenceOptions
  ) {
    const project = await this.assertProjectOwnership(projectId, workspaceId);

    // Buscar todas as cenas ordenadas por 'order' ascendente
    const scenes = await db.scene.findMany({
      where: { projectId },
      orderBy: { order: "asc" },
      include: {
        characters: {
          include: {
            character: {
              select: {
                id: true,
                name: true,
                attributes: true,
              },
            },
          },
        },
        environments: {
          include: {
            environment: {
              select: {
                id: true,
                name: true,
                attributes: true,
              },
            },
          },
        },
      },
    });

    // Para cada cena, buscar a última versão de prompt gerada (video_prompt ou individual_scene)
    const sequenceItems = await Promise.all(
      scenes.map(async (scene: any) => {
        const latestPrompt = await db.promptVersion.findFirst({
          where: {
            projectId,
            sceneId: scene.id,
            templateKey: { in: ["video_prompt", "individual_scene"] },
          },
          orderBy: { createdAt: "desc" },
        });

        const sceneConfig = (scene.configuration as any) || {};

        return {
          sceneId: scene.id,
          order: scene.order,
          title: scene.title,
          description: scene.description,
          durationSeconds: scene.durationSeconds,
          decupage: {
            mainAction: sceneConfig.mainAction || null,
            framing: sceneConfig.framing || null,
            cameraMovement: sceneConfig.cameraMovement || null,
            lighting: sceneConfig.lighting || null,
            focusDepth: sceneConfig.focusDepth || null,
            transitionIn: sceneConfig.transitionIn || null,
            transitionOut: sceneConfig.transitionOut || null,
          },
          audioDirectives: {
            ambientSound: sceneConfig.ambientSound || null,
            dialogue: sceneConfig.dialogue || null,
            music: sceneConfig.music || null,
          },
          characters: (scene.characters || []).map((sc: any) => ({
            id: sc.character.id,
            name: sc.character.name,
            visualIdentity: (sc.character.attributes as any)?.visualIdentity || null,
          })),
          environments: (scene.environments || []).map((se: any) => ({
            id: se.environment.id,
            name: se.environment.name,
            lighting: (se.environment.attributes as any)?.lighting || null,
          })),

          latestGeneratedPrompt: latestPrompt
            ? {
                versionId: latestPrompt.id,
                templateKey: latestPrompt.templateKey,
                targetTool: latestPrompt.targetTool,
                compiledPromptText: latestPrompt.outputText,
                structuredJson: latestPrompt.outputJson,
                generatedAt: latestPrompt.createdAt.toISOString(),
              }
            : null,
        };
      })
    );

    return {
      tomadixVersion: "1.0",
      cinepromptStudioVersion: "1.0",
      exportTimestamp: new Date().toISOString(),
      project: {
        id: project.id,
        title: project.title,
        genre: project.genre,
        language: project.language,
        configuration: project.configuration,
      },
      sequenceOverview: {
        totalScenes: scenes.length,
        totalPlannedDurationSeconds: scenes.reduce(
          (acc, s) => acc + (s.durationSeconds || 0),
          0
        ),
      },
      scenes: sequenceItems,
    };
  }

  /**
   * 9. Exibe os erros de geração registrados para o projeto.
   */
  static async listFailedJobs(projectId: string, workspaceId: string) {
    await this.assertProjectOwnership(projectId, workspaceId);

    const failedJobs = await db.generationJob.findMany({
      where: {
        projectId,
        status: GenerationStatus.FAILED,
      },
      orderBy: { createdAt: "desc" },
    });

    return failedJobs.map((job) => ({
      id: job.id,
      modelName: job.modelName,
      request: job.request,
      errorMessage: job.errorMessage || "Erro desconhecido na geração do prompt.",
      startedAt: job.startedAt ? job.startedAt.toISOString() : null,
      finishedAt: job.finishedAt ? job.finishedAt.toISOString() : null,
      createdAt: job.createdAt.toISOString(),
    }));
  }

  /**
   * 10. Exclui um registro específico de erro (GenerationJob com status FAILED).
   */
  static async deleteFailedJob(jobId: string, projectId: string, workspaceId: string) {
    await this.assertProjectOwnership(projectId, workspaceId);

    const job = await db.generationJob.findFirst({
      where: { id: jobId, projectId, status: GenerationStatus.FAILED },
    });

    if (!job) {
      throw new Error("Registro de erro não encontrado ou já excluído.");
    }

    await db.generationJob.delete({
      where: { id: jobId },
    });

    return { success: true, message: "Registro de erro excluído com sucesso." };
  }

  /**
   * 11. Exclui todos os registros de erros (GenerationJobs com status FAILED) do projeto.
   */
  static async clearAllFailedJobs(projectId: string, workspaceId: string) {
    await this.assertProjectOwnership(projectId, workspaceId);

    const { count } = await db.generationJob.deleteMany({
      where: {
        projectId,
        status: GenerationStatus.FAILED,
      },
    });

    return { success: true, count, message: `${count} registro(s) de erro excluído(s) com sucesso.` };
  }
}

