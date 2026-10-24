import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import {
  CreateProjectInput,
  UpdateProjectInput,
  ListProjectsQuery,
} from "@/lib/schemas/project";
import { EntitlementService } from "@/modules/billing/entitlement.service";
import { NotFoundError, AuthorizationError } from "@/lib/auth";
import { WorkspaceService } from "@/modules/workspaces/workspace.service";

export class ProjectService {
  /**
   * Lista os projetos de um workspace com suporte a filtros, busca e ordenação.
   */
  static async listProjects(workspaceId: string, query: ListProjectsQuery) {
    const where: Prisma.ProjectWhereInput = {
      workspaceId,
    };

    // Filtro por estado
    if (query.status === "active") {
      where.isArchived = false;
    } else if (query.status === "archived") {
      where.isArchived = true;
    }

    // Busca textual por nome ou descrição
    if (query.search && query.search.trim() !== "") {
      const term = query.search.trim();
      where.OR = [
        { title: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
      ];
    }

    // Filtro por gênero
    if (query.genre && query.genre.trim() !== "") {
      where.genre = query.genre.trim();
    }

    // Ordenação
    let orderBy: Prisma.ProjectOrderByWithRelationInput = { updatedAt: "desc" };
    switch (query.sort) {
      case "updatedAt_asc":
        orderBy = { updatedAt: "asc" };
        break;
      case "title_asc":
        orderBy = { title: "asc" };
        break;
      case "title_desc":
        orderBy = { title: "desc" };
        break;
      case "createdAt_desc":
        orderBy = { createdAt: "desc" };
        break;
      case "updatedAt_desc":
      default:
        orderBy = { updatedAt: "desc" };
        break;
    }

    return db.project.findMany({
      where,
      orderBy,
      include: {
        _count: {
          select: {
            characters: true,
            environments: true,
            scenes: true,
            parameterValues: true,
            generations: true,
          },
        },
      },
    });
  }

  /**
   * Retorna os detalhes completos de um projeto.
   */
  static async getProjectById(id: string, workspaceId: string) {
    return db.project.findFirst({
      where: {
        id,
        workspaceId,
      },
      include: {
        _count: {
          select: {
            characters: true,
            environments: true,
            scenes: true,
            parameterValues: true,
            generations: true,
          },
        },
        characters: {
          take: 10,
          orderBy: { updatedAt: "desc" },
        },
        environments: {
          take: 10,
          orderBy: { updatedAt: "desc" },
        },
        scenes: {
          take: 10,
          orderBy: { order: "asc" },
          include: {
            characters: {
              include: { character: true },
            },
            environments: {
              include: { environment: true },
            },
          },
        },
      },
    });
  }

  /**
   * Cria um novo projeto associado ao workspace.
   */
  static async createProject(workspaceId: string, data: CreateProjectInput) {
    // Validar limites comerciais e direitos do plano (Entitlements)
    await EntitlementService.assertCanCreateProject(workspaceId);

    return db.project.create({
      data: {
        workspaceId,
        title: data.title,
        description: data.description ?? "",
        genre: data.genre ?? null,
        language: data.language ?? "pt-BR",
        durationSeconds: data.durationSeconds ?? null,
        configuration: (data.configuration ?? {
          aspectRatio: "16:9",
          targetPlatform: "Google Flow",
        }) as Prisma.InputJsonValue,
      },
      include: {
        _count: {
          select: {
            characters: true,
            environments: true,
            scenes: true,
            parameterValues: true,
            generations: true,
          },
        },
      },
    });
  }

  /**
   * Atualiza os metadados e configurações de um projeto existente.
   */
  static async updateProject(id: string, workspaceId: string, data: UpdateProjectInput) {
    const updateData: Prisma.ProjectUpdateInput = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.genre !== undefined) updateData.genre = data.genre;
    if (data.language !== undefined) updateData.language = data.language;
    if (data.durationSeconds !== undefined) updateData.durationSeconds = data.durationSeconds;
    if (data.configuration !== undefined) {
      updateData.configuration = data.configuration as Prisma.InputJsonValue;
    }
    if (data.isArchived !== undefined) {
      updateData.isArchived = data.isArchived;
      updateData.archivedAt = data.isArchived ? new Date() : null;
    }

    return db.project.update({
      where: {
        id,
        workspaceId,
      },
      data: updateData,
      include: {
        _count: {
          select: {
            characters: true,
            environments: true,
            scenes: true,
            parameterValues: true,
            generations: true,
          },
        },
      },
    });
  }

  /**
   * Duplica um projeto mantendo a integridade referencial dos elementos filhos:
   * personagens, ambientes, parâmetros e cenas com suas ligações.
   */
  static async duplicateProject(id: string, workspaceId: string, customTitle?: string) {
    return db.$transaction(async (tx) => {
      const original = await tx.project.findFirst({
        where: { id, workspaceId },
        include: {
          characters: true,
          environments: true,
          scenes: {
            include: {
              characters: true,
              environments: true,
            },
          },
          parameterValues: true,
        },
      });

      if (!original) {
        throw new Error("Projeto original não encontrado para duplicação.");
      }

      const duplicateTitle = customTitle && customTitle.trim() !== ""
        ? customTitle.trim()
        : `${original.title} (Cópia)`;

      // 1. Criar novo projeto base
      const duplicatedProject = await tx.project.create({
        data: {
          workspaceId: original.workspaceId,
          title: duplicateTitle,
          description: original.description,
          genre: original.genre,
          language: original.language,
          durationSeconds: original.durationSeconds,
          configuration: original.configuration as Prisma.InputJsonValue,
          visualBible: original.visualBible as Prisma.InputJsonValue,
          isArchived: false,
          archivedAt: null,
        },
      });

      // 2. Clonar valores de parâmetros
      if (original.parameterValues.length > 0) {
        await tx.parameterValue.createMany({
          data: original.parameterValues.map((pv) => ({
            projectId: duplicatedProject.id,
            parameterDefinitionId: pv.parameterDefinitionId,
            targetType: pv.targetType,
            targetId: pv.targetId,
            value: pv.value as Prisma.InputJsonValue,
          })),
        });
      }

      // 3. Clonar personagens e mapear IDs antigos -> novos
      const characterIdMap = new Map<string, string>();
      for (const char of original.characters) {
        const newChar = await tx.character.create({
          data: {
            projectId: duplicatedProject.id,
            name: char.name,
            description: char.description,
            attributes: char.attributes as Prisma.InputJsonValue,
          },
        });
        characterIdMap.set(char.id, newChar.id);
      }

      // 4. Clonar ambientes e mapear IDs antigos -> novos
      const environmentIdMap = new Map<string, string>();
      for (const env of original.environments) {
        const newEnv = await tx.environment.create({
          data: {
            projectId: duplicatedProject.id,
            name: env.name,
            description: env.description,
            attributes: env.attributes as Prisma.InputJsonValue,
          },
        });
        environmentIdMap.set(env.id, newEnv.id);
      }

      // 5. Clonar cenas com os vínculos aos novos personagens e ambientes
      for (const scene of original.scenes) {
        const newScene = await tx.scene.create({
          data: {
            projectId: duplicatedProject.id,
            title: scene.title,
            order: scene.order,
            durationSeconds: scene.durationSeconds,
            description: scene.description,
            configuration: scene.configuration as Prisma.InputJsonValue,
          },
        });

        // Relacionar personagens clonados
        for (const sc of scene.characters) {
          const mappedCharId = characterIdMap.get(sc.characterId);
          if (mappedCharId) {
            await tx.sceneCharacter.create({
              data: {
                sceneId: newScene.id,
                characterId: mappedCharId,
              },
            });
          }
        }

        // Relacionar ambientes clonados
        for (const se of scene.environments) {
          const mappedEnvId = environmentIdMap.get(se.environmentId);
          if (mappedEnvId) {
            await tx.sceneEnvironment.create({
              data: {
                sceneId: newScene.id,
                environmentId: mappedEnvId,
              },
            });
          }
        }
      }

      return tx.project.findUnique({
        where: { id: duplicatedProject.id },
        include: {
          _count: {
            select: {
              characters: true,
              environments: true,
              scenes: true,
              parameterValues: true,
              generations: true,
            },
          },
        },
      });
    }, {
      maxWait: 10000,
      timeout: 30000,
    });
  }

  /**
   * Arquiva um projeto.
   */
  static async archiveProject(id: string, workspaceId: string) {
    return db.project.update({
      where: { id, workspaceId },
      data: {
        isArchived: true,
        archivedAt: new Date(),
      },
    });
  }

  /**
   * Restaura um projeto arquivado.
   */
  static async restoreProject(id: string, workspaceId: string) {
    return db.project.update({
      where: { id, workspaceId },
      data: {
        isArchived: false,
        archivedAt: null,
      },
    });
  }

  /**
   * Exclui permanentemente um projeto e seus recursos associados.
   */
  static async deleteProject(id: string, workspaceId: string) {
    return db.project.delete({
      where: {
        id,
        workspaceId,
      },
    });
  }

  /**
   * Transfere um projeto com todos os seus recursos para outro workspace autorizado.
   */
  static async transferProject(
    projectId: string,
    currentUserId: string,
    targetWorkspaceId: string
  ) {
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        workspace: true,
      },
    });

    if (!project) {
      throw new NotFoundError("Projeto não encontrado.");
    }

    if (project.workspaceId === targetWorkspaceId) {
      throw new Error("O projeto já pertence a este workspace.");
    }

    // 1. Validar permissão no workspace de origem (projects:delete ou projects:update)
    await WorkspaceService.assertUserHasPermission(
      project.workspaceId,
      currentUserId,
      "projects:delete"
    );

    // 2. Validar permissão no workspace de destino (projects:create)
    await WorkspaceService.assertUserHasPermission(
      targetWorkspaceId,
      currentUserId,
      "projects:create"
    );

    // 3. Validar se o workspace de destino está ativo (não arquivado)
    const targetWorkspace = await db.workspace.findUnique({
      where: { id: targetWorkspaceId },
    });

    if (!targetWorkspace || targetWorkspace.isArchived) {
      throw new Error("O workspace de destino não existe ou está arquivado.");
    }

    // 4. Validar limites de projetos no plano do workspace de destino (Entitlement)
    await EntitlementService.assertCanCreateProject(targetWorkspaceId);

    // 5. Tratar colisão de nomes/títulos no destino
    let finalTitle = project.title;
    const existingSameTitle = await db.project.findFirst({
      where: {
        workspaceId: targetWorkspaceId,
        title: project.title,
        isArchived: false,
      },
    });

    if (existingSameTitle) {
      finalTitle = `${project.title} (Transferido)`;
    }

    // 6. Transferência atômica com preservação integral de relações e auditoria dupla
    return await db.$transaction(async (tx) => {
      const transferred = await tx.project.update({
        where: { id: projectId },
        data: {
          workspaceId: targetWorkspaceId,
          title: finalTitle,
        },
      });

      // Auditoria no workspace de origem
      await tx.auditLog.create({
        data: {
          userId: currentUserId,
          workspaceId: project.workspaceId,
          action: "PROJECT_TRANSFERRED_OUT",
          details: {
            projectId,
            title: project.title,
            targetWorkspaceId,
          },
        },
      });

      // Auditoria no workspace de destino
      await tx.auditLog.create({
        data: {
          userId: currentUserId,
          workspaceId: targetWorkspaceId,
          action: "PROJECT_TRANSFERRED_IN",
          details: {
            projectId,
            title: finalTitle,
            originWorkspaceId: project.workspaceId,
          },
        },
      });

      return transferred;
    });
  }
}
