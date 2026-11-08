import { describe, it, expect } from "vitest";
import { fitPlainText, formatPlainTextWithLimit, truncateAtBoundary } from "@/modules/prompt-engine/plain-text-limit";
import { composePromptInstructions } from "@/modules/prompt-engine/compose-prompt";
import { PromptEngineService } from "@/modules/prompt-engine/prompt-engine.service";
import { getSystemTemplate } from "@/modules/prompt-engine/prompt-template.catalog";
import { getToolProfile } from "@/modules/prompt-engine/tool-profiles";

const longPrompt = Array.from({ length: 120 }, (_, i) => `Frase número ${i} descreve a ação com detalhes cinematográficos.`).join(" ");

describe("Limite de 2500 caracteres no Texto Simples", () => {
  it("truncateAtBoundary não parte palavras", () => {
    const out = truncateAtBoundary("alpha beta gamma delta epsilon", 14);
    expect(out.length).toBeLessThanOrEqual(14);
    expect(out).not.toMatch(/gam/);
  });

  it("fitPlainText mantém texto curto intacto e limita o longo", () => {
    expect(fitPlainText("curto", 2500)).toBe("curto");
    const text = `TÍTULO\n--\nPROMPT:\n${longPrompt}\n🚫 NEGATIVO:\nblurry, text`;
    const out = fitPlainText(text, 2500);
    expect(out.length).toBeLessThanOrEqual(2500);
    expect(out).toContain("TÍTULO");
    expect(out).toContain("blurry, text");
  });

  it("limita o texto simples mas não altera o JSON de origem (vídeo)", () => {
    const data = { compiledPromptText: longPrompt, action: "ação", compiledNegativePrompt: "blurry" };
    expect(data.compiledPromptText.length).toBeGreaterThan(2500);
    const out = formatPlainTextWithLimit(data, "video_prompt", 2500);
    expect(out.length).toBeLessThanOrEqual(2500);
    expect(data.compiledPromptText).toBe(longPrompt);
  });

  it("na sequência de cenas o limite vale por cena", () => {
    const scenes = [1, 2, 3].map((n) => ({ sceneId: `s${n}`, order: n, title: `Cena ${n}`, shotPrompt: longPrompt }));
    const out = formatPlainTextWithLimit({ sequenceTitle: "Seq", scenes }, "scene_sequence", 2500);
    const chunks = out.split(/\n(?=CENA #)/);
    expect(chunks).toHaveLength(4);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(2500);
    expect(out).toContain("CENA #3: Cena 3");
  });
});

describe("Sequência de Cenas com cenas reais", () => {
  const real = [
    { id: "a", order: 1, title: "Abertura", durationSeconds: 4 },
    { id: "b", order: 2, title: "Clímax", durationSeconds: null },
  ];

  it("reconcileSequence força ids, ordem e títulos reais", () => {
    const out = PromptEngineService.reconcileSequence(
      { scenes: [
          { sceneId: "inventado1", order: 9, title: "X", shotPrompt: "p1" },
          { sceneId: "inventado2", order: 8, title: "Y", shotPrompt: "p2" },
        ] },
      real
    );
    expect(out.scenes.map((s: any) => [s.sceneId, s.order, s.title])).toEqual([["a", 1, "Abertura"], ["b", 2, "Clímax"]]);
    expect(out.scenes[0].shotPrompt).toBe("p1");
    expect(out.scenes[0].durationSeconds).toBe(4);
  });

  it("reconcileSequence casa por sceneId mesmo fora de ordem", () => {
    const out = PromptEngineService.reconcileSequence(
      { scenes: [
          { sceneId: "b", shotPrompt: "pb" },
          { sceneId: "a", shotPrompt: "pa" },
          { sceneId: "zzz", shotPrompt: "extra" },
        ] },
      real
    );
    expect(out.scenes.map((s: any) => s.shotPrompt)).toEqual(["pa", "pb"]);
  });

  it("reconcileSequence falha quando falta a cena na resposta", () => {
    expect(() => PromptEngineService.reconcileSequence({ scenes: [{ sceneId: "a", shotPrompt: "pa" }] }, real)).toThrow(/Clímax/);
  });

  it("o prompt lista as cenas reais e o esqueleto tem uma entrada por cena", () => {
    const { systemInstruction, userPrompt } = composePromptInstructions({
      project: { id: "p", title: "T", description: "", genre: null, language: "pt-BR" },
      toolProfile: getToolProfile("seedance"),
      template: getSystemTemplate("scene_sequence"),
      resolvedParameters: {},
      sequenceScenes: real.map((r) => ({ ...r, description: "d", configuration: {}, characters: [], environments: [] })),
    });
    expect(userPrompt).toContain("CENAS REAIS DO PROJETO");
    expect(userPrompt).toContain("sceneId: a");
    expect(userPrompt).toContain("sceneId: b");
    expect(systemInstruction).toContain("PROIBIDO criar, remover");
    expect(systemInstruction).toContain("Seedance");
    expect(systemInstruction).toContain("2500");
  });
});
