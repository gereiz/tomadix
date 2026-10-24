import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { OnboardingService } from "@/modules/onboarding/onboarding.service";
import { DashboardService } from "@/modules/dashboard/dashboard.service";
import { UserProfileService } from "@/modules/users/user-profile.service";

describe("Onboarding, Dashboard e Configurações de Conta (SaaS)", () => {
  const plainPassword = "SuperPassword123!";
  let testEmail: string;
  let userId: string;
  let workspaceId: string;
  let sessionToken: string;

  beforeEach(async () => {
    // Gera email e authSubject únicos para cada teste
    testEmail = `cine_saas_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`;
    const passwordHash = await bcrypt.hash(plainPassword, 10);
    const user = await db.user.create({
      data: {
        authSubject: `auth_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        email: testEmail,
        displayName: "Diretor Teste",
        passwordHash,
        emailConfirmed: false,
        onboardingCompleted: false,
        onboardingStep: 1,
        preferences: {
          theme: "dark",
          defaultPlatform: "Google Flow",
        },
      },
    });
    userId = user.id;

    const workspace = await db.workspace.create({
      data: {
        name: "Estúdio CinePrompt Teste",
        slug: `estudio-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        isPersonal: true,
        creditsBalance: 20,
        memberships: {
          create: {
            userId: user.id,
            role: "OWNER",
          },
        },
      },
    });
    workspaceId = workspace.id;

    // Cria sessão ativa
    sessionToken = `token_${Date.now()}`;
    const crypto = await import("crypto");
    const tokenHash = crypto.createHash("sha256").update(sessionToken).digest("hex");
    await db.session.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 86400000),
        userAgent: "Vitest Test Runner / Chrome",
        ipAddress: "127.0.0.1",
      },
    });
  });

  describe("1. Fluxo de Onboarding (Boas-vindas e Primeiros Passos)", () => {
    it("deve carregar o estado inicial de onboarding com modelos iniciais disponíveis", async () => {
      const state = await OnboardingService.getOnboardingState(userId);

      expect(state.userId).toBe(userId);
      expect(state.onboardingCompleted).toBe(false);
      expect(state.onboardingStep).toBe(1);
      expect(state.starterTemplates.length).toBeGreaterThan(0);
      expect(state.activeWorkspace?.id).toBe(workspaceId);
    });

    it("deve avançar as etapas do onboarding até a conclusão", async () => {
      const step3 = await OnboardingService.updateStep(userId, 3, false);
      expect(step3.onboardingStep).toBe(3);
      expect(step3.onboardingCompleted).toBe(false);

      const step7 = await OnboardingService.updateStep(userId, 7, true);
      expect(step7.onboardingStep).toBe(7);
      expect(step7.onboardingCompleted).toBe(true);
    });

    it("deve permitir pular o onboarding imediatamente", async () => {
      const skipped = await OnboardingService.skipOnboarding(userId);
      expect(skipped.onboardingCompleted).toBe(true);

      const state = await OnboardingService.getOnboardingState(userId);
      expect(state.onboardingCompleted).toBe(true);
    });

    it("deve criar um projeto inicial completo com personagens e cenas a partir de um template", async () => {
      const project = await OnboardingService.createStarterProject(
        userId,
        workspaceId,
        "cyberpunk_nordestino"
      );

      expect(project.id).toBeDefined();
      expect(project.title).toBe("Neo-Sertão 2099");
      expect(project.characters.length).toBeGreaterThan(0);
      expect(project.environments.length).toBeGreaterThan(0);
      expect(project.scenes.length).toBeGreaterThan(0);

      const state = await OnboardingService.getOnboardingState(userId);
      expect(state.onboardingCompleted).toBe(true);
    });
  });

  describe("2. Dashboard com Dados Reais", () => {
    it("deve agregar dados 100% reais do usuário, workspace e estatísticas", async () => {
      // Cria um projeto real com cena
      const project = await db.project.create({
        data: {
          workspaceId,
          title: "Curta Metragem Real",
          genre: "Drama",
          scenes: {
            create: {
              title: "Cena 1 - Abertura",
              order: 1,
              description: "Abertura dramática",
            },
          },
        },
      });

      const dashboard = await DashboardService.getDashboardData(userId, workspaceId);

      expect(dashboard.user.id).toBe(userId);
      expect(dashboard.workspace.id).toBe(workspaceId);
      expect(dashboard.stats.totalProjects).toBeGreaterThanOrEqual(1);
      expect(dashboard.stats.totalScenes).toBeGreaterThanOrEqual(1);
      expect(dashboard.recentProjects.some((p) => p.id === project.id)).toBe(true);
      expect(dashboard.usageSummary.creditsBalance).toBe(20);

      // Como o e-mail não foi verificado, deve conter alerta real de e-mail não confirmado
      expect(dashboard.alerts.some((a) => a.id === "email_unconfirmed")).toBe(true);
    });
  });

  describe("3. Configurações da Conta e Preferências", () => {
    it("deve atualizar nome de exibição e preferências JSON persistidas", async () => {
      const updated = await UserProfileService.updateProfile(userId, {
        displayName: "Diretora Renata Silva",
        preferences: {
          theme: "system",
          defaultPlatform: "OpenAI Sora",
          defaultAspectRatio: "2.39:1",
          compactView: true,
        },
      });

      expect(updated.displayName).toBe("Diretora Renata Silva");
      const prefs = updated.preferences as any;
      expect(prefs.defaultPlatform).toBe("OpenAI Sora");
      expect(prefs.compactView).toBe(true);
    });

    it("deve alterar senha validando a senha atual e revogando outras sessões", async () => {
      // Cria uma segunda sessão
      const crypto = await import("crypto");
      const secondHash = crypto.createHash("sha256").update("second_session").digest("hex");
      await db.session.create({
        data: {
          userId,
          tokenHash: secondHash,
          expiresAt: new Date(Date.now() + 86400000),
          userAgent: "Secondary Browser",
        },
      });

      // Altera senha informando a senha correta
      const result = await UserProfileService.changePassword(
        userId,
        plainPassword,
        "NewSecretPassword123!",
        sessionToken
      );

      expect(result.success).toBe(true);

      // Verifica se a segunda sessão foi revogada e apenas a atual persiste
      const activeSessions = await UserProfileService.listSessions(userId, sessionToken);
      expect(activeSessions.length).toBe(1);
      expect(activeSessions[0].isCurrent).toBe(true);

      // Rejeita tentativa de alteração com senha atual errada
      await expect(
        UserProfileService.changePassword(userId, "WrongPassword!", "AnotherOne123!", sessionToken)
      ).rejects.toThrow("A senha atual informada está incorreta.");
    });

    it("deve listar e revogar sessões ativas", async () => {
      const crypto = await import("crypto");
      const tempHash = crypto.createHash("sha256").update("temp_sess").digest("hex");
      const tempSession = await db.session.create({
        data: {
          userId,
          tokenHash: tempHash,
          expiresAt: new Date(Date.now() + 86400000),
          userAgent: "Mobile Safari",
        },
      });

      const listBefore = await UserProfileService.listSessions(userId, sessionToken);
      expect(listBefore.some((s) => s.id === tempSession.id)).toBe(true);

      await UserProfileService.revokeSession(userId, tempSession.id);

      const listAfter = await UserProfileService.listSessions(userId, sessionToken);
      expect(listAfter.some((s) => s.id === tempSession.id)).toBe(false);
    });
  });

  describe("4. Privacidade, Exportação LGPD e Exclusão de Conta", () => {
    it("deve exportar todos os dados pessoais do usuário em formato JSON estruturado (LGPD)", async () => {
      const exportData = await UserProfileService.exportUserData(userId);

      expect(exportData.exportMetadata.regulationCompliance).toContain("LGPD");
      expect(exportData.account.email).toBe(testEmail);
      expect(exportData.workspacesAndTeams.length).toBeGreaterThan(0);
      expect(exportData.activeSessions.length).toBeGreaterThan(0);
      // Garante que senhas ou hashes de senha NÃO são expostos na exportação
      expect((exportData.account as any).passwordHash).toBeUndefined();
    });

    it("deve excluir a conta com senha correta e integridade de dados", async () => {
      // Rejeita com senha errada
      await expect(
        UserProfileService.deleteAccount(userId, "IncorrectPassword!")
      ).rejects.toThrow("A senha digitada está incorreta.");

      // Exclui com senha correta
      const deleted = await UserProfileService.deleteAccount(userId, plainPassword);
      expect(deleted.success).toBe(true);

      const checkUser = await db.user.findUnique({ where: { id: userId } });
      expect(checkUser).toBeNull();
    });
  });
});
