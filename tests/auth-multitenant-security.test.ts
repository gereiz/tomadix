import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { AuthService } from "@/modules/auth/auth.service";
import { WorkspaceService } from "@/modules/workspaces/workspace.service";
import { ProjectService } from "@/modules/projects/project.service";
import { hasPermission } from "@/lib/permissions";
import { assertProjectAccess, AuthorizationError, NotFoundError } from "@/lib/auth";
import { checkRateLimit, verifyPassword } from "@/lib/security";
import { WorkspaceRole } from "@prisma/client";

describe("Fundação Multiusuário, Autenticação, RBAC e Segurança", () => {
  let userAlphaId: string;
  let userAlphaEmail: string;
  let userAlphaSessionToken: string;
  let userAlphaWorkspaceId: string;
  let alphaProjectId: string;

  let userBetaId: string;
  let userBetaEmail: string;
  let userBetaSessionToken: string;
  let userBetaWorkspaceId: string;

  let userGammaId: string;
  let userGammaEmail: string;

  beforeAll(async () => {
    userAlphaEmail = `alpha_${Date.now()}@cinema.com`;
    userBetaEmail = `beta_${Date.now()}@cinema.com`;
    userGammaEmail = `gamma_${Date.now()}@cinema.com`;
  });

  afterAll(async () => {
    // Limpeza dos usuários e workspaces criados nos testes
    const emails = [userAlphaEmail, userBetaEmail, userGammaEmail];
    const users = await db.user.findMany({ where: { email: { in: emails } } });
    for (const u of users) {
      await db.user.delete({ where: { id: u.id } }).catch(() => {});
    }
  });

  describe("1. Fluxo Completo de Autenticação e Contas", () => {
    it("deve cadastrar um novo usuário com senha criptografada em bcrypt e workspace com papel OWNER", async () => {
      const regAlpha = await AuthService.register({
        email: userAlphaEmail,
        password: "Password@123",
        displayName: "Diretora Alpha",
        workspaceName: "Estúdio Alpha Filmes",
      });

      expect(regAlpha.user).toBeDefined();
      expect(regAlpha.user.email).toBe(userAlphaEmail);
      expect(regAlpha.workspace.name).toBe("Estúdio Alpha Filmes");
      expect(regAlpha.sessionToken).toBeDefined();
      expect(regAlpha.confirmationToken).toBeDefined();

      userAlphaId = regAlpha.user.id;
      userAlphaSessionToken = regAlpha.sessionToken;
      userAlphaWorkspaceId = regAlpha.workspace.id;

      // Verificar que a senha NUNCA foi armazenada em texto puro
      const dbUser = await db.user.findUnique({ where: { id: userAlphaId } });
      expect(dbUser?.passwordHash).not.toBe("Password@123");
      expect(dbUser?.passwordHash?.startsWith("$2")).toBe(true);

      const isValidPassword = await verifyPassword("Password@123", dbUser!.passwordHash!);
      expect(isValidPassword).toBe(true);
    });

    it("deve rejeitar tentativa de cadastro com e-mail duplicado", async () => {
      await expect(
        AuthService.register({
          email: userAlphaEmail,
          password: "OutraSenha@123",
          displayName: "Clone Alpha",
        })
      ).rejects.toThrow("Este e-mail já está em uso");
    });

    it("deve realizar login com sucesso e retornar sessão válida", async () => {
      const loginResult = await AuthService.login({
        email: userAlphaEmail,
        password: "Password@123",
      });

      expect(loginResult.user.id).toBe(userAlphaId);
      expect(loginResult.sessionToken).toBeDefined();
      expect(loginResult.workspaces.length).toBeGreaterThan(0);
      expect(loginResult.workspaces[0].role).toBe(WorkspaceRole.OWNER);
    });

    it("deve rejeitar login com senha incorreta sem expor detalhes internos", async () => {
      await expect(
        AuthService.login({
          email: userAlphaEmail,
          password: "SenhaErrada@999",
        })
      ).rejects.toThrow("Credenciais inválidas");
    });

    it("deve confirmar o endereço de e-mail do usuário com token válido", async () => {
      const dbUser = await db.user.findUnique({ where: { id: userAlphaId } });
      expect(dbUser?.emailConfirmationToken).not.toBeNull();

      const confirmResult = await AuthService.confirmEmail(dbUser!.emailConfirmationToken!);
      expect(confirmResult.success).toBe(true);

      const updatedUser = await db.user.findUnique({ where: { id: userAlphaId } });
      expect(updatedUser?.emailConfirmed).toBe(true);
      expect(updatedUser?.emailConfirmationToken).toBeNull();
    });

    it("deve rejeitar confirmação com token inválido ou já utilizado", async () => {
      await expect(AuthService.confirmEmail("token_falso_ou_expirado")).rejects.toThrow(
        "Token de confirmação inválido"
      );
    });

    it("deve solicitar recuperação de senha protegendo contra enumeração de contas", async () => {
      // 1. Para e-mail existente
      const existingReq = await AuthService.requestPasswordReset(userAlphaEmail);
      expect(existingReq.message).toContain("as instruções de recuperação foram geradas");
      expect(existingReq.resetToken).toBeDefined();

      // 2. Para e-mail inexistente (deve responder com a mesma mensagem neutra)
      const nonExistingReq = await AuthService.requestPasswordReset("inexistente@cinema.com");
      expect(nonExistingReq.message).toContain("as instruções de recuperação foram geradas");
      expect(nonExistingReq.resetToken).toBeNull();
    });

    it("deve redefinir senha com token e revogar sessões ativas anteriores (logout forçado)", async () => {
      const dbUser = await db.user.findUnique({ where: { id: userAlphaId } });
      const resetToken = dbUser!.passwordResetToken!;

      // Redefinir senha
      const resetResult = await AuthService.resetPassword(resetToken, "NovaSenha@2026");
      expect(resetResult.success).toBe(true);
      expect(resetResult.sessionToken).toBeDefined();

      // Sessão antiga não deve mais ser válida
      const oldSessionValid = await AuthService.validateSession(userAlphaSessionToken);
      expect(oldSessionValid).toBeNull();

      // Nova senha deve funcionar no login
      const newLogin = await AuthService.login({
        email: userAlphaEmail,
        password: "NovaSenha@2026",
      });
      expect(newLogin.user.id).toBe(userAlphaId);
      userAlphaSessionToken = newLogin.sessionToken;
    });

    it("deve efetuar logout e invalidar o token de sessão", async () => {
      await AuthService.logout(userAlphaSessionToken);
      const sessionAfterLogout = await AuthService.validateSession(userAlphaSessionToken);
      expect(sessionAfterLogout).toBeNull();

      // Recriar sessão para os testes seguintes
      const freshLogin = await AuthService.login({
        email: userAlphaEmail,
        password: "NovaSenha@2026",
      });
      userAlphaSessionToken = freshLogin.sessionToken;
    });
  });

  describe("2. Workspaces, Matriz RBAC e Proteção do Proprietário (OWNER)", () => {
    let membershipGammaId: string;

    beforeAll(async () => {
      // Cadastrar Usuário Gamma para atuar como membro convidado
      const regGamma = await AuthService.register({
        email: userGammaEmail,
        password: "Password@123",
        displayName: "Assistente Gamma",
      });
      userGammaId = regGamma.user.id;
    });

    it("deve validar a matriz RBAC para todos os 4 papéis: OWNER, ADMIN, MEMBER, VIEWER", () => {
      // VIEWER: apenas leitura
      expect(hasPermission(WorkspaceRole.VIEWER, "projects:read")).toBe(true);
      expect(hasPermission(WorkspaceRole.VIEWER, "parameters:read")).toBe(true);
      expect(hasPermission(WorkspaceRole.VIEWER, "projects:create")).toBe(false);
      expect(hasPermission(WorkspaceRole.VIEWER, "projects:delete")).toBe(false);
      expect(hasPermission(WorkspaceRole.VIEWER, "members:manage")).toBe(false);

      // MEMBER: criação e edição cinematográfica, sem gestão de membros
      expect(hasPermission(WorkspaceRole.MEMBER, "projects:create")).toBe(true);
      expect(hasPermission(WorkspaceRole.MEMBER, "prompts:generate")).toBe(true);
      expect(hasPermission(WorkspaceRole.MEMBER, "members:manage")).toBe(false);
      expect(hasPermission(WorkspaceRole.MEMBER, "projects:delete")).toBe(false);

      // ADMIN: gestão operacional e membros, sem exclusão do workspace
      expect(hasPermission(WorkspaceRole.ADMIN, "projects:delete")).toBe(true);
      expect(hasPermission(WorkspaceRole.ADMIN, "members:manage")).toBe(true);
      expect(hasPermission(WorkspaceRole.ADMIN, "workspace:delete")).toBe(false);

      // OWNER: controle total irrestrito
      expect(hasPermission(WorkspaceRole.OWNER, "workspace:delete")).toBe(true);
      expect(hasPermission(WorkspaceRole.OWNER, "members:manage")).toBe(true);
      expect(hasPermission(WorkspaceRole.OWNER, "audit:read")).toBe(true);
    });

    it("deve permitir que o OWNER convide um novo membro com papel VIEWER", async () => {
      // Garantir plano TEAM para autorizar membros no workspace colaborativo
      await db.subscription.upsert({
        where: { workspaceId: userAlphaWorkspaceId },
        create: {
          workspaceId: userAlphaWorkspaceId,
          planTier: "TEAM",
          status: "ACTIVE",
        },
        update: {
          planTier: "TEAM",
          status: "ACTIVE",
        },
      });

      const membership = await WorkspaceService.addMember(
        userAlphaWorkspaceId,
        userAlphaId,
        userGammaEmail,
        WorkspaceRole.VIEWER
      );

      expect(membership).toBeDefined();
      expect(membership.userId).toBe(userGammaId);
      expect(membership.role).toBe(WorkspaceRole.VIEWER);
      membershipGammaId = membership.id;
    });

    it("deve permitir que o OWNER altere o papel do membro para ADMIN", async () => {
      const updated = await WorkspaceService.updateMemberRole(
        userAlphaWorkspaceId,
        userAlphaId,
        membershipGammaId,
        WorkspaceRole.ADMIN
      );

      expect(updated.role).toBe(WorkspaceRole.ADMIN);
    });

    it("REGRA CRÍTICA: o sistema deve impedir a remoção do único OWNER do workspace", async () => {
      const ownerMembership = await db.membership.findFirst({
        where: {
          workspaceId: userAlphaWorkspaceId,
          role: WorkspaceRole.OWNER,
        },
      });

      expect(ownerMembership).not.toBeNull();

      // Tentativa de remover o OWNER
      await expect(
        WorkspaceService.removeMember(userAlphaWorkspaceId, userAlphaId, ownerMembership!.id)
      ).rejects.toThrow("Não é permitido remover o único proprietário do workspace");
    });

    it("REGRA CRÍTICA: ADMIN não pode remover nem alterar o papel do OWNER", async () => {
      const ownerMembership = await db.membership.findFirst({
        where: {
          workspaceId: userAlphaWorkspaceId,
          role: WorkspaceRole.OWNER,
        },
      });

      // Usuário Gamma (agora ADMIN) tenta rebaixar o OWNER
      await expect(
        WorkspaceService.updateMemberRole(
          userAlphaWorkspaceId,
          userGammaId,
          ownerMembership!.id,
          WorkspaceRole.VIEWER
        )
      ).rejects.toThrow("Não é permitido alterar o papel do proprietário");
    });

    it("deve permitir remover membro não-proprietário com integridade", async () => {
      const result = await WorkspaceService.removeMember(
        userAlphaWorkspaceId,
        userAlphaId,
        membershipGammaId
      );
      expect(result.success).toBe(true);

      const deleted = await db.membership.findUnique({ where: { id: membershipGammaId } });
      expect(deleted).toBeNull();
    });
  });

  describe("3. Isolamento Multitenant Estrito e Testes Negativos", () => {
    beforeAll(async () => {
      // Cadastrar Usuário Beta com seu próprio workspace
      const regBeta = await AuthService.register({
        email: userBetaEmail,
        password: "Password@123",
        displayName: "Produtor Beta",
        workspaceName: "Estúdio Beta Pictures",
      });
      userBetaId = regBeta.user.id;
      userBetaWorkspaceId = regBeta.workspace.id;

      // Criar um projeto dentro do Workspace Alpha
      const projectAlpha = await ProjectService.createProject(userAlphaWorkspaceId, {
        title: "Projeto Confidencial Alpha",
        description: "Projeto ultra-secreto da produtora Alpha",
        genre: "Sci-Fi",
        language: "pt-BR",
      });
      alphaProjectId = projectAlpha.id;
    });

    it("Workspace Beta NÃO pode obter projeto pertencente ao Workspace Alpha (404/Null)", async () => {
      const result = await ProjectService.getProjectById(alphaProjectId, userBetaWorkspaceId);
      expect(result).toBeNull();
    });

    it("assertProjectAccess deve lançar NotFoundError ao tentar acessar projeto de outro workspace", async () => {
      await expect(assertProjectAccess(alphaProjectId, userBetaWorkspaceId)).rejects.toThrow(
        NotFoundError
      );
    });

    it("Workspace Beta NÃO pode listar projetos pertencentes ao Workspace Alpha", async () => {
      const betaProjects = await ProjectService.listProjects(userBetaWorkspaceId, {
        status: "all",
        sort: "updatedAt_desc",
      });
      expect(betaProjects.some((p) => p.id === alphaProjectId)).toBe(false);
    });

    it("Workspace Beta NÃO pode listar membros nem auditoria do Workspace Alpha (403)", async () => {
      await expect(
        WorkspaceService.listMembers(userAlphaWorkspaceId, userBetaId)
      ).rejects.toThrow(AuthorizationError);

      await expect(
        WorkspaceService.getAuditLogs(userAlphaWorkspaceId, userBetaId)
      ).rejects.toThrow(AuthorizationError);
    });
  });

  describe("4. Segurança Adicional: Rate Limiting e Validação de Sessão Expirada", () => {
    it("deve limitar requisições excessivas via Rate Limiter", () => {
      const testKey = `test_limit_${Date.now()}`;
      const opts = { limit: 3, windowMs: 2000 };

      expect(checkRateLimit(testKey, opts).success).toBe(true);
      expect(checkRateLimit(testKey, opts).success).toBe(true);
      expect(checkRateLimit(testKey, opts).success).toBe(true);

      // A 4ª tentativa deve ser bloqueada
      const blocked = checkRateLimit(testKey, opts);
      expect(blocked.success).toBe(false);
      expect(blocked.remaining).toBe(0);
    });

    it("deve rejeitar e limpar automaticamente sessão expirada", async () => {
      // Criar uma sessão artificialmente expirada no banco
      const expiredSession = await AuthService.createSession(userAlphaId);
      await db.session.update({
        where: { id: expiredSession.session.id },
        data: { expiresAt: new Date(Date.now() - 1000) }, // Expirada no passado
      });

      const validated = await AuthService.validateSession(expiredSession.rawToken);
      expect(validated).toBeNull();
    });
  });
});
