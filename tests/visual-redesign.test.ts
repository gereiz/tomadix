import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Etapa 4: Implementação do Redesign Visual V1 e Identidade Cinematográfica", () => {
  it("1. Design Tokens: globals.css deve conter tokens oficiais do DESIGN.md", () => {
    const globalsCssPath = path.join(process.cwd(), "src/app/globals.css");
    const content = fs.readFileSync(globalsCssPath, "utf-8");

    // Cores oficiais
    // Os tokens são personalizáveis pelo admin (variáveis --brand-*), com o valor oficial como fallback
    expect(content).toContain("--color-surface: var(--brand-surface, #101418);");
    expect(content).toContain("--color-primary: var(--brand-primary, #4edea3);");
    expect(content).toContain("--color-primary-container: var(--brand-primary, #10b981);");
    expect(content).toContain("--color-surface-container-lowest: #0b0f13;");
    expect(content).toContain("--color-outline-variant: var(--brand-border, #3c4a42);");

    // Tipografia
    expect(content).toContain('--font-display-hero: "Plus Jakarta Sans"');
    expect(content).toContain('--font-body-md: "Inter"');
    expect(content).toContain('--font-label-code: "JetBrains Mono"');
  });

  it("2. Fontes e Layout Global: layout.tsx carrega Google Fonts, sem a fonte de ícones Material Symbols", () => {
    const layoutPath = path.join(process.cwd(), "src/app/layout.tsx");
    const content = fs.readFileSync(layoutPath, "utf-8");

    expect(content).toContain("Plus+Jakarta+Sans");
    expect(content).toContain("Inter");
    expect(content).toContain("JetBrains+Mono");
    // Ícones agora são SVGs inline (src/components/ui/icon.tsx)
    expect(content).not.toContain("Material+Symbols+Outlined");
    expect(content).toContain("bg-surface font-body-md text-on-surface");
  });

  it("3. Navbar Redesenhado: links com tokens e logo moderno, sem backdrop-blur", () => {
    const navbarPath = path.join(process.cwd(), "src/components/navigation/navbar.tsx");
    const content = fs.readFileSync(navbarPath, "utf-8");

    // backdrop-blur foi removido de todo o sistema por custo de GPU (veja CLAUDE.md)
    expect(content).not.toContain("backdrop-blur");
    expect(content).toContain("border-outline-variant/30");
    expect(content).toContain("text-primary");
    expect(content).toContain("TOMA");
    expect(content).toContain("DIX");
  });

  it("4. Landing Page Home: Hero, exemplo de prompt JSON e fluxo em 4 passos (componentes reutilizáveis)", () => {
    const root = process.cwd();
    const page = fs.readFileSync(path.join(root, "src/app/page.tsx"), "utf-8");
    const content = fs.readFileSync(path.join(root, "src/config/home-content.ts"), "utf-8");
    const preview = fs.readFileSync(path.join(root, "src/components/home/prompt-preview.tsx"), "utf-8");

    expect(page).toContain("Escreva a cena.");
    expect(page).toContain("Receba o prompt pronto.");
    expect(page).toContain("PromptPreview");
    expect(page).toContain("HOME_STEPS");
    expect(page).not.toContain('"use client"');
    expect(preview).toContain("HOME_PROMPT_SAMPLE");
    expect(content).toContain("cena-03.json");
    expect(content).toContain("Google Flow");
  });

  it("5. Página de Projetos: deve possuir cards widescreen 16:9, atalho ⌘K, presets e 4 métricas", () => {
    // A página foi dividida em componentes: a rota apenas reexporta src/components/projects/list
    const listDir = path.join(process.cwd(), "src/components/projects/list");
    const content = fs
      .readdirSync(listDir)
      .filter((name) => /\.tsx?$/.test(name))
      .map((name) => fs.readFileSync(path.join(listDir, name), "utf-8"))
      .join("\n");

    // Aspect ratio 16:9 widescreen card
    expect(content).toContain("aspect-[16/9]");
    expect(content).toContain("⌘K");

    // 4 contadores de módulo
    expect(content).toContain("Persona");
    expect(content).toContain("Ambiente");
    expect(content).toContain("Cena");
    expect(content).toContain("Parâmetros");

    // Presets rápidos
    expect(content).toContain("CINEMA_PRESETS");
    expect(content).toContain("Presets Rápidos");
    expect(content).toContain("Curta Cyberpunk 2099");
    expect(content).toContain("Cinema Noir VHS Anos 90");

    // Ação Abrir Módulos
    expect(content).toContain("Abrir");
  });
});
