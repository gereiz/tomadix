import { db } from "@/lib/db";
import { generateStructuredJson } from "@/modules/ai/gemini-provider";
import { CreditExecutionService } from "@/modules/billing/credit-execution.service";
import { z } from "zod";
import {
  ExpandSceneInput,
  GenerateSceneSequenceInput,
  GenerateScriptInput,
  GenerateCharacterInput,
  GenerateEnvironmentInput,
  GenerateVisualBibleInput,
  EnhancePromptInput,
  BatchGeneratePromptsInput,
} from "./cinematic-creation.schema";
import { PromptEngineService } from "../prompt-engine/prompt-engine.service";

export class CinematicCreationService {
  /**
   * Valida se o projeto pertence ao workspace informado.
   */
  private static async assertProjectOwnership(projectId: string, workspaceId: string) {
    const project = await db.project.findFirst({
      where: { id: projectId, workspaceId },
      include: {
        characters: { where: { isArchived: false } },
        environments: { where: { isArchived: false } },
      },
    });

    if (!project) {
      throw new Error("Projeto não encontrado ou acesso não permitido.");
    }

    return project;
  }

  /**
   * 1. EXPAND_SCENE — Desdobra uma cena existente em sub-planos, planos detalhe ou variações de ângulo.
   */
  static async expandScene(
    projectId: string,
    workspaceId: string,
    sceneId: string,
    input: ExpandSceneInput,
    userId?: string
  ) {
    const project = await this.assertProjectOwnership(projectId, workspaceId);

    const targetScene = await db.scene.findFirst({
      where: { id: sceneId, projectId },
      include: {
        characters: { include: { character: true } },
        environments: { include: { environment: true } },
      },
    });

    if (!targetScene) {
      throw new Error("Cena alvo não encontrada no projeto.");
    }

    const outputSchema = z.preprocess(
      (val: any) => {
        if (!val || typeof val !== "object") return {};
        return {
          rationale: val.rationale || val.justificativa || "",
          shots: Array.isArray(val.shots || val.planos || val.subScenes) ? (val.shots || val.planos || val.subScenes) : [],
        };
      },
      z.object({
        rationale: z.string().default(""),
        shots: z.array(
          z.object({
            title: z.string().default("Plano Complementar"),
            description: z.string().default(""),
            durationSeconds: z.number().int().default(5),
            framing: z.string().default("Plano Médio"),
            cameraMovement: z.string().default("Estática"),
            mainAction: z.string().default(""),
            lighting: z.string().default("Natural"),
            visualStyle: z.string().default("Cinematográfico"),
            transitionIn: z.string().default("Corte Direto (Cut)"),
            transitionOut: z.string().default("Corte Direto (Cut)"),
          })
        ).default([]),
      })
    );

    return await CreditExecutionService.executeWithCredits(
      {
        workspaceId,
        operationCode: "EXPAND_SCENE",
        description: `Expansão de cena "${targetScene.title}"`,
        projectId,
        userId,
        metadata: {
          sceneId,
          sceneTitle: targetScene.title,
          expansionType: input.expansionType,
          count: input.count,
        },
      },
      async () => {
        const config = (targetScene.configuration as any) || {};
        const charNames = targetScene.characters.map((c) => c.character.name).join(", ");
        const envNames = targetScene.environments.map((e) => e.environment.name).join(", ");

        const systemPrompt = `Você é um Diretor de Fotografia e Assistente de Direção de cinema profissional.
Sua missão é realizar a decupagem técnica cinematográfica, desdobrando uma cena base em ${input.count} planos/sub-cenas sequenciais ou complementares (${input.expansionType}).

DIRETRIZES DE CINEMA:
- As novas cenas devem manter perfeita continuidade temporal, estética e de ação com a cena original.
- Para SUB_SHOTS: desdobre em progressão clássica (ex: Plano Geral de estabelecimento -> Plano Médio com ação principal -> Plano Próximo/Detalhe de reação).
- Para CAMERA_ANGLES: crie variações de eixo de câmera, contra-campo ou ângulo plongée/contra-plongée coerentes.
- Para DETAIL_SHOTS: foque em inserts dramáticos de mãos, olhares, objetos ou luz.
- As ações devem ser concretas, visuais e cinematográficas.`;

        const userPrompt = `PROJETO: "${project.title}"
GÊNERO: ${project.genre || "Geral / Cinema"}
CENA ORIGINAL #${targetScene.order}: "${targetScene.title}"
DESCRIÇÃO ATUAL: ${targetScene.description || "N/A"}
AÇÃO PRINCIPAL: ${config.mainAction || "N/A"}
ENQUADRAMENTO: ${config.framing || "Plano Médio"}
ILUMINAÇÃO: ${config.lighting || "Natural"}
PERSONAGENS PRESENTES: ${charNames || "Nenhum explicitado"}
AMBIENTES PRESENTES: ${envNames || "Nenhum explicitado"}
DIRETIVAS ADICIONAIS DO DIRETOR: ${input.directives || "Nenhuma. Aplique decupagem técnica primorosa."}

Gere exatamente ${input.count} planos complementares/sub-cenas decupadas.`;

        const geminiResponse = await generateStructuredJson(
          userPrompt,
          outputSchema,
          { systemInstruction: systemPrompt }
        );

        const generatedShots = (geminiResponse.data as any).shots || [];

        // Persistência com reordenação transacional
        const createdScenes = await db.$transaction(async (tx) => {
          // Desloca cenas posteriores para abrir espaço na ordem
          await tx.scene.updateMany({
            where: {
              projectId,
              order: { gt: targetScene.order },
            },
            data: {
              order: { increment: generatedShots.length },
            },
          });

          const createdList = [];
          let currentOrder = targetScene.order + 1;

          for (let i = 0; i < generatedShots.length; i++) {
            const shot = generatedShots[i];
            const newScene = await tx.scene.create({
              data: {
                projectId,
                title: `${targetScene.title} — Plano ${i + 1}: ${shot.framing}`,
                order: currentOrder++,
                durationSeconds: shot.durationSeconds || 5,
                description: shot.description,
                configuration: {
                  mainAction: shot.mainAction,
                  framing: shot.framing,
                  cameraMovement: shot.cameraMovement,
                  lighting: shot.lighting,
                  visualStyle: shot.visualStyle,
                  transitionIn: shot.transitionIn,
                  transitionOut: shot.transitionOut,
                  derivedFromSceneId: targetScene.id,
                  expansionType: input.expansionType,
                },
                characters: {
                  create: targetScene.characters.map((c) => ({
                    characterId: c.characterId,
                    configuration: {},
                  })),
                },
                environments: {
                  create: targetScene.environments.map((e) => ({
                    environmentId: e.environmentId,
                    configuration: {},
                  })),
                },
              },
              include: {
                characters: { include: { character: true } },
                environments: { include: { environment: true } },
              },
            });

            createdList.push(newScene);
          }

          return createdList;
        });

        return {
          originalSceneId: targetScene.id,
          expansionType: input.expansionType,
          rationale: (geminiResponse.data as any).rationale || "",
          createdScenes,
        };
      }
    );
  }

  /**
   * 2. GEN_SCENE_SEQUENCE — Estruturação seriada de cenas e enquadramentos contínuos via IA.
   */
  static async generateSceneSequence(
    projectId: string,
    workspaceId: string,
    input: GenerateSceneSequenceInput,
    userId?: string
  ) {
    const project = await this.assertProjectOwnership(projectId, workspaceId);

    const characters = await db.character.findMany({
      where: {
        projectId,
        id: { in: input.characterIds },
      },
    });

    const environments = await db.environment.findMany({
      where: {
        projectId,
        id: { in: input.environmentIds },
      },
    });

    const outputSchema = z.preprocess(
      (val: any) => {
        if (!val || typeof val !== "object") return {};
        return {
          sequenceTitle: val.sequenceTitle || val.titulo || "Sequência",
          dramaticArc: val.dramaticArc || val.arcoDramatico || "",
          scenes: Array.isArray(val.scenes || val.cenas) ? (val.scenes || val.cenas) : [],
        };
      },
      z.object({
        sequenceTitle: z.string().default("Sequência"),
        dramaticArc: z.string().default(""),
        scenes: z.array(
          z.object({
            title: z.string().default("Cena"),
            description: z.string().default(""),
            durationSeconds: z.number().int().default(6),
            framing: z.string().default("Plano Geral"),
            cameraMovement: z.string().default("Tracking"),
            mainAction: z.string().default(""),
            lighting: z.string().default("Cinemática"),
            visualStyle: z.string().default("Estilizado"),
            transitionIn: z.string().default("Corte Direto (Cut)"),
            transitionOut: z.string().default("Corte Direto (Cut)"),
          })
        ).default([]),
      })
    );

    return await CreditExecutionService.executeWithCredits(
      {
        workspaceId,
        operationCode: "GEN_SCENE_SEQUENCE",
        description: `Geração de sequência seriada (${input.sceneCount} cenas)`,
        projectId,
        userId,
        metadata: {
          premise: input.premise,
          sceneCount: input.sceneCount,
          pacing: input.pacing,
        },
      },
      async () => {
        const charContext = characters.map((c) => `- ${c.name}: ${c.description}`).join("\n");
        const envContext = environments.map((e) => `- ${e.name}: ${e.description}`).join("\n");

        const systemPrompt = `Você é um Roteirista e Diretor Cinematográfico de renome.
Sua função é gerar uma sequência contínua de exatamente ${input.sceneCount} cenas encadeadas para um filme/produção audiovisual.

REGRAS OBRIGATÓRIAS:
- A sequência deve possuir arco narrativo com começo, tensão crescente e desfecho dramático ou gancho.
- Cada cena deve ter ações claras, físicas e enquadramento cinematográfico de alto nível.
- Ritmo solicitado: ${input.pacing}.
- Mantenha continuidade absoluta entre as cenas consecutivas.`;

        const userPrompt = `PROJETO: "${project.title}"
GÊNERO: ${project.genre || "Drama / Ficção"}
PREMISSA DA SEQUÊNCIA: ${input.premise}
CLIMA / MOOD: ${input.mood || "Cinematográfico e envolvente"}
PERSONAGENS VINCULADOS:
${charContext || "Personagens anônimos ou definidos na ação"}
AMBIENTES VINCULADOS:
${envContext || "Ambientes urbanos ou descritos no enredo"}

Gere a sequência técnica de exatamente ${input.sceneCount} cenas numeradas.`;

        const geminiResponse = await generateStructuredJson(
          userPrompt,
          outputSchema,
          { systemInstruction: systemPrompt }
        );

        // Obter maior ordem existente para anexar no fim
        const maxOrderScene = await db.scene.findFirst({
          where: { projectId },
          orderBy: { order: "desc" },
          select: { order: true },
        });

        let nextOrder = (maxOrderScene?.order ?? 0) + 1;

        const sequenceData = geminiResponse.data as any;
        const createdScenes = await db.$transaction(async (tx) => {
          const list = [];
          for (const s of (sequenceData.scenes || [])) {
            const created = await tx.scene.create({
              data: {
                projectId,
                title: s.title,
                order: nextOrder++,
                durationSeconds: s.durationSeconds || 6,
                description: s.description,
                configuration: {
                  mainAction: s.mainAction,
                  framing: s.framing,
                  cameraMovement: s.cameraMovement,
                  lighting: s.lighting,
                  visualStyle: s.visualStyle,
                  transitionIn: s.transitionIn,
                  transitionOut: s.transitionOut,
                  sequenceTitle: sequenceData.sequenceTitle,
                  sequenceArc: sequenceData.dramaticArc,
                },
                characters: {
                  create: characters.map((c) => ({
                    characterId: c.id,
                    configuration: {},
                  })),
                },
                environments: {
                  create: environments.map((e) => ({
                    environmentId: e.id,
                    configuration: {},
                  })),
                },
              },
              include: {
                characters: { include: { character: true } },
                environments: { include: { environment: true } },
              },
            });
            list.push(created);
          }
          return list;
        });

        return {
          sequenceTitle: sequenceData.sequenceTitle || "Sequência",
          dramaticArc: sequenceData.dramaticArc || "",
          createdScenes,
        };
      }
    );
  }

  /**
   * 3. GEN_SCRIPT — Criação de roteiro técnico com diálogos e rubricas de direção.
   */
  static async generateScript(
    projectId: string,
    workspaceId: string,
    input: GenerateScriptInput,
    userId?: string
  ) {
    const project = await this.assertProjectOwnership(projectId, workspaceId);

    const outputSchema = z.preprocess(
      (val: any) => {
        if (!val || typeof val !== "object") return {};
        return {
          title: val.title || val.titulo || "Roteiro",
          logline: val.logline || val.sinopse || "",
          fullScreenplayText: val.fullScreenplayText || val.textoCompleto || val.roteiro || "",
          scenes: Array.isArray(val.scenes || val.cenas) ? (val.scenes || val.cenas) : [],
        };
      },
      z.object({
        title: z.string().default("Roteiro"),
        logline: z.string().default(""),
        fullScreenplayText: z.string().default(""),
        scenes: z.array(
          z.object({
            sceneNumber: z.number().int().default(1),
            heading: z.string().default("CENA"),
            summary: z.string().default(""),
            durationSeconds: z.number().int().default(10),
            framing: z.string().default("Plano Médio"),
            mainAction: z.string().default(""),
            lighting: z.string().default("Natural"),
            charactersInvolved: z.array(z.string()).default([]),
          })
        ).default([]),
      })
    );

    return await CreditExecutionService.executeWithCredits(
      {
        workspaceId,
        operationCode: "GEN_SCRIPT",
        description: `Geração de roteiro cinematográfico completo (${input.format})`,
        projectId,
        userId,
        metadata: {
          premise: input.premise,
          format: input.format,
          generateScenesImmediately: input.generateScenesImmediately,
        },
      },
      async () => {
        const charNames = project.characters.map((c) => c.name).join(", ");
        const envNames = project.environments.map((e) => e.name).join(", ");

        const systemPrompt = `Você é um Mestre Roteirista de Cinema premiado.
Sua tarefa é escrever um roteiro cinematográfico profissional completo e formatado no padrão internacional Master Scene Format.

REGRAS DE FORMATAÇÃO:
- Cabeçalhos de cena (Sluglines): INT. ou EXT. [LOCAÇÃO] - [DIA/NOITE].
- Descrições de ação: No presente do indicativo, sucintas, sensoriais e visuais.
- Personagens e diálogos: Nomes centralizados em maiúsculas seguidos de falas marcantes e subtexto dramático.
- Inclua rubricas e indicações técnicas essenciais (ex: CLOSE EM, PLANO SEQUÊNCIA).`;

        const userPrompt = `PROJETO: "${project.title}"
GÊNERO: ${project.genre || "Ficção / Suspense / Drama"}
FORMATO: ${input.format}
PREMISSA DRAMÁTICA: ${input.premise}
TOM / ESTILO: ${input.tone || "Imersivo, cinematográfico, contemporâneo"}
PERSONAGENS DO PROJETO: ${charNames || "Crie personagens adequados ao argumento"}
AMBIENTES DO PROJETO: ${envNames || "Crie locações adequadas ao argumento"}

Escreva o roteiro completo no campo 'fullScreenplayText' e decomponha em blocos de cenas estruturados no array 'scenes'.`;

        const geminiResponse = await generateStructuredJson(
          userPrompt,
          outputSchema,
          { systemInstruction: systemPrompt }
        );

        const data = geminiResponse.data as any;

        // Atualiza a configuração do projeto com o roteiro
        const updatedConfig = {
          ...((project.configuration as any) || {}),
          screenplay: {
            title: data.title,
            logline: data.logline,
            fullText: data.fullScreenplayText,
            generatedAt: new Date().toISOString(),
            format: input.format,
          },
        };

        await db.project.update({
          where: { id: projectId },
          data: { configuration: updatedConfig },
        });

        let createdScenes: any[] = [];

        // Se solicitado, instancia automaticamente as cenas no banco
        if (input.generateScenesImmediately && data.scenes.length > 0) {
          const maxOrderScene = await db.scene.findFirst({
            where: { projectId },
            orderBy: { order: "desc" },
            select: { order: true },
          });

          let nextOrder = (maxOrderScene?.order ?? 0) + 1;

          createdScenes = await db.$transaction(async (tx) => {
            const list = [];
            for (const sc of data.scenes) {
              const created = await tx.scene.create({
                data: {
                  projectId,
                  title: `${sc.heading} — Cena ${sc.sceneNumber}`,
                  order: nextOrder++,
                  durationSeconds: sc.durationSeconds || 10,
                  description: sc.summary,
                  configuration: {
                    mainAction: sc.mainAction,
                    framing: sc.framing,
                    lighting: sc.lighting,
                    heading: sc.heading,
                  },
                },
              });
              list.push(created);
            }
            return list;
          });
        }

        return {
          title: data.title,
          logline: data.logline,
          fullScreenplayText: data.fullScreenplayText,
          scenesCount: data.scenes.length,
          createdScenes,
        };
      }
    );
  }

  /**
   * 4. GEN_CHARACTER — Criação de perfil cinematográfico de personagem e ficha de atuação.
   */
  static async generateCharacter(
    projectId: string,
    workspaceId: string,
    input: GenerateCharacterInput,
    userId?: string
  ) {
    const project = await this.assertProjectOwnership(projectId, workspaceId);

    const outputSchema = z.preprocess(
      (val: any) => {
        if (!val || typeof val !== "object") return {};
        // Se vier envelopado ou em lista
        let raw = val;
        if (Array.isArray(val) && val.length > 0) {
          raw = val[0];
        } else if (val.character && typeof val.character === "object" && !Array.isArray(val.character)) {
          raw = val.character;
        } else if (val.personagem && typeof val.personagem === "object" && !Array.isArray(val.personagem)) {
          raw = val.personagem;
        } else if (val.data && typeof val.data === "object" && !Array.isArray(val.data)) {
          raw = val.data;
        }

        const pickStr = (...candidates: any[]): string | undefined => {
          for (const c of candidates) {
            if (typeof c === "string" && c.trim().length > 0) return c.trim();
          }
          return undefined;
        };

        return {
          name: pickStr(raw.name, raw.nome, raw.character_name) || "Personagem",
          archetype: pickStr(raw.archetype, raw.arquetipo, raw.tipo, input.archetype) || "Protagonista",
          role: pickStr(raw.role, raw.papel, raw.funcao, input.role) || "Personagem Principal",
          description: pickStr(raw.description, raw.descricao, raw.perfil, raw.bio, input.prompt) || "",
          attributes: typeof raw.attributes === "object" && raw.attributes !== null && !Array.isArray(raw.attributes)
            ? raw.attributes
            : typeof raw.atributos === "object" && raw.atributos !== null && !Array.isArray(raw.atributos)
            ? raw.atributos
            : {},
        };
      },
      z.object({
        name: z.string().default("Personagem"),
        archetype: z.string().default("Protagonista"),
        role: z.string().default("Personagem Principal"),
        description: z.string().default(""),
        attributes: z.record(z.any()).default({}),
      })
    );

    return await CreditExecutionService.executeWithCredits(
      {
        workspaceId,
        operationCode: "GEN_CHARACTER",
        description: `Geração de personagem com IA`,
        projectId,
        userId,
        metadata: {
          prompt: input.prompt,
          archetype: input.archetype,
        },
      },
      async () => {
        const systemPrompt = `Você é um Diretor de Elenco e Dramaturgo cinematográfico.
Sua missão é conceber um personagem tridimensional, marcante e perfeito para ser renderizado por IAs visuais (Midjourney, Flux, Sora).

Responda ESTRITAMENTE em formato JSON com o seguinte schema:
{
  "name": "Nome cinematográfico do personagem",
  "archetype": "Arquétipo dramático (ex: O Rebelde, O Explorador)",
  "role": "Papel na narrativa (ex: Protagonista, Antagonista)",
  "description": "Descrição conceitual marcante e tridimensional",
  "attributes": {
    "age": "Idade aparente",
    "gender": "Gênero",
    "eyes": "Olhos",
    "hair": "Cabelo",
    "physique": "Biotipo físico",
    "costume": "Figurino característico",
    "lightingPreference": "Iluminação",
    "actingStyle": "Estilo de atuação",
    "colorPalette": "Paleta cromática",
    "psychologicalTraits": "Traços psicológicos"
  }
}`;

        const userPrompt = `PROJETO: "${project.title}"
GÊNERO: ${project.genre || "Cinema Geral"}
BRIEFING DO PERSONAGEM: ${input.prompt}
ARQUÉTIPO DESEJADO: ${input.archetype || "Apropriado ao briefing"}
PAPEL NA TRAMA: ${input.role || "Protagonista / Personagem Relevante"}

Crie um nome único e ficha completa.`;

        const geminiResponse = await generateStructuredJson(
          userPrompt,
          outputSchema,
          { systemInstruction: systemPrompt }
        );

        const data = geminiResponse.data as any;

        const newCharacter = await db.character.create({
          data: {
            projectId,
            name: data.name,
            description: `${data.role} (${data.archetype}). ${data.description}`,
            attributes: {
              ...data.attributes,
              archetype: data.archetype,
              role: data.role,
              aiGenerated: true,
            },
          },
        });

        return newCharacter;
      }
    );
  }

  /**
   * 5. GEN_ENVIRONMENT — Concepção de ambientação visual, iluminação e espaço cênico.
   */
  static async generateEnvironment(
    projectId: string,
    workspaceId: string,
    input: GenerateEnvironmentInput,
    userId?: string
  ) {
    const project = await this.assertProjectOwnership(projectId, workspaceId);

    const outputSchema = z.preprocess(
      (val: any) => {
        if (!val || typeof val !== "object") return {};
        let raw = val;
        if (Array.isArray(val) && val.length > 0) {
          raw = val[0];
        } else if (val.environment && typeof val.environment === "object" && !Array.isArray(val.environment)) {
          raw = val.environment;
        } else if (val.ambiente && typeof val.ambiente === "object" && !Array.isArray(val.ambiente)) {
          raw = val.ambiente;
        } else if (val.data && typeof val.data === "object" && !Array.isArray(val.data)) {
          raw = val.data;
        }

        const pickStr = (...candidates: any[]): string | undefined => {
          for (const c of candidates) {
            if (typeof c === "string" && c.trim().length > 0) return c.trim();
          }
          return undefined;
        };

        return {
          name: pickStr(raw.name, raw.nome, raw.location_name) || "Locação",
          type: pickStr(raw.type, raw.tipo, raw.locationType, input.locationType) || "Geral",
          description: pickStr(raw.description, raw.descricao, raw.detalhes, input.prompt) || "",
          attributes: typeof raw.attributes === "object" && raw.attributes !== null && !Array.isArray(raw.attributes)
            ? raw.attributes
            : typeof raw.atributos === "object" && raw.atributos !== null && !Array.isArray(raw.atributos)
            ? raw.atributos
            : {},
        };
      },
      z.object({
        name: z.string().default("Locação"),
        type: z.string().default("Geral"),
        description: z.string().default(""),
        attributes: z.record(z.any()).default({}),
      })
    );

    return await CreditExecutionService.executeWithCredits(
      {
        workspaceId,
        operationCode: "GEN_ENVIRONMENT",
        description: `Geração de ambiente cênico com IA`,
        projectId,
        userId,
        metadata: {
          prompt: input.prompt,
          locationType: input.locationType,
        },
      },
      async () => {
        const systemPrompt = `Você é um Diretor de Arte e Cenógrafo Cinematográfico.
Conceba uma locação cinematográfica palpável, com atmosfera visual rica em texturas, iluminação cênica e identidade estética.

Responda ESTRITAMENTE em formato JSON com o seguinte schema:
{
  "name": "Nome da Locação",
  "type": "Tipo de Locação",
  "description": "Descrição detalhada do ambiente e clima cênico",
  "attributes": {
    "locationType": "Interna / Externa / Estúdio",
    "spatialDimensions": "Dimensões e proporções espaciais",
    "lightingKey": "Esquema e temperatura de luz",
    "practicalLights": "Fontes de luz visíveis no quadro",
    "colorPalette": "Paleta cromática do espaço",
    "atmosphereAndMood": "Atmosfera e clima psicológico",
    "texturesAndMaterials": "Materiais e superfícies táteis",
    "keyProps": "Objetos cênicos fundamentais",
    "cameraLensSuggestion": "Lente e enquadramento recomendados"
  }
}`;

        const userPrompt = `PROJETO: "${project.title}"
GÊNERO: ${project.genre || "Cinema Geral"}
CONCEITO DO AMBIENTE: ${input.prompt}
TIPO DE LOCAÇÃO: ${input.locationType}

Crie nome cinematográfico e ficha de direção de arte completa.`;

        const geminiResponse = await generateStructuredJson(
          userPrompt,
          outputSchema,
          { systemInstruction: systemPrompt }
        );

        const data = geminiResponse.data as any;

        const newEnvironment = await db.environment.create({
          data: {
            projectId,
            name: data.name,
            description: `[${data.type}] ${data.description}`,
            attributes: {
              ...data.attributes,
              type: data.type,
              aiGenerated: true,
            },
          },
        });

        return newEnvironment;
      }
    );
  }

  /**
   * 6. GEN_VISUAL_BIBLE — Compilação estética completa do projeto cinematográfico com direção de arte.
   */
  static async generateVisualBible(
    projectId: string,
    workspaceId: string,
    input: GenerateVisualBibleInput,
    userId?: string
  ) {
    const project = await this.assertProjectOwnership(projectId, workspaceId);

    // Validação estrita de pré-requisitos essenciais para a Bíblia Visual
    const missingRequirements: string[] = [];
    if (!project.title || project.title.trim().length < 3) {
      missingRequirements.push("Título do projeto (mínimo de 3 caracteres)");
    }
    if (!project.description || project.description.trim().length < 10) {
      missingRequirements.push("Premissa dramática ou sinopse (mínimo de 10 caracteres)");
    }
    if (!project.genre || !project.genre.trim()) {
      missingRequirements.push("Gênero cinematográfico especificado");
    }
    if (!project.characters || project.characters.length === 0) {
      missingRequirements.push("Pelo menos 1 personagem registrado no projeto");
    }
    if (!project.environments || project.environments.length === 0) {
      missingRequirements.push("Pelo menos 1 ambiente/locação registrado no projeto");
    }

    if (missingRequirements.length > 0) {
      const error = new Error(
        `A Bíblia Visual só pode ser gerada após o preenchimento de todos os requisitos essenciais do projeto. Faltando: ${missingRequirements.join(
          "; "
        )}.`
      ) as any;
      error.statusCode = 422;
      error.code = "PREREQUISITES_NOT_MET";
      error.missing = missingRequirements;
      throw error;
    }

    const outputSchema = z.preprocess(
      (val: any) => {
        if (!val || typeof val !== "object") return {};
        return {
          artDirectionConcept: val.artDirectionConcept || val.conceito || val.direcaoDeArte || "Conceito Cinematográfico Geral",
          colorPalette: typeof val.colorPalette === "object" && val.colorPalette !== null
            ? val.colorPalette
            : typeof val.paletaDeCores === "object" && val.paletaDeCores !== null
            ? val.paletaDeCores
            : { dominant: "Neutro", secondary: "Natural", accent: "Dourado", gradingNotes: "" },
          cinematography: typeof val.cinematography === "object" && val.cinematography !== null
            ? val.cinematography
            : typeof val.fotografia === "object" && val.fotografia !== null
            ? val.fotografia
            : { aspectRatio: "16:9", recommendedLenses: "35mm e 50mm", cameraMovementStyle: "Cinemático", grainAndTexture: "35mm sutil" },
          lightingPhilosophy: typeof val.lightingPhilosophy === "object" && val.lightingPhilosophy !== null
            ? val.lightingPhilosophy
            : typeof val.iluminacao === "object" && val.iluminacao !== null
            ? val.iluminacao
            : { contrastRatio: "Médio", keyLightStyle: "Suave", shadowTreatment: "Difuso" },
          visualDirectives: Array.isArray(val.visualDirectives || val.diretrizes)
            ? (val.visualDirectives || val.diretrizes)
            : [],
        };
      },
      z.object({
        artDirectionConcept: z.string().default("Conceito Cinematográfico Geral"),
        colorPalette: z.object({
          dominant: z.string().default("Neutro"),
          secondary: z.string().default("Natural"),
          accent: z.string().default("Dourado"),
          gradingNotes: z.string().default(""),
        }).default({}),
        cinematography: z.object({
          aspectRatio: z.string().default("16:9"),
          recommendedLenses: z.string().default("35mm e 50mm"),
          cameraMovementStyle: z.string().default("Cinemático"),
          grainAndTexture: z.string().default("35mm"),
        }).default({}),
        lightingPhilosophy: z.object({
          contrastRatio: z.string().default("Médio"),
          keyLightStyle: z.string().default("Suave"),
          shadowTreatment: z.string().default("Difuso"),
        }).default({}),
        visualDirectives: z.array(z.string()).default([]),
      })
    );

    return await CreditExecutionService.executeWithCredits(
      {
        workspaceId,
        operationCode: "GEN_VISUAL_BIBLE",
        description: `Geração de Bíblia Visual do projeto "${project.title}"`,
        projectId,
        userId,
        metadata: {
          artDirectives: input.artDirectives,
        },
      },
      async () => {
        const charSummary = project.characters.map((c) => c.name).join(", ");
        const envSummary = project.environments.map((e) => e.name).join(", ");

        const systemPrompt = `Você é um Diretor de Arte e Diretor de Fotografia laureado.
Sua missão é redigir a Bíblia Visual (Lookbook Estético) oficial para a produção cinematográfica, servindo de guia mestre para IAs geradoras de imagem e vídeo.`;

        const userPrompt = `TÍTULO DO FILME: "${project.title}"
GÊNERO: ${project.genre || "Cinema"}
DESCRIÇÃO/PREMISSA: ${project.description || "N/A"}
PERSONAGENS REGISTRADOS: ${charSummary || "A definir"}
LOCAÇÕES REGISTRADAS: ${envSummary || "A definir"}
REFERÊNCIAS DE FOTOGRAFIA: ${input.cinematographerReference || "Cinematografia moderna e marcante"}
DIRETIVAS ADICIONAIS: ${input.artDirectives || "Nenhuma. Crie padrão visual coeso e cinematográfico."}

Gere a Bíblia Visual completa em JSON.`;

        const geminiResponse = await generateStructuredJson(
          userPrompt,
          outputSchema,
          { systemInstruction: systemPrompt }
        );

        const visualBibleData = geminiResponse.data;

        await db.project.update({
          where: { id: projectId },
          data: {
            visualBible: visualBibleData as any,
          },
        });

        return visualBibleData;
      }
    );
  }

  /**
   * 7. REWRITE_ENHANCE — Otimização de vocabulário de lente, iluminação e atmosfera cinematográfica.
   */
  static async enhancePrompt(
    projectId: string,
    workspaceId: string,
    input: EnhancePromptInput,
    userId?: string
  ) {
    await this.assertProjectOwnership(projectId, workspaceId);

    const outputSchema = z.preprocess(
      (val: any) => {
        if (!val || typeof val !== "object") return {};
        return {
          originalPrompt: val.originalPrompt || val.promptOriginal || input.prompt || "",
          enhancedPrompt: val.enhancedPrompt || val.promptAprimorado || val.prompt || input.prompt || "",
          technicalNotes: Array.isArray(val.technicalNotes || val.notasTecnicas)
            ? (val.technicalNotes || val.notasTecnicas)
            : [],
          targetGenerator: val.targetGenerator || input.targetGenerator || "general",
        };
      },
      z.object({
        originalPrompt: z.string().default(""),
        enhancedPrompt: z.string().default(""),
        technicalNotes: z.array(z.string()).default([]),
        targetGenerator: z.string().default("general"),
      })
    );

    return await CreditExecutionService.executeWithCredits(
      {
        workspaceId,
        operationCode: "REWRITE_ENHANCE",
        description: `Aprimoramento de prompt (${input.targetGenerator})`,
        projectId,
        userId,
        metadata: {
          targetGenerator: input.targetGenerator,
          focus: input.enhancementFocus,
        },
      },
      async () => {
        const systemPrompt = `Você é um Engenheiro de Prompts Cinematográficos especialista em Midjourney v6, Flux.1 Pro, Runway Gen-3 e Sora.
Sua missão é pegar um prompt de imagem ou vídeo básico e elevá-lo a um nível de cinematografia profissional de Hollywood.

DIRETRIZES:
- Preserve rigorosamente a intenção e os elementos principais do prompt original.
- Acrescente terminologia técnica precisa: distância focal, modelo de lente (ex: Anamorphic 50mm, Cooke Panchro), iluminação (ex: Chiaroscuro, Rembrandt, Golden Hour volumetric haze), color grading e granulação de película (ex: 35mm film grain, Arri Alexa 65).
- Otimize a sintaxe para o gerador alvo: ${input.targetGenerator}.`;

        const userPrompt = `PROMPT ORIGINAL: "${input.prompt}"
GERADOR ALVO: ${input.targetGenerator}
FOCO DE APRIMORAMENTO: ${input.enhancementFocus}

Retorne o prompt enriquecido e as notas técnicas do que foi aprimorado.`;

        const geminiResponse = await generateStructuredJson(
          userPrompt,
          outputSchema,
          { systemInstruction: systemPrompt }
        );

        return geminiResponse.data;
      }
    );
  }

  /**
   * 8. BATCH_GENERATION — Processamento paralelo simultâneo de múltiplos prompts de cenas.
   */
  static async batchGeneratePrompts(
    projectId: string,
    workspaceId: string,
    input: BatchGeneratePromptsInput,
    userId?: string
  ) {
    await this.assertProjectOwnership(projectId, workspaceId);

    const scenes = await db.scene.findMany({
      where: {
        projectId,
        id: { in: input.sceneIds },
      },
      orderBy: { order: "asc" },
      include: {
        characters: { include: { character: true } },
        environments: { include: { environment: true } },
      },
    });

    if (scenes.length === 0) {
      throw new Error("Nenhuma das cenas informadas foi encontrada no projeto.");
    }

    return await CreditExecutionService.executeWithCredits(
      {
        workspaceId,
        operationCode: "BATCH_GENERATION",
        description: `Geração em lote de ${scenes.length} prompts`,
        projectId,
        userId,
        metadata: {
          sceneIds: input.sceneIds,
          sceneCount: scenes.length,
          targetTool: input.targetTool,
        },
      },
      async () => {
        const generatedList = [];

        for (const scene of scenes) {
          try {
            const config = (scene.configuration as any) || {};
            const hints = [
              `Sujeito: ${scene.title}`,
              `Ação: ${config.mainAction || scene.description || "—"}`,
              `Ambiente: ${scene.environments[0]?.environment?.name || "Ambiente Cinematográfico"}`,
              `Enquadramento: ${config.framing || "Plano Médio"}`,
              `Iluminação: ${config.lighting || "Luz Natural"}`,
              config.cameraMovement ? `Movimento de câmera: ${config.cameraMovement}` : null,
            ]
              .filter(Boolean)
              .join(". ");

            // skipCharge: o lote inteiro já é cobrado por BATCH_GENERATION.
            const result = await PromptEngineService.generate(
              projectId,
              workspaceId,
              {
                templateKey: "video_prompt",
                targetTool: input.targetTool === "nano_banana" ? "nano_banana" : "google_flow",
                sceneId: scene.id,
                customInstructions: hints.slice(0, 2000),
                references: { characterIds: scene.characters.map((c) => c.characterId) },
              },
              { skipCharge: true }
            );

            generatedList.push({
              sceneId: scene.id,
              sceneTitle: scene.title,
              success: true,
              result,
            });
          } catch (err: any) {
            generatedList.push({
              sceneId: scene.id,
              sceneTitle: scene.title,
              success: false,
              error: err.message,
            });
          }
        }

        // Se nenhuma cena foi gerada, falha para que os créditos do lote sejam estornados.
        if (generatedList.every((g) => !g.success)) {
          throw new Error("Falha ao gerar o lote: nenhuma cena pôde ser processada.");
        }

        return {
          totalProcessed: scenes.length,
          successCount: generatedList.filter((g) => g.success).length,
          results: generatedList,
        };
      }
    );
  }
}
