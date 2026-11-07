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
import { ParameterService } from "../parameters/parameter.service";
import { formatPromptToPlainText } from "./format-plain-text";
import { EntitlementService } from "../billing/entitlement.service";
import { CreditPricingService } from "../billing/credit-pricing.service";
import { CreditExecutionService } from "../billing/credit-execution.service";

export interface GeneratePromptResult {
  jobId: string;
  versionId: string;
  templateKey: TemplateKey;
  templateVersion: number;
  targetTool: string;
  model: string;
  data: PromptEngineOutput;
  formattedText?: string;
  outputFormat?: "json" | "text";
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
    req: GeneratePromptRequest,
    options?: { skipCharge?: boolean }
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

    // Carregar referências contextuais estruturadas (@personagens, #ambientes, $cenas)
    let contextualReferences: {
      characters?: Array<{ id: string; name: string; description: string; attributes: any }>;
      environments?: Array<{ id: string; name: string; description: string; attributes: any }>;
      scenes?: Array<{ id: string; title: string; order: number; description: string; configuration: any }>;
    } | undefined = undefined;

    if (req.references) {
      const charIds = (req.references.characterIds || []).filter(Boolean);
      const envIds = (req.references.environmentIds || []).filter(Boolean);
      const sceneIds = (req.references.sceneIds || []).filter(Boolean);

      if (charIds.length > 0 || envIds.length > 0 || sceneIds.length > 0) {
        const [refChars, refEnvs, refScenes] = await Promise.all([
          charIds.length > 0
            ? db.character.findMany({
                where: { id: { in: charIds }, projectId },
                select: { id: true, name: true, description: true, attributes: true },
              })
            : [],
          envIds.length > 0
            ? db.environment.findMany({
                where: { id: { in: envIds }, projectId },
                select: { id: true, name: true, description: true, attributes: true },
              })
            : [],
          sceneIds.length > 0
            ? db.scene.findMany({
                where: { id: { in: sceneIds }, projectId },
                select: { id: true, title: true, order: true, description: true, configuration: true },
              })
            : [],
        ]);

        contextualReferences = {
          characters: refChars.map((c) => ({
            id: c.id,
            name: c.name,
            description: c.description || "",
            attributes: c.attributes,
          })),
          environments: refEnvs.map((e) => ({
            id: e.id,
            name: e.name,
            description: e.description || "",
            attributes: e.attributes,
          })),
          scenes: refScenes.map((s) => ({
            id: s.id,
            title: s.title,
            order: s.order,
            description: s.description || "",
            configuration: s.configuration,
          })),
        };
      }
    }

    // 5. Carregar e resolver parâmetros cinematográficos do projeto e do contexto específico (Etapa 5)
    const targetContext = req.sceneId
      ? { type: "SCENE" as const, id: req.sceneId }
      : req.characterId
      ? { type: "CHARACTER" as const, id: req.characterId }
      : req.environmentId
      ? { type: "ENVIRONMENT" as const, id: req.environmentId }
      : { type: "PROJECT" as const, id: projectId };

    const parameterResolution = await ParameterService.resolveForProject(
      projectId,
      workspaceId,
      targetContext
    );

    const resolvedParameters: Record<string, any> = parameterResolution.resolved;
    const missingRequiredParams = parameterResolution.missingRequired;

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
      contextualReferences,
      customInstructions: req.customInstructions,
    });

    // 7. Política Comercial: Resolução dinâmica de custos via Catálogo Central de Operações
    let operationCode = "GEN_IMAGE_PROMPT";
    if (["runway_gen3", "sora", "kling_ai", "luma_dream_machine"].includes(req.targetTool || "google_flow") || req.templateKey === "video_prompt") {
      operationCode = "GEN_VIDEO_PROMPT";
    } else if (req.templateKey === "character_definition") {
      operationCode = "GEN_CHARACTER";
    } else if (req.templateKey === "environment_definition") {
      operationCode = "GEN_ENVIRONMENT";
    } else if (req.templateKey === "visual_bible") {
      operationCode = "GEN_VISUAL_BIBLE";
    } else if (req.templateKey === "scene_sequence") {
      operationCode = "GEN_SCENE_SEQUENCE";
    }

    const wsSub = await db.subscription.findUnique({
      where: { workspaceId },
      select: { planTier: true },
    });
    const currentPlanTier = wsSub?.planTier || "FREE";

    const costResolution = await CreditPricingService.resolveCost(operationCode, currentPlanTier);
    // Chamadores que já cobram a operação como um todo (ex.: lote) evitam cobrança dupla.
    const creditCost = options?.skipCharge ? 0 : costResolution.creditCost;

    // Pré-checagem de saldo (o débito efetivo ocorre após a criação do job,
    // para que uma falha ao registrar o job nunca deixe créditos cobrados).
    if (creditCost > 0) {
      await EntitlementService.assertCanConsumeCredits(workspaceId, creditCost);
    }

    // 8. Registrar GenerationJob com status PENDING
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
          creditCost,
        } as Prisma.InputJsonValue,
      },
    });

    try {
      // Corpo da geração (IA + persistência). Quando há custo, roda dentro de
      // executeWithCredits: débito por lote (ordem de consumo/FEFO) antes e
      // estorno por lote automático se qualquer etapa falhar.
      const runGeneration = async (): Promise<GeneratePromptResult> => {
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


      // 11. Extrair outputText e formatar saída em Texto Simples (Etapa 5)
      const rawData = geminiResult.data as any;
      const formattedText = formatPromptToPlainText(geminiResult.data, req.templateKey);
      const outputText =
        formattedText ||
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
          targetTool: req.targetTool || "google_flow",
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
        targetTool: req.targetTool || "google_flow",
        model: geminiResult.model || modelName,
        data: geminiResult.data,
        formattedText,
        outputFormat: req.outputFormat || "json",
        tokens: geminiResult.tokens,
        createdAt: promptVersion.createdAt.toISOString(),
      };
      };

      if (creditCost > 0) {
        const execution = await CreditExecutionService.executeWithCredits(
          {
            workspaceId,
            operationCode,
            description: `Geração de prompt (${costResolution.operationName} / ${req.targetTool})`,
            projectId,
            metadata: {
              jobId: job.id,
              templateKey: req.templateKey,
              targetTool: req.targetTool,
            },
          },
          runGeneration
        );
        return execution.result;
      }

      return await runGeneration();
    } catch (err: any) {
      // Registrar falha no GenerationJob
      try {
        await db.generationJob.update({
          where: { id: job.id },
          data: {
            status: GenerationStatus.FAILED,
            errorMessage: err?.message || "Erro desconhecido na geração do prompt.",
            finishedAt: new Date(),
          },
        });
      } catch (jobUpdateError) {
        console.error("Erro ao registrar falha do job de geração:", jobUpdateError);
      }

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
