import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { AdminAuditService } from "./admin-audit.service";
import { EntitlementService } from "../billing/entitlement.service";

export interface ListAdminProjectsParams {
  search?: string;
  status?: "all" | "active" | "archived";
  genre?: string;
  workspaceId?: string;
  page?: number;
  limit?: number;
  sort?: "newest" | "oldest" | "title" | "updated";
}

export class AdminProjectsService {
  /**
   * Lista todos os projetos da plataforma com busca, filtros por workspace, status e paginação.
   */
  static async listProjects(params: ListAdminProjectsParams) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.ProjectWhereInput = {};

    if (params.search) {
      where.OR = [
        { title: { contains: params.search, mode: "insensitive" } },
        { description: { contains: params.search, mode: "insensitive" } },
        { genre: { contains: params.search, mode: "insensitive" } },
        { workspace: { name: { contains: params.search, mode: "insensitive" } } },
      ];
    }

    if (params.status === "active") {
      where.isArchived = false;
    } else if (params.status === "archived") {
      where.isArchived = true;
    }

    if (params.genre && params.genre !== "all") {
      where.genre = { equals: params.genre, mode: "insensitive" };
    }

    if (params.workspaceId) {
      where.workspaceId = params.workspaceId;
    }

    let orderBy: Prisma.ProjectOrderByWithRelationInput = { updatedAt: "desc" };
    if (params.sort === "newest") orderBy = { createdAt: "desc" };
    if (params.sort === "oldest") orderBy = { createdAt: "asc" };
    if (params.sort === "title") orderBy = { title: "asc" };

    const [projects, total] = await Promise.all([
      db.project.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          workspace: {
            select: {
              id: true,
              name: true,
              slug: true,
              creditsBalance: true,
              subscription: {
                select: {
                  planTier: true,
                  status: true,
                },
              },
              memberships: {
                where: { role: "OWNER" },
                take: 1,
                include: {
                  user: {
                    select: {
                      id: true,
                      email: true,
                      displayName: true,
                    },
                  },
                },
              },
            },
          },
          _count: {
            select: {
              scenes: true,
              characters: true,
              environments: true,
              generations: true,
            },
          },
        },
      }),
      db.project.count({ where }),
    ]);

    return {
      projects: projects.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        genre: p.genre,
        language: p.language,
        durationSeconds: p.durationSeconds,
        isArchived: p.isArchived,
        archivedAt: p.archivedAt,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        workspaceId: p.workspaceId,
        workspaceName: p.workspace.name,
        workspaceSlug: p.workspace.slug,
        workspace: p.workspace,
        planTier: p.workspace.subscription?.planTier || "FREE",
        ownerEmail: p.workspace.memberships[0]?.user?.email || "Sem proprietário",
        ownerName: p.workspace.memberships[0]?.user?.displayName || "N/A",
        counts: {
          scenes: p._count.scenes,
          characters: p._count.characters,
          environments: p._count.environments,
          generations: p._count.generations,
        },
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obtém detalhes operacionais e técnicos completos de um projeto pelo administrador.
   */
  static async getProjectDetails(projectId: string) {
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        workspace: {
          include: {
            subscription: {
              include: { plan: true },
            },
            memberships: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    displayName: true,
                    platformRole: true,
                  },
                },
              },
            },
          },
        },
        characters: {
          where: { isArchived: false },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        environments: {
          where: { isArchived: false },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        scenes: {
          orderBy: { order: "asc" },
          take: 15,
        },
        generations: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            status: true,
            modelName: true,
            inputTokens: true,
            outputTokens: true,
            errorMessage: true,
            createdAt: true,
            finishedAt: true,
          },
        },
        _count: {
          select: {
            scenes: true,
            characters: true,
            environments: true,
            generations: true,
            parameterValues: true,
          },
        },
      },
    });

    if (!project) {
      throw new Error("Projeto cinematográfico não encontrado.");
    }

    // Buscar histórico de auditoria administrativa referente a este projeto
    const recentAuditLogs = await db.platformAuditLog.findMany({
      where: {
        targetType: "Project",
        targetId: projectId,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return {
      project,
      metrics: {
        scenesCount: project._count.scenes,
        charactersCount: project._count.characters,
        environmentsCount: project._count.environments,
        generationsCount: project._count.generations,
      },
      recentAuditLogs,
    };
  }

  /**
   * Arquiva um projeto administrativamente (com justificativa de auditoria).
   */
  static async archiveProject(
    adminUserId: string,
    projectId: string,
    reason: string,
    context?: { ip?: string; ua?: string }
  ) {
    if (!reason || reason.trim().length < 5) {
      throw new Error("Informe uma justificativa válida para arquivar o projeto.");
    }

    const project = await db.project.findUnique({
      where: { id: projectId },
      include: { workspace: true },
    });

    if (!project) {
      throw new Error("Projeto não encontrado.");
    }

    if (project.isArchived) {
      throw new Error("O projeto já se encontra arquivado.");
    }

    const updated = await db.project.update({
      where: { id: projectId },
      data: {
        isArchived: true,
        archivedAt: new Date(),
      },
    });

    await AdminAuditService.logAction({
      adminUserId,
      action: "PROJECT_ARCHIVE",
      targetType: "Project",
      targetId: projectId,
      result: "SUCCESS",
      details: {
        projectTitle: project.title,
        workspaceId: project.workspaceId,
        workspaceName: project.workspace.name,
        reason: reason.trim(),
      },
      ipAddress: context?.ip,
      userAgent: context?.ua,
    });

    return updated;
  }

  /**
   * Desarquiva um projeto administrativamente.
   */
  static async unarchiveProject(
    adminUserId: string,
    projectId: string,
    context?: { ip?: string; ua?: string }
  ) {
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: { workspace: true },
    });

    if (!project) {
      throw new Error("Projeto não encontrado.");
    }

    if (!project.isArchived) {
      throw new Error("O projeto não se encontra arquivado.");
    }

    const updated = await db.project.update({
      where: { id: projectId },
      data: {
        isArchived: false,
        archivedAt: null,
      },
    });

    await AdminAuditService.logAction({
      adminUserId,
      action: "PROJECT_UNARCHIVE",
      targetType: "Project",
      targetId: projectId,
      result: "SUCCESS",
      details: {
        projectTitle: project.title,
        workspaceId: project.workspaceId,
        workspaceName: project.workspace.name,
      },
      ipAddress: context?.ip,
      userAgent: context?.ua,
    });

    return updated;
  }

  /**
   * Transfere um projeto para outro workspace (com validação de cotas do destino).
   */
  static async transferProject(
    adminUserId: string,
    projectId: string,
    targetWorkspaceId: string,
    reason: string,
    context?: { ip?: string; ua?: string }
  ) {
    if (!reason || reason.trim().length < 5) {
      throw new Error("Informe uma justificativa para a transferência administrativa do projeto.");
    }

    const project = await db.project.findUnique({
      where: { id: projectId },
      include: { workspace: true },
    });

    if (!project) {
      throw new Error("Projeto não encontrado.");
    }

    if (project.workspaceId === targetWorkspaceId) {
      throw new Error("O projeto já pertence ao workspace de destino informado.");
    }

    const targetWorkspace = await db.workspace.findUnique({
      where: { id: targetWorkspaceId },
    });

    if (!targetWorkspace) {
      throw new Error("Workspace de destino não encontrado.");
    }

    // Validar cota de projetos do workspace destino
    await EntitlementService.assertCanCreateProject(targetWorkspaceId);

    const oldWorkspaceName = project.workspace.name;

    const updated = await db.project.update({
      where: { id: projectId },
      data: {
        workspaceId: targetWorkspaceId,
      },
      include: {
        workspace: true,
      },
    });

    await AdminAuditService.logAction({
      adminUserId,
      action: "PROJECT_TRANSFER",
      targetType: "Project",
      targetId: projectId,
      result: "SUCCESS",
      details: {
        projectTitle: project.title,
        fromWorkspaceId: project.workspaceId,
        fromWorkspaceName: oldWorkspaceName,
        toWorkspaceId: targetWorkspaceId,
        toWorkspaceName: targetWorkspace.name,
        reason: reason.trim(),
      },
      ipAddress: context?.ip,
      userAgent: context?.ua,
    });

    return updated;
  }

  /**
   * Exclui um projeto administrativamente (com confirmação e auditoria).
   */
  static async deleteProject(
    adminUserId: string,
    projectId: string,
    reason: string,
    context?: { ip?: string; ua?: string }
  ) {
    if (!reason || reason.trim().length < 5) {
      throw new Error("É obrigatório fornecer justificativa formal para a exclusão do projeto.");
    }

    const project = await db.project.findUnique({
      where: { id: projectId },
      include: { workspace: true },
    });

    if (!project) {
      throw new Error("Projeto não encontrado.");
    }

    await db.project.delete({
      where: { id: projectId },
    });

    await AdminAuditService.logAction({
      adminUserId,
      action: "PROJECT_DELETE",
      targetType: "Project",
      targetId: projectId,
      result: "SUCCESS",
      details: {
        projectTitle: project.title,
        workspaceId: project.workspaceId,
        workspaceName: project.workspace.name,
        reason: reason.trim(),
      },
      ipAddress: context?.ip,
      userAgent: context?.ua,
    });

    return {
      success: true,
      deletedId: projectId,
      deletedProjectId: projectId,
      title: project.title,
    };
  }
}
