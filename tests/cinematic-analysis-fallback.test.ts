import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { ProjectService } from "@/modules/projects/project.service";
import { CinematicAnalysisService } from "@/modules/cinematic-analysis/cinematic-analysis.service";

describe("Análise cinematográfica de contingência (isFallback)", () => {
  let workspaceId: string;
  let otherWorkspaceId: string;
  let projectId: string;

  beforeAll(async () => {
    const ws = await db.workspace.create({
      data: { name: "Estúdio Fallback", slug: `fallback-${Date.now()}` },
    });
    workspaceId = ws.id;
    const other = await db.workspace.create({
      data: { name: "Estúdio Fallback B", slug: `fallback-b-${Date.now()}` },
    });
    otherWorkspaceId = other.id;

    const project = await ProjectService.createProject(workspaceId, {
      title: "Projeto Fallback",
      description: "Teste de bloqueio de análise genérica.",
      genre: "Drama",
      language: "pt-BR",
    });
    projectId = project.id;

    for (const [id, isFallback] of [
      ["analise-generica", true],
      ["analise-real", false],
    ] as const) {
      await db.generationJob.create({
        data: {
          projectId,
          status: "SUCCEEDED",
          modelName: "teste",
          request: { mode: "TECHNICAL_ANALYSIS" },
          result: { id, isFallback },
        },
      });
    }
  });

  afterAll(async () => {
    await db.generationJob.deleteMany({ where: { projectId } });
    await db.project.deleteMany({ where: { id: projectId } });
    await db.workspace.deleteMany({ where: { id: { in: [workspaceId, otherWorkspaceId] } } });
  });

  it("identifica análise salva como contingência", async () => {
    await expect(
      CinematicAnalysisService.isFallbackAnalysis(projectId, workspaceId, "analise-generica")
    ).resolves.toBe(true);
  });

  it("não bloqueia análise real nem id desconhecido", async () => {
    await expect(
      CinematicAnalysisService.isFallbackAnalysis(projectId, workspaceId, "analise-real")
    ).resolves.toBe(false);
    await expect(
      CinematicAnalysisService.isFallbackAnalysis(projectId, workspaceId, "nao-existe")
    ).resolves.toBe(false);
  });

  it("não enxerga análises de outro workspace", async () => {
    await expect(
      CinematicAnalysisService.isFallbackAnalysis(projectId, otherWorkspaceId, "analise-generica")
    ).resolves.toBe(false);
  });
});
