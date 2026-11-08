import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Separation of Cinematic Analysis and Workspace (Acervo & Produções)", () => {
  const rootDir = process.cwd();

  it("should have a dedicated workspace page (src/app/workspace/page.tsx) containing Acervo & Produções (StudioGallery)", () => {
    const workspacePagePath = path.join(rootDir, "src/app/workspace/page.tsx");
    expect(fs.existsSync(workspacePagePath)).toBe(true);

    const content = fs.readFileSync(workspacePagePath, "utf-8");
    expect(content).toContain("Workspace — Acervo & Produções");
    expect(content).toContain("StudioGallery");
    expect(content).toContain("QuickCreationBar");
    expect(content).toContain('href="/workspace"');
    expect(content).toContain('href="/workspace/members"');
    expect(content).toContain('href="/workspace/billing"');
  });

  it("should have a dedicated cinematic analysis page (src/app/studio/page.tsx) without StudioGallery", () => {
    const studioPagePath = path.join(rootDir, "src/app/studio/page.tsx");
    expect(fs.existsSync(studioPagePath)).toBe(true);

    const content = fs.readFileSync(studioPagePath, "utf-8");
    expect(content).toContain("CinematicStudioWorkflow");
    expect(content).not.toContain("StudioGallery");
    expect(content).not.toContain("QuickCreationBar");
  });

  it("should keep /cinematic-analysis and /spaces as redirects to the real routes", () => {
    const analysis = fs.readFileSync(path.join(rootDir, "src/app/cinematic-analysis/page.tsx"), "utf-8");
    expect(analysis).toContain('redirect("/studio")');
    const spaces = fs.readFileSync(path.join(rootDir, "src/app/spaces/page.tsx"), "utf-8");
    expect(spaces).toContain('redirect("/projects")');
    const spaceById = fs.readFileSync(path.join(rootDir, "src/app/spaces/[id]/page.tsx"), "utf-8");
    expect(spaceById).toContain("/projects/");
  });

  it("should have distinct navigation links in Navbar for Análise Cinematográfica and Workspace", () => {
    const navbarPath = path.join(rootDir, "src/components/navigation/navbar.tsx");
    expect(fs.existsSync(navbarPath)).toBe(true);

    const content = fs.readFileSync(navbarPath, "utf-8");
    expect(content).toContain('href: "/studio"');
    expect(content).toContain('label: "Análise de imagem"');
    expect(content).toContain('href: "/workspace"');
    expect(content).toContain('label: "Biblioteca"');
    expect(content).toContain('label: "Projetos"');
  });

  it("should have navigation links to Workspace in CinematicStudioWorkflow header", () => {
    const workflowPath = path.join(rootDir, "src/components/studio/cinematic-studio-workflow.tsx");
    expect(fs.existsSync(workflowPath)).toBe(true);

    const content = fs.readFileSync(workflowPath, "utf-8");
    expect(content).toContain('href="/workspace"');
    expect(content).toContain("Análise Cinematográfica");
  });
});
