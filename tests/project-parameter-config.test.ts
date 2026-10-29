import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import {
  ProjectParameterConfigService,
  CINEMATIC_CATEGORIES,
} from "@/modules/projects/project-parameter-config.service";
import { ParameterResolver } from "@/modules/parameters/parameter-resolver.service";

describe("Etapa 3: Configuração de Parâmetros Cinematográficos por Projeto", () => {
  let workspaceId: string;
  let projectId: string;

  beforeAll(async () => {
    const ws = await db.workspace.create({
      data: {
        name: "Workspace Cine Test V1",
        slug: `cine-test-${Date.now()}`,
      },
    });
    workspaceId = ws.id;

    const proj = await db.project.create({
      data: {
        workspaceId,
        title: "Filme Sci-Fi V1",
      },
    });
    projectId = proj.id;
  });

  afterAll(async () => {
    if (workspaceId) {
      await db.workspace.delete({ where: { id: workspaceId } }).catch(() => {});
    }
  });

  it("1. Deve sincronizar e listar as 9 categorias cinematográficas obrigatórias", async () => {
    const data = await ProjectParameterConfigService.getProjectParameterSettings(
      projectId,
      workspaceId
    );

    expect(data.categories.length).toBe(9);

    const categoryIds = data.categories.map((c) => c.id);
    expect(categoryIds).toContain("CAMERA");
    expect(categoryIds).toContain("LENS");
    expect(categoryIds).toContain("FRAMING");
    expect(categoryIds).toContain("MOVEMENT");
    expect(categoryIds).toContain("LIGHTING");
    expect(categoryIds).toContain("AESTHETICS");
    expect(categoryIds).toContain("ART_ATMOSPHERE");
    expect(categoryIds).toContain("AUDIO");
    expect(categoryIds).toContain("CONTINUITY");

    expect(data.totalParameters).toBeGreaterThanOrEqual(20);
    expect(data.enabledParametersCount).toBeGreaterThanOrEqual(20);
  });

  it("2. Deve permitir desativar categorias e parâmetros individuais com persistência no projeto", async () => {
    // Desativar AUDIO e ART_ATMOSPHERE, mantendo as demais
    const enabledCategories = [
      "CAMERA",
      "LENS",
      "FRAMING",
      "MOVEMENT",
      "LIGHTING",
      "AESTHETICS",
      "CONTINUITY",
    ] as any[];

    // Selecionar apenas alguns parâmetros específicos de CAMERA e LIGHTING
    const enabledParameterKeys = [
      "formato_sensor_camera",
      "estilo_iluminacao",
      "tipo_de_plano",
      "estilo_cinematografico_visual",
    ];

    const updated = await ProjectParameterConfigService.updateProjectParameterSettings(
      projectId,
      workspaceId,
      {
        enabledCategories,
        enabledParameterKeys,
        defaultValues: {
          formato_sensor_camera: "anamorfico_65mm",
          estilo_iluminacao: "neon_cyberpunk",
        },
      }
    );

    expect(updated.enabledParameterKeys).toEqual(enabledParameterKeys);
    expect(updated.enabledParametersCount).toBe(4);

    // Verificar se a categoria AUDIO está desativada
    const audioCat = updated.categories.find((c) => c.id === "AUDIO");
    expect(audioCat?.isEnabled).toBe(false);
    expect(audioCat?.enabledCount).toBe(0);

    // Verificar se o valor padrão foi gravado
    const cameraParam = updated.categories
      .find((c) => c.id === "CAMERA")
      ?.parameters.find((p) => p.key === "formato_sensor_camera");
    expect(cameraParam?.currentProjectValue).toBe("anamorfico_65mm");
  });

  it("3. Resolução Efetiva: Submódulos (Personagem, Cena) só enxergam parâmetros habilitados no projeto", async () => {
    // Configurar apenas 2 parâmetros ativos no projeto: "tipo_de_plano" (SCENE) e "formato_sensor_camera" (GLOBAL)
    await ProjectParameterConfigService.updateProjectParameterSettings(
      projectId,
      workspaceId,
      {
        enabledCategories: ["CAMERA", "FRAMING"],
        enabledParameterKeys: ["tipo_de_plano", "formato_sensor_camera"],
        defaultValues: {
          formato_sensor_camera: "full_frame_35mm",
        },
      }
    );

    // Resolver para o contexto de uma CENA
    const sceneResolution = await ProjectParameterConfigService.getEffectiveProjectParameters(
      projectId,
      workspaceId,
      { type: "SCENE", id: "scene_123" }
    );

    const resolvedKeys = Object.keys(sceneResolution.resolved);
    // Deve incluir tipo_de_plano e formato_sensor_camera (herdado de global), mas NÃO deve incluir movimento_camera nem angulo_camera_posicao
    expect(resolvedKeys).toContain("tipo_de_plano");
    expect(resolvedKeys).toContain("formato_sensor_camera");
    expect(resolvedKeys).not.toContain("movimento_camera");
    expect(resolvedKeys).not.toContain("angulo_camera_posicao");
  });

  it("4. Resolução de Herança: Valor explícito do elemento tem precedência sobre o padrão do projeto", () => {
    const mockDefs: any[] = [
      {
        id: "def_camera",
        key: "formato_sensor_camera",
        label: "Sensor",
        type: "SELECT",
        scope: "GLOBAL",
        order: 1,
        enabled: true,
        defaultValue: "super_35",
      },
    ];

    // Valor padrão do projeto é anamorfico_65mm
    // Mas a cena específica tem valor explícito imax_70mm
    const mockValues: any[] = [
      {
        parameterDefinitionId: "def_camera",
        targetType: "PROJECT",
        targetId: null,
        value: "anamorfico_65mm",
      },
      {
        parameterDefinitionId: "def_camera",
        targetType: "SCENE",
        targetId: "scene_hero",
        value: "imax_70mm",
      },
    ];

    const result = ParameterResolver.resolveForTarget(mockDefs, mockValues, {
      type: "SCENE",
      id: "scene_hero",
    });

    expect(result.resolved["formato_sensor_camera"]).toBe("imax_70mm");
    expect(result.details[0].source).toBe("EXPLICIT");
  });
});
