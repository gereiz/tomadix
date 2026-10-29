import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { ParameterService } from "@/modules/parameters/parameter.service";
import { ProjectParameterConfigService } from "@/modules/projects/project-parameter-config.service";
import { ParameterResolver } from "@/modules/parameters/parameter-resolver.service";
import { SceneService } from "@/modules/scenes/scene.service";

describe("Etapa 4: Integração de Formulários e Elementos Contextuais", () => {
  let workspaceId: string;
  let projectId: string;
  let characterId: string;
  let environmentId: string;
  let sceneId1: string;
  let sceneId2: string;

  beforeAll(async () => {
    // 1. Criar Workspace
    const ws = await db.workspace.create({
      data: {
        name: "Workspace Contextual Test V1",
        slug: `contextual-test-${Date.now()}`,
      },
    });
    workspaceId = ws.id;

    // 2. Garantir parâmetros cinematográficos
    await ProjectParameterConfigService.ensureCinematicParameters(workspaceId);

    // 3. Criar Projeto com configuração personalizada de parâmetros
    // Ativa apenas:
    // - CAMERA: formato_sensor_camera (GLOBAL)
    // - LIGHTING: estilo_iluminacao (GLOBAL)
    // - FRAMING: tipo_de_plano (SCENE)
    // - ART_ATMOSPHERE: textura_cenario_arquitetura (ENVIRONMENT)
    // - CONTINUITY: consistencia_rosto_figurino (CHARACTER)
    const proj = await db.project.create({
      data: {
        workspaceId,
        title: "Blade Runner Contextual V1",
        configuration: {
          parameterSettings: {
            enabledCategories: ["CAMERA", "LIGHTING", "FRAMING", "ART_ATMOSPHERE", "CONTINUITY"],
            enabledParameterKeys: [
              "formato_sensor_camera",
              "estilo_iluminacao",
              "tipo_de_plano",
              "textura_cenario_arquitetura",
              "consistencia_rosto_figurino",
            ],
          },
        },
      },
    });
    projectId = proj.id;

    // 4. Salvar valor padrão do projeto para estilo_iluminacao = "neon_cyberpunk"
    const defLighting = await db.parameterDefinition.findFirst({
      where: { workspaceId, key: "estilo_iluminacao" },
    });
    if (defLighting) {
      await ParameterService.saveValues(projectId, workspaceId, [
        {
          parameterDefinitionId: defLighting.id,
          targetType: "PROJECT",
          targetId: null,
          value: "neon_cyberpunk",
        },
      ]);
    }

    // 5. Criar Personagem com atributo de consistência
    const char = await db.character.create({
      data: {
        projectId,
        name: "Detetive K",
        description: "Protagonista investigativo.",
        attributes: {
          visualIdentity: "Sobretudo escuro, gola alta, cicatriz fina",
          apparentAge: "35 anos",
        },
      },
    });
    characterId = char.id;

    // 6. Criar Ambiente
    const env = await db.environment.create({
      data: {
        projectId,
        name: "Beco Chuvoso de Neo-Tokyo",
        description: "Rua estreita de concreto com néon refletido no chão molhado.",
        attributes: {
          lighting: "Luzes de néon azul e magenta",
          weatherAndAtmosphere: "Chuva ácida intermitente",
        },
      },
    });
    environmentId = env.id;

    // 7. Criar Cena 1
    const s1 = await db.scene.create({
      data: {
        projectId,
        title: "Cena 1 - O Encontro no Beco",
        order: 1,
        description: "K caminha pelo beco sob a chuva.",
        configuration: {
          framing: "Plano Geral",
          lighting: "Neon",
        },
        characters: {
          create: [{ characterId: char.id }],
        },
        environments: {
          create: [{ environmentId: env.id }],
        },
      },
    });
    sceneId1 = s1.id;

    // 8. Criar Cena 2 (Sequência)
    const s2 = await db.scene.create({
      data: {
        projectId,
        title: "Cena 2 - Confronto Próximo",
        order: 2,
        description: "K encara a figura misteriosa em primeiro plano.",
        configuration: {
          framing: "Close-Up",
          lighting: "Neon",
        },
        characters: {
          create: [{ characterId: char.id }],
        },
        environments: {
          create: [{ environmentId: env.id }],
        },
      },
    });
    sceneId2 = s2.id;
  });

  afterAll(async () => {
    if (workspaceId) {
      await db.workspace.delete({ where: { id: workspaceId } }).catch(() => {});
    }
  });

  it("1. Formulário de Personagem: só deve receber parâmetros de CHARACTER e GLOBAL habilitados no projeto", async () => {
    const resolution = await ParameterService.resolveForProject(projectId, workspaceId, {
      type: "CHARACTER",
      id: characterId,
    });

    const detailKeys = resolution.details.map((d) => d.key);

    // Deve conter consistencia_rosto_figurino (escopo CHARACTER)
    expect(detailKeys).toContain("consistencia_rosto_figurino");
    // Deve conter parâmetros GLOBAL habilitados (formato_sensor_camera, estilo_iluminacao)
    expect(detailKeys).toContain("formato_sensor_camera");
    expect(detailKeys).toContain("estilo_iluminacao");

    // NÃO DEVE conter parâmetros de SCENE nem ENVIRONMENT (ex: tipo_de_plano, textura_cenario_arquitetura)
    expect(detailKeys).not.toContain("tipo_de_plano");
    expect(detailKeys).not.toContain("textura_cenario_arquitetura");

    // NÃO DEVE conter parâmetros desativados no projeto (ex: movimento_camera, distancia_focal_lente)
    expect(detailKeys).not.toContain("movimento_camera");
    expect(detailKeys).not.toContain("distancia_focal_lente");
  });

  it("2. Formulário de Ambiente: só deve receber parâmetros de ENVIRONMENT e GLOBAL habilitados no projeto", async () => {
    const resolution = await ParameterService.resolveForProject(projectId, workspaceId, {
      type: "ENVIRONMENT",
      id: environmentId,
    });

    const detailKeys = resolution.details.map((d) => d.key);

    // Deve conter textura_cenario_arquitetura (ENVIRONMENT)
    expect(detailKeys).toContain("textura_cenario_arquitetura");
    // Deve conter parâmetros GLOBAL habilitados
    expect(detailKeys).toContain("formato_sensor_camera");
    expect(detailKeys).toContain("estilo_iluminacao");

    // NÃO DEVE conter parâmetros exclusivos de CHARACTER (consistencia_rosto_figurino) nem SCENE
    expect(detailKeys).not.toContain("consistencia_rosto_figurino");
    expect(detailKeys).not.toContain("tipo_de_plano");
  });

  it("3. Formulário de Cena e Herança: herda o padrão do projeto mas permite sobrescrita explícita", async () => {
    // Verificar que a Cena 1 herda estilo_iluminacao = neon_cyberpunk do projeto
    const initialSceneRes = await ParameterService.resolveForProject(projectId, workspaceId, {
      type: "SCENE",
      id: sceneId1,
    });
    expect(initialSceneRes.resolved["estilo_iluminacao"]).toBe("neon_cyberpunk");
    const lightingDetail = initialSceneRes.details.find((d) => d.key === "estilo_iluminacao");
    expect(lightingDetail?.source).toBe("INHERITED");

    // Agora sobrescrever na Cena 1 com iluminação específica chiaroscuro_dramatico
    const defLighting = await db.parameterDefinition.findFirst({
      where: { workspaceId, key: "estilo_iluminacao" },
    });
    if (defLighting) {
      await ParameterService.saveValues(projectId, workspaceId, [
        {
          parameterDefinitionId: defLighting.id,
          targetType: "SCENE",
          targetId: sceneId1,
          value: "chiaroscuro_dramatico",
        },
      ]);
    }

    // Resolver novamente para a Cena 1
    const overriddenSceneRes = await ParameterService.resolveForProject(projectId, workspaceId, {
      type: "SCENE",
      id: sceneId1,
    });
    expect(overriddenSceneRes.resolved["estilo_iluminacao"]).toBe("chiaroscuro_dramatico");
    const overriddenDetail = overriddenSceneRes.details.find((d) => d.key === "estilo_iluminacao");
    expect(overriddenDetail?.source).toBe("EXPLICIT");

    // A Cena 2 continua herdando o padrão do projeto (neon_cyberpunk)
    const scene2Res = await ParameterService.resolveForProject(projectId, workspaceId, {
      type: "SCENE",
      id: sceneId2,
    });
    expect(scene2Res.resolved["estilo_iluminacao"]).toBe("neon_cyberpunk");
    expect(scene2Res.details.find((d) => d.key === "estilo_iluminacao")?.source).toBe("INHERITED");
  });

  it("4. Sequência e Continuidade: preserva encadeamento ordenado e vínculos de entidades", async () => {
    // Carregar relatório de continuidade entre as cenas da sequência
    const report = await SceneService.analyzeContinuity(projectId, workspaceId);

    expect(report.projectId).toBe(projectId);
    expect(report.analyzedScenesCount).toBe(2);
    expect(report.status).toBeDefined();

    // Validar ordenação cronológica da sequência de cenas no banco
    const sequenceScenes = await db.scene.findMany({
      where: { projectId },
      orderBy: { order: "asc" },
      include: {
        characters: { include: { character: true } },
        environments: { include: { environment: true } },
      },
    });

    expect(sequenceScenes.length).toBe(2);
    expect(sequenceScenes[0].order).toBe(1);
    expect(sequenceScenes[1].order).toBe(2);
    expect(sequenceScenes[0].characters[0].character.name).toBe("Detetive K");
    expect(sequenceScenes[0].environments[0].environment.name).toBe("Beco Chuvoso de Neo-Tokyo");
  });
});
