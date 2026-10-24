import { db } from "@/lib/db";
import { Prisma, GenerationStatus } from "@prisma/client";
import {
  GeneratePromptRequest,
  PromptEngineOutput,
  TemplateKey,
} from "./prompt-engine.schema";
import { getSystemTemplate, SYSTEM_TEMPLATES } from "./prompt-template.catalog";
import { getToolProfile, TOOL_PROFILES } from "./tool-profiles";
import { composePromptInstructions } from "./compose-prompt";
import { generateStructuredJson } from "../ai/gemini-provider";

export interface GeneratePromptResult {
  jobId: string;
  versionId: string;
  templateKey: TemplateKey;
  templateVersion: number;
  targetTool: string;
  model: string;
  data: PromptEngineOutput;
  tokens?: {
    inputTokens: number;
    outputTokens: number;
  };
  createdAt: string;
}

export class PromptEngineService {
  /**
   * Valida se o projeto pertence ao workspace do usuário.
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
   * Executa o fluxo completo de 14 etapas de composição e geração de prompts cinematográficos via Gemini.
   */
  static async generate(
    projectId: string,
    workspaceId: string,
    req: GeneratePromptRequest
  ): Promise<GeneratePromptResult> {
    const startTime = new Date();

    // 1 & 2. Validar autorização e carregar projeto
    const project = await this.assertProjectOwnership(projectId, workspaceId);

    // 3. Carregar template do sistema ou banco
    const template = getSystemTemplate(req.templateKey);
    const toolProfile = getToolProfile(req.targetTool);

    // 4. Validar se o template requer contexto específico e carregar entidades
    if (req.templateKey === "character_definition" && !req.characterId) {
      throw new Error("Parâmetro obrigatório ausente: Selecione um personagem para o template 'character_definition'.");
    }
    if (req.templateKey === "environment_definition" && !req.environmentId) {
      throw new Error("Parâmetro obrigatório ausente: Selecione um ambiente para o template 'environment_definition'.");
    }
    if (req.templateKey === "individual_scene" && !req.sceneId) {
      throw new Error("Parâmetro obrigatório ausente: Selecione uma cena para o template 'individual_scene'.");
    }

    let sceneData: any = null;
    let characterData: any = null;
    let environmentData: any = null;

    if (req.sceneId) {
      sceneData = await db.scene.findFirst({
        where: { id: req.sceneId, projectId },
        include: {
          characters: { include: { character: true } },
          environments: { include: { environment: true } },
        },
      });
      if (!sceneData) throw new Error(`Cena informada (${req.sceneId}) não encontrada no projeto.`);
    }

    if (req.characterId) {
      characterData = await db.character.findFirst({
        where: { id: req.characterId, projectId },
      });
      if (!characterData) throw new Error(`Personagem (${req.characterId}) não encontrado.`);
    }

    if (req.environmentId) {
      environmentData = await db.environment.findFirst({
        where: { id: req.environmentId, projectId },
      });
      if (!environmentData) throw new Error(`Ambiente (${req.environmentId}) não encontrado.`);
    }

    // 5. Carregar e resolver parâmetros dinâmicos
    const [paramDefs, paramValues] = await Promise.all([
      db.parameterDefinition.findMany({
        where: { enabled: true, OR: [{ workspaceId: null }, { workspaceId }] },
      }),
      db.parameterValue.findMany({
        where: { projectId },
        include: { definition: true },
      }),
    ]);

    const resolvedParameters: Record<string, any> = {};
    const missingRequiredParams: string[] = [];

    // Mapear valores por escopo
    for (const def of paramDefs) {
      const matchedVal = paramValues.find((pv) => pv.parameterDefinitionId === def.id);
      if (matchedVal && matchedVal.value !== null && matchedVal.value !== undefined) {
        resolvedParameters[def.key] = matchedVal.value;
      } else if (def.defaultValue !== null && def.defaultValue !== undefined) {
        resolvedParameters[def.key] = def.defaultValue;
      } else if (def.required) {
        missingRequiredParams.push(def.label || def.key);
      }
    }

    if (missingRequiredParams.length > 0) {
      throw new Error(
        `Parâmetros obrigatórios ausentes para o projeto: ${missingRequiredParams.join(", ")}.`
      );
    }

    // 6. Compor instruções estruturadas
    const { systemInstruction, userPrompt } = composePromptInstructions({
      project,
      toolProfile,
      template,
      resolvedParameters,
      scene: sceneData || undefined,
      character: characterData || undefined,
      environment: environmentData || undefined,
      customInstructions: req.customInstructions,
    });

    // 7. Registrar GenerationJob com status PENDING
    const modelName = req.model || process.env.GEMINI_DEFAULT_MODEL || "gemini-3.5-flash";

    const job = await db.generationJob.create({
      data: {
        projectId,
        status: GenerationStatus.PENDING,
        modelName,
        startedAt: startTime,
        request: {
          templateKey: req.templateKey,
          targetTool: req.targetTool,
          sceneId: req.sceneId,
          characterId: req.characterId,
          environmentId: req.environmentId,
          customInstructions: req.customInstructions,
        } as Prisma.InputJsonValue,
      },
    });

    try {
      // 8 & 9. Enviar à Gemini API no servidor e obter JSON estruturado
      const geminiResult = await generateStructuredJson(userPrompt, template.schema, {
        model: modelName,
        systemInstruction,
      });

      const finishedTime = new Date();

      // 10. Atualizar GenerationJob para SUCCEEDED
      await db.generationJob.update({
        where: { id: job.id },
        data: {
          status: GenerationStatus.SUCCEEDED,
          modelName: geminiResult.model || modelName,
          result: geminiResult.data as unknown as Prisma.InputJsonValue,
          inputTokens: geminiResult.tokens?.inputTokens ?? null,
          outputTokens: geminiResult.tokens?.outputTokens ?? null,
          finishedAt: finishedTime,
        },
      });


      // 11. Extrair outputText caso o schema contenha um texto compilado de prompt
      const rawData = geminiResult.data as any;
      const outputText =
        rawData.compiledPromptText ||
        rawData.compiledProductionPrompt ||
        rawData.compiledBasePrompt ||
        rawData.promptText ||
        rawData.visualIdentity ||
        null;

      // 12. Contar versões prévias e registrar PromptVersion histórico e rastreável
      const priorCount = await db.promptVersion.count({
        where: {
          projectId,
          templateKey: req.templateKey,
          sceneId: req.sceneId || null,
        },
      });
      const versionNumber = priorCount + 1;

      const promptVersion = await db.promptVersion.create({
        data: {
          projectId,
          sceneId: req.sceneId || null,
          templateKey: req.templateKey,
          templateVersion: template.version,
          targetTool: req.targetTool,
          modelName: geminiResult.model || modelName,
          inputSnapshot: {
            versionNumber,
            parentVersionId: req.parentVersionId || null,
            status: "SUCCEEDED",
            resolvedParameters,
            customInstructions: req.customInstructions,
            sceneTitle: sceneData?.title || null,
            characterName: characterData?.name || null,
            environmentName: environmentData?.name || null,
            elementsSnapshot: {
              project: {
                id: project.id,
                title: project.title,
                genre: project.genre,
                language: project.language,
                configuration: project.configuration,
              },
              scene: sceneData
                ? {
                    id: sceneData.id,
                    title: sceneData.title,
                    order: sceneData.order,
                    durationSeconds: sceneData.durationSeconds,
                    description: sceneData.description,
                    configuration: sceneData.configuration,
                  }
                : undefined,
              character: characterData
                ? {
                    id: characterData.id,
                    name: characterData.name,
                    description: characterData.description,
                    attributes: characterData.attributes,
                  }
                : undefined,
              environment: environmentData
                ? {
                    id: environmentData.id,
                    name: environmentData.name,
                    description: environmentData.description,
                    attributes: environmentData.attributes,
                  }
                : undefined,
            },
            technicalMetadata: {
              model: geminiResult.model || modelName,
              targetTool: req.targetTool,
              templateVersion: template.version,
              jobId: job.id,
              tokens: geminiResult.tokens || null,
              durationMs: finishedTime.getTime() - startTime.getTime(),
              startedAt: startTime.toISOString(),
              finishedAt: finishedTime.toISOString(),
            },
          } as Prisma.InputJsonValue,
          outputJson: geminiResult.data as unknown as Prisma.InputJsonValue,
          outputText,
        },
      });

      return {
        jobId: job.id,
        versionId: promptVersion.id,
        templateKey: req.templateKey,
        templateVersion: template.version,
        targetTool: req.targetTool,
        model: geminiResult.model || modelName,
        data: geminiResult.data,
        tokens: geminiResult.tokens,
        createdAt: promptVersion.createdAt.toISOString(),
      };

    } catch (err: any) {
      // Registrar falha no GenerationJob
      await db.generationJob.update({
        where: { id: job.id },
        data: {
          status: GenerationStatus.FAILED,
          errorMessage: err?.message || "Erro desconhecido na geração do prompt.",
          finishedAt: new Date(),
        },
      });

      throw err;
    }
  }

  /**
   * Lista o histórico de versões de prompts gerados para o projeto.
   */
  static async listVersions(
    projectId: string,
    workspaceId: string,
    filters?: { sceneId?: string; templateKey?: string }
  ) {
    await this.assertProjectOwnership(projectId, workspaceId);

    const where: Prisma.PromptVersionWhereInput = {
      projectId,
    };

    if (filters?.sceneId) where.sceneId = filters.sceneId;
    if (filters?.templateKey) where.templateKey = filters.templateKey;

    return db.promptVersion.findMany({
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
  }

  /**
   * Alias para listVersions compatível com interface de histórico.
   */
  static async getHistory(
    projectId: string,
    workspaceId: string,
    filters?: { sceneId?: string; templateKey?: string }
  ) {
    return this.listVersions(projectId, workspaceId, filters);
  }

  /**
   * Obtém detalhes de uma versão de prompt específica com validação de ownership.
   * Suporta assinaturas:
   * - (versionId, projectId, workspaceId)
   * - (projectId, workspaceId, versionId)
   */
  static async getVersionById(
    arg1: string,
    arg2: string,
    arg3: string
  ) {
    let versionId: string;
    let projectId: string;

    const p1 = await db.project.findFirst({ where: { id: arg2, workspaceId: arg3 } });
    if (p1) {
      versionId = arg1;
      projectId = arg2;
    } else {
      const p2 = await db.project.findFirst({ where: { id: arg1, workspaceId: arg2 } });
      if (p2) {
        projectId = arg1;
        versionId = arg3;
      } else {
        throw new Error("Projeto não encontrado ou acesso não permitido.");
      }
    }

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

    if (!version) throw new Error("Versão de prompt não encontrada ou acesso não permitido.");
    return version;
  }


  /**
   * Lista os templates de sistema e perfis de ferramentas disponíveis.
   */
  static getAvailableTemplates() {
    return Object.values(SYSTEM_TEMPLATES).map((t) => ({
      key: t.key,
      name: t.name,
      version: t.version,
      description: t.description,
      sections: t.sections,
    }));
  }

  static getAvailableToolProfiles() {
    return Object.values(TOOL_PROFILES);
  }
}
