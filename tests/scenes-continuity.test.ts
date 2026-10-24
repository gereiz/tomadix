import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { ProjectService } from "@/modules/projects/project.service";
import { CharacterService } from "@/modules/characters/character.service";
import { EnvironmentService } from "@/modules/environments/environment.service";
import { SceneService } from "@/modules/scenes/scene.service";
import { continuityReportSchema } from "@/modules/scenes/scene.schema";

// Helper de resiliência para conexões remotas em ambiente de teste
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 500): Promise<T> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      if (i < retries - 1) {
        await new Promise((res) => setTimeout(res, delayMs));
      }
    }
  }
  throw lastError;
}

describe("SceneService & ContinuityService - Editor de Cenas e Continuidade", () => {
  let workspaceAId: string;
  let workspaceBId: string;
  let projectId: string;
  let char1Id: string;
  let env1Id: string;
  let env2Id: string;
  let scene1Id: string;
  let scene2Id: string;
  let scene3Id: string;

  beforeAll(async () => {
    // 1. Criar Workspace A e Projeto
    const wsA = await withRetry(() =>
      db.workspace.create({
        data: {
          name: "Produtora Cenas Alpha",
          slug: `scenes-alpha-${Date.now()}`,
        },
      })
    );
    workspaceAId = wsA.id;

    const project = await withRetry(() =>
      ProjectService.createProject(workspaceAId, {
        title: "Perseguição em Neo-São Paulo",
        description: "Thriller de ação cinematográfica noturna.",
        genre: "Ação / Neo-Noir",
        language: "pt-BR",
        configuration: {
          aspectRatio: "2.39:1",
          targetPlatform: "Google Flow",
        },
      })
    );
    projectId = project.id;

    // 2. Criar Workspace B para testes de isolamento multitenant
    const wsB = await withRetry(() =>
      db.workspace.create({
        data: {
          name: "Produtora Cenas Beta",
          slug: `scenes-beta-${Date.now()}`,
        },
      })
    );
    workspaceBId = wsB.id;

    // 3. Cadastrar personagem e ambientes para vínculos
    const char = await withRetry(() =>
      CharacterService.createCharacter(projectId, workspaceAId, {
        name: "Clara Vance",
        description: "Agente tática disfarçada.",
        attributes: {
          apparentAge: "32 anos",
          visualIdentity: "Traje tático escuro, olhar compenetrado",
        },
      })
    );
    char1Id = char.id;

    const env1 = await withRetry(() =>
      EnvironmentService.createEnvironment(projectId, workspaceAId, {
        name: "Hangar Abandonado",
        description: "Estrutura metálica industrial abandonada.",
        attributes: {
          locationContext: "Zona Portuária",
          lighting: "Noite escura, penumbra com feixes de lanterna",
        },
      })
    );
    env1Id = env1.id;

    const env2 = await withRetry(() =>
      EnvironmentService.createEnvironment(projectId, workspaceAId, {
        name: "Avenida Central Iluminada",
        description: "Avenida larga com tráfego intenso e outdoors luminosos.",
        attributes: {
          locationContext: "Centro Urbano",
          lighting: "Luzes de neon e postes viários intensos",
        },
      })
    );
    env2Id = env2.id;
  });

  afterAll(async () => {
    if (workspaceAId) {
      await db.workspace.delete({ where: { id: workspaceAId } }).catch(() => {});
    }
    if (workspaceBId) {
      await db.workspace.delete({ where: { id: workspaceBId } }).catch(() => {});
    }
  });

  describe("1. CRUD e Sequenciamento de Cenas", () => {
    it("Deve criar uma cena com configurações cinematográficas completas", async () => {
      const scene1 = await withRetry(() =>
        SceneService.createScene(projectId, workspaceAId, {
          title: "Infiltração no Hangar",
          description: "Clara entra furtivamente pelas vigas superiores do hangar.",
          durationSeconds: 4,
          characterIds: [char1Id],
          environmentIds: [env1Id],
          configuration: {
            mainAction: "Clara salta silenciosamente de uma viga para o piso de metal.",
            initialState: "Agachada nas vigas superiores",
            finalState: "Ferido no chão após queda brusca",
            characterMovement: "Avança da esquerda para o centro",
            framing: "Plano Médio (Medium Shot)",
            cameraMovement: "Dolly / Travelling (Tracking Shot)",
            lighting: "Noite escura, contrastes marcados",
            transitionIn: "Fade in suave",
            transitionOut: "Corte Direto (Cut)",
            ambientSound: "Gotejamento constante, vento uivando na cobertura",
            dialogue: {
              enabled: true,
              language: "pt-BR",
              lines: "CLARA: 'Cheguei ao ponto de extração.'",
            },
            music: {
              enabled: true,
              description: "Sintetizador tenso e minimalista em tom grave",
            },
          },
        })
      );

      expect(scene1).toBeDefined();
      expect(scene1?.id).toBeDefined();
      expect(scene1?.order).toBe(1);
      expect(scene1?.characters.length).toBe(1);
      expect(scene1?.environments.length).toBe(1);
      scene1Id = scene1!.id;
    });

    it("Deve atribuir automaticamente a próxima ordem sequencial para novas cenas", async () => {
      const scene2 = await withRetry(() =>
        SceneService.createScene(projectId, workspaceAId, {
          title: "Confronto e Fuga",
          description: "Confronto direto com seguranças.",
          durationSeconds: 6,
          characterIds: [char1Id],
          environmentIds: [env1Id],
          configuration: {
            mainAction: "Clara corre em pé disparando contra os alarmes.",
            initialState: "Em pé correndo em direção à saída",
            finalState: "Atravessando a porta blindada",
            characterMovement: "Movimento veloz para a direita",
            framing: "Plano Geral (Wide Shot)",
            cameraMovement: "Câmera na Mão (Handheld)",
            lighting: "Luz do dia solar brilhante", // Conflito proposital para teste de continuidade
            transitionIn: "Corte Direto (Cut)",
            dialogue: {
              enabled: true,
              language: "pt-BR",
              lines: "CLARA: 'Segurança comprometida!'",
            },
          },
        })
      );

      expect(scene2?.order).toBe(2);
      scene2Id = scene2!.id;

      const scene3 = await withRetry(() =>
        SceneService.createScene(projectId, workspaceAId, {
          title: "Perseguição na Avenida",
          description: "Fuga em alta velocidade pela avenida.",
          durationSeconds: 8,
          characterIds: [char1Id],
          environmentIds: [env2Id],
          configuration: {
            mainAction: "Clara assume o volante de uma motocicleta.",
            initialState: "Montando na moto",
            finalState: "Desaparecendo no tráfego",
            framing: "Plano Médio (Medium Shot)",
            cameraMovement: "Dolly / Travelling (Tracking Shot)",
            lighting: "Luzes de neon e postes viários intensos",
            transitionIn: "Corte Direto (Cut)",
          },
        })
      );

      expect(scene3?.order).toBe(3);
      scene3Id = scene3!.id;
    });

    it("Deve listar as cenas na ordem sequencial correta (1, 2, 3)", async () => {
      const list = await withRetry(() => SceneService.listScenes(projectId, workspaceAId));
      expect(list.length).toBe(3);
      expect(list[0].order).toBe(1);
      expect(list[1].order).toBe(2);
      expect(list[2].order).toBe(3);
      expect(list[0].id).toBe(scene1Id);
    });

    it("Deve atualizar metadados e vínculos da cena", async () => {
      const updated = await withRetry(() =>
        SceneService.updateScene(scene1Id, projectId, workspaceAId, {
          title: "Infiltração Tática Silenciosa",
          durationSeconds: 5,
        })
      );

      expect(updated?.title).toBe("Infiltração Tática Silenciosa");
      expect(updated?.durationSeconds).toBe(5);
    });

    it("Deve reordenar cenas atomicamente sem conflitos de índice", async () => {
      // Inverter ordem: cena 3 -> 1, cena 1 -> 2, cena 2 -> 3
      const reordered = await withRetry(() =>
        SceneService.reorderScenes(projectId, workspaceAId, [scene3Id, scene1Id, scene2Id])
      );

      expect(reordered[0].id).toBe(scene3Id);
      expect(reordered[0].order).toBe(1);
      expect(reordered[1].id).toBe(scene1Id);
      expect(reordered[1].order).toBe(2);
      expect(reordered[2].id).toBe(scene2Id);
      expect(reordered[2].order).toBe(3);

      // Restaurar a ordem natural (1, 2, 3)
      await withRetry(() =>
        SceneService.reorderScenes(projectId, workspaceAId, [scene1Id, scene2Id, scene3Id])
      );
    });

    it("Deve duplicar uma cena inserindo a cópia imediatamente na sequência", async () => {
      const duplicated = await withRetry(() =>
        SceneService.duplicateScene(scene1Id, projectId, workspaceAId, {
          title: "Infiltração Tática (Take 2)",
        })
      );

      expect(duplicated?.title).toBe("Infiltração Tática (Take 2)");
      expect(duplicated?.order).toBe(2);

      // As cenas subsequentes devem ter sido deslocadas
      const list = await withRetry(() => SceneService.listScenes(projectId, workspaceAId));
      expect(list.length).toBe(4);
      expect(list[2].id).toBe(scene2Id);
      expect(list[2].order).toBe(3);
      expect(list[3].id).toBe(scene3Id);
      expect(list[3].order).toBe(4);

      // Excluir a cena duplicada de teste
      await withRetry(() => SceneService.deleteScene(duplicated!.id, projectId, workspaceAId));
    });

    it("Deve excluir uma cena e recompactar as ordens subsequentes", async () => {
      // Cenas atuais: scene1 (1), scene2 (2), scene3 (3)
      // Excluir cena 2
      const delResult = await withRetry(() =>
        SceneService.deleteScene(scene2Id, projectId, workspaceAId)
      );
      expect(delResult.success).toBe(true);

      const listAfter = await withRetry(() => SceneService.listScenes(projectId, workspaceAId));
      expect(listAfter.length).toBe(2);
      expect(listAfter[0].id).toBe(scene1Id);
      expect(listAfter[0].order).toBe(1);
      expect(listAfter[1].id).toBe(scene3Id);
      expect(listAfter[1].order).toBe(2); // Recompactado de 3 para 2!
    });
  });

  describe("2. Análise de Continuidade Cinematográfica", () => {
    it("Deve detectar descontinuidades físicas, espaciais e de iluminação", async () => {
      // Criar cena com conflito físico e de iluminação deliberado
      const conflictScene = await withRetry(() =>
        SceneService.createScene(projectId, workspaceAId, {
          title: "Cena de Conflito de Continuidade",
          description: "Cena criada para disparar validação de continuidade.",
          order: 2,
          characterIds: [char1Id],
          environmentIds: [env1Id],
          configuration: {
            mainAction: "Ação contraditória sem transição.",
            initialState: "Em pé correndo ileso", // Cena 1 finalizou como 'Ferido no chão'
            finalState: "Deslocamento final",
            lighting: "Luz solar brilhante do meio-dia", // Cena 1 é 'Noite escura' no mesmo Hangar
            transitionIn: "Corte Direto (Cut)",
          },
        })
      );

      const report = await withRetry(() =>
        SceneService.analyzeContinuity(projectId, workspaceAId)
      );

      expect(report).toBeDefined();
      expect(report.analyzedScenesCount).toBeGreaterThanOrEqual(2);
      expect(report.warnings.length).toBeGreaterThan(0);

      // Validar contra o schema Zod
      const parseResult = continuityReportSchema.safeParse(report);
      expect(parseResult.success).toBe(true);

      // Deve ter detectado aviso de salto físico ou de iluminação
      const hasPhysicalOrLightingWarning = report.warnings.some(
        (w) => w.type === "action_continuity" || w.type === "lighting_continuity"
      );
      expect(hasPhysicalOrLightingWarning).toBe(true);

      // Limpar cena de conflito
      await withRetry(() => SceneService.deleteScene(conflictScene!.id, projectId, workspaceAId));
    });

    it("Deve garantir isolamento multitenant entre workspaces", async () => {
      await expect(
        SceneService.getSceneById(scene1Id, projectId, workspaceBId)
      ).rejects.toThrow("Projeto não encontrado ou acesso não permitido.");
    });
  });
});
