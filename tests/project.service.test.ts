import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { ProjectService } from "@/modules/projects/project.service";
import { WorkspaceRole } from "@prisma/client";

describe("ProjectService - Módulo de Gerenciamento de Projetos", () => {
  let workspaceAId: string;
  let workspaceBId: string;
  let createdProjectId: string;

  beforeAll(async () => {
    // 1. Criar Workspace A
    const wsA = await db.workspace.create({
      data: {
        name: "Produtora Alpha Test",
        slug: `alpha-test-${Date.now()}`,
      },
    });
    workspaceAId = wsA.id;

    // 2. Criar Workspace B para testes de isolamento multitenant
    const wsB = await db.workspace.create({
      data: {
        name: "Produtora Beta Test",
        slug: `beta-test-${Date.now()}`,
      },
    });
    workspaceBId = wsB.id;
  });

  afterAll(async () => {
    // Limpeza dos workspaces de teste
    if (workspaceAId) {
      await db.workspace.delete({ where: { id: workspaceAId } }).catch(() => {});
    }
    if (workspaceBId) {
      await db.workspace.delete({ where: { id: workspaceBId } }).catch(() => {});
    }
  });

  it("1. Deve criar um projeto cinematográfico com configurações técnicas válidas", async () => {
    const project = await ProjectService.createProject(workspaceAId, {
      title: "Neo-Sertão 2099",
      description: "Uma distopia cyberpunk no semiárido brasileiro com estética de luz dura.",
      genre: "Cyberpunk",
      language: "pt-BR",
      durationSeconds: 120,
      configuration: {
        aspectRatio: "2.39:1",
        targetPlatform: "Google Flow",
        colorGrade: "Teal & Orange com poeira dourada",
        pacing: "Acelerado / Dinâmico",
      },
    });

    expect(project).toBeDefined();
    expect(project.id).toBeDefined();
    expect(project.title).toBe("Neo-Sertão 2099");
    expect(project.isArchived).toBe(false);
    expect(project.workspaceId).toBe(workspaceAId);
    expect(project._count.scenes).toBe(0);

    createdProjectId = project.id;
  });

  it("2. Deve listar projetos ativos e filtrar por busca textual", async () => {
    const projects = await ProjectService.listProjects(workspaceAId, {
      status: "active",
      search: "Neo-Sertão",
      sort: "updatedAt_desc",
    });

    expect(projects.length).toBeGreaterThanOrEqual(1);
    expect(projects[0].title).toBe("Neo-Sertão 2099");
  });

  it("3. Deve recuperar detalhes de um projeto pelo identificador", async () => {
    const project = await ProjectService.getProjectById(createdProjectId, workspaceAId);

    expect(project).not.toBeNull();
    expect(project?.id).toBe(createdProjectId);
    expect(project?.genre).toBe("Cyberpunk");
  });

  it("4. Deve atualizar metadados e configurações do projeto", async () => {
    const updated = await ProjectService.updateProject(createdProjectId, workspaceAId, {
      title: "Neo-Sertão 2099: Edição do Diretor",
      durationSeconds: 180,
      configuration: {
        aspectRatio: "2.39:1",
        targetPlatform: "Nano Banana",
        colorGrade: "Monocromático de alto contraste",
        pacing: "Contemplativo",
      },
    });

    expect(updated.title).toBe("Neo-Sertão 2099: Edição do Diretor");
    expect(updated.durationSeconds).toBe(180);
    expect((updated.configuration as any)?.targetPlatform).toBe("Nano Banana");
  });

  it("5. Deve duplicar o projeto com integridade de personagens, ambientes e cenas", async () => {
    // Adicionar um personagem, um ambiente e uma cena antes da duplicação
    const character = await db.character.create({
      data: {
        projectId: createdProjectId,
        name: "Capitão Zé",
        description: "Ciborgue com chapéu de couro e prótese solar",
      },
    });

    const environment = await db.environment.create({
      data: {
        projectId: createdProjectId,
        name: "Ruínas do Açude",
        description: "Concreto rachado sob sol escaldante",
      },
    });

    const scene = await db.scene.create({
      data: {
        projectId: createdProjectId,
        title: "O Duelo ao Meio-Dia",
        order: 1,
        durationSeconds: 45,
        description: "Encontro silencioso entre Zé e os drones da corporação",
      },
    });

    await db.sceneCharacter.create({
      data: { sceneId: scene.id, characterId: character.id },
    });

    await db.sceneEnvironment.create({
      data: { sceneId: scene.id, environmentId: environment.id },
    });

    // Executar duplicação profunda
    const duplicated = await ProjectService.duplicateProject(
      createdProjectId,
      workspaceAId,
      "Neo-Sertão 2099 (Cópia Duplicada)"
    );

    expect(duplicated).not.toBeNull();
    expect(duplicated?.title).toBe("Neo-Sertão 2099 (Cópia Duplicada)");
    expect(duplicated?.id).not.toBe(createdProjectId);
    expect(duplicated?._count.characters).toBe(1);
    expect(duplicated?._count.environments).toBe(1);
    expect(duplicated?._count.scenes).toBe(1);

    // Verificar se as cenas duplicadas mantêm os vínculos novos
    const duplicatedScenes = await db.scene.findMany({
      where: { projectId: duplicated?.id },
      include: {
        characters: { include: { character: true } },
        environments: { include: { environment: true } },
      },
    });

    expect(duplicatedScenes.length).toBe(1);
    expect(duplicatedScenes[0].characters[0].character.name).toBe("Capitão Zé");
    expect(duplicatedScenes[0].environments[0].environment.name).toBe("Ruínas do Açude");
    // O ID do personagem na cena clonada DEVE ser diferente do original
    expect(duplicatedScenes[0].characters[0].characterId).not.toBe(character.id);
  });

  it("6. Deve arquivar e restaurar um projeto corretamente", async () => {
    // Arquivar
    const archived = await ProjectService.archiveProject(createdProjectId, workspaceAId);
    expect(archived.isArchived).toBe(true);
    expect(archived.archivedAt).not.toBeNull();

    // Listar ativos não deve trazer o arquivado
    const activeList = await ProjectService.listProjects(workspaceAId, {
      status: "active",
      sort: "updatedAt_desc",
    });
    expect(activeList.some((p) => p.id === createdProjectId)).toBe(false);

    // Listar arquivados deve trazer o arquivado
    const archivedList = await ProjectService.listProjects(workspaceAId, {
      status: "archived",
      sort: "updatedAt_desc",
    });
    expect(archivedList.some((p) => p.id === createdProjectId)).toBe(true);

    // Restaurar
    const restored = await ProjectService.restoreProject(createdProjectId, workspaceAId);
    expect(restored.isArchived).toBe(false);
    expect(restored.archivedAt).toBeNull();
  });

  it("7. Regra de autorização: um workspace não pode consultar ou modificar projetos de outro", async () => {
    // Workspace B tenta buscar projeto do Workspace A
    const forbiddenProject = await ProjectService.getProjectById(createdProjectId, workspaceBId);
    expect(forbiddenProject).toBeNull();

    // Workspace B tenta listar projetos do Workspace A
    const listB = await ProjectService.listProjects(workspaceBId, { status: "all", sort: "updatedAt_desc" });
    expect(listB.some((p) => p.id === createdProjectId)).toBe(false);
  });

  it("8. Deve excluir o projeto com confirmação e integridade referencial", async () => {
    await ProjectService.deleteProject(createdProjectId, workspaceAId);

    const deletedProject = await db.project.findUnique({
      where: { id: createdProjectId },
    });
    expect(deletedProject).toBeNull();
  });
});
