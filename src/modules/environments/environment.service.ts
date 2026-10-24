import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import {
  CreateEnvironmentInput,
  UpdateEnvironmentInput,
  EnvironmentPromptOutput,
} from "./environment.schema";

export class EnvironmentService {
  /**
   * Valida se o projeto pertence ao workspace do usuário.
   */
  private static async assertProjectOwnership(projectId: string, workspaceId: string) {
    const project = await db.project.findFirst({
      where: { id: projectId, workspaceId },
    });
    if (!project) {
      throw new Error("Projeto não encontrado ou acesso não permitido.");
    }
    return project;
  }

  /**
   * Lista ambientes do projeto com busca e filtro por estado.
   */
  static async listEnvironments(
    projectId: string,
    workspaceId: string,
    filters?: { search?: string; status?: "active" | "archived" | "all" }
  ) {
    await this.assertProjectOwnership(projectId, workspaceId);

    const where: Prisma.EnvironmentWhereInput = {
      projectId,
    };

    if (filters?.status === "active") {
      where.isArchived = false;
    } else if (filters?.status === "archived") {
      where.isArchived = true;
    }

    if (filters?.search && filters.search.trim() !== "") {
      const term = filters.search.trim();
      where.OR = [
        { name: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
      ];
    }

    return db.environment.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      include: {
        _count: {
          select: {
            sceneLinks: true,
          },
        },
      },
    });
  }

  /**
   * Obtém detalhes de um ambiente.
   */
  static async getEnvironmentById(id: string, projectId: string, workspaceId: string) {
    await this.assertProjectOwnership(projectId, workspaceId);

    return db.environment.findFirst({
      where: { id, projectId },
      include: {
        sceneLinks: {
          include: {
            scene: {
              select: {
                id: true,
                title: true,
                order: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Cria um novo ambiente cinematográfico no projeto.
   */
  static async createEnvironment(
    projectId: string,
    workspaceId: string,
    input: CreateEnvironmentInput
  ) {
    await this.assertProjectOwnership(projectId, workspaceId);

    return db.environment.create({
      data: {
        projectId,
        name: input.name,
        description: input.description ?? "",
        attributes: (input.attributes || {}) as Prisma.InputJsonValue,
        isArchived: false,
      },
      include: {
        _count: {
          select: { sceneLinks: true },
        },
      },
    });
  }

  /**
   * Atualiza dados de um ambiente.
   */
  static async updateEnvironment(
    id: string,
    projectId: string,
    workspaceId: string,
    input: UpdateEnvironmentInput
  ) {
    await this.assertProjectOwnership(projectId, workspaceId);

    const existing = await db.environment.findFirst({ where: { id, projectId } });
    if (!existing) throw new Error("Ambiente não encontrado.");

    const data: Prisma.EnvironmentUpdateInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.description !== undefined) data.description = input.description;
    if (input.attributes !== undefined) {
      data.attributes = input.attributes as Prisma.InputJsonValue;
    }
    if (input.isArchived !== undefined) {
      data.isArchived = input.isArchived;
      data.archivedAt = input.isArchived ? new Date() : null;
    }

    return db.environment.update({
      where: { id },
      data,
      include: {
        _count: { select: { sceneLinks: true } },
      },
    });
  }

  /**
   * Duplica um ambiente.
   */
  static async duplicateEnvironment(
    id: string,
    projectId: string,
    workspaceId: string,
    customName?: string | { name?: string }
  ) {
    await this.assertProjectOwnership(projectId, workspaceId);

    const original = await db.environment.findFirst({ where: { id, projectId } });
    if (!original) throw new Error("Ambiente original não encontrado.");

    const rawName = typeof customName === "object" ? customName?.name : customName;
    const newName = rawName && rawName.trim() !== ""
      ? rawName.trim()
      : `${original.name} (Cópia)`;

    return db.environment.create({
      data: {
        projectId,
        name: newName,
        description: original.description,
        attributes: original.attributes as Prisma.InputJsonValue,
        isArchived: false,
      },
      include: {
        _count: { select: { sceneLinks: true } },
      },
    });
  }

  /**
   * Arquiva ambiente.
   */
  static async archiveEnvironment(id: string, projectId: string, workspaceId: string) {
    await this.assertProjectOwnership(projectId, workspaceId);

    return db.environment.update({
      where: { id },
      data: {
        isArchived: true,
        archivedAt: new Date(),
      },
    });
  }

  /**
   * Restaura ambiente arquivado.
   */
  static async restoreEnvironment(id: string, projectId: string, workspaceId: string) {
    await this.assertProjectOwnership(projectId, workspaceId);

    return db.environment.update({
      where: { id },
      data: {
        isArchived: false,
        archivedAt: null,
      },
    });
  }

  /**
   * Exclui ambiente.
   */
  static async deleteEnvironment(id: string, projectId: string, workspaceId: string) {
    await this.assertProjectOwnership(projectId, workspaceId);

    // Remove referências de cenas
    await db.sceneEnvironment.deleteMany({
      where: { environmentId: id },
    });

    const deleted = await db.environment.delete({
      where: { id },
    });

    return {
      success: true,
      ...deleted,
    };
  }

  /**
   * Compila o perfil visual permanente do ambiente em um prompt-base estruturado em JSON.
   */
  static async generatePromptJson(
    id: string,
    projectId: string,
    workspaceId: string
  ): Promise<EnvironmentPromptOutput> {
    const env = await this.getEnvironmentById(id, projectId, workspaceId);
    if (!env) throw new Error("Ambiente não encontrado.");

    const attrs = (env.attributes as any) || {};

    const compiledParts = [
      `Cinematic environment setting: "${env.name}".`,
      attrs.locationContext ? `Location & Context: ${attrs.locationContext}.` : null,
      attrs.architecture ? `Architecture & Layout: ${attrs.architecture}.` : null,
      attrs.propsAndElements ? `Set Elements & Props: ${attrs.propsAndElements}.` : null,
      attrs.lighting ? `Primary Lighting: ${attrs.lighting}.` : null,
      attrs.colorPalette ? `Color Palette: ${attrs.colorPalette}.` : null,
      attrs.weatherAndAtmosphere ? `Weather & Atmosphere: ${attrs.weatherAndAtmosphere}.` : null,
      attrs.historicalEra ? `Era: ${attrs.historicalEra}.` : null,
      attrs.visualStyle ? `Style: ${attrs.visualStyle}.` : null,
    ]
      .filter(Boolean)
      .join(" ");

    return {
      schemaVersion: "1.0",
      type: "environment_prompt",
      environmentId: env.id,
      name: env.name,
      summary: env.description || attrs.locationContext || "Cenário cinematográfico consistente.",
      permanentFeatures: {
        location: attrs.locationContext || "",
        architecture: attrs.architecture || "",
        props: attrs.propsAndElements || "",
        lighting: attrs.lighting || "",
        palette: attrs.colorPalette || "",
        atmosphere: attrs.weatherAndAtmosphere || "",
        era: attrs.historicalEra || "",
        style: attrs.visualStyle || "",
      },
      compiledPromptText: attrs.basePrompt?.trim() || compiledParts,
    };
  }
}
