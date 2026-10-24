import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { db } from "@/lib/db";
import { ProjectService } from "@/modules/projects/project.service";
import { CharacterService } from "@/modules/characters/character.service";
import { EnvironmentService } from "@/modules/environments/environment.service";
import { SceneService } from "@/modules/scenes/scene.service";
import { PromptEngineService } from "@/modules/prompt-engine/prompt-engine.service";
import { PromptHistoryService } from "@/modules/prompt-engine/prompt-history.service";
import * as geminiProvider from "@/modules/ai/gemini-provider";
import { GenerationStatus } from "@prisma/client";

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

describe("PromptHistoryService & Export - Histórico, Versionamento e Exportação", () => {
  let workspaceAId: string;
  let workspaceBId: string;
  let projectId: string;
  let characterId: string;
  let environmentId: string;
  let scene1Id: string;
  let scene2Id: string;
  let version1Id: string;
  let version2Id: string;

  beforeAll(async () => {
    // 1. Criar Workspaces e Projeto

    const wsA = await withRetry(() =>
      db.workspace.create({
        data: {
          name: "Produtora Histórico Alpha",
          slug: `history-alpha-${Date.now()}`,
        },
      })
    );
    workspaceAId = wsA.id;

    const wsB = await withRetry(() =>
      db.workspace.create({
        data: {
          name: "Produtora Histórico Beta",
          slug: `history-beta-${Date.now()}`,
        },
      })
    );
    workspaceBId = wsB.id;

    const project = await withRetry(() =>
      ProjectService.createProject(workspaceAId, {
        title: "O Enigma de Solaris Prime",
        description: "Thriller espacial de ficção científica e mistério em órbita.",
        genre: "Sci-Fi / Mistério",
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
        name: "Dra. Elena Vance",
        description: "Astrofísica sênior com macacão pressurizado e olhar compenetrado.",
        attributes: {
          visualIdentity: "Cabelos curtos prateados, traje espacial cinza com insígnia Solaris.",
        },
      })
    );
    characterId = char.id;

    // 3. Criar Ambiente
    const env = await withRetry(() =>
      EnvironmentService.createEnvironment(projectId, workspaceAId, {
        name: "Módulo de Comando da Estação",
        description: "Ponte de comando com janelas panorâmicas para a nebulosa cintilante.",
        attributes: {
          lighting: "Luz ambiente âmbar e azulada dos consoles de comando.",
        },
      })
    );
    environmentId = env.id;

    // 4. Criar Cenas 1 e 2
    const scene1 = await withRetry(() =>
      SceneService.createScene(projectId, workspaceAId, {
        title: "Alerta na Ponte",
        description: "Elena detecta oscilação gravitacional anômala nos sensores.",
        configuration: {
          mainAction: "Elena analisa a telemetria enquanto o alarme pulsa luz vermelha suave.",
          framing: "Plano Médio (Medium Shot)",
          cameraMovement: "Travelling lateral lento",
          lighting: "Contraste âmbar e pulso vermelho de emergência",
        },
        characterIds: [characterId],
        environmentIds: [environmentId],
      })
    );
    scene1Id = scene1!.id;

    const scene2 = await withRetry(() =>
      SceneService.createScene(projectId, workspaceAId, {
        title: "A Janela Panorâmica",
        description: "Elena caminha até a janela observando a anomalia cósmica se expandir.",
        configuration: {
          mainAction: "Elena toca o vidro reforçado observando o vórtice de luz.",
          framing: "Plano Geral (Wide Shot)",
          cameraMovement: "Dolly in suave",
          lighting: "Brilho estelar azul profundo refletindo na face de Elena",
        },
        characterIds: [characterId],
        environmentIds: [environmentId],
      })
    );
    scene2Id = scene2!.id;

    // 5. Gerar Versão 1 inicial com Mock do Gemini
    const mockOutput1 = {
      sceneIdentifier: "Cena 01 - Alerta na Ponte",
      narrativeObjective: "Introduzir a ameaça cósmica iminente e a urgência técnica.",
      characterReferences: ["Dra. Elena Vance"],
      environmentReferences: ["Módulo de Comando da Estação"],
      action: "Elena digita comandos rápidos no painel holográfico.",
      visualComposition: "Medium shot com profundidade de campo média e bokeh de consoles.",
      camera: "35mm anamorphic, f/2.0",
      movement: "Travelling lateral lento e preciso.",
      lighting: "Luz âmbar primária com luz de recorte pulsante vermelha.",
      style: "Cinematografia Sci-Fi realista em 2.39:1 widescreen.",
      sound: "Zumbido elétrico de reator e pulso grave de alerta sonoro.",
      dialogue: null,
      constraints: ["Sem movimentos bruscos de chicote de câmera"],
      continuityNotes: "Preservar traje cinza pressurizado de Elena na tomada seguinte.",
      compiledProductionPrompt:
        "Cinematic 35mm anamorphic shot, Dr. Elena Vance in a grey flight suit operating holographic terminals in a spaceship bridge. Ambient amber and pulsing red rim light. Slow lateral dolly movement.",
    };

    const spy = vi
      .spyOn(geminiProvider, "generateStructuredJson")
      .mockResolvedValueOnce({
        data: mockOutput1,
        rawText: JSON.stringify(mockOutput1),
        model: "gemini-3.8-flash",
        tokens: { inputTokens: 500, outputTokens: 250 },
      });

    const gen1 = await PromptEngineService.generate(projectId, workspaceAId, {
      templateKey: "video_prompt",
      targetTool: "google_flow",
      sceneId: scene1Id,
      customInstructions: "Enfatizar a tensão dramática e os reflexos nos consoles.",
    });

    version1Id = gen1.versionId;
    spy.mockRestore();

    // 6. Criar um GenerationJob com FAILED para testar auditoria de erros
    await withRetry(() =>
      db.generationJob.create({
        data: {
          projectId,
          status: GenerationStatus.FAILED,
          modelName: "gemini-3.8-flash",
          errorMessage: "Falha simulada: Quota de tokens excedida temporariamente.",
          request: {
            templateKey: "video_prompt",
            targetTool: "google_flow",
            sceneId: scene1Id,
          },
          startedAt: new Date(Date.now() - 5000),
          finishedAt: new Date(),
        },
      })
    );
  }, 90000);

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
  }, 90000);


  // -------------------------------------------------------------
  // 1. Listagem de Histórico e Filtros
  // -------------------------------------------------------------
  describe("Listagem de Histórico e Filtros", () => {
    it("deve listar o histórico completo contendo versões com sucesso e falhas registradas", async () => {
      const history = await PromptHistoryService.listHistory(projectId, workspaceAId);
      expect(history.length).toBeGreaterThanOrEqual(2); // 1 sucesso + 1 falha

      const successItem = history.find((h) => h.id === version1Id);
      expect(successItem).toBeDefined();
      expect(successItem?.status).toBe("SUCCEEDED");
      expect(successItem?.versionNumber).toBe(1);
      expect(successItem?.templateKey).toBe("video_prompt");
      expect(successItem?.targetTool).toBe("google_flow");

      const failedItem = history.find((h) => h.status === "FAILED");
      expect(failedItem).toBeDefined();
      expect(failedItem?.errorMessage).toContain("Quota de tokens excedida");
    });

    it("deve filtrar histórico por status (SUCCEEDED vs FAILED)", async () => {
      const succeededOnly = await PromptHistoryService.listHistory(projectId, workspaceAId, {
        status: "SUCCEEDED",
      });
      expect(succeededOnly.every((i) => i.status === "SUCCEEDED")).toBe(true);
      expect(succeededOnly.some((i) => i.id === version1Id)).toBe(true);

      const failedOnly = await PromptHistoryService.listHistory(projectId, workspaceAId, {
        status: "FAILED",
      });
      expect(failedOnly.every((i) => i.status === "FAILED")).toBe(true);
    });

    it("deve filtrar histórico por templateKey e por cena", async () => {
      const filteredByScene = await PromptHistoryService.listHistory(projectId, workspaceAId, {
        sceneId: scene1Id,
        templateKey: "video_prompt",
      });
      expect(filteredByScene.length).toBeGreaterThanOrEqual(1);
      expect(filteredByScene[0].templateKey).toBe("video_prompt");

      const filteredByNonExistent = await PromptHistoryService.listHistory(projectId, workspaceAId, {
        templateKey: "visual_bible",
      });
      expect(filteredByNonExistent.length).toBe(0);
    });
  });

  // -------------------------------------------------------------
  // 2. Consulta de Versão Específica e Snapshots
  // -------------------------------------------------------------
  describe("Consulta de Versão e Snapshots", () => {
    it("deve recuperar os detalhes completos de uma versão com snapshot profundo", async () => {
      const version = await PromptHistoryService.getVersionById(version1Id, projectId, workspaceAId);

      expect(version.id).toBe(version1Id);
      expect(version.templateKey).toBe("video_prompt");
      expect(version.outputText).toContain("Dr. Elena Vance");

      const snapshot = (version.inputSnapshot as any) || {};
      expect(snapshot.versionNumber).toBe(1);
      expect(snapshot.elementsSnapshot).toBeDefined();
      expect(snapshot.elementsSnapshot.project.title).toBe("O Enigma de Solaris Prime");
      expect(snapshot.elementsSnapshot.scene.title).toBe("Alerta na Ponte");
      expect(snapshot.technicalMetadata).toBeDefined();
      expect(snapshot.technicalMetadata.model).toBe("gemini-3.8-flash");
      expect(snapshot.technicalMetadata.tokens.inputTokens).toBe(500);
    });
  });

  // -------------------------------------------------------------
  // 3. Regeneração a partir de Versão Anterior (Nunca sobrescreve)
  // -------------------------------------------------------------
  describe("Regeneração a partir de Versão Anterior", () => {
    it("deve gerar uma nova versão subsequente preservando a versão original intacta", async () => {
      const mockOutput2 = {
        sceneIdentifier: "Cena 01 - Alerta na Ponte (Take 2)",
        narrativeObjective: "Intensificar o pânico sutil da Dra. Elena com luz estroboscópica.",
        characterReferences: ["Dra. Elena Vance"],
        environmentReferences: ["Módulo de Comando da Estação"],
        action: "Elena aciona o protocolo de isolamento do reator com as mãos trêmulas.",
        visualComposition: "Close-up tenso nos olhos e reflexos no visor.",
        camera: "50mm anamorphic, f/1.4",
        movement: "Dolly in frontal rápido.",
        lighting: "Flashes rápidos de luz vermelha de emergência e escuridão.",
        style: "Sci-Fi claustrofóbico 2.39:1 widescreen.",
        sound: "Alarme ensurdecedor e respiração ofegante pelo comunicador.",
        dialogue: null,
        constraints: ["Sem iluminação suave", "Sem corte elíptico"],
        continuityNotes: "Elena deve manter expressão de choque no corte para cena 2.",
        compiledProductionPrompt:
          "Intense cinematic close-up, Dr. Elena Vance trembling hands activating reactor lockdown. Fast frontal dolly zoom, flashing red emergency strobe lights. Claustrophobic atmospheric sci-fi.",
      };

      const spy = vi
        .spyOn(geminiProvider, "generateStructuredJson")
        .mockResolvedValueOnce({
          data: mockOutput2,
          rawText: JSON.stringify(mockOutput2),
          model: "gemini-3.8-flash",
          tokens: { inputTokens: 520, outputTokens: 260 },
        });

      const regenResult = await PromptHistoryService.regenerate(
        version1Id,
        projectId,
        workspaceAId,
        {
          customInstructions: "Aumentar a urgência dramática com plano mais fechado e luz estroboscópica.",
        }
      );

      version2Id = regenResult.versionId;
      expect(version2Id).not.toBe(version1Id);
      expect(regenResult.templateKey).toBe("video_prompt");

      // 1. A versão 1 original deve permanecer INTACTA no banco
      const originalVersion = await PromptHistoryService.getVersionById(
        version1Id,
        projectId,
        workspaceAId
      );
      expect(originalVersion.outputText).toContain("Dr. Elena Vance in a grey flight suit");

      // 2. A nova versão 2 deve registrar parentVersionId e versão sequencial 2
      const newVersion = await PromptHistoryService.getVersionById(
        version2Id,
        projectId,
        workspaceAId
      );
      expect(newVersion.outputText).toContain("Intense cinematic close-up");
      const snap2 = (newVersion.inputSnapshot as any) || {};
      expect(snap2.parentVersionId).toBe(version1Id);
      expect(snap2.versionNumber).toBe(2);

      spy.mockRestore();
    });
  });

  // -------------------------------------------------------------
  // 4. Comparador de Versões (Diff)
  // -------------------------------------------------------------
  describe("Comparador de Versões (Diff)", () => {
    it("deve apontar as diferenças entre as duas versões geradas", async () => {
      const comparison = await PromptHistoryService.compareVersions(
        version1Id,
        version2Id,
        projectId,
        workspaceAId
      );

      expect(comparison).toBeDefined();
      expect(comparison.versionA.id).toBe(version1Id);
      expect(comparison.versionB.id).toBe(version2Id);
      expect(comparison.versionA.versionNumber).toBe(1);
      expect(comparison.versionB.versionNumber).toBe(2);
      expect(comparison.identical).toBe(false);

      // Deve identificar que houve modificações em chaves JSON
      expect(comparison.jsonDiff.modifiedKeys.length).toBeGreaterThan(0);
      const actionKey = comparison.jsonDiff.modifiedKeys.find((m) => m.key === "action");
      expect(actionKey).toBeDefined();
      expect(actionKey?.from).toContain("digita comandos");
      expect(actionKey?.to).toContain("aciona o protocolo");

      // Deve identificar diferença de tamanho de caracteres no texto do prompt
      expect(comparison.textDiff.identical).toBe(false);
    });
  });

  // -------------------------------------------------------------
  // 5. Exportação JSON Limpa e Formatada (UTF-8)
  // -------------------------------------------------------------
  describe("Exportação JSON", () => {
    it("deve exportar versão individual em formato padronizado, sanitizado e sem dados sensíveis", async () => {
      const exported = await PromptHistoryService.exportVersion(
        version1Id,
        projectId,
        workspaceAId
      );

      expect(exported.cinepromptStudioVersion).toBe("1.0");
      expect(exported.project.title).toBe("O Enigma de Solaris Prime");
      expect(exported.template.key).toBe("video_prompt");
      expect(exported.targetTool).toBe("google_flow");
      expect(exported.versionNumber).toBe(1);
      expect(exported.promptStructuredJson).toBeDefined();
      expect(exported.compiledPromptText).toContain("Dr. Elena Vance");

      // Garantir ausência de dados sensíveis ou segredos
      const jsonString = JSON.stringify(exported);
      expect(jsonString).not.toContain("GEMINI_API_KEY");
      expect(jsonString).not.toContain("password");
      expect(jsonString).not.toContain("DATABASE_URL");
    });

    it("deve exportar a sequência completa de cenas em ordem estrita de decupagem com prompts", async () => {
      const sequenceManifest = await PromptHistoryService.exportSceneSequence(
        projectId,
        workspaceAId
      );

      expect(sequenceManifest.cinepromptStudioVersion).toBe("1.0");
      expect(sequenceManifest.project.title).toBe("O Enigma de Solaris Prime");
      expect(sequenceManifest.sequenceOverview.totalScenes).toBe(2);

      const scenes = sequenceManifest.scenes;
      expect(scenes.length).toBe(2);
      // Ordem sequencial preservada
      expect(scenes[0].order).toBe(1);
      expect(scenes[0].title).toBe("Alerta na Ponte");
      expect(scenes[1].order).toBe(2);
      expect(scenes[1].sceneId).toBe(scene2Id);
      expect(scenes[1].title).toBe("A Janela Panorâmica");

      // Cena 1 deve conter o último prompt gerado
      expect(scenes[0].latestGeneratedPrompt).toBeDefined();
      expect(scenes[0].latestGeneratedPrompt?.compiledPromptText).toBeTruthy();

      // Personagens associados preservados
      expect(scenes[0].characters[0].name).toBe("Dra. Elena Vance");
    });
  });

  // -------------------------------------------------------------
  // 6. Controle de Acesso e Isolamento Multitenant
  // -------------------------------------------------------------
  describe("Controle de Acesso e Isolamento Multitenant", () => {
    it("Workspace B não deve conseguir listar o histórico de prompts do Workspace A", async () => {
      await expect(
        PromptHistoryService.listHistory(projectId, workspaceBId)
      ).rejects.toThrow("Projeto não encontrado ou acesso não permitido.");
    });

    it("Workspace B não deve conseguir regenerar a partir de versão do Workspace A", async () => {
      await expect(
        PromptHistoryService.regenerate(version1Id, projectId, workspaceBId)
      ).rejects.toThrow("Projeto não encontrado ou acesso não permitido.");
    });

    it("Workspace B não deve conseguir exportar versão do Workspace A", async () => {
      await expect(
        PromptHistoryService.exportVersion(version1Id, projectId, workspaceBId)
      ).rejects.toThrow("Projeto não encontrado ou acesso não permitido.");
    });

    it("Workspace B não deve conseguir exportar a sequência de cenas do Workspace A", async () => {
      await expect(
        PromptHistoryService.exportSceneSequence(projectId, workspaceBId)
      ).rejects.toThrow("Projeto não encontrado ou acesso não permitido.");
    });
  });

  // -------------------------------------------------------------
  // 7. Exclusão de Registros de Erros (Failed Jobs)
  // -------------------------------------------------------------
  describe("Exclusão de Registros de Erros", () => {
    let testJobId: string;

    beforeAll(async () => {
      const job = await withRetry(() =>
        db.generationJob.create({
          data: {
            projectId,
            modelName: "gemini-3.5-flash",
            status: GenerationStatus.FAILED,
            request: { templateKey: "video_prompt", targetTool: "google_flow" },
            errorMessage: "Erro transitório de timeout de teste para exclusão.",
          },
        })
      );
      testJobId = job.id;
    });

    it("Workspace B não deve conseguir excluir erro do Workspace A", async () => {
      await expect(
        PromptHistoryService.deleteFailedJob(testJobId, projectId, workspaceBId)
      ).rejects.toThrow("Projeto não encontrado ou acesso não permitido.");
    });

    it("deve excluir um registro de erro específico com sucesso", async () => {
      const res = await PromptHistoryService.deleteFailedJob(testJobId, projectId, workspaceAId);
      expect(res.success).toBe(true);

      const check = await db.generationJob.findUnique({ where: { id: testJobId } });
      expect(check).toBeNull();
    });

    it("deve limpar todos os registros de erros do projeto em lote", async () => {
      // Criar 2 erros adicionais
      await db.generationJob.createMany({
        data: [
          {
            projectId,
            modelName: "gemini-3.5-flash",
            status: GenerationStatus.FAILED,
            request: { templateKey: "video_prompt", targetTool: "google_flow" },
            errorMessage: "Erro lote 1",
          },
          {
            projectId,
            modelName: "gemini-3.5-flash",
            status: GenerationStatus.FAILED,
            request: { templateKey: "video_prompt", targetTool: "google_flow" },
            errorMessage: "Erro lote 2",
          },
        ],
      });

      const res = await PromptHistoryService.clearAllFailedJobs(projectId, workspaceAId);
      expect(res.success).toBe(true);
      expect(res.count).toBeGreaterThanOrEqual(2);

      const remainingFailed = await db.generationJob.findMany({
        where: { projectId, status: GenerationStatus.FAILED },
      });
      expect(remainingFailed.length).toBe(0);
    });
  });
});
