import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Etapa 4: Implementação do Redesign Visual V1 e Identidade Cinematográfica", () => {
  it("1. Design Tokens: globals.css deve conter tokens oficiais do DESIGN.md", () => {
    const globalsCssPath = path.join(process.cwd(), "src/app/globals.css");
    const content = fs.readFileSync(globalsCssPath, "utf-8");

    // Cores oficiais
    expect(content).toContain("--color-surface: #101418;");
    expect(content).toContain("--color-primary: #4edea3;");
    expect(content).toContain("--color-primary-container: #10b981;");
    expect(content).toContain("--color-surface-container-lowest: #0b0f13;");
    expect(content).toContain("--color-outline-variant: #3c4a42;");

    // Tipografia
    expect(content).toContain('--font-display-hero: "Plus Jakarta Sans"');
    expect(content).toContain('--font-body-md: "Inter"');
    expect(content).toContain('--font-label-code: "JetBrains Mono"');
  });

  it("2. Fontes e Layout Global: layout.tsx deve carregar Google Fonts e Material Symbols", () => {
    const layoutPath = path.join(process.cwd(), "src/app/layout.tsx");
    const content = fs.readFileSync(layoutPath, "utf-8");

    expect(content).toContain("Plus+Jakarta+Sans");
    expect(content).toContain("Inter");
    expect(content).toContain("JetBrains+Mono");
    expect(content).toContain("Material+Symbols+Outlined");
    expect(content).toContain("bg-surface font-body-md text-on-surface");
  });

  it("3. Navbar Redesenhado: deve possuir backdrop-blur, links com tokens e logo moderno", () => {
    const navbarPath = path.join(process.cwd(), "src/components/navigation/navbar.tsx");
    const content = fs.readFileSync(navbarPath, "utf-8");

    expect(content).toContain("bg-surface/85 backdrop-blur-xl");
    expect(content).toContain("border-outline-variant/30");
    expect(content).toContain("text-primary");
    expect(content).toContain("TOMA");
    expect(content).toContain("DIX");
  });

  it("4. Landing Page Home: deve conter Hero cinematográfico, ambient glow e terminal JSON", () => {
    const homePath = path.join(process.cwd(), "src/app/page.tsx");
    const content = fs.readFileSync(homePath, "utf-8");

    expect(content).toContain("AI-Powered Pre-Production • Engine v2.4");
    expect(content).toContain("Da ideia ao prompt.");
    expect(content).toContain("Com direção cinematográfica.");
    expect(content).toContain("prompt_compiler.json");
    expect(content).toContain("Midjourney v6.1");
    expect(content).toContain("Flux Pro");
  });

  it("5. Página de Projetos: deve possuir cards widescreen 16:9, atalho ⌘K, presets e 4 métricas", () => {
    const projectsPath = path.join(process.cwd(), "src/app/projects/page.tsx");
    const content = fs.readFileSync(projectsPath, "utf-8");

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
    expect(content).toContain("Abrir Módulos");
  });
});
