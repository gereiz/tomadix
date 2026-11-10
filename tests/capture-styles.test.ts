import { describe, it, expect } from "vitest";
import { CAPTURE_STYLE_KEYS, getCaptureStyle, listCaptureStyles } from "@/modules/prompt-engine/capture-styles";
import { composePromptInstructions } from "@/modules/prompt-engine/compose-prompt";
import { getSystemTemplate } from "@/modules/prompt-engine/prompt-template.catalog";
import { getToolProfile } from "@/modules/prompt-engine/tool-profiles";
import { generatePromptRequestSchema } from "@/modules/prompt-engine/prompt-engine.schema";
import { CinematicPromptEnricher } from "@/modules/image-generation/cinematic-prompt-enricher";

const base = {
  project: { id: "p", title: "T", description: "", genre: null, language: "pt-BR" },
  toolProfile: getToolProfile("google_flow"),
  resolvedParameters: {},
};

describe("Estilos de captura", () => {
  it("todo estilo não padrão tem instruções, negativos e sufixo direto", () => {
    expect(listCaptureStyles()).toHaveLength(CAPTURE_STYLE_KEYS.length);
    for (const st of listCaptureStyles()) {
      if (st.key === "cinematic") continue;
      expect(st.instructions.length).toBeGreaterThan(0);
      expect(st.negativeHints.length).toBeGreaterThan(0);
      expect(st.directPromptSuffix).not.toBe("");
    }
    expect(getCaptureStyle("inexistente").key).toBe("cinematic");
  });

  it("estilos amadores pedem grão e baixa resolução (não 'sem grão') e o novo estilo existe", () => {
    expect(CAPTURE_STYLE_KEYS).toContain("lowres_grain");
    for (const key of ["amateur_phone", "selfie_flash", "lowres_grain"] as const) {
      const st = getCaptureStyle(key);
      expect(st.instructions.join(" ")).not.toMatch(/SEM grão/i);
      expect(st.negativeHints).not.toContain("film grain");
      expect(st.directPromptSuffix).toMatch(/grain/);
      expect(st.directPromptSuffix).toMatch(/low resolution|480p/);
      expect(st.negativeHints.join(" ")).toMatch(/4k|ultra HD/);
    }
  });

  it("estilos extremos trazem descritores concretos de ruído digital e compressão", async () => {
    for (const key of ["lowres_grain_extreme", "cctv_lowbit"] as const) {
      const st = getCaptureStyle(key);
      expect(CAPTURE_STYLE_KEYS).toContain(key);
      expect(st.directPromptSuffix).toMatch(/360p/);
      expect(st.directPromptSuffix).toMatch(/macroblocking/);
      expect(st.directPromptSuffix).toMatch(/ISO 6400/);
      expect(st.directPromptSuffix).toMatch(/not film grain/);
      expect(st.instructions.join(" ")).toMatch(/360p/);
    }
    const out = await CinematicPromptEnricher.enrich({ userPrompt: "um gato", projectId: "x", workspaceId: "w", captureStyle: "lowres_grain_extreme" });
    expect(out.enrichedPrompt.startsWith(getCaptureStyle("lowres_grain_extreme").directPromptSuffix)).toBe(true);
    expect(out.enrichedPrompt).toContain("um gato");
  });

  it("amador/celular entra no prompt de imagem e vídeo; cinematográfico não adiciona seção", () => {
    for (const key of ["image_prompt", "video_prompt"] as const) {
      const amateur = composePromptInstructions({ ...base, template: getSystemTemplate(key), captureStyle: "amateur_phone" });
      expect(amateur.userPrompt).toContain("ESTILO DE CAPTURA OBRIGATÓRIO");
      expect(amateur.userPrompt).toContain("smartphone");
      expect(amateur.userPrompt).toContain("ruído digital");
      expect(amateur.userPrompt).toContain("sharp 4k");
      expect(amateur.userPrompt).toContain("baixa resolução");
      expect(amateur.systemInstruction).toContain("ESTILO DE CAPTURA");

      const cine = composePromptInstructions({ ...base, template: getSystemTemplate(key), captureStyle: "cinematic" });
      expect(cine.userPrompt).not.toContain("ESTILO DE CAPTURA");
      const none = composePromptInstructions({ ...base, template: getSystemTemplate(key) });
      expect(none.userPrompt).not.toContain("ESTILO DE CAPTURA");
    }
  });

  it("não se aplica a templates que não descrevem câmera (ex.: personagem)", () => {
    const out = composePromptInstructions({ ...base, template: getSystemTemplate("character_definition"), captureStyle: "amateur_phone" });
    expect(out.userPrompt).not.toContain("ESTILO DE CAPTURA");
  });

  it("schema da rota aceita estilos válidos, usa cinematic por padrão e rejeita inválidos", () => {
    expect(generatePromptRequestSchema.parse({ templateKey: "video_prompt" }).captureStyle).toBe("cinematic");
    expect(generatePromptRequestSchema.parse({ templateKey: "video_prompt", captureStyle: "amateur_phone" }).captureStyle).toBe("amateur_phone");
    expect(() => generatePromptRequestSchema.parse({ templateKey: "video_prompt", captureStyle: "xyz" })).toThrow();
  });

  it("enricher da geração direta troca o look cinematográfico pelo estilo de captura", async () => {
    const out = await CinematicPromptEnricher.enrich({
      userPrompt: "carro futurista voando em rua de ladeira",
      projectId: "qualquer",
      workspaceId: "w",
      negativePrompt: "texto",
      captureStyle: "amateur_phone",
    });
    expect(out.enrichedPrompt).toContain("smartphone");
    expect(out.enrichedNegativePrompt).toContain("cinematic lighting");
    expect(out.enrichedNegativePrompt).toContain("texto");
    expect(out.appliedDirectives[0]).toContain("Amador");
  });
});
