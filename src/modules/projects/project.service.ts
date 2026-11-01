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

export type ProjectWithCounts = Prisma.ProjectGetPayload<{
  include: {
    _count: {
      select: {
        characters: true;
        environments: true;
        scenes: true;
        parameterValues: true;
        generations: true;
      };
    };
  };
}>;

export type PaginatedProjectList = ProjectWithCounts[] & {
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
};

export class ProjectService {
  /**
   * Lista os projetos (Spaces) de um workspace com suporte a filtros, busca, visibilidade e ordenação.
   */
  static async listProjects(
    workspaceId: string,
    query: ListProjectsQuery,
    viewer?: { userId: string; role: string }
  ): Promise<PaginatedProjectList> {
    const andConditions: Prisma.ProjectWhereInput[] = [];
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
      andConditions.push({
        OR: [
          { title: { contains: term, mode: "insensitive" } },
          { description: { contains: term, mode: "insensitive" } },
        ],
      });
    }

    // Filtro por visibilidade do membro (quando não é OWNER nem ADMIN do workspace)
    if (viewer?.userId && viewer.role !== "OWNER" && viewer.role !== "ADMIN") {
      andConditions.push({
        OR: [
          { visibility: "TEAM" },
          { ownerUserId: viewer.userId },
          { ownerUserId: null },
          {
            visibility: "SELECTED",
            spaceMembers: {
              some: { userId: viewer.userId },
            },
          },
        ],
      });
    }

    // Filtro de aba do Spaces ("mine" vs "shared")
    if (viewer?.userId && query.boardFilter === "mine") {
      andConditions.push({
        OR: [{ ownerUserId: viewer.userId }, { ownerUserId: null }],
      });
    } else if (viewer?.userId && query.boardFilter === "shared") {
      andConditions.push({
        OR: [
          { visibility: "TEAM" },
          {
            visibility: "SELECTED",
            spaceMembers: {
              some: { userId: viewer.userId },
            },
          },
        ],
      });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
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

    const page = query.page || 1;
    const limit = query.limit;

    const projectInclude = {
      _count: {
        select: {
          characters: true,
          environments: true,
          scenes: true,
          parameterValues: true,
          generations: true,
          generatedImages: true,
          boards: true,
          spaceMembers: true,
        },
      },
      spaceMembers: {
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
        },
      },
      generatedImages: {
        where: { status: "SUCCEEDED" },
        take: 6,
        orderBy: { createdAt: "desc" as const },
        select: {
          id: true,
          imageUrl: true,
          prompt: true,
          aspectRatio: true,
          modelId: true,
        },
      },
    };

    if (limit) {
      const skip = (page - 1) * limit;
      const [projects, total] = await Promise.all([
        db.project.findMany({
          where,
          orderBy,
          skip,
          take: limit,
          include: projectInclude,
        }),
        db.project.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit) || 1;
      const sanitized = projects.map((p) => {
        if (p.configuration && typeof p.configuration === "object" && "cinematicAnalyses" in (p.configuration as any)) {
          const { cinematicAnalyses: _ignored, ...restConfig } = p.configuration as Record<string, any>;
          return { ...p, configuration: restConfig };
        }
        return p;
      });
      const paginatedList: any = sanitized;
      paginatedList.total = total;
      paginatedList.page = page;
      paginatedList.limit = limit;
      paginatedList.totalPages = totalPages;
      return paginatedList;
    }

    const projects = await db.project.findMany({
      where,
      orderBy,
      include: projectInclude,
    });

    return projects.map((p) => {
      if (p.configuration && typeof p.configuration === "object" && "cinematicAnalyses" in (p.configuration as any)) {
        const { cinematicAnalyses: _ignored, ...restConfig } = p.configuration as Record<string, any>;
        return { ...p, configuration: restConfig };
      }
      return p;
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
            generatedImages: true,
            boards: true,
            spaceMembers: true,
          },
        },
        spaceMembers: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                email: true,
              },
            },
          },
        },
        boards: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            name: true,
            order: true,
            updatedAt: true,
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
   * Cria um novo projeto (Space) associado ao workspace e inicializa sua primeira página de board.
   */
  static async createProject(workspaceId: string, data: CreateProjectInput, ownerUserId?: string) {
    // Validar limites comerciais e direitos do plano (Entitlements)
    await EntitlementService.assertCanCreateProject(workspaceId);

    return db.project.create({
      data: {
        workspaceId,
        ownerUserId: ownerUserId ?? null,
        title: data.title,
        description: data.description ?? "",
        genre: data.genre ?? null,
        language: data.language ?? "pt-BR",
        durationSeconds: data.durationSeconds ?? null,
        visibility: data.visibility ?? "TEAM",
        thumbnailUrl: data.thumbnailUrl ?? null,
        configuration: (data.configuration ?? {
          aspectRatio: "16:9",
          targetPlatform: "Google Flow",
        }) as Prisma.InputJsonValue,
        boards: {
          create: {
            name: "Page 1",
            order: 0,
            viewport: { x: 0, y: 0, zoom: 1 },
          },
        },
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
    if (data.visibility !== undefined) updateData.visibility = data.visibility;
    if (data.thumbnailUrl !== undefined) updateData.thumbnailUrl = data.thumbnailUrl;
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
