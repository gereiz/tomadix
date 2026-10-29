import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { db } from "@/lib/db";
import { PlatformRole, WorkspaceRole } from "@prisma/client";
import {
  PlatformSettingsService,
  DEFAULT_CUSTOMIZATION,
  DEFAULT_GENERAL_SETTINGS,
} from "@/modules/admin/platform-settings.service";

describe("Console Administrativo — Personalização, Configurações Gerais e Limpeza", () => {
  let adminUserId: string;
  let testUserId: string;
  let testWorkspaceId: string;

  beforeEach(async () => {
    const rand = Math.random().toString(36).substring(7);

    // Cria um admin para os testes
    const adminUser = await db.user.create({
      data: {
        authSubject: `auth_adm_test_${Date.now()}_${rand}`,
        email: `adm_${Date.now()}_${rand}@example.com`,
        displayName: "Admin Tester",
        platformRole: PlatformRole.SUPER_ADMIN,
      },
    });
    adminUserId = adminUser.id;

    // Cria um usuário e estúdio de teste com sufixo de teste explícito
    const testUser = await db.user.create({
      data: {
        authSubject: `auth_test_user_${Date.now()}_${rand}`,
        email: `test_cleanup_${Date.now()}_${rand}@test.com`,
        displayName: "Usuário Teste Cleanup",
        platformRole: PlatformRole.USER,
      },
    });
    testUserId = testUser.id;

    const testWs = await db.workspace.create({
      data: {
        name: `Estúdio de Teste ${rand}`,
        slug: `estudio-teste-${Date.now()}-${rand}`,
        isPersonal: true,
        memberships: {
          create: {
            userId: testUser.id,
            role: WorkspaceRole.OWNER,
          },
        },
      },
    });
    testWorkspaceId = testWs.id;
  });

  afterAll(async () => {
    // Limpeza segura dos registros criados pelo teste
    await db.workspace.deleteMany({
      where: { id: testWorkspaceId },
    }).catch(() => {});

    await db.user.deleteMany({
      where: { id: { in: [adminUserId, testUserId] } },
    }).catch(() => {});
  });

  describe("1. Personalização Visual da Plataforma", () => {
    it("deve carregar personalização padrão ou salva", async () => {
      const customization = await PlatformSettingsService.getCustomization();
      expect(customization).toBeDefined();
      expect(customization.primaryColor).toBeDefined();
      expect(customization.brandName).toBeDefined();
    });

    it("deve salvar nova paleta de cores e registrar auditoria", async () => {
      const updated = await PlatformSettingsService.updateCustomization(
        {
          primaryColor: "#10b981",
          secondaryColor: "#059669",
          brandName: "Tomadix Studio Pro",
        },
        adminUserId
      );

      expect(updated.primaryColor).toBe("#10b981");
      expect(updated.brandName).toBe("Tomadix Studio Pro");

      const saved = await PlatformSettingsService.getCustomization();
      expect(saved.primaryColor).toBe("#10b981");
      expect(saved.brandName).toBe("Tomadix Studio Pro");

      // Verifica log de auditoria
      const log = await db.platformAuditLog.findFirst({
        where: {
          adminUserId,
          action: "PLATFORM_CUSTOMIZATION_UPDATED",
        },
      });
      expect(log).toBeDefined();
    });

    it("deve restaurar configurações padrão ao chamar resetCustomization", async () => {
      const reset = await PlatformSettingsService.resetCustomization(adminUserId);
      expect(reset.brandName).toBe(DEFAULT_CUSTOMIZATION.brandName);
      expect(reset.primaryColor).toBe(DEFAULT_CUSTOMIZATION.primaryColor);
    });
  });

  describe("2. Configurações Gerais da Plataforma", () => {
    it("deve carregar configurações gerais padrão", async () => {
      const settings = await PlatformSettingsService.getGeneralSettings();
      expect(settings).toBeDefined();
      expect(settings.maintenanceMode).toBe(false);
      expect(settings.contactEmail).toBeDefined();
    });

    it("deve atualizar modo de manutenção e feature flags com auditoria", async () => {
      const updated = await PlatformSettingsService.updateGeneralSettings(
        {
          maintenanceMode: true,
          maintenanceMessage: "Atualização de servidores em andamento.",
          featureFlags: {
            ...DEFAULT_GENERAL_SETTINGS.featureFlags,
            registrationEnabled: false,
          },
        },
        adminUserId
      );

      expect(updated.maintenanceMode).toBe(true);
      expect(updated.maintenanceMessage).toBe("Atualização de servidores em andamento.");
      expect(updated.featureFlags.registrationEnabled).toBe(false);

      // Reverte para o padrão
      await PlatformSettingsService.updateGeneralSettings(
        {
          maintenanceMode: false,
          featureFlags: {
            ...DEFAULT_GENERAL_SETTINGS.featureFlags,
            registrationEnabled: true,
          },
        },
        adminUserId
      );
    });
  });

  describe("3. Auditoria e Limpeza Segura de Dados de Teste", () => {
    it("deve analisar o banco e identificar usuários e estúdios de teste preservando dados reais", async () => {
      const analysis = await PlatformSettingsService.analyzeTestData();

      expect(analysis.safetyStatus).toBe("SAFE_VERIFIED");
      expect(analysis.preservedRealData.usersCount).toBeGreaterThanOrEqual(1);

      // Usuário de teste criado no beforeEach deve estar nos elegíveis
      expect(analysis.eligibleTestData.total).toBeGreaterThanOrEqual(1);
      expect(analysis.eligibleTestData.usersCount).toBeGreaterThanOrEqual(1);
    });

    it("deve REJEITAR limpeza se a frase de confirmação estiver incorreta", async () => {
      await expect(
        PlatformSettingsService.executeTestDataCleanup(adminUserId, "CONFIRMAR")
      ).rejects.toThrow("Frase de confirmação de segurança incorreta");
    });

    it("deve executar a limpeza quando a frase exata for fornecida", async () => {
      const report = await PlatformSettingsService.executeTestDataCleanup(
        adminUserId,
        "EXCLUIR DADOS DE TESTE"
      );

      expect(report.success).toBe(true);
      expect(report.summary.deletedUsers).toBeGreaterThanOrEqual(1);
      expect(report.preserved.usersCount).toBeGreaterThanOrEqual(1);

      // O usuário de teste deve ter sido removido
      const testUserCheck = await db.user.findUnique({
        where: { id: testUserId },
      });
      expect(testUserCheck).toBeNull();
    }, 60000);
  });

  describe("4. Diagnósticos Operacionais", () => {
    it("deve retornar estado do banco, latência e memória", async () => {
      const diagnostics = await PlatformSettingsService.getDiagnostics();
      expect(diagnostics.database.status).toBe("OK");
      expect(diagnostics.database.latencyMs).toBeGreaterThanOrEqual(0);
      expect(diagnostics.system.nodeVersion).toBeDefined();
      expect(diagnostics.system.memory.heapUsedMb).toBeGreaterThan(0);
    });
  });
});

