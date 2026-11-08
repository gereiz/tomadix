import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { db } from "@/lib/db";
import { ProjectService } from "@/modules/projects/project.service";
import { CharacterService } from "@/modules/characters/character.service";
import { EnvironmentService } from "@/modules/environments/environment.service";
import { SceneService } from "@/modules/scenes/scene.service";
import { PromptEngineService } from "@/modules/prompt-engine/prompt-engine.service";
import * as geminiProvider from "@/modules/ai/gemini-provider";
import {
  GeminiAuthError,
  GeminiQuotaError,
  GeminiInvalidJsonError,
  GeminiTimeoutError,
} from "@/modules/ai/gemini-provider";

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 500): Promise<T> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      if (i < retries - 1) {
        await new Promise((res) => setTimeout(res, delayMs));
      }
    }
  }
  throw lastError;
}

describe("PromptEngineService - Motor de Composição e Geração com Gemini", () => {
  let workspaceAId: string;
  let workspaceBId: string;
  let projectId: string;
  let characterId: string;
  let environmentId: string;
  let sceneId: string;

  beforeAll(async () => {
    // 1. Criar Workspace A e Projeto
    const wsA = await withRetry(() =>
      db.workspace.create({
        data: {
          name: "Estúdio Prompt Alpha",
          slug: `prompt-alpha-${Date.now()}`,
          creditsBalance: 500,
        },
      })
    );
    workspaceAId = wsA.id;

    const wsB = await withRetry(() =>
      db.workspace.create({
        data: {
          name: "Estúdio Prompt Beta",
          slug: `prompt-beta-${Date.now()}`,
        },
      })
    );
    workspaceBId = wsB.id;

    const project = await withRetry(() =>
      ProjectService.createProject(workspaceAId, {
        title: "Cyberpunk São Paulo 2088",
        description: "Ficção científica cinematográfica em ruas chuvosas e luzes de neon.",
        genre: "Sci-Fi / Cyberpunk",
        language: "pt-BR",
        configuration: {
          aspectRatio: "2.39:1",
          targetPlatform: "Google Flow",
        },
      })
    );
    projectId = project.id;

    // 2. Criar Personagem
    const char = await withRetry(() =>
      CharacterService.createCharacter(projectId, workspaceAId, {
        name: "Akira Tanaka",
        description: "Detetive cibernético com sobretudo escuro e olho biônico azul.",
        attributes: {
          visualIdentity: "Sobretudo preto desgastado, implante ocular cintilante neon azul.",
        },
      })
    );
    characterId = char.id;

    // 3. Criar Ambiente
    const env = await withRetry(() =>
      EnvironmentService.createEnvironment(projectId, workspaceAId, {
        name: "Beco Chuvoso da Liberdade",
        description: "Rua estreita de paralelepípedos molhados com reflexos de letreiros luminosos.",
        attributes: {
          lighting: "Neon vermelho e azul difuso, poças refletivas.",
        },
      })
    );
    environmentId = env.id;

    // 4. Criar Cena
    const scene = await withRetry(() =>
      SceneService.createScene(projectId, workspaceAId, {
        title: "O Encontro no Beco",
        description: "Akira caminha pelo beco sob garoa densa.",
        configuration: {
          mainAction: "Akira acende um cigarro holográfico enquanto observa a sombra ao longe.",
          framing: "Plano Médio (Medium Shot)",
          cameraMovement: "Travelling frontal lento",
          lighting: "Luz de recorte neon ciano",
        },
        characterIds: [characterId],
        environmentIds: [environmentId],
      })
    );
    sceneId = scene!.id;

  });

  afterAll(async () => {
    try {
      await withRetry(() => db.promptVersion.deleteMany({ where: { projectId } }));
      await withRetry(() => db.generationJob.deleteMany({ where: { projectId } }));
      await withRetry(() => db.scene.deleteMany({ where: { projectId } }));
      await withRetry(() => db.character.deleteMany({ where: { projectId } }));
      await withRetry(() => db.environment.deleteMany({ where: { projectId } }));
      await withRetry(() => db.project.deleteMany({ where: { id: projectId } }));
      await withRetry(() =>
        db.workspace.deleteMany({
          where: { id: { in: [workspaceAId, workspaceBId] } },
        })
      );
    } catch {
      // Ignorar erros na limpeza
    }
  });

  // -------------------------------------------------------------
  // 1. Templates e Perfis de Ferramentas
  // -------------------------------------------------------------
  describe("Templates & Perfis de Ferramentas", () => {
    it("deve disponibilizar todos os 7 templates cinematográficos versionados", () => {
      const templates = PromptEngineService.getAvailableTemplates();
      expect(templates.length).toBe(7);

      const keys = templates.map((t) => t.key);
      expect(keys).toContain("visual_bible");
      expect(keys).toContain("character_definition");
      expect(keys).toContain("environment_definition");
      expect(keys).toContain("image_prompt");
      expect(keys).toContain("video_prompt");
      expect(keys).toContain("scene_sequence");
      expect(keys).toContain("individual_scene");

      for (const t of templates) {
        expect(t.version).toBeGreaterThanOrEqual(1);
        expect(t.name).toBeTruthy();
        expect(t.description).toBeTruthy();
      }
    });

    it("deve disponibilizar perfis de saída suportados (Google Flow, Nano Banana, Seedance, Kling, Genérico)", () => {
      const profiles = PromptEngineService.getAvailableToolProfiles();
      expect(profiles.length).toBe(5);

      const keys = profiles.map((p) => p.key);
      expect(keys).toContain("google_flow");
      expect(keys).toContain("nano_banana");
      expect(keys).toContain("seedance");
      expect(keys).toContain("kling");
      expect(keys).toContain("generic");

      for (const p of profiles) {
        expect(p.features.maxPromptCharacters).toBe(5000);
        expect(p.features.maxPlainTextCharacters).toBe(2500);
        expect(p.promptFormattingRules.length).toBeGreaterThan(0);
      }

      const flow = profiles.find((p) => p.key === "google_flow");
      expect(flow?.features.supportsMotionVectors).toBe(true);

      const banana = profiles.find((p) => p.key === "nano_banana");
      expect(banana?.features.maxPlainTextCharacters).toBe(2500);
    });


  });

  // -------------------------------------------------------------
  // 2. Validação de Parâmetros Obrigatórios Ausentes
  // -------------------------------------------------------------
  describe("Validação de Parâmetros Obrigatórios", () => {
    it("deve rejeitar geração de character_definition sem selecionar um personagem", async () => {
      await expect(
        PromptEngineService.generate(projectId, workspaceAId, {
          templateKey: "character_definition",
          targetTool: "generic",
        })
      ).rejects.toThrow("Parâmetro obrigatório ausente: Selecione um personagem");
    });

    it("deve rejeitar geração de environment_definition sem selecionar um ambiente", async () => {
      await expect(
        PromptEngineService.generate(projectId, workspaceAId, {
          templateKey: "environment_definition",
          targetTool: "generic",
        })
      ).rejects.toThrow("Parâmetro obrigatório ausente: Selecione um ambiente");
    });

    it("deve rejeitar geração de individual_scene sem selecionar uma cena", async () => {
      await expect(
        PromptEngineService.generate(projectId, workspaceAId, {
          templateKey: "individual_scene",
          targetTool: "generic",
        })
      ).rejects.toThrow("Parâmetro obrigatório ausente: Selecione uma cena");
    });
  });

  // -------------------------------------------------------------
  // 3. Geração Estruturada com Sucesso
  // -------------------------------------------------------------
  describe("Fluxo de Geração com Sucesso e Persistência", () => {
    it("deve gerar prompt de vídeo estruturado, salvar PromptVersion e registrar GenerationJob", async () => {
      // Mock do retorno estruturado do Gemini
      const mockVideoOutput = {
        sceneIdentifier: "Cena 01 - Beco Chuvoso",
        narrativeObjective: "Estabelecer o tom noir e a solidão do detetive Akira.",
        characterReferences: ["Akira Tanaka"],
        environmentReferences: ["Beco Chuvoso da Liberdade"],
        action: "Akira acende cigarro holográfico sob garoa fina.",
        visualComposition: "Medium shot com profundidade de campo rasa.",
        camera: "35mm anamórfica, f/1.8",
        movement: "Travelling frontal lento avançando suavemente.",
        lighting: "Neon azul e ciano de recorte com reflexos em poças.",
        style: "Cyberpunk cinematográfico 2.39:1, textura orgânica 35mm.",
        sound: "Chuva suave e zumbido elétrico de alta frequência.",
        dialogue: null,
        constraints: ["Sem cortes abruptos", "Sem iluminação solar direta"],
        continuityNotes: "Manter sobretudo escuro e olho azul aceso na próxima tomada.",
        compiledProductionPrompt:
          "Cinematic medium shot, Akira Tanaka in a dark trenchcoat, lit by vibrant cyan neon reflections on wet asphalt. Slow frontal dolly movement. 35mm anamorphic style, 2.39:1.",
      };

      const spy = vi
        .spyOn(geminiProvider, "generateStructuredJson")
        .mockResolvedValueOnce({
          data: mockVideoOutput,
          rawText: JSON.stringify(mockVideoOutput),
          model: "gemini-2.5-flash",
          tokens: {
            inputTokens: 450,
            outputTokens: 210,
          },
        });

      const result = await PromptEngineService.generate(projectId, workspaceAId, {
        templateKey: "video_prompt",
        targetTool: "google_flow",
        sceneId,
        customInstructions: "Enfatizar a atmosfera neo-noir e a chuva fina no asfalto.",
      });

      expect(spy).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.jobId).toBeTruthy();
      expect(result.versionId).toBeTruthy();
      expect(result.templateKey).toBe("video_prompt");
      expect(result.targetTool).toBe("google_flow");
      expect(result.data).toEqual(mockVideoOutput);
      expect(result.tokens?.inputTokens).toBe(450);

      // Verificar persistência no banco
      const savedJob = await db.generationJob.findUnique({
        where: { id: result.jobId },
      });
      expect(savedJob?.status).toBe("SUCCEEDED");
      expect(savedJob?.inputTokens).toBe(450);
      expect(savedJob?.outputTokens).toBe(210);

      const savedVersion = await db.promptVersion.findUnique({
        where: { id: result.versionId },
      });
      expect(savedVersion).toBeDefined();
      expect(savedVersion?.templateKey).toBe("video_prompt");
      expect(savedVersion?.targetTool).toBe("google_flow");
      expect(savedVersion?.templateVersion).toBe(1);
      expect(savedVersion?.outputText).toContain("Akira Tanaka");


      // Consultar histórico
      const history = await PromptEngineService.getHistory(projectId, workspaceAId);
      expect(history.length).toBeGreaterThanOrEqual(1);
      expect(history[0].id).toBe(result.versionId);

      // Consultar versão específica
      const fetchedVersion = await PromptEngineService.getVersionById(
        projectId,
        workspaceAId,
        result.versionId
      );
      expect(fetchedVersion.id).toBe(result.versionId);
      expect(fetchedVersion.outputJson).toEqual(mockVideoOutput);

      spy.mockRestore();
    });

    it("deve gerar Bíblia Visual do projeto com schema visual_bible", async () => {
      const mockBibleOutput = {
        projectTitle: "Cyberpunk São Paulo 2088",
        visualPhilosophy: "Futurismo sujo, alta tecnologia e baixa qualidade de vida.",
        colorPalette: {
          primary: "Preto profundo e azul meia-noite",
          secondary: "Ciano neon e magenta",
          accents: ["Laranja de alerta", "Branco estéril"],
        },
        lightingRules: "Sempre noturno ou penumbra, luzes diegéticas de néon.",
        cameraAndLenses: "Lentes anamórficas 35mm e 50mm, proporção 2.39:1.",
        textureAndGrain: "Granulação sutil 35mm Kodak Vision3.",
        atmosphereAndMood: "Melancólico, tenso e solitário.",
        negativePrompts: ["Luz solar direta", "Cores pastéis", "Estética vintage dos anos 70"],
      };

      const spy = vi
        .spyOn(geminiProvider, "generateStructuredJson")
        .mockResolvedValueOnce({
          data: mockBibleOutput,
          rawText: JSON.stringify(mockBibleOutput),
          model: "gemini-2.5-flash",
        });

      const result = await PromptEngineService.generate(projectId, workspaceAId, {
        templateKey: "visual_bible",
        targetTool: "generic",
      });

      expect(result.templateKey).toBe("visual_bible");
      expect(result.data).toEqual(mockBibleOutput);

      spy.mockRestore();
    });
  });

  // -------------------------------------------------------------
  // 4. Tratamento de Erros da Gemini API e Não Invenção de JSON
  // -------------------------------------------------------------
  describe("Tratamento de Erros da Gemini API", () => {
    it("deve tratar resposta com JSON inválido sem inventar dados, marcando o job como FAILED", async () => {
      const spy = vi
        .spyOn(geminiProvider, "generateStructuredJson")
        .mockRejectedValueOnce(
          new GeminiInvalidJsonError("Resposta malformada recebida do provedor.")
        );

      await expect(
        PromptEngineService.generate(projectId, workspaceAId, {
          templateKey: "image_prompt",
          targetTool: "nano_banana",
          customInstructions: "Retorne algo inválido",
        })
      ).rejects.toThrow(GeminiInvalidJsonError);

      // Verificar que o último job criado foi marcado como FAILED
      const failedJob = await db.generationJob.findFirst({
        where: { projectId },
        orderBy: { createdAt: "desc" },
      });
      expect(failedJob?.status).toBe("FAILED");
      expect(failedJob?.errorMessage).toContain("Resposta malformada");

      spy.mockRestore();

    });

    it("deve estornar integralmente os créditos quando a geração falha", async () => {
      const before = await db.workspace.findUnique({
        where: { id: workspaceAId },
        select: { creditsBalance: true },
      });

      const spy = vi
        .spyOn(geminiProvider, "generateStructuredJson")
        .mockRejectedValueOnce(new GeminiTimeoutError("Tempo limite esgotado."));

      await expect(
        PromptEngineService.generate(projectId, workspaceAId, {
          templateKey: "image_prompt",
          targetTool: "google_flow",
        })
      ).rejects.toThrow(GeminiTimeoutError);

      const after = await db.workspace.findUnique({
        where: { id: workspaceAId },
        select: { creditsBalance: true },
      });
      expect(after?.creditsBalance).toBe(before?.creditsBalance);

      spy.mockRestore();
    });

    it("não cobra créditos nem exige saldo quando skipCharge está ativo (uso em lote)", async () => {
      const before = await db.workspace.findUnique({
        where: { id: workspaceAId },
        select: { creditsBalance: true },
      });

      const spy = vi
        .spyOn(geminiProvider, "generateStructuredJson")
        .mockRejectedValueOnce(new GeminiQuotaError("Cota esgotada."));

      await expect(
        PromptEngineService.generate(
          projectId,
          workspaceAId,
          { templateKey: "image_prompt", targetTool: "google_flow" },
          { skipCharge: true }
        )
      ).rejects.toThrow(GeminiQuotaError);

      const after = await db.workspace.findUnique({
        where: { id: workspaceAId },
        select: { creditsBalance: true },
      });
      expect(after?.creditsBalance).toBe(before?.creditsBalance);

      spy.mockRestore();
    });

    it("deve tratar erro de cota (GeminiQuotaError) adequadamente", async () => {
      const spy = vi
        .spyOn(geminiProvider, "generateStructuredJson")
        .mockRejectedValueOnce(
          new GeminiQuotaError("Limite de requisições por minuto atingido.")
        );

      await expect(
        PromptEngineService.generate(projectId, workspaceAId, {
          templateKey: "video_prompt",
          targetTool: "google_flow",
        })
      ).rejects.toThrow(GeminiQuotaError);

      spy.mockRestore();
    });

    it("deve tratar timeout da API (GeminiTimeoutError)", async () => {
      const spy = vi
        .spyOn(geminiProvider, "generateStructuredJson")
        .mockRejectedValueOnce(
          new GeminiTimeoutError("Tempo limite esgotado ao aguardar o modelo.")
        );

      await expect(
        PromptEngineService.generate(projectId, workspaceAId, {
          templateKey: "scene_sequence",
          targetTool: "generic",
        })
      ).rejects.toThrow(GeminiTimeoutError);

      spy.mockRestore();
    });
  });

  // -------------------------------------------------------------
  // 5. Isolamento Multitenant
  // -------------------------------------------------------------
  describe("Isolamento Multitenant", () => {
    it("não deve permitir que Workspace B gere prompts em projeto do Workspace A", async () => {
      await expect(
        PromptEngineService.generate(projectId, workspaceBId, {
          templateKey: "video_prompt",
          targetTool: "google_flow",
        })
      ).rejects.toThrow("Projeto não encontrado ou acesso não permitido.");
    });

    it("não deve permitir que Workspace B consulte histórico de prompts do Workspace A", async () => {
      await expect(
        PromptEngineService.getHistory(projectId, workspaceBId)
      ).rejects.toThrow("Projeto não encontrado ou acesso não permitido.");
    });

    it("não deve permitir que Workspace B consulte versão específica do Workspace A", async () => {
      // Obter uma versão existente
      const history = await PromptEngineService.getHistory(projectId, workspaceAId);
      const versionId = history[0]?.id;
      if (versionId) {
        await expect(
          PromptEngineService.getVersionById(projectId, workspaceBId, versionId)
        ).rejects.toThrow("Projeto não encontrado ou acesso não permitido.");
      }
    });

  });

  // -------------------------------------------------------------
  // Sequência de Cenas: usa as cenas reais do projeto
  // -------------------------------------------------------------
  describe("Sequência de Cenas com cenas reais", () => {
    it("deve usar as cenas criadas (id, ordem, título) mesmo que a IA invente outras", async () => {
      const real = await db.scene.findMany({ where: { projectId }, orderBy: { order: "asc" } });
      expect(real.length).toBeGreaterThan(0);

      const aiOutput = {
        schemaVersion: "1.0",
        type: "scene_sequence",
        projectId,
        sequenceTitle: "Seq",
        targetTool: "Seedance",
        narrativePacing: "Rápido",
        scenes: real.map((r, i) => ({
          sceneId: `inventado-${i}`,
          order: 50 + i,
          title: `Cena inventada ${i}`,
          durationSeconds: 5,
          shotPrompt: `prompt ${i}`,
          transition: "Corte",
          continuityNotes: "",
        })),
        globalAtmosphere: "x",
      };

      const spy = vi.spyOn(geminiProvider, "generateStructuredJson").mockResolvedValueOnce({
        data: aiOutput,
        rawText: JSON.stringify(aiOutput),
        model: "gemini-2.5-flash",
        tokens: { inputTokens: 1, outputTokens: 1 },
      } as any);

      const result = await PromptEngineService.generate(projectId, workspaceAId, {
        templateKey: "scene_sequence",
        targetTool: "seedance",
      });

      const prompt = spy.mock.calls[0][0] as string;
      for (const r of real) expect(prompt).toContain(`sceneId: ${r.id}`);
      const scenes = (result.data as any).scenes;
      expect(scenes.map((s: any) => s.sceneId)).toEqual(real.map((r) => r.id));
      expect(scenes.map((s: any) => s.order)).toEqual(real.map((r) => r.order));
      expect(scenes.map((s: any) => s.title)).toEqual(real.map((r) => r.title));
      expect(result.targetTool).toBe("seedance");
      spy.mockRestore();
    });

    it("deve rejeitar a sequência quando o projeto não tem cenas", async () => {
      const empty = await withRetry(() =>
        ProjectService.createProject(workspaceAId, { title: "Sem cenas", description: "", genre: "Geral", language: "pt-BR", configuration: { aspectRatio: "16:9", targetPlatform: "Google Flow" } })
      );
      try {
        await expect(
          PromptEngineService.generate(empty.id, workspaceAId, { templateKey: "scene_sequence", targetTool: "kling" })
        ).rejects.toThrow(/Selecione ou crie ao menos uma cena/);
      } finally {
        await db.generationJob.deleteMany({ where: { projectId: empty.id } });
        await db.project.deleteMany({ where: { id: empty.id } });
      }
    });
  });
});
