import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import {
  CreateSceneInput,
  UpdateSceneInput,
  DuplicateSceneInput,
  ContinuityReport,
} from "./scene.schema";
import { ContinuityService } from "./continuity.service";

export class SceneService {
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
   * Lista todas as cenas do projeto em ordem cronológica.
   */
  static async listScenes(projectId: string, workspaceId: string) {
    await this.assertProjectOwnership(projectId, workspaceId);

    return db.scene.findMany({
      where: { projectId },
      orderBy: { order: "asc" },
      include: {
        characters: {
          include: {
            character: {
              select: {
                id: true,
                name: true,
                description: true,
                attributes: true,
                isArchived: true,
              },
            },
          },
        },
        environments: {
          include: {
            environment: {
              select: {
                id: true,
                name: true,
                description: true,
                attributes: true,
                isArchived: true,
              },
            },
          },
        },
        _count: {
          select: {
            promptVersions: true,
          },
        },
      },
    });
  }

  /**
   * Obtém detalhes de uma cena por ID.
   */
  static async getSceneById(id: string, projectId: string, workspaceId: string) {
    await this.assertProjectOwnership(projectId, workspaceId);

    return db.scene.findFirst({
      where: { id, projectId },
      include: {
        characters: {
          include: {
            character: true,
          },
        },
        environments: {
          include: {
            environment: true,
          },
        },
      },
    });
  }

  /**
   * Cria uma nova cena e vincula personagens e ambientes.
   */
  static async createScene(projectId: string, workspaceId: string, input: CreateSceneInput) {
    await this.assertProjectOwnership(projectId, workspaceId);

    // Calcular próxima ordem se não for explicitamente informada
    let nextOrder = input.order;
    if (!nextOrder) {
      const maxOrderScene = await db.scene.findFirst({
        where: { projectId },
        orderBy: { order: "desc" },
        select: { order: true },
      });
      nextOrder = (maxOrderScene?.order ?? 0) + 1;
    }

    return db.$transaction(async (tx) => {
      // Se a ordem já existir, deslocar as posteriores para abrir espaço
      const existingAtOrder = await tx.scene.findFirst({
        where: { projectId, order: nextOrder },
      });

      if (existingAtOrder) {
        const scenesToShift = await tx.scene.findMany({
          where: { projectId, order: { gte: nextOrder } },
          orderBy: { order: "desc" },
          select: { id: true, order: true },
        });

        for (const s of scenesToShift) {
          await tx.scene.update({
            where: { id: s.id },
            data: { order: s.order + 1 },
          });
        }
      }

      // Criar a cena
      const scene = await tx.scene.create({
        data: {
          projectId,
          title: input.title,
          description: input.description ?? "",
          order: nextOrder,
          durationSeconds: input.durationSeconds ?? null,
          configuration: (input.configuration as Prisma.InputJsonValue) ?? {},
        },
      });

      // Vincular personagens
      if (input.characterIds && input.characterIds.length > 0) {
        await tx.sceneCharacter.createMany({
          data: input.characterIds.map((charId) => ({
            sceneId: scene.id,
            characterId: charId,
            configuration: {},
          })),
          skipDuplicates: true,
        });
      }

      // Vincular ambientes
      if (input.environmentIds && input.environmentIds.length > 0) {
        await tx.sceneEnvironment.createMany({
          data: input.environmentIds.map((envId) => ({
            sceneId: scene.id,
            environmentId: envId,
            configuration: {},
          })),
          skipDuplicates: true,
        });
      }

      return tx.scene.findUnique({
        where: { id: scene.id },
        include: {
          characters: { include: { character: true } },
          environments: { include: { environment: true } },
        },
      });
    });
  }

  /**
   * Atualiza uma cena existente.
   */
  static async updateScene(
    id: string,
    projectId: string,
    workspaceId: string,
    input: UpdateSceneInput
  ) {
    await this.assertProjectOwnership(projectId, workspaceId);

    const existing = await db.scene.findFirst({ where: { id, projectId } });
    if (!existing) throw new Error("Cena não encontrada.");

    return db.$transaction(async (tx) => {
      const updateData: Prisma.SceneUpdateInput = {};

      if (input.title !== undefined) updateData.title = input.title;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.durationSeconds !== undefined) updateData.durationSeconds = input.durationSeconds;
      if (input.configuration !== undefined) {
        updateData.configuration = input.configuration as Prisma.InputJsonValue;
      }

      // Atualizar dados cadastrais da cena
      await tx.scene.update({
        where: { id },
        data: updateData,
      });

      // Sincronizar vínculos de personagens, se fornecidos
      if (input.characterIds !== undefined) {
        await tx.sceneCharacter.deleteMany({ where: { sceneId: id } });
        if (input.characterIds.length > 0) {
          await tx.sceneCharacter.createMany({
            data: input.characterIds.map((charId) => ({
              sceneId: id,
              characterId: charId,
              configuration: {},
            })),
            skipDuplicates: true,
          });
        }
      }

      // Sincronizar vínculos de ambientes, se fornecidos
      if (input.environmentIds !== undefined) {
        await tx.sceneEnvironment.deleteMany({ where: { sceneId: id } });
        if (input.environmentIds.length > 0) {
          await tx.sceneEnvironment.createMany({
            data: input.environmentIds.map((envId) => ({
              sceneId: id,
              environmentId: envId,
              configuration: {},
            })),
            skipDuplicates: true,
          });
        }
      }

      return tx.scene.findUnique({
        where: { id },
        include: {
          characters: { include: { character: true } },
          environments: { include: { environment: true } },
        },
      });
    });
  }

  /**
   * Reordena as cenas do projeto garantindo integridade transacional sem conflitos de índice unique.
   */
  static async reorderScenes(projectId: string, workspaceId: string, sceneIds: string[]) {
    await this.assertProjectOwnership(projectId, workspaceId);

    return db.$transaction(async (tx) => {
      // Fase 1: Atribuir valores negativos temporários para liberar restrições unique
      for (let i = 0; i < sceneIds.length; i++) {
        await tx.scene.updateMany({
          where: { id: sceneIds[i], projectId },
          data: { order: -(i + 1) },
        });
      }

      // Fase 2: Atribuir a ordem sequencial definitiva (1, 2, 3...)
      for (let i = 0; i < sceneIds.length; i++) {
        await tx.scene.updateMany({
          where: { id: sceneIds[i], projectId },
          data: { order: i + 1 },
        });
      }

      return tx.scene.findMany({
        where: { projectId },
        orderBy: { order: "asc" },
        include: {
          characters: { include: { character: true } },
          environments: { include: { environment: true } },
        },
      });
    });
  }

  /**
   * Duplica uma cena existente, posicionando a cópia imediatamente após a original.
   */
  static async duplicateScene(
    id: string,
    projectId: string,
    workspaceId: string,
    input?: DuplicateSceneInput | string
  ) {
    await this.assertProjectOwnership(projectId, workspaceId);

    const original = await db.scene.findFirst({
      where: { id, projectId },
      include: {
        characters: true,
        environments: true,
      },
    });

    if (!original) throw new Error("Cena original não encontrada.");

    const rawTitle = typeof input === "object" ? input?.title : input;
    const newTitle = rawTitle && rawTitle.trim() !== ""
      ? rawTitle.trim()
      : `${original.title} (Cópia)`;

    const targetOrder = original.order + 1;

    return db.$transaction(async (tx) => {
      // Deslocar cenas subsequentes em ordem decrescente para evitar colisão de índice único
      const scenesToShift = await tx.scene.findMany({
        where: { projectId, order: { gte: targetOrder } },
        orderBy: { order: "desc" },
        select: { id: true, order: true },
      });

      for (const s of scenesToShift) {
        await tx.scene.update({
          where: { id: s.id },
          data: { order: s.order + 1 },
        });
      }

      // Criar cópia
      const duplicated = await tx.scene.create({
        data: {
          projectId,
          title: newTitle,
          description: original.description,
          order: targetOrder,
          durationSeconds: original.durationSeconds,
          configuration: original.configuration as Prisma.InputJsonValue,
        },
      });

      // Duplicar vínculos de personagens
      if (original.characters.length > 0) {
        await tx.sceneCharacter.createMany({
          data: original.characters.map((sc) => ({
            sceneId: duplicated.id,
            characterId: sc.characterId,
            configuration: sc.configuration as Prisma.InputJsonValue,
          })),
        });
      }

      // Duplicar vínculos de ambientes
      if (original.environments.length > 0) {
        await tx.sceneEnvironment.createMany({
          data: original.environments.map((se) => ({
            sceneId: duplicated.id,
            environmentId: se.environmentId,
            configuration: se.configuration as Prisma.InputJsonValue,
          })),
        });
      }

      return tx.scene.findUnique({
        where: { id: duplicated.id },
        include: {
          characters: { include: { character: true } },
          environments: { include: { environment: true } },
        },
      });
    });
  }

  /**
   * Exclui uma cena e recompacta os números de ordem das restantes.
   */
  static async deleteScene(id: string, projectId: string, workspaceId: string) {
    await this.assertProjectOwnership(projectId, workspaceId);

    const scene = await db.scene.findFirst({ where: { id, projectId } });
    if (!scene) throw new Error("Cena não encontrada.");

    return db.$transaction(async (tx) => {
      // 1. Remover vínculos
      await tx.sceneCharacter.deleteMany({ where: { sceneId: id } });
      await tx.sceneEnvironment.deleteMany({ where: { sceneId: id } });

      // 2. Excluir cena
      const deleted = await tx.scene.delete({ where: { id } });

      // 3. Compactar ordens subsequentes para evitar buracos na sequência (em ordem ascendente para respeitar @@unique([projectId, order]))
      const subsequentScenes = await tx.scene.findMany({
        where: { projectId, order: { gt: scene.order } },
        orderBy: { order: "asc" },
        select: { id: true, order: true },
      });
      for (const s of subsequentScenes) {
        await tx.scene.update({
          where: { id: s.id },
          data: { order: s.order - 1 },
        });
      }


      return {
        success: true,
        ...deleted,
      };
    });
  }

  /**
   * Executa a análise de continuidade sequencial do projeto.
   */
  static async analyzeContinuity(projectId: string, workspaceId: string): Promise<ContinuityReport> {
    const project = await this.assertProjectOwnership(projectId, workspaceId);

    const scenes = await db.scene.findMany({
      where: { projectId },
      orderBy: { order: "asc" },
      include: {
        characters: {
          include: {
            character: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        environments: {
          include: {
            environment: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return ContinuityService.analyze(projectId, scenes as any, project.language);
  }
}
