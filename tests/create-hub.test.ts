import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf-8");

describe("Fase 3 - entrada por ferramenta", () => {
  it("dashboard monta a tela Criar com cartões de uma ação", () => {
    expect(read("src/app/dashboard/page.tsx")).toContain("<CreateHub />");
    const hub = read("src/components/dashboard/create-hub.tsx");
    for (const t of ["Gerar imagem", "Gerar vídeo", "Prompt de vídeo", "Prompt de imagem", "Criar personagem", "Criar cena"]) {
      expect(hub).toContain(t);
    }
    // fluxo ideia -> prompt -> imagem/vídeo no mesmo lugar
    expect(hub).toContain("Gerar imagem com este prompt");
    expect(hub).toContain("Gerar vídeo com este prompt");
  });

  it("quick-create aceita ferramenta e proporção com os padrões de sempre", () => {
    const route = read("src/app/api/studio/quick-create/route.ts");
    expect(route).toContain('optional().default("google_flow")');
    expect(route).toContain('optional().default("16:9")');
    expect(route).toContain("aspectRatio: validated.aspectRatio");
    expect(route).toContain("targetTool: validated.targetTool");
  });

  it("barra de criação aparece na lista de projetos e a aba clássica gera vídeo direto", () => {
    expect(read("src/components/projects/list/projects-list.tsx")).toContain("<QuickCreationBar");
    expect(read("src/components/prompts/prompts-tab.tsx")).toContain("<DirectVideoModal");
    expect(read("src/components/prompts/prompt-mode-bar.tsx")).toContain("Gerar Vídeo (IA Direta)");
  });
});
