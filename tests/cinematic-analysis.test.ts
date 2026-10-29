import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  CinematicAnalysisInputSchema,
  CinematicAnalysisResultSchema,
  AnalysisModeSchema,
} from "@/modules/cinematic-analysis/cinematic-analysis.schema";
import { CinematicAnalysisService } from "@/modules/cinematic-analysis/cinematic-analysis.service";
import { db } from "@/lib/db";

describe("Etapa 3: Módulo de Análise Cinematográfica e Engenharia Reversa Multimodal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. Validação do Schema: deve aceitar e normalizar os 4 modos de análise", () => {
    const modes = [
      "TECHNICAL_ANALYSIS",
      "REVERSE_ENGINEERING",
      "VISUAL_CONTINUITY",
      "STYLE_REPRODUCTION",
    ];

    for (const mode of modes) {
      const parsed = AnalysisModeSchema.safeParse(mode);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data).toBe(mode);
      }
    }

    const invalid = AnalysisModeSchema.safeParse("INVALID_MODE");
    expect(invalid.success).toBe(false);
  });

  it("2. Validação de Input: exige imagem principal e aplica valores padrão", () => {
    const valid = CinematicAnalysisInputSchema.safeParse({
      image: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
      mode: "TECHNICAL_ANALYSIS",
    });

    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.modelTier).toBe("flash");
      expect(valid.data.mode).toBe("TECHNICAL_ANALYSIS");
    }

    const missingImage = CinematicAnalysisInputSchema.safeParse({
      mode: "TECHNICAL_ANALYSIS",
    });
    expect(missingImage.success).toBe(false);
  });

  it("3. Catálogo de Referências: deve fornecer referências ricas com badges e metadados", () => {
    const refs = CinematicAnalysisService.getDefaultStudioReferences();
    expect(refs.length).toBeGreaterThanOrEqual(5);

    const mainVibe = refs.find((r) => r.badge === "MAIN VIBE");
    expect(mainVibe).toBeDefined();
    expect(mainVibe?.imageUrl).toContain("/visual-references/");
    expect(mainVibe?.technicalTag).toContain("85mm");
  });

  it("4. Execução de Análise: deve gerar ficha técnica e prompts estruturados para Midjourney e Flux", async () => {
    // Teste com imagem local da biblioteca
    const result = await CinematicAnalysisService.analyze(
      {
        mode: "TECHNICAL_ANALYSIS",
        image: "/visual-references/lighting/luz_neon.svg",
        referenceTitle: "Teste Unitário Cyberpunk",
        modelTier: "flash",
      },
      "workspace_test_id"
    );

    expect(result).toBeDefined();
    expect(result.id).toContain("analysis_");
    expect(result.technicalData).toBeDefined();
    expect(result.technicalData.cameraSensor).toBeDefined();
    expect(result.technicalData.lensFocalLength).toBeDefined();
    expect(result.technicalData.aperture).toBeDefined();
    expect(result.technicalData.colorPalette).toBeInstanceOf(Array);
    expect(result.technicalData.colorPalette.length).toBeGreaterThanOrEqual(3);

    // Prompts reversos
    expect(result.prompts).toBeDefined();
    expect(result.prompts.midjourney).toContain("--ar");
    expect(result.prompts.flux).toBeDefined();
    expect(result.prompts.negativePrompt).toBeDefined();

    // Mapeamento para Tomadix
    expect(result.parameterSettings).toBeDefined();
    expect(result.parameterSettings.formato_sensor_camera).toBeDefined();
    expect(result.parameterSettings.tipo_de_plano).toBeDefined();
  });

  it("5. Modo Continuidade Visual: deve analisar duas imagens e emitir relatório de raccord", async () => {
    const result = await CinematicAnalysisService.analyze(
      {
        mode: "VISUAL_CONTINUITY",
        image: "/visual-references/framing/close_up.svg",
        comparisonImage: "/visual-references/framing/medium_shot.svg",
        referenceTitle: "Teste Raccord",
        modelTier: "flash",
      },
      "workspace_test_id"
    );

    expect(result.mode).toBe("VISUAL_CONTINUITY");
    expect(result.continuityReport).toBeDefined();
    expect(result.continuityReport?.score).toBeGreaterThanOrEqual(0);
    expect(result.continuityReport?.score).toBeLessThanOrEqual(100);
    expect(result.continuityReport?.characterConsistency).toBeDefined();
    expect(result.continuityReport?.lightingConsistency).toBeDefined();
  });

  it("6. Aplicação ao Projeto: deve injetar parâmetros na configuração do projeto", async () => {
    // Buscar um projeto real no banco
    const project = await db.project.findFirst({
      select: { id: true, workspaceId: true, configuration: true },
    });

    if (project) {
      const applyResult = await CinematicAnalysisService.applyToProject(
        project.id,
        project.workspaceId,
        {
          formato_sensor_camera: "anamorfico_65mm",
          tipo_de_plano: "close_up",
          estilo_iluminacao: "chiaroscuro_dramatico",
        }
      );

      expect(applyResult.success).toBe(true);
      expect(applyResult.appliedCount).toBe(3);

      // Verificar persistência
      const updated = await db.project.findUnique({
        where: { id: project.id },
        select: { configuration: true },
      });
      const config = updated?.configuration as any;
      expect(config.parameterSettings.values.formato_sensor_camera).toBe("anamorfico_65mm");
      expect(config.parameterSettings.values.estilo_iluminacao).toBe("chiaroscuro_dramatico");
    }
  });
});
