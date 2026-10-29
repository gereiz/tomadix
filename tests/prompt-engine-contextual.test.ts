import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { db } from "@/lib/db";
import { ProjectService } from "@/modules/projects/project.service";
import { SceneService } from "@/modules/scenes/scene.service";
import { CharacterService } from "@/modules/characters/character.service";
import { EnvironmentService } from "@/modules/environments/environment.service";
import { ProjectParameterConfigService } from "@/modules/projects/project-parameter-config.service";
import { PromptEngineService } from "@/modules/prompt-engine/prompt-engine.service";
import { PromptHistoryService } from "@/modules/prompt-engine/prompt-history.service";
import { formatPromptToPlainText } from "@/modules/prompt-engine/format-plain-text";
import * as geminiProvider from "@/modules/ai/gemini-provider";

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

describe("Etapa 5: Geração Contextual de Prompts (Dual Output: JSON e Texto Simples)", () => {
  let workspaceId: string;
  let projectId: string;
  let sceneId: string;
  let characterId: string;
  let environmentId: string;
  let generatedVersionId: string;

  beforeAll(async () => {
    // 1. Criar Workspace e Projeto de Teste
    const ws = await db.workspace.create({
      data: {
        name: "Produtora Etapa 5 Dual Output",
        slug: `etapa5-dual-${Date.now()}`,
      },
    });
    workspaceId = ws.id;

    const project = await db.project.create({
      data: {
        workspaceId,
        title: "Nebulosa Vermelha",
        description: "Ficção científica com foco em iluminação néon e lentes anamórficas.",
        genre: "Sci-Fi / Neo-Noir",
        language: "pt-BR",
        configuration: {
          aspectRatio: "2.39:1",
          targetPlatform: "google_flow",
        },
      },
    });
    projectId = project.id;

    // 2. Configurar Parâmetros do Projeto (habilitar CAMERA e LIGHTING, desabilitar AUDIO)
    await ProjectParameterConfigService.updateProjectParameterSettings(projectId, workspaceId, {
      enabledCategories: ["CAMERA", "LIGHTING"],
      enabledParameterKeys: ["formato_sensor_camera", "estilo_iluminacao"],
      defaultValues: {
        formato_sensor_camera: "full_frame_35mm",
        estilo_iluminacao: "chiaroscuro",
      },
    });

    // 3. Criar Personagem e Ambiente
    const char = await db.character.create({
      data: {
        projectId,
        name: "Agente Kaori Sato",
        description: "Investigadora cibernética com jaqueta de couro e implante neural ótico.",
      },
    });
    characterId = char.id;

    const env = await db.environment.create({
      data: {
        projectId,
        name: "Beco de Shibuya Subterrâneo",
        description: "Rua estreita com asfalto molhado, vapor saindo de bueiros e néons ciano e magenta.",
      },
    });
    environmentId = env.id;

    // 4. Criar Cena
    const scene = await db.scene.create({
      data: {
        projectId,
        title: "A Perseguição no Beco Úmido",
        description: "Kaori corre pelo beco com a arma empunhada refletindo luzes de neon.",
        order: 1,
      },
    });
    sceneId = scene.id;
  }, 60000);

  afterAll(async () => {
    try {
      await db.promptVersion.deleteMany({ where: { projectId } });
      await db.scene.deleteMany({ where: { projectId } });
      await db.character.deleteMany({ where: { projectId } });
      await db.environment.deleteMany({ where: { projectId } });
      await db.project.deleteMany({ where: { id: projectId } });
      await db.workspace.deleteMany({ where: { id: workspaceId } });
    } catch (e) {
      // Ignora limpeza se falhar
    }
  });

  describe("1. Formatador Universal de Texto Simples (formatPromptToPlainText)", () => {
    it("deve formatar corretamente a saída de video_prompt para texto simples cinematográfico", () => {
      const videoOutput = {
        sceneIdentifier: "Cena 01 - Beco Subterrâneo",
        narrativeObjective: "Estabelecer o suspense e perigo na fuga.",
        action: "Kaori salta sobre caixotes e desliza no piso molhado.",
        visualComposition: "Medium shot em ângulo holandês leve.",
        camera: "35mm anamórfica, abertura f/1.8",
        movement: "Travelling rápido seguindo a corrida.",
        lighting: "Néon ciano e reflexos avermelhados no asfalto molhado.",
        style: "Estilo cinematográfico Neo-Noir estilizado.",
        sound: "Passos rápidos espirrando água e zumbido elétrico de alta frequência.",
        compiledProductionPrompt:
          "Cinematic shot of Kaori sprinting down a wet neon-lit alleyway in Neo-Tokyo, reflection of cyan lights on wet asphalt, 35mm anamorphic.",
      };

      const plainText = formatPromptToPlainText("video_prompt", videoOutput);

      expect(plainText).toContain("PROMPT DE VÍDEO CINEMATOGRÁFICO");
      expect(plainText).toContain("Cena 01 - Beco Subterrâneo");
      expect(plainText).toContain("Kaori salta sobre caixotes");
      expect(plainText).toContain("PROMPT DE PRODUÇÃO COMPILADO");
      expect(plainText).toContain("Cinematic shot of Kaori sprinting");
      expect(plainText).toContain("🎥 CÂMERA & ÓPTICA");
      expect(plainText).toContain("35mm anamórfica");
    });

    it("deve formatar corretamente a saída de image_prompt para texto simples", () => {
      const imageOutput = {
        subject: "Close-up do rosto de Kaori com o implante neural aceso em azul celeste.",
        framing: "Close-up dramático",
        composition: "Regra dos terços com olhar direcionado para a direita.",
        lighting: "Rim light néon azul com preenchimento quente suave.",
        style: "Fotografia cinematográfica hiper-detalhada 8K.",
        negativePrompt: "low quality, blurry, deformed eyes, extra limbs",
        compiledPromptText:
          "Dramatic close-up portrait of Kaori Sato, glowing cybernetic eye implant, intense expression, cyan backlight.",
      };

      const plainText = formatPromptToPlainText("image_prompt", imageOutput);

      expect(plainText).toContain("PROMPT DE IMAGEM");
      expect(plainText).toContain("PROMPT COMPILADO:");
      expect(plainText).toContain("Dramatic close-up portrait");
      expect(plainText).toContain("PROMPT NEGATIVO:");
      expect(plainText).toContain("deformed eyes");
    });

    it("deve formatar corretamente a saída de individual_scene e scene_sequence", () => {
      const sceneOutput = {
        sceneTitle: "Tomada do Telhado",
        narrativeFunction: "Clímax da perseguição",
        compiledProductionPrompt: "Wide angle rooftop scene under heavy rain.",
      };

      const plainText = formatPromptToPlainText("individual_scene", sceneOutput);
      expect(plainText).toContain("CENA INDIVIDUAL");
      expect(plainText).toContain("Tomada do Telhado");
      expect(plainText).toContain("Wide angle rooftop scene");
    });
  });

  describe("2. Geração Contextual com PromptEngineService", () => {
    it("deve gerar prompt com dupla saída: JSON estruturado e Texto Simples formatado", async () => {
      const mockGeminiData = {
        sceneIdentifier: "Cena 01 - Fuga no Beco",
        narrativeObjective: "Construir perigo imediato.",
        characterReferences: ["Agente Kaori Sato"],
        environmentReferences: ["Beco de Shibuya Subterrâneo"],
        action: "Kaori olha para trás enquanto recarrega o dispositivo.",
        visualComposition: "Medium close-up com profundidade de campo rasa.",
        camera: "Full Frame 35mm anamórfica",
        movement: "Câmera na mão com microvibração controlada.",
        lighting: "Chiaroscuro Neo-Noir com néon refletido no casaco molhado.",
        style: "Gritty Neo-Noir contemporâneo em 2.39:1.",
        sound: "Gotejamento metálico e sirene abafada ao longe.",
        dialogue: null,
        constraints: ["Evitar iluminação difusa plana"],
        continuityNotes: "Garantir que a manga direita do casaco esteja manchada.",
        compiledProductionPrompt:
          "Cinematic shot of cyber-detective Kaori in a wet Tokyo alley, illuminated by cyan and magenta neon signs. Medium close-up, 35mm anamorphic, chiaroscuro.",
      };

      const spy = vi.spyOn(geminiProvider, "generateStructuredJson").mockResolvedValueOnce({
        data: mockGeminiData,
        rawText: JSON.stringify(mockGeminiData),
        model: "gemini-3.8-flash",
        tokens: { inputTokens: 400, outputTokens: 200 },
      });

      // Executa a geração solicitando explicitamente saída em texto/json
      const result = await PromptEngineService.generate(projectId, workspaceId, {
        templateKey: "video_prompt",
        targetTool: "google_flow",
        sceneId,
        characterId,
        environmentId,
        outputFormat: "text",
        customInstructions: "Enfatizar o contraste chiaroscuro.",
      });

      spy.mockRestore();

      generatedVersionId = result.versionId;

      // Validações da resposta da geração
      expect(result.versionId).toBeDefined();
      expect(result.outputFormat).toBe("text");
      // JSON Estruturado íntegro
      expect(result.data).toBeDefined();
      const outputData = result.data as any;
      expect(outputData.sceneIdentifier).toBe("Cena 01 - Fuga no Beco");
      expect(outputData.compiledProductionPrompt).toContain("Cinematic shot of cyber-detective Kaori");

      // Texto Simples formatado presente e não-vazio
      expect(result.formattedText).toBeDefined();
      expect(typeof result.formattedText).toBe("string");
      expect(result.formattedText).toContain("PROMPT DE VÍDEO CINEMATOGRÁFICO");
      expect(result.formattedText).toContain("Kaori olha para trás");
      expect(result.formattedText).toContain("PROMPT DE PRODUÇÃO COMPILADO");

      // Validação no banco de dados
      const savedVersion = await db.promptVersion.findUnique({
        where: { id: result.versionId },
      });

      expect(savedVersion).not.toBeNull();
      expect(savedVersion!.outputJson).toBeDefined();
      expect(savedVersion!.outputText).toBe(result.formattedText);

      // Validação da resolução contextual de parâmetros
      const snapshot = savedVersion!.inputSnapshot as any;
      expect(snapshot).toBeDefined();
      expect(snapshot.resolvedParameters).toBeDefined();
      // Deve ter parâmetros de CÂMERA e ILUMINAÇÃO
      expect(snapshot.resolvedParameters.formato_sensor_camera).toBe("full_frame_35mm");
      expect(snapshot.resolvedParameters.estilo_iluminacao).toBe("chiaroscuro");
      // ÁUDIO estava desabilitado no projeto, não deve constar
      expect(snapshot.resolvedParameters.tipo_microfone).toBeUndefined();
    });
  });

  describe("3. Exportação em Múltiplos Formatos (.txt e .json)", () => {
    it("deve exportar versão com o texto compilado limpo e JSON estruturado preservados", async () => {
      const exported = await PromptHistoryService.exportVersion(
        generatedVersionId,
        projectId,
        workspaceId
      );

      expect(exported.tomadixVersion).toBe("1.0");
      expect(exported.project.title).toBe("Nebulosa Vermelha");
      expect(exported.compiledPromptText).toBeDefined();
      expect(exported.compiledPromptText).toContain("PROMPT DE VÍDEO CINEMATOGRÁFICO");
      expect(exported.promptStructuredJson).toBeDefined();
      const jsonOutput = exported.promptStructuredJson as any;
      expect(jsonOutput?.action).toContain("Kaori");
      expect(exported.contextSnapshot.parameters.formato_sensor_camera).toBe("full_frame_35mm");
    });

    it("deve fornecer fallback para texto formatado caso versões legadas possuam outputText nulo", async () => {
      // Criar versão legada sem outputText
      const legacyOutput = {
        sceneIdentifier: "Cena Legada",
        action: "Personagem caminha.",
        compiledProductionPrompt: "Cinematic walking shot.",
      };

      const legacyVersion = await db.promptVersion.create({
        data: {
          projectId,
          templateKey: "video_prompt",
          templateVersion: 1,
          targetTool: "google_flow",
          modelName: "gemini-3.8-flash",
          outputJson: legacyOutput,
          outputText: null, // Legado com campo vazio
          inputSnapshot: {
            versionNumber: 99,
          },
        },
      });

      // 1. Verificar listHistory (Fallback ativo)
      const list = await PromptHistoryService.listHistory(projectId, workspaceId);
      const foundLegacy = list.find((v) => v.id === legacyVersion.id);
      expect(foundLegacy).toBeDefined();
      expect(foundLegacy!.outputText).not.toBeNull();
      expect(foundLegacy!.outputText).toContain("PROMPT DE VÍDEO CINEMATOGRÁFICO");
      expect(foundLegacy!.outputText).toContain("Cena Legada");

      // 2. Verificar exportVersion (Fallback ativo)
      const exportedLegacy = await PromptHistoryService.exportVersion(
        legacyVersion.id,
        projectId,
        workspaceId
      );
      expect(exportedLegacy.compiledPromptText).not.toBeNull();
      expect(exportedLegacy.compiledPromptText).toContain("Cinematic walking shot");

      // Limpar versão legada de teste
      await db.promptVersion.delete({ where: { id: legacyVersion.id } });
    });
  });
});
