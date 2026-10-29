import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { PlatformRole, WorkspaceRole } from "@prisma/client";
import { AdminParametersService } from "@/modules/admin/admin-parameters.service";
import { ProjectParameterConfigService } from "@/modules/projects/project-parameter-config.service";

describe("Etapa 6: Painel Administrativo e Extensibilidade Global de Parâmetros", () => {
  let regularUserId: string;
  let adminUserId: string;
  let superAdminUserId: string;
  let workspaceId: string;
  let projectId: string;

  const randSuffix = Math.random().toString(36).substring(7);

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash("Password123!", 10);

    // 1. Usuário Regular (USER)
    const regUser = await db.user.create({
      data: {
        authSubject: `auth_reg_${Date.now()}_${randSuffix}`,
        email: `reg_${Date.now()}_${randSuffix}@example.com`,
        displayName: "Produtor Regular",
        passwordHash,
        platformRole: PlatformRole.USER,
      },
    });
    regularUserId = regUser.id;

    // 2. Administrador da Plataforma (ADMIN)
    const admUser = await db.user.create({
      data: {
        authSubject: `auth_adm_${Date.now()}_${randSuffix}`,
        email: `adm_${Date.now()}_${randSuffix}@example.com`,
        displayName: "Administrador de Parâmetros",
        passwordHash,
        platformRole: PlatformRole.ADMIN,
      },
    });
    adminUserId = admUser.id;

    // 3. Super Administrador (SUPER_ADMIN)
    const sAdmUser = await db.user.create({
      data: {
        authSubject: `auth_sadm_${Date.now()}_${randSuffix}`,
        email: `sadm_${Date.now()}_${randSuffix}@example.com`,
        displayName: "Super Admin",
        passwordHash,
        platformRole: PlatformRole.SUPER_ADMIN,
      },
    });
    superAdminUserId = sAdmUser.id;

    // 4. Workspace & Projeto de Teste
    const ws = await db.workspace.create({
      data: {
        name: `Estúdio Paramount ${randSuffix}`,
        slug: `estudio-paramount-${Date.now()}-${randSuffix}`,
        memberships: {
          create: {
            userId: regUser.id,
            role: WorkspaceRole.OWNER,
          },
        },
      },
    });
    workspaceId = ws.id;

    const proj = await db.project.create({
      data: {
        workspaceId,
        title: "Duna 3: A Aliança Cinematográfica",
        genre: "Sci-Fi",
      },
    });
    projectId = proj.id;
  }, 60000);

  afterAll(async () => {
    await db.parameterDefinition
      .deleteMany({
        where: {
          OR: [
            { key: { endsWith: `_${randSuffix}` } },
            { key: { startsWith: "anamorphic_flare_streak_" } },
            { key: { startsWith: "lut_color_grading_" } },
            { key: { startsWith: "texture_noise_custom_" } },
          ],
        },
      })
      .catch(() => {});
    if (workspaceId) {
      await db.workspace.delete({ where: { id: workspaceId } }).catch(() => {});
    }
    if (regularUserId) {
      await db.user.delete({ where: { id: regularUserId } }).catch(() => {});
    }
    if (adminUserId) {
      await db.user.delete({ where: { id: adminUserId } }).catch(() => {});
    }
    if (superAdminUserId) {
      await db.user.delete({ where: { id: superAdminUserId } }).catch(() => {});
    }
  });

  it("1. Deve sincronizar e governar parâmetros nas 9 categorias cinematográficas obrigatórias", async () => {
    const syncResult = await AdminParametersService.syncDefaultCinematicParameters(adminUserId, {
      ipAddress: "127.0.0.1",
      userAgent: "Vitest-Admin-Test",
    });

    expect(syncResult.syncedCount).toBeGreaterThanOrEqual(20);

    const list = await AdminParametersService.listGlobalParameters();
    expect(list.parameters.length).toBeGreaterThanOrEqual(20);

    // Verificar se as 9 categorias estão presentes
    const categoriesPresent = new Set(list.parameters.map((p) => p.category));
    expect(categoriesPresent.has("CAMERA")).toBe(true);
    expect(categoriesPresent.has("LENS")).toBe(true);
    expect(categoriesPresent.has("FRAMING")).toBe(true);
    expect(categoriesPresent.has("MOVEMENT")).toBe(true);
    expect(categoriesPresent.has("LIGHTING")).toBe(true);
    expect(categoriesPresent.has("AESTHETICS")).toBe(true);
    expect(categoriesPresent.has("ART_ATMOSPHERE")).toBe(true);
    expect(categoriesPresent.has("AUDIO")).toBe(true);
    expect(categoriesPresent.has("CONTINUITY")).toBe(true);

    // Métricas globais
    const metrics = await AdminParametersService.getGlobalMetrics();
    expect(metrics.totalParameters).toBeGreaterThanOrEqual(20);
    expect(metrics.activeParameters).toBeGreaterThanOrEqual(20);
    expect(metrics.systemParameters).toBeGreaterThanOrEqual(20);
    expect(metrics.categoriesCount).toBe(9);
    expect(metrics.visualCoveragePercent).toBeGreaterThan(0);
  }, 60000);

  it("2. Deve criar novo parâmetro global customizado associado a uma categoria cinematográfica com auditoria", async () => {
    const customKey = `anamorphic_flare_streak_${randSuffix}`;

    const created = await AdminParametersService.createGlobalParameter(
      {
        key: customKey,
        label: "Flare Anamórfico Horizontal Azul",
        description: "Emula o reflexo óptico característico de lentes anamórficas Cooke / Panavision.",
        type: "SELECT",
        category: "LENS",
        scope: "SCENE",
        scopes: ["SCENE", "GLOBAL"],
        required: false,
        defaultValue: "flare_azul_suave",
        options: [
          {
            value: "flare_azul_suave",
            label: "Azul Cobalto Suave (Sci-Fi Elegante)",
            imageUrl: "https://images.unsplash.com/photo-flare-blue",
            whatToLookFor: "Linha horizontal nítida cortando fontes luminosas pontuais.",
          },
          {
            value: "flare_dourado_quente",
            label: "Dourado Quente / Âmbar Vintage",
            imageUrl: "https://images.unsplash.com/photo-flare-gold",
            whatToLookFor: "Brilho caloroso e reflexos orgânicos.",
          },
        ],
        promptMapping: {
          target: "lens",
          instruction: "Adicionar flare anamórfico horizontal cinematográfico.",
        },
      },
      adminUserId,
      { ipAddress: "10.0.0.1", userAgent: "Vitest-Admin" }
    );

    expect(created.id).toBeDefined();
    expect(created.key).toBe(customKey);
    expect(created.category).toBe("LENS");
    expect(created.isSystem).toBe(false);
    expect(created.hasVisualRef).toBe(true);
    expect(created.options?.length).toBe(2);

    // Auditoria
    const auditLogs = await db.platformAuditLog.findMany({
      where: {
        adminUserId,
        action: "CREATE_GLOBAL_PARAMETER",
        targetId: created.id,
      },
    });
    expect(auditLogs.length).toBeGreaterThanOrEqual(1);
    expect((auditLogs[0].details as any)?.key).toBe(customKey);
  });

  it("3. Deve atualizar e alternar ativação (toggle) com invalidação de cache e auditoria", async () => {
    const customKey = `lut_color_grading_${randSuffix}`;

    const created = await AdminParametersService.createGlobalParameter(
      {
        key: customKey,
        label: "LUT de Color Grading",
        type: "SELECT",
        category: "AESTHETICS",
        scope: "GLOBAL",
        options: [{ value: "kodak_2383", label: "Kodak 2383 Print Film" }],
      },
      adminUserId
    );

    // Atualização
    const updated = await AdminParametersService.updateGlobalParameter(
      created.id,
      {
        label: "LUT Cinematográfica Kodak 2383",
        description: "Emulação da película de exibição mais famosa de Hollywood.",
      },
      adminUserId
    );
    expect(updated.label).toBe("LUT Cinematográfica Kodak 2383");

    // Toggle para desativar
    const toggledOff = await AdminParametersService.toggleGlobalParameter(
      created.id,
      false,
      adminUserId
    );
    expect(toggledOff.enabled).toBe(false);

    // Toggle para reativar
    const toggledOn = await AdminParametersService.toggleGlobalParameter(
      created.id,
      true,
      adminUserId
    );
    expect(toggledOn.enabled).toBe(true);

    // Auditorias registradas
    const toggleAudit = await db.platformAuditLog.findFirst({
      where: {
        adminUserId,
        action: "TOGGLE_GLOBAL_PARAMETER",
        targetId: created.id,
      },
    });
    expect(toggleAudit).not.toBeNull();
  });

  it("4. Proteção de Segurança: Não deve permitir exclusão física de parâmetros nativos do sistema", async () => {
    const systemParam = await db.parameterDefinition.findFirst({
      where: { key: "formato_sensor_camera" },
    });
    expect(systemParam).not.toBeNull();

    await expect(
      AdminParametersService.deleteGlobalParameter(systemParam!.id, adminUserId)
    ).rejects.toThrow(/Parâmetros nativos do sistema são protegidos/);
  });

  it("5. Proteção de Dados: Não deve permitir excluir parâmetro em uso por projetos", async () => {
    const inUseKey = `texture_noise_custom_${randSuffix}`;

    const param = await AdminParametersService.createGlobalParameter(
      {
        key: inUseKey,
        label: "Textura de Ruído Personalizada",
        type: "SELECT",
        category: "AESTHETICS",
        options: [{ value: "ruido_35mm", label: "Ruído 35mm" }],
      },
      adminUserId
    );

    // Simular projeto utilizando este parâmetro
    await db.parameterValue.create({
      data: {
        projectId,
        parameterDefinitionId: param.id,
        targetType: "PROJECT",
        value: "ruido_35mm",
      },
    });

    // Tentativa de exclusão deve ser bloqueada
    await expect(
      AdminParametersService.deleteGlobalParameter(param.id, adminUserId)
    ).rejects.toThrow(/está em uso por 1 projeto\(s\)/);

    // Limpar o valor associado para os próximos passos
    await db.parameterValue.deleteMany({
      where: { parameterDefinitionId: param.id },
    });
  });

  it("6. Deve permitir exclusão segura de parâmetro customizado não utilizado", async () => {
    const deleteKey = `temp_param_to_delete_${randSuffix}`;

    const param = await AdminParametersService.createGlobalParameter(
      {
        key: deleteKey,
        label: "Parâmetro Temporário",
        type: "TEXT",
        category: "AUDIO",
      },
      adminUserId
    );

    const deleteResult = await AdminParametersService.deleteGlobalParameter(
      param.id,
      adminUserId
    );
    expect(deleteResult.deleted).toBe(true);

    const existsInDb = await db.parameterDefinition.findUnique({
      where: { id: param.id },
    });
    expect(existsInDb).toBeNull();
  });

  it("7. Resolução Dinâmica e Não-Regressão: Parâmetro global criado aparece na categoria do projeto sem quebrar snapshots", async () => {
    const dynamicKey = `camera_special_mount_${randSuffix}`;

    const created = await AdminParametersService.createGlobalParameter(
      {
        key: dynamicKey,
        label: "Suporte Especial de Câmera (Snorricam / Cablecam)",
        description: "Suporte veicular ou acoplado ao ator para perspectiva visceral.",
        type: "SELECT",
        category: "CAMERA",
        options: [
          { value: "snorricam", label: "Snorricam (Fixada ao Torso do Ator)" },
          { value: "cablecam", label: "Cablecam (Cabo suspenso em alta velocidade)" },
        ],
      },
      adminUserId
    );

    // Recupera as configurações do projeto de teste
    const projectSettings = await ProjectParameterConfigService.getProjectParameterSettings(
      projectId,
      workspaceId
    );

    // Categoria CAMERA deve existir e agora conter o parâmetro customizado
    const cameraCat = projectSettings.categories.find((c) => c.id === "CAMERA");
    expect(cameraCat).toBeDefined();

    const paramInProject = cameraCat!.parameters.find((p) => p.key === dynamicKey);
    expect(paramInProject).toBeDefined();
    expect(paramInProject?.label).toBe("Suporte Especial de Câmera (Snorricam / Cablecam)");
    expect(paramInProject?.category).toBe("CAMERA");
    expect(paramInProject?.options.length).toBe(2);

    // Limpeza
    await db.parameterDefinition.delete({ where: { id: created.id } }).catch(() => {});
  });
});
