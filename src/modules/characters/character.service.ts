import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import {
  CreateCharacterInput,
  UpdateCharacterInput,
  CharacterPromptOutput,
} from "./character.schema";

export class CharacterService {
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
   * Lista personagens do projeto com busca e filtro por estado ativo/arquivado.
   */
  static async listCharacters(
    projectId: string,
    workspaceId: string,
    filters?: { search?: string; status?: "active" | "archived" | "all" }
  ) {
    await this.assertProjectOwnership(projectId, workspaceId);

    const where: Prisma.CharacterWhereInput = {
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

    return db.character.findMany({
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
   * Obtém detalhes de um personagem.
   */
  static async getCharacterById(id: string, projectId: string, workspaceId: string) {
    await this.assertProjectOwnership(projectId, workspaceId);

    return db.character.findFirst({
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
   * Cria um novo personagem cinematográfico no projeto.
   */
  static async createCharacter(
    projectId: string,
    workspaceId: string,
    input: CreateCharacterInput
  ) {
    await this.assertProjectOwnership(projectId, workspaceId);

    return db.character.create({
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
   * Atualiza dados de um personagem.
   */
  static async updateCharacter(
    id: string,
    projectId: string,
    workspaceId: string,
    input: UpdateCharacterInput
  ) {
    await this.assertProjectOwnership(projectId, workspaceId);

    const existing = await db.character.findFirst({ where: { id, projectId } });
    if (!existing) throw new Error("Personagem não encontrado.");

    const data: Prisma.CharacterUpdateInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.description !== undefined) data.description = input.description;
    if (input.attributes !== undefined) {
      data.attributes = input.attributes as Prisma.InputJsonValue;
    }
    if (input.isArchived !== undefined) {
      data.isArchived = input.isArchived;
      data.archivedAt = input.isArchived ? new Date() : null;
    }

    return db.character.update({
      where: { id },
      data,
      include: {
        _count: { select: { sceneLinks: true } },
      },
    });
  }

  /**
   * Duplica um personagem.
   */
  static async duplicateCharacter(
    id: string,
    projectId: string,
    workspaceId: string,
    customName?: string | { name?: string }
  ) {
    await this.assertProjectOwnership(projectId, workspaceId);

    const original = await db.character.findFirst({ where: { id, projectId } });
    if (!original) throw new Error("Personagem original não encontrado.");

    const rawName = typeof customName === "object" ? customName?.name : customName;
    const newName = rawName && rawName.trim() !== ""
      ? rawName.trim()
      : `${original.name} (Cópia)`;

    return db.character.create({
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
   * Alterna arquivamento do personagem.
   */
  static async archiveCharacter(id: string, projectId: string, workspaceId: string) {
    await this.assertProjectOwnership(projectId, workspaceId);

    return db.character.update({
      where: { id },
      data: {
        isArchived: true,
        archivedAt: new Date(),
      },
    });
  }

  /**
   * Restaura personagem arquivado.
   */
  static async restoreCharacter(id: string, projectId: string, workspaceId: string) {
    await this.assertProjectOwnership(projectId, workspaceId);

    return db.character.update({
      where: { id },
      data: {
        isArchived: false,
        archivedAt: null,
      },
    });
  }

  /**
   * Exclui personagem.
   */
  static async deleteCharacter(id: string, projectId: string, workspaceId: string) {
    await this.assertProjectOwnership(projectId, workspaceId);

    // Remove referências de cena
    await db.sceneCharacter.deleteMany({
      where: { characterId: id },
    });

    const deleted = await db.character.delete({
      where: { id },
    });

    return {
      success: true,
      ...deleted,
    };
  }

  /**
   * Compila o perfil visual permanente do personagem em um prompt-base estruturado em JSON.
   */
  static async generatePromptJson(
    id: string,
    projectId: string,
    workspaceId: string
  ): Promise<CharacterPromptOutput> {
    const character = await this.getCharacterById(id, projectId, workspaceId);
    if (!character) throw new Error("Personagem não encontrado.");

    const attrs = (character.attributes as any) || {};

    const restrictionsList = attrs.restrictions
      ? attrs.restrictions.split("\n").map((r: string) => r.trim()).filter(Boolean)
      : [];

    const compiledPromptParts = [
      `Cinematic portrait and character bible for "${character.name}".`,
      attrs.visualIdentity ? `Visual Identity: ${attrs.visualIdentity}.` : null,
      attrs.physicalCharacteristics ? `Physical Traits: ${attrs.physicalCharacteristics}.` : null,
      attrs.apparentAge ? `Apparent Age: ${attrs.apparentAge}.` : null,
      attrs.hairAndFace ? `Face & Hair: ${attrs.hairAndFace}.` : null,
      attrs.costumeAndAccessories ? `Permanent Wardrobe: ${attrs.costumeAndAccessories}.` : null,
      attrs.personalityAndBehavior ? `Persona: ${attrs.personalityAndBehavior}.` : null,
    ]
      .filter(Boolean)
      .join(" ");

    return {
      schemaVersion: "1.0",
      type: "character_prompt",
      characterId: character.id,
      name: character.name,
      visualSummary: character.description || attrs.visualIdentity || "Personagem cinematográfico consistente.",
      permanentFeatures: {
        identity: attrs.visualIdentity || "",
        physical: attrs.physicalCharacteristics || "",
        hairAndFace: attrs.hairAndFace || "",
        costume: attrs.costumeAndAccessories || "",
        personality: attrs.personalityAndBehavior || "",
        restrictions: restrictionsList,
      },
      compiledPromptText: attrs.basePrompt?.trim() || compiledPromptParts,
    };
  }
}
