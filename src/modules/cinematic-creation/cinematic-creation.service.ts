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

    const outputSchema = z.object({
      rationale: z.string(),
      shots: z.array(
        z.object({
          title: z.string(),
          description: z.string(),
          durationSeconds: z.number().int().default(5),
          framing: z.string(),
          cameraMovement: z.string(),
          mainAction: z.string(),
          lighting: z.string(),
          visualStyle: z.string(),
          transitionIn: z.string().default("Corte Direto (Cut)"),
          transitionOut: z.string().default("Corte Direto (Cut)"),
        })
      ),
    });

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

        const generatedShots = geminiResponse.data.shots;

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
          rationale: geminiResponse.data.rationale,
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

    const outputSchema = z.object({
      sequenceTitle: z.string(),
      dramaticArc: z.string(),
      scenes: z.array(
        z.object({
          title: z.string(),
          description: z.string(),
          durationSeconds: z.number().int().default(6),
          framing: z.string(),
          cameraMovement: z.string(),
          mainAction: z.string(),
          lighting: z.string(),
          visualStyle: z.string(),
          transitionIn: z.string().default("Corte Direto (Cut)"),
          transitionOut: z.string().default("Corte Direto (Cut)"),
        })
      ),
    });

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

        const createdScenes = await db.$transaction(async (tx) => {
          const list = [];
          for (const s of geminiResponse.data.scenes) {
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
                  sequenceTitle: geminiResponse.data.sequenceTitle,
                  sequenceArc: geminiResponse.data.dramaticArc,
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
          sequenceTitle: geminiResponse.data.sequenceTitle,
          dramaticArc: geminiResponse.data.dramaticArc,
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

    const outputSchema = z.object({
      title: z.string(),
      logline: z.string(),
      fullScreenplayText: z.string(),
      scenes: z.array(
        z.object({
          sceneNumber: z.number().int(),
          heading: z.string(),
          summary: z.string(),
          durationSeconds: z.number().int().default(10),
          framing: z.string(),
          mainAction: z.string(),
          lighting: z.string(),
          charactersInvolved: z.array(z.string()).default([]),
        })
      ),
    });

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

        const data = geminiResponse.data;

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

    const outputSchema = z.object({
      name: z.string(),
      archetype: z.string(),
      role: z.string(),
      description: z.string(),
      attributes: z.object({
        age: z.string().optional(),
        gender: z.string().optional(),
        eyes: z.string().optional(),
        hair: z.string().optional(),
        physique: z.string().optional(),
        costume: z.string().optional(),
        lightingPreference: z.string().optional(),
        actingStyle: z.string().optional(),
        colorPalette: z.string().optional(),
        psychologicalTraits: z.string().optional(),
      }),
    });

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
Sua missão é conceber um personagem tridimensional, marcante e perfeito para ser renderizado por IAs visuais (Midjourney, Flux, Sora).`;

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

        const data = geminiResponse.data;

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

    const outputSchema = z.object({
      name: z.string(),
      type: z.string(),
      description: z.string(),
      attributes: z.object({
        locationType: z.string().optional(),
        spatialDimensions: z.string().optional(),
        lightingKey: z.string().optional(),
        practicalLights: z.string().optional(),
        colorPalette: z.string().optional(),
        atmosphereAndMood: z.string().optional(),
        texturesAndMaterials: z.string().optional(),
        keyProps: z.string().optional(),
        cameraLensSuggestion: z.string().optional(),
      }),
    });

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
Conceba uma locação cinematográfica palpável, com atmosfera visual rica em texturas, iluminação cênica e identidade estética.`;

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

        const data = geminiResponse.data;

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

    const outputSchema = z.object({
      artDirectionConcept: z.string(),
      colorPalette: z.object({
        dominant: z.string(),
        secondary: z.string(),
        accent: z.string(),
        gradingNotes: z.string(),
      }),
      cinematography: z.object({
        aspectRatio: z.string(),
        recommendedLenses: z.string(),
        cameraMovementStyle: z.string(),
        grainAndTexture: z.string(),
      }),
      lightingPhilosophy: z.object({
        contrastRatio: z.string(),
        keyLightStyle: z.string(),
        shadowTreatment: z.string(),
      }),
      visualDirectives: z.array(z.string()),
    });

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

    const outputSchema = z.object({
      originalPrompt: z.string(),
      enhancedPrompt: z.string(),
      technicalNotes: z.array(z.string()),
      targetGenerator: z.string(),
    });

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
            const result = await PromptEngineService.generate(projectId, workspaceId, {
              templateKey: "video_prompt",
              targetTool: (input.targetTool === "nano_banana" ? "nano_banana" : "google_flow"),
              sceneId: scene.id,
              subject: scene.title,
              action: config.mainAction || scene.description,
              environment: scene.environments[0]?.environment?.name || "Ambiente Cinematográfico",
              framing: config.framing || "Plano Médio",
              lighting: config.lighting || "Luz Natural",
              cameraMovement: config.cameraMovement,
              characterIds: scene.characters.map((c) => c.characterId),
            } as any);

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

        return {
          totalProcessed: scenes.length,
          successCount: generatedList.filter((g) => g.success).length,
          results: generatedList,
        };
      }
    );
  }
}
