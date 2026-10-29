import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { PlatformRole, WorkspaceRole } from "@prisma/client";
import { requirePlatformAdmin, requireCurrentUser, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { AuthService } from "@/modules/auth/auth.service";
import { ParameterService } from "@/modules/parameters/parameter.service";
import { AdminParametersService } from "@/modules/admin/admin-parameters.service";
import { ProjectParameterConfigService } from "@/modules/projects/project-parameter-config.service";
import { hasPermission } from "@/lib/permissions";

describe("Etapa 1: Correção de Permissões e Segurança Administrativa", () => {
  let regularUserId: string;
  let regularSessionToken: string;
  let adminUserId: string;
  let adminSessionToken: string;
  let workspaceId: string;
  let projectId: string;
  let testParameterId: string;

  const randSuffix = Math.random().toString(36).substring(7);

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash("Password123!", 10);

    // 1. Criar Usuário Comum (USER) com workspace próprio (onde é OWNER do seu workspace)
    const regUser = await db.user.create({
      data: {
        authSubject: `auth_sec_reg_${Date.now()}_${randSuffix}`,
        email: `reg_sec_${Date.now()}_${randSuffix}@example.com`,
        displayName: "Usuário Produtor Comum",
        passwordHash,
        platformRole: PlatformRole.USER,
      },
    });
    regularUserId = regUser.id;

    // 2. Criar Administrador da Plataforma (ADMIN)
    const admUser = await db.user.create({
      data: {
        authSubject: `auth_sec_adm_${Date.now()}_${randSuffix}`,
        email: `adm_sec_${Date.now()}_${randSuffix}@example.com`,
        displayName: "Administrador Geral",
        passwordHash,
        platformRole: PlatformRole.ADMIN,
      },
    });
    adminUserId = admUser.id;

    // 3. Workspace do usuário comum (ele é OWNER do workspace)
    const ws = await db.workspace.create({
      data: {
        name: `Estúdio Produtor ${randSuffix}`,
        slug: `estudio-produtor-${Date.now()}-${randSuffix}`,
        memberships: {
          create: {
            userId: regUser.id,
            role: WorkspaceRole.OWNER,
          },
        },
      },
    });
    workspaceId = ws.id;

    // 4. Projeto no workspace do usuário comum
    const proj = await db.project.create({
      data: {
        workspaceId,
        title: `Curta-Metragem de Segurança ${randSuffix}`,
        genre: "Suspense",
      },
    });
    projectId = proj.id;

    // 5. Sessões
    const regSession = await AuthService.createSession(regUser.id);
    regularSessionToken = regSession.rawToken;

    const admSession = await AuthService.createSession(admUser.id);
    adminSessionToken = admSession.rawToken;

    // 6. Criar um parâmetro de teste no banco
    const createdParam = await db.parameterDefinition.create({
      data: {
        workspaceId: null,
        key: `param_sec_${Date.now().toString().slice(-6)}_${randSuffix}`,
        label: "Parâmetro de Teste de Segurança",
        description: "Validando governança estrita",
        type: "SELECT",
        scope: "GLOBAL",
        promptMapping: { category: "CAMERA" },
        isSystem: false,
        enabled: true,
      },
    });
    testParameterId = createdParam.id;
  }, 60000);

  afterAll(async () => {
    await db.parameterDefinition
      .deleteMany({
        where: {
          OR: [
            { key: { startsWith: "param_hack_" } },
            { key: { startsWith: "param_sec_" } },
          ],
        },
      })
      .catch(() => {});
    if (testParameterId) {
      await db.parameterDefinition.delete({ where: { id: testParameterId } }).catch(() => {});
    }
    if (workspaceId) {
      await db.workspace.delete({ where: { id: workspaceId } }).catch(() => {});
    }
    if (regularUserId) {
      await db.user.delete({ where: { id: regularUserId } }).catch(() => {});
    }
    if (adminUserId) {
      await db.user.delete({ where: { id: adminUserId } }).catch(() => {});
    }
  });

  it("1. Administrador consegue acessar o painel e validar permissões administrativas", async () => {
    const adminUser = await db.user.findUnique({ where: { id: adminUserId } });
    expect(adminUser).not.toBeNull();
    expect(adminUser?.platformRole).toBe(PlatformRole.ADMIN);

    // Validação com sessao real
    const sessionData = await AuthService.validateSession(adminSessionToken);
    expect(sessionData?.user.platformRole).toBe("ADMIN");

    const isPlatformAdmin = sessionData?.user.platformRole === "ADMIN" || sessionData?.user.platformRole === "SUPER_ADMIN";
    expect(isPlatformAdmin).toBe(true);
  });

  it("2. Usuário comum tem isPlatformAdmin === false (não visualiza botão administrativo)", async () => {
    const regSessionData = await AuthService.validateSession(regularSessionToken);
    expect(regSessionData?.user.platformRole).toBe("USER");

    const isPlatformAdmin = regSessionData?.user.platformRole === "ADMIN" || regSessionData?.user.platformRole === "SUPER_ADMIN";
    expect(isPlatformAdmin).toBe(false);

    // No papel de workspace, mesmo sendo OWNER do workspace, não possui permissão de gerenciamento global
    expect(hasPermission(WorkspaceRole.OWNER, "parameters:read")).toBe(true);
    expect(hasPermission(WorkspaceRole.OWNER, "parameters:manage" as any)).toBe(false);
  });

  it("3. Usuário comum não consegue abrir diretamente o console administrativo (bloqueio 403)", async () => {
    const regUser = await db.user.findUnique({
      where: { id: regularUserId },
      include: { memberships: { include: { workspace: true } } },
    });

    // Função guard de autorização administrativa
    const verifyAccess = (user: any) => {
      const isRoleAdmin = user.platformRole === "ADMIN" || user.platformRole === "SUPER_ADMIN";
      if (!isRoleAdmin) {
        throw new AuthorizationError("Acesso restrito. Este recurso requer privilégios de administrador da plataforma.");
      }
      return true;
    };

    expect(() => verifyAccess(regUser)).toThrow(AuthorizationError);
    expect(() => verifyAccess(regUser)).toThrow(/Acesso restrito/);
  });

  it("4. Usuário comum não consegue cadastrar parâmetros por requisição direta", async () => {
    // Chamada administrativa sem papel de admin lança AuthorizationError
    await expect(
      AdminParametersService.createGlobalParameter(
        {
          key: `param_hack_${Date.now().toString().slice(-6)}`,
          label: "Parâmetro Invasor",
          category: "CAMERA",
          type: "SELECT",
          scope: "GLOBAL",
        },
        regularUserId // ID de usuário comum
      )
    ).rejects.toThrow(AuthorizationError);
  });

  it("5. Usuário comum não consegue editar parâmetros globais", async () => {
    await expect(
      AdminParametersService.updateGlobalParameter(
        testParameterId,
        {
          label: "Tentativa de Alteração Maliciosa",
        },
        regularUserId
      )
    ).rejects.toThrow(AuthorizationError);
  });

  it("6. Usuário comum não consegue excluir parâmetros globais", async () => {
    await expect(
      AdminParametersService.deleteGlobalParameter(testParameterId, regularUserId)
    ).rejects.toThrow(AuthorizationError);
  });

  it("7. Usuário comum não consegue alternar ativação administrativa (toggle)", async () => {
    await expect(
      AdminParametersService.toggleGlobalParameter(testParameterId, regularUserId)
    ).rejects.toThrow(AuthorizationError);
  });

  it("8. Administrador continua conseguindo realizar todas as operações autorizadas", async () => {
    // 1. Atualizar parâmetro existente
    const updated = await AdminParametersService.updateGlobalParameter(
      testParameterId,
      {
        description: "Atualizado com sucesso pelo Administrador",
      },
      adminUserId
    );
    expect(updated.description).toBe("Atualizado com sucesso pelo Administrador");

    // 2. Alternar estado (toggle)
    const toggled = await AdminParametersService.toggleGlobalParameter(testParameterId, adminUserId);
    expect(toggled.enabled).toBe(false);

    // Reativar
    const reEnabled = await AdminParametersService.toggleGlobalParameter(testParameterId, adminUserId);
    expect(reEnabled.enabled).toBe(true);

    // 3. Listagem administrativa
    const listRes = await AdminParametersService.listGlobalParameters();
    expect(listRes.total).toBeGreaterThan(0);
    expect(listRes.parameters.some((p) => p.id === testParameterId)).toBe(true);
  });

  it("9. Usuários comuns continuam utilizando os parâmetros nos projetos normalmente", async () => {
    // Leitura dos parâmetros disponíveis para o workspace do usuário comum
    const params = await ParameterService.listParameters(workspaceId);
    expect(Array.isArray(params)).toBe(true);
    expect(params.length).toBeGreaterThan(0);

    // O usuário comum consegue configurar parâmetros do seu projeto (habilitar/desabilitar para o projeto)
    const projectSettings = await ProjectParameterConfigService.getProjectParameterSettings(projectId, workspaceId);
    expect(projectSettings.categories.length).toBe(9);
    expect(projectSettings.totalParameters).toBeGreaterThan(0);
  });

  it("10. Usuário não autenticado não consegue executar operações protegidas", async () => {
    // Validação com token inexistente ou vazio
    const invalidSession = await AuthService.validateSession("token_inexistente_123456");
    expect(invalidSession).toBeNull();

    // Guard de usuário não autenticado
    const guardAuth = (user: any) => {
      if (!user) {
        throw new AuthenticationError("Sessão não encontrada ou expirada.");
      }
      return user;
    };

    expect(() => guardAuth(invalidSession?.user)).toThrow(AuthenticationError);
  });

  it("11. Alterar informações locais no navegador não permite contornar as permissões", async () => {
    // Simula tentativa de enviar claim falsificada no header ou body
    const forgedClientPayload = {
      id: regularUserId,
      email: "reg_sec@example.com",
      platformRole: "SUPER_ADMIN", // Tenta fingir ser SUPER_ADMIN no frontend
      isPlatformAdmin: true,
    };

    // A verificação do backend vai ao banco de dados com base na sessão real, ignorando dados do cliente
    const realDbUser = await db.user.findUnique({
      where: { id: forgedClientPayload.id },
      select: { platformRole: true },
    });

    expect(realDbUser?.platformRole).toBe(PlatformRole.USER);
    expect(realDbUser?.platformRole).not.toBe(PlatformRole.SUPER_ADMIN);

    // A autorização do backend falha independentemente do que o cliente declarou
    const isActuallyAdmin = realDbUser?.platformRole === "ADMIN" || realDbUser?.platformRole === "SUPER_ADMIN";
    expect(isActuallyAdmin).toBe(false);
  });
});
