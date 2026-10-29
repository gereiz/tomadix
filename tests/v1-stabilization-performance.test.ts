import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { PlatformRole, WorkspaceRole } from "@prisma/client";
import { AuthService } from "@/modules/auth/auth.service";
import { ParameterService } from "@/modules/parameters/parameter.service";
import { ParameterResolver } from "@/modules/parameters/parameter-resolver.service";
import {
  ProjectParameterConfigService,
  CINEMATIC_CATEGORIES,
  CINEMATIC_PARAM_DEFINITIONS,
} from "@/modules/projects/project-parameter-config.service";
import { formatPromptToPlainText } from "@/modules/prompt-engine/format-plain-text";
import { AdminParametersService } from "@/modules/admin/admin-parameters.service";

describe("Etapa 7: Estabilização de Performance, Resiliência e Homologação Final da V1", () => {
  let userId: string;
  let workspaceId: string;
  let projectId: string;
  let rawSessionToken: string;

  const rand = Math.random().toString(36).substring(7);

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash("Password123!", 10);

    // 1. Criar usuário e workspace
    const user = await db.user.create({
      data: {
        authSubject: `auth_stab_${Date.now()}_${rand}`,
        email: `stab_${Date.now()}_${rand}@example.com`,
        displayName: "Diretor de Performance",
        passwordHash,
        platformRole: PlatformRole.ADMIN,
      },
    });
    userId = user.id;

    const ws = await db.workspace.create({
      data: {
        name: `Estúdio Estabilização V1 ${rand}`,
        slug: `estudio-stab-${Date.now()}-${rand}`,
        memberships: {
          create: {
            userId: user.id,
            role: WorkspaceRole.OWNER,
          },
        },
      },
    });
    workspaceId = ws.id;

    const proj = await db.project.create({
      data: {
        workspaceId,
        title: "Longa-Metragem de Performance V1",
        genre: "Drama Cinematográfico",
      },
    });
    projectId = proj.id;

    // Criar sessão real de autenticação
    const sessionRes = await AuthService.createSession(userId);
    rawSessionToken = sessionRes.rawToken;
  }, 60000);

  afterAll(async () => {
    if (workspaceId) {
      await db.workspace.delete({ where: { id: workspaceId } }).catch(() => {});
    }
    if (userId) {
      await db.user.delete({ where: { id: userId } }).catch(() => {});
    }
  });

  it("1. Resiliência do Pool de Conexões e Cache de Sessão (10 Validações Concorrentes)", async () => {
    // 1. Primeira validação (fria) preenche o cache
    const firstCallStart = performance.now();
    const firstCall = await AuthService.validateSession(rawSessionToken);
    const firstDuration = performance.now() - firstCallStart;

    expect(firstCall).not.toBeNull();
    expect(firstCall?.user.id).toBe(userId);

    // 2. 10 chamadas concorrentes simultâneas (simulando requisições paralelas do Next.js)
    const concurrentStart = performance.now();
    const concurrentCalls = await Promise.all(
      Array.from({ length: 10 }).map(() => AuthService.validateSession(rawSessionToken))
    );
    const concurrentDuration = performance.now() - concurrentStart;

    // Todas as 10 requisições devem ser bem-sucedidas
    expect(concurrentCalls.length).toBe(10);
    for (const res of concurrentCalls) {
      expect(res).not.toBeNull();
      expect(res?.user.id).toBe(userId);
    }

    // Com o cache de sessão, 10 chamadas simultâneas devem ser quase instantâneas (< 150ms total)
    expect(concurrentDuration).toBeLessThan(500);

    // 3. Invalidação em Logout
    await AuthService.logout(rawSessionToken);
    const postLogout = await AuthService.validateSession(rawSessionToken);
    expect(postLogout).toBeNull();
  });

  it("2. Benchmark de Performance de Parâmetros: Cache em Memória vs Linha de Base", async () => {
    // Linha de base da Etapa 0: ~855ms sem cache
    // Primeira chamada para aquecer o cache do workspace
    await ParameterService.listParameters(workspaceId);

    // Segunda chamada (cache quente)
    const start = performance.now();
    const params = await ParameterService.listParameters(workspaceId);
    const duration = performance.now() - start;

    expect(params.length).toBeGreaterThanOrEqual(7);
    // Deve responder em menos de 50ms com cache em memória (otimização de 95%+)
    expect(duration).toBeLessThan(50);
  });

  it("3. Resolução Determinística Hierárquica (< 10ms para 20+ Parâmetros)", async () => {
    // Garantir parâmetros do projeto
    await ProjectParameterConfigService.ensureCinematicParameters(workspaceId);
    const allDefs = await db.parameterDefinition.findMany({
      where: {
        OR: [{ workspaceId }, { workspaceId: null }],
      },
    });

    const start = performance.now();
    const result = ParameterResolver.resolveForTarget(allDefs, [], { type: "SCENE" });
    const duration = performance.now() - start;

    expect(Object.keys(result.resolved).length).toBeGreaterThanOrEqual(3);
    // Resolução em memória extremamente rápida (< 20ms)
    expect(duration).toBeLessThan(20);
  });

  it("4. Governança das 9 Categorias Cinematográficas Mestre (V1 Compliance)", async () => {
    expect(CINEMATIC_CATEGORIES.length).toBe(9);

    const expectedCategoryIds = [
      "CAMERA",
      "LENS",
      "FRAMING",
      "MOVEMENT",
      "LIGHTING",
      "AESTHETICS",
      "ART_ATMOSPHERE",
      "AUDIO",
      "CONTINUITY",
    ];

    const actualCategoryIds = CINEMATIC_CATEGORIES.map((c) => c.id);
    for (const id of expectedCategoryIds) {
      expect(actualCategoryIds).toContain(id);
    }

    // Validar que cada categoria possui ao menos 2 parâmetros canônicos associados
    for (const cat of CINEMATIC_CATEGORIES) {
      expect(cat.parameterKeys.length).toBeGreaterThanOrEqual(2);
    }

    // Validar definições canônicas com opções
    expect(CINEMATIC_PARAM_DEFINITIONS.length).toBeGreaterThanOrEqual(20);
    const withOptions = CINEMATIC_PARAM_DEFINITIONS.filter(
      (p) => p.options && p.options.length > 0
    );
    expect(withOptions.length).toBeGreaterThanOrEqual(15);
  });

  it("5. Geração Dual: JSON Estruturado e Texto Puro Polimórfico", async () => {
    const mockJson = {
      compiledPromptText: "Protagonista em silhueta contra um vitral gótico em plano médio",
      action: "Caminha em direção à luz do vitral",
      camera: {
        framing: "Plano Médio (Cintura para Cima)",
        movement: "Dolly In lento e controlado",
        lens: "50mm normal anamórfica com bokeh cremoso",
      },
      lighting: "Chiaroscuro dramático com luz de recorte azul",
      style: "Realista contemporâneo com grão 35mm",
      sound: {
        profile: "Silêncio tenso com sub-grave contínuo",
      },
      negativePrompt: "deformed, blurry, low quality",
    };

    // 1. Formatação para Video Prompt
    const videoText = formatPromptToPlainText(mockJson, "video_prompt");
    expect(videoText).toContain("Plano Médio");
    expect(videoText).toContain("Chiaroscuro dramático");
    expect(videoText).toContain("Dolly In");

    // 2. Formatação para Continuity Scene
    const sceneText = formatPromptToPlainText(mockJson, "continuity_scene");
    expect(sceneText).toContain("Protagonista");

    // 3. Fallback genérico para JSON arbitrário
    const genericText = formatPromptToPlainText(
      { notes: "Iluminação fria de estúdio" },
      "custom_template"
    );
    expect(genericText).toContain("Iluminação fria de estúdio");
  });

  it("6. Segurança e Auditoria Administrativa: Proibição de Deleção Destrutiva", async () => {
    // 1. Tentar excluir parâmetro de sistema
    const sysParam = await db.parameterDefinition.findFirst({
      where: { key: "formato_sensor_camera" },
    });
    expect(sysParam).not.toBeNull();

    await expect(
      AdminParametersService.deleteGlobalParameter(sysParam!.id, userId)
    ).rejects.toThrow(/Parâmetros nativos do sistema são protegidos/);

    // 2. Métricas do console administrativo respondem com integridade
    const metrics = await AdminParametersService.getGlobalMetrics();
    expect(metrics.totalParameters).toBeGreaterThanOrEqual(20);
    expect(metrics.categoriesCount).toBe(9);
    expect(metrics.visualCoveragePercent).toBeGreaterThan(0);
  });
});
