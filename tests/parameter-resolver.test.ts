import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { ParameterResolver } from "@/modules/parameters/parameter-resolver.service";
import { ParameterService } from "@/modules/parameters/parameter.service";
import { ParameterDefinition, ParameterValue } from "@prisma/client";

describe("Sistema de Parâmetros Dinâmicos e Motor de Resolução", () => {
  let workspaceId: string;
  let projectId: string;

  beforeAll(async () => {
    const ws = await db.workspace.create({
      data: {
        name: "Estúdio Parâmetros Test",
        slug: `param-test-${Date.now()}`,
      },
    });
    workspaceId = ws.id;

    const proj = await db.project.create({
      data: {
        workspaceId,
        title: "Projeto de Teste de Parâmetros",
      },
    });
    projectId = proj.id;
  });

  afterAll(async () => {
    if (workspaceId) {
      await db.workspace.delete({ where: { id: workspaceId } }).catch(() => {});
    }
  });

  it("1. Precedência de Resolução: Explícito > Herança Global > Padrão > Vazio", () => {
    const mockDefinitions: any[] = [
      {
        id: "def_explicit",
        workspaceId,
        key: "lente_focal",
        label: "Lente Focal",
        description: null,
        type: "SELECT",
        scope: "CHARACTER",
        required: true,
        defaultValue: "50mm",
        options: [
          { value: "35mm", label: "35mm" },
          { value: "50mm", label: "50mm" },
          { value: "85mm", label: "85mm" },
        ],
        validationRules: null,
        visibilityRules: null,
        promptMapping: null,
        order: 1,
        version: 1,
        isSystem: false,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "def_inherited",
        workspaceId,
        key: "granulacao",
        label: "Granulação",
        description: null,
        type: "RANGE",
        scope: "GLOBAL",
        required: false,
        defaultValue: 10,
        options: null,
        validationRules: { min: 0, max: 100 },
        visibilityRules: null,
        promptMapping: null,
        order: 2,
        version: 1,
        isSystem: false,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "def_default",
        workspaceId,
        key: "iluminacao_chave",
        label: "Iluminação Chave",
        description: null,
        type: "TEXT",
        scope: "CHARACTER",
        required: false,
        defaultValue: "Softbox Difuso",
        options: null,
        validationRules: null,
        visibilityRules: null,
        promptMapping: null,
        order: 3,
        version: 1,
        isSystem: false,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "def_optional_empty",
        workspaceId,
        key: "notas_adicionais",
        label: "Notas Adicionais",
        description: null,
        type: "TEXTAREA",
        scope: "CHARACTER",
        required: false,
        defaultValue: null,
        options: null,
        validationRules: null,
        visibilityRules: null,
        promptMapping: null,
        order: 4,
        version: 1,
        isSystem: false,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const mockValues: ParameterValue[] = [
      // Valor explícito para o personagem 1
      {
        id: "val_1",
        projectId,
        parameterDefinitionId: "def_explicit",
        targetType: "CHARACTER",
        targetId: "char_1",
        value: "85mm",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // Valor global para o projeto
      {
        id: "val_2",
        projectId,
        parameterDefinitionId: "def_inherited",
        targetType: "PROJECT",
        targetId: null,
        value: 45,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const result = ParameterResolver.resolveForTarget(mockDefinitions, mockValues, {
      type: "CHARACTER",
      id: "char_1",
    });

    expect(result.missingRequired.length).toBe(0);

    // 1. Explícito prevaleceu sobre o default "50mm"
    expect(result.resolved["lente_focal"]).toBe("85mm");
    expect(result.details.find((d) => d.key === "lente_focal")?.source).toBe("EXPLICIT");

    // 2. Herança do escopo GLOBAL prevaleceu sobre o default 10
    expect(result.resolved["granulacao"]).toBe(45);
    expect(result.details.find((d) => d.key === "granulacao")?.source).toBe("INHERITED");

    // 3. Valor padrão quando não há valor explícito nem herança
    expect(result.resolved["iluminacao_chave"]).toBe("Softbox Difuso");
    expect(result.details.find((d) => d.key === "iluminacao_chave")?.source).toBe("DEFAULT");

    // 4. Opcional sem valor padrão não polui o resultado
    expect(result.resolved["notas_adicionais"]).toBeUndefined();
    expect(result.details.find((d) => d.key === "notas_adicionais")?.source).toBe("EMPTY");
  });

  it("2. Isolamento de Escopos: Personagem A não pode herdar ou misturar valores do Personagem B", () => {
    const mockDefinitions: any[] = [
      {
        id: "def_char_name",
        workspaceId,
        key: "figurino_cor",
        label: "Cor do Figurino",
        description: null,
        type: "TEXT",
        scope: "CHARACTER",
        required: false,
        defaultValue: "Neutro",
        options: null,
        validationRules: null,
        visibilityRules: null,
        promptMapping: null,
        order: 1,
        version: 1,
        isSystem: false,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const mockValues: ParameterValue[] = [
      {
        id: "val_char_A",
        projectId,
        parameterDefinitionId: "def_char_name",
        targetType: "CHARACTER",
        targetId: "char_A",
        value: "Capa Vermelha",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // Consulta para o Personagem B (que não possui valor explícito)
    const resultCharB = ParameterResolver.resolveForTarget(mockDefinitions, mockValues, {
      type: "CHARACTER",
      id: "char_B",
    });

    // Personagem B NÃO deve receber "Capa Vermelha", deve receber o defaultValue "Neutro"
    expect(resultCharB.resolved["figurino_cor"]).toBe("Neutro");
    expect(resultCharB.details[0].source).toBe("DEFAULT");
  });

  it("3. Parâmetro Obrigatório Ausente: Gera erro de validação claro", () => {
    const mockDefinitions: any[] = [
      {
        id: "def_req",
        workspaceId,
        key: "formato_anamorfico",
        label: "Taxa Anamórfica",
        description: null,
        type: "SELECT",
        scope: "GLOBAL",
        required: true,
        defaultValue: null, // Sem valor padrão
        options: [{ value: "2x", label: "2x Squeeze" }],
        validationRules: null,
        visibilityRules: null,
        promptMapping: null,
        order: 1,
        version: 1,
        isSystem: false,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const result = ParameterResolver.resolveForTarget(mockDefinitions, [], {
      type: "PROJECT",
      id: projectId,
    });

    expect(result.missingRequired.length).toBe(1);
    expect(result.missingRequired[0]).toContain("Taxa Anamórfica");
  });

  it("4. Regras de Visibilidade Declarativas: Oculta parâmetro e não cobra obrigatoriedade se condição não for atendida", () => {
    const mockDefinitions: any[] = [
      {
        id: "def_modo_noturno",
        workspaceId,
        key: "usar_filtro_noturno",
        label: "Usar Filtro Noturno",
        description: null,
        type: "BOOLEAN",
        scope: "SCENE",
        required: false,
        defaultValue: false,
        options: null,
        validationRules: null,
        visibilityRules: null,
        promptMapping: null,
        order: 1,
        version: 1,
        isSystem: false,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "def_densidade_filtro",
        workspaceId,
        key: "densidade_nd",
        label: "Densidade do Filtro ND",
        description: null,
        type: "NUMBER",
        scope: "SCENE",
        required: true, // Obrigatório, mas depende de usar_filtro_noturno ser true
        defaultValue: null,
        options: null,
        validationRules: null,
        visibilityRules: {
          dependsOn: "usar_filtro_noturno",
          operator: "truthy",
        },
        promptMapping: null,
        order: 2,
        version: 1,
        isSystem: false,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // Quando usar_filtro_noturno é falso (padrão)
    const resultInvisivel = ParameterResolver.resolveForTarget(mockDefinitions, [], {
      type: "SCENE",
      id: "scene_1",
    });

    // densidade_nd deve estar oculto e NÃO deve acusar missingRequired
    expect(resultInvisivel.resolved["densidade_nd"]).toBeUndefined();
    expect(resultInvisivel.missingRequired.length).toBe(0);
  });

  it("5. Teste de CRUD e Persistência no Banco Real via ParameterService", async () => {
    // 1. Criar novo parâmetro customizado
    const param = await ParameterService.createParameter(workspaceId, {
      key: "temperatura_luz_kelvin",
      label: "Temperatura da Luz (Kelvin)",
      description: "Define a calidez ou frieza da luz.",
      type: "NUMBER",
      scope: "ENVIRONMENT",
      required: false,
      defaultValue: 5600,
      validationRules: {
        min: 2000,
        max: 10000,
        isInteger: true,
      },
      order: 10,
      enabled: true,
    });

    expect(param.id).toBeDefined();
    expect(param.key).toBe("temperatura_luz_kelvin");

    // 2. Alternar estado (toggle)
    const toggled = await ParameterService.toggleParameter(param.id, workspaceId);
    expect(toggled.enabled).toBe(false);

    const reToggled = await ParameterService.toggleParameter(param.id, workspaceId);
    expect(reToggled.enabled).toBe(true);

    // 3. Salvar valores no projeto para um ambiente específico
    await ParameterService.saveValues(projectId, workspaceId, [
      {
        parameterDefinitionId: param.id,
        targetType: "ENVIRONMENT",
        targetId: "env_floresta",
        value: 3200,
      },
    ]);

    // 4. Resolver parâmetros para esse ambiente
    const resolved = await ParameterService.resolveForProject(projectId, workspaceId, {
      type: "ENVIRONMENT",
      id: "env_floresta",
    });

    expect(resolved.resolved["temperatura_luz_kelvin"]).toBe(3200);

    // 5. Excluir parâmetro customizado
    await ParameterService.deleteParameter(param.id, workspaceId);
    const checkDeleted = await ParameterService.getParameterById(param.id, workspaceId);
    expect(checkDeleted).toBeNull();
  });
});
