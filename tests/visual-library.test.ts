import { describe, it, expect } from "vitest";
import { VisualReferenceService } from "@/modules/visual-library/visual-reference.service";
import {
  VISUAL_CATEGORIES,
  VISUAL_REFERENCE_OPTIONS,
} from "@/modules/visual-library/visual-reference.catalog";
import { VisualCategory } from "@/modules/visual-library/visual-reference.types";
import { parameterOptionSchema, baseParameterDefinitionSchema } from "@/modules/parameters/parameter.schema";
import fs from "fs";
import path from "path";

describe("Biblioteca Visual de Referência para Parâmetros de Imagem e Vídeo (Prompt 18)", () => {
  describe("1. Inventário de Categorias e Cobertura Cinematográfica", () => {
    it("deve contemplar todas as 11 categorias cinematográficas principais", () => {
      const categories = VisualReferenceService.getCategories();
      expect(categories.length).toBe(11);

      const categoryKeys = categories.map((c) => c.id);
      expect(categoryKeys).toContain<VisualCategory>("LIGHTING");
      expect(categoryKeys).toContain<VisualCategory>("FRAMING");
      expect(categoryKeys).toContain<VisualCategory>("CAMERA_ANGLE");
      expect(categoryKeys).toContain<VisualCategory>("CAMERA_MOVEMENT");
      expect(categoryKeys).toContain<VisualCategory>("LENS_PERSPECTIVE");
      expect(categoryKeys).toContain<VisualCategory>("COMPOSITION");
      expect(categoryKeys).toContain<VisualCategory>("FOCUS_OPTICS");
      expect(categoryKeys).toContain<VisualCategory>("COLOR_GRADING");
      expect(categoryKeys).toContain<VisualCategory>("SCENE_DYNAMIC");
      expect(categoryKeys).toContain<VisualCategory>("SENSOR_FORMAT");
      expect(categoryKeys).toContain<VisualCategory>("ATMOSPHERE");
    });

    it("cada categoria deve conter identificador, nome, ícone e descrição elucidativa", () => {
      for (const cat of VISUAL_CATEGORIES) {
        expect(cat.id).toBeDefined();
        expect(cat.name.length).toBeGreaterThan(0);
        expect(cat.icon.length).toBeGreaterThan(0);
        expect(cat.shortDescription.length).toBeGreaterThan(10);
      }
    });

    it("o catálogo mestre deve possuir mais de 170 opções especializadas com cobertura integral", () => {
      const allOptions = VisualReferenceService.getCatalogOptions();
      expect(allOptions.length).toBeGreaterThanOrEqual(175);
    });

    it("não deve haver duplicidade de códigos técnicos dentro da mesma categoria", () => {
      const allOptions = VisualReferenceService.getCatalogOptions();
      const seen = new Set<string>();

      for (const opt of allOptions) {
        const uniqueKey = `${opt.category}:${opt.value}`;
        expect(seen.has(uniqueKey)).toBe(false);
        seen.add(uniqueKey);
      }
    });
  });

  describe("2. Qualidade Didática e Metadados das Opções Visuais", () => {
    it("cada opção visual deve possuir rótulo em português, descrição e caminho de asset", () => {
      const allOptions = VisualReferenceService.getCatalogOptions();

      for (const opt of allOptions) {
        expect(opt.value).toBeDefined();
        expect(opt.value.trim().length).toBeGreaterThan(0);
        expect(opt.label).toBeDefined();
        expect(opt.label.trim().length).toBeGreaterThan(0);
        expect(opt.description).toBeDefined();
        expect(opt.description.trim().length).toBeGreaterThan(5);
        expect(opt.imageUrl).toBeDefined();
        expect(opt.imageUrl.startsWith("/visual-references/")).toBe(true);
        expect(opt.altText).toBeDefined();
        expect(opt.isApproved).toBe(true);
      }
    });

    it("opções com nuances técnicas sutis devem possuir notas de comparação e o que observar", () => {
      // Exemplo: Dolly In vs Zoom In
      const dollyIn = VisualReferenceService.findOption("dolly_in");
      const zoomIn = VisualReferenceService.findOption("zoom_in");

      expect(dollyIn).toBeDefined();
      expect(dollyIn?.whatToLookFor).toBeDefined();
      expect(dollyIn?.comparisonNotes?.toLowerCase()).toContain("zoom");

      expect(zoomIn).toBeDefined();
      expect(zoomIn?.comparisonNotes?.toLowerCase()).toContain("dolly");

      // Exemplo: Bokeh cremoso / grande abertura
      const bokeh = VisualReferenceService.findOption("bokeh_cremoso");
      expect(bokeh).toBeDefined();
      expect(bokeh?.comparisonNotes).toBeDefined();
    });
  });

  describe("3. Resolução Inteligente e Preservação de Valores Técnicos", () => {
    it("deve localizar opções por código técnico exato (value)", () => {
      const opt = VisualReferenceService.findOption("extreme_wide_shot");
      expect(opt).not.toBeNull();
      expect(opt?.value).toBe("extreme_wide_shot");
      expect(opt?.label).toContain("Extreme Wide Shot");
    });

    it("deve localizar opções por rótulo em português (label)", () => {
      const opt = VisualReferenceService.findOption("Luz Suave");
      expect(opt).not.toBeNull();
      expect(opt?.value).toBe("luz_suave");
    });

    it("deve localizar opções por nome original em inglês (originalName)", () => {
      const opt = VisualReferenceService.findOption("Tracking Shot");
      expect(opt).not.toBeNull();
      expect(opt?.value).toBe("tracking_shot");
    });

    it("deve resolver strings existentes compostas de cenas (ex: 'Plano Médio (Medium Shot)')", () => {
      const opt = VisualReferenceService.findOption("Plano Médio (Medium Shot)");
      expect(opt).not.toBeNull();
      expect(opt?.value).toBe("medium_shot");
    });

    it("deve fornecer fallback gracioso com placeholder seguro para valores desconhecidos sem estourar erro", () => {
      const fallback = VisualReferenceService.resolveVisualReference("FRAMING", "param_inexistente_xyz");
      expect(fallback).toBeDefined();
      expect(fallback.value).toBe("param_inexistente_xyz");
      expect(fallback.imageUrl).toBe("/visual-references/placeholder.svg");
      expect(fallback.isApproved).toBe(false);
    });

    it("a resolução visual não altera nem corrompe o valor técnico original do parâmetro", () => {
      const technicalCode = "dolly_in";
      const resolved = VisualReferenceService.resolveVisualReference("CAMERA_MOVEMENT", technicalCode);
      expect(resolved.value).toBe(technicalCode);
    });
  });

  describe("4. Validação de Schemas e Compatibilidade de Parâmetros", () => {
    it("deve validar opções enriquecidas com metadados visuais no parameterOptionSchema", () => {
      const validOption = {
        value: "low_angle",
        label: "Plano Contra-Plongée (Low Angle)",
        imageUrl: "/visual-references/camera_angles/low_angle.svg",
        category: "CAMERA_ANGLE",
        whatToLookFor: "Câmera posicionada abaixo da linha dos olhos apontando para cima.",
        comparisonNotes: "Diferencia-se do Worm's Eye View que fica no nível do solo.",
        altText: "Exemplo de Low Angle",
        order: 2,
      };

      const result = parameterOptionSchema.safeParse(validOption);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.imageUrl).toBe("/visual-references/camera_angles/low_angle.svg");
        expect(result.data.category).toBe("CAMERA_ANGLE");
      }
    });

    it("deve aceitar parâmetros normais sem metadados visuais garantindo retrocompatibilidade", () => {
      const legacyOption = {
        value: "op_padrao",
        label: "Opção Padrão",
      };

      const result = parameterOptionSchema.safeParse(legacyOption);
      expect(result.success).toBe(true);
    });

    it("deve validar definições de parâmetros com flags visuais", () => {
      const paramDef = {
        key: "tipo_enquadramento",
        label: "Tipo de Enquadramento",
        description: "Seletor visual de escala de plano",
        scope: "SCENE",
        type: "SELECT",
        required: true,
        visualReferenceEnabled: true,
        visualReferenceCategory: "FRAMING",
        options: [
          { value: "close_up", label: "Close-Up", imageUrl: "/visual-references/framing/close_up.svg" },
        ],
      };

      const result = baseParameterDefinitionSchema.safeParse(paramDef);
      expect(result.success).toBe(true);
    });
  });

  describe("5. Relatório e Diagnóstico de Cobertura Administrativa", () => {
    it("deve calcular estatísticas de cobertura com precisão", async () => {
      const report = await VisualReferenceService.getCoverageReport();

      expect(report.totalOptions).toBeGreaterThanOrEqual(175);
      expect(report.coveredOptions).toBeGreaterThanOrEqual(175);
      expect(report.pendingOptions).toBeGreaterThanOrEqual(0);
      expect(report.coveragePercentage).toBeGreaterThanOrEqual(90);
      expect(report.categories.length).toBe(11);

      // Todas as categorias devem possuir cobertura no relatório
      for (const catReport of report.categories) {
        expect(catReport.total).toBeGreaterThan(0);
        expect(catReport.covered).toBeGreaterThan(0);
        expect(catReport.percentage).toBeGreaterThan(0);
      }
    });
  });

  describe("6. Validação de Assets Físicos em Disco", () => {
    it("deve garantir que o placeholder padrão existe em public/visual-references/placeholder.svg", () => {
      const placeholderPath = path.join(process.cwd(), "public", "visual-references", "placeholder.svg");
      expect(fs.existsSync(placeholderPath)).toBe(true);
      const content = fs.readFileSync(placeholderPath, "utf-8");
      expect(content).toContain("<svg");
    });

    it("deve garantir que os diretórios de todas as 11 categorias existem com seus assets SVG", () => {
      const baseDir = path.join(process.cwd(), "public", "visual-references");
      expect(fs.existsSync(baseDir)).toBe(true);

      const allOptions = VisualReferenceService.getCatalogOptions();
      let verifiedCount = 0;

      for (const opt of allOptions) {
        if (opt.imageUrl && opt.imageUrl.startsWith("/visual-references/")) {
          const relativeAsset = opt.imageUrl.replace(/^\//, "");
          const absolutePath = path.join(process.cwd(), "public", relativeAsset);
          expect(fs.existsSync(absolutePath)).toBe(true);
          verifiedCount++;
        }
      }

      expect(verifiedCount).toBeGreaterThanOrEqual(175);
    });
  });
});
