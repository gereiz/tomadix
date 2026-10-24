import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { PlatformRole, WorkspaceRole } from "@prisma/client";
import { rateLimiter, RateLimitRule } from "@/lib/rate-limiter";
import { logger } from "@/lib/logger";
import { PrivacyService } from "@/modules/privacy/privacy.service";
import { AdminAuditService } from "@/modules/admin/admin-audit.service";

describe("Produção, LGPD e Confiabilidade (Production Readiness Suite)", () => {
  let testUserId: string;
  let testUserEmail: string;
  let adminUserId: string;

  beforeEach(async () => {
    const passwordHash = await bcrypt.hash("ProdTest123!", 10);
    const rand = Math.random().toString(36).substring(7);

    // 1. Usuário de teste
    testUserEmail = `lgpd_user_${Date.now()}_${rand}@example.com`;
    const user = await db.user.create({
      data: {
        authSubject: `auth_lgpd_${Date.now()}_${rand}`,
        email: testUserEmail,
        displayName: "Titular de Dados LGPD",
        passwordHash,
        platformRole: PlatformRole.USER,
      },
    });
    testUserId = user.id;

    // 2. Administrador para resolução de DSR
    const admin = await db.user.create({
      data: {
        authSubject: `auth_admin_${Date.now()}_${rand}`,
        email: `dpo_admin_${Date.now()}_${rand}@example.com`,
        displayName: "Encarregado DPO",
        passwordHash,
        platformRole: PlatformRole.SUPER_ADMIN,
      },
    });
    adminUserId = admin.id;
  });

  describe("1. Mecanismo de Rate Limiting e Proteção Contra Abusos", () => {
    it("deve permitir requisições dentro do limite estipulado", async () => {
      const config: RateLimitRule = { limit: 3, windowSeconds: 10 };
      const testKey = `test_rate_allow_${Date.now()}`;

      const res1 = rateLimiter.check(testKey, config);
      expect(res1.success).toBe(true);
      expect(res1.remaining).toBe(2);

      const res2 = rateLimiter.check(testKey, config);
      expect(res2.success).toBe(true);
      expect(res2.remaining).toBe(1);

      const res3 = rateLimiter.check(testKey, config);
      expect(res3.success).toBe(true);
      expect(res3.remaining).toBe(0);
    });

    it("deve bloquear e retornar 429 com retryAfter quando o limite for excedido", async () => {
      const config: RateLimitRule = { limit: 2, windowSeconds: 30 };
      const testKey = `test_rate_block_${Date.now()}`;

      rateLimiter.check(testKey, config);
      rateLimiter.check(testKey, config);

      const blockedRes = rateLimiter.check(testKey, config);
      expect(blockedRes.success).toBe(false);
      expect(blockedRes.remaining).toBe(0);
      expect(blockedRes.retryAfter).toBeGreaterThan(0);
      expect(blockedRes.retryAfter).toBeLessThanOrEqual(30);
    });

    it("deve isolar contadores entre chaves/IPs distintos", async () => {
      const config: RateLimitRule = { limit: 1, windowSeconds: 10 };
      const keyA = `ip_192_168_1_1_${Date.now()}`;
      const keyB = `ip_192_168_1_2_${Date.now()}`;

      const resA1 = rateLimiter.check(keyA, config);
      expect(resA1.success).toBe(true);

      const resA2 = rateLimiter.check(keyA, config);
      expect(resA2.success).toBe(false);

      // Key B não pode ser afetada pelo bloqueio da Key A
      const resB1 = rateLimiter.check(keyB, config);
      expect(resB1.success).toBe(true);
    });
  });

  describe("2. Higienização e Sanitização de Logs", () => {
    it("deve redigir automaticamente chaves sensíveis como senhas, tokens e secrets", () => {
      const rawData = {
        email: "user@example.com",
        password: "MySuperSecretPassword123!",
        token: "jwt_token_sensitive_xyz",
        apiKey: "ai_studio_api_key_12345",
        cookie: "session_token=abcdef",
        safeMeta: "informacao_segura",
      };

      const sanitized = logger.sanitize(rawData);

      expect(sanitized.email).toBe("user@example.com");
      expect(sanitized.password).toBe("[REDACTED]");
      expect(sanitized.token).toBe("[REDACTED]");
      expect(sanitized.apiKey).toBe("[REDACTED]");
      expect(sanitized.cookie).toBe("[REDACTED]");
      expect(sanitized.safeMeta).toBe("informacao_segura");
    });
  });

  describe("3. LGPD: Registro e Consulta de Consentimentos (Art. 7º, I)", () => {
    it("deve registrar o consentimento do usuário para termos e políticas", async () => {
      const consent = await PrivacyService.recordConsent({
        userId: testUserId,
        consentType: "TERMS_OF_SERVICE",
        version: "v1.0-2026-10",
        ipAddress: "189.40.12.50",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      });

      expect(consent).toBeDefined();
      expect(consent.id).toBeDefined();
      expect(consent.consentType).toBe("TERMS_OF_SERVICE");
      expect(consent.version).toBe("v1.0-2026-10");
      expect(consent.ipAddress).toBe("189.40.12.50");

      const hasConsent = await PrivacyService.hasActiveConsent(testUserId, "TERMS_OF_SERVICE", "v1.0-2026-10");
      expect(hasConsent).toBe(true);
    });

    it("deve listar o histórico completo de consentimentos do titular", async () => {
      await PrivacyService.recordConsent({
        userId: testUserId,
        consentType: "PRIVACY_POLICY",
        version: "v1.0-2026-10",
      });
      await PrivacyService.recordConsent({
        userId: testUserId,
        consentType: "MARKETING_COOKIES",
        version: "v1.0-2026-10",
      });

      const list = await PrivacyService.listUserConsents(testUserId);
      expect(list.length).toBeGreaterThanOrEqual(2);
      const types = list.map((c) => c.consentType);
      expect(types).toContain("PRIVACY_POLICY");
      expect(types).toContain("MARKETING_COOKIES");
    });
  });

  describe("4. LGPD: Ciclo de Vida de Solicitações do Titular (DSR / DSAR - Art. 18)", () => {
    it("deve permitir que o titular abra uma solicitação de exclusão ou acesso", async () => {
      const dsr = await PrivacyService.createDataSubjectRequest({
        userId: testUserId,
        requestType: "DELETION",
        email: testUserEmail,
        details: "Solicito exclusão dos dados de perfil e projetos conforme Art. 18, VI da LGPD.",
      });

      expect(dsr).toBeDefined();
      expect(dsr.status).toBe("PENDING");
      expect(dsr.requestType).toBe("DELETION");
      expect(dsr.email).toBe(testUserEmail);
    });

    it("deve permitir que o operador administrativo consulte e atenda a solicitação de DSR", async () => {
      const dsr = await PrivacyService.createDataSubjectRequest({
        userId: testUserId,
        requestType: "ACCESS",
        email: testUserEmail,
        details: "Solicito relatório consolidado de todos os meus dados.",
      });

      // Admin lista DSRs
      const pendingList = await PrivacyService.listDataSubjectRequests({ status: "PENDING" });
      const found = pendingList.requests.find((item) => item.id === dsr.id);
      expect(found).toBeDefined();

      // Admin conclui a solicitação com notas de resolução
      const resolved = await PrivacyService.resolveDataSubjectRequest(
        adminUserId,
        dsr.id,
        "Relatório de dados exportado e enviado ao titular em conformidade com Art. 18, II da LGPD.",
        "COMPLETED"
      );

      expect(resolved.status).toBe("COMPLETED");
      expect(resolved.resolvedAt).toBeDefined();
      expect(resolved.resolution).toContain("Relatório de dados exportado");

      // Deve ter registrado na auditoria da plataforma
      const auditLogs = await AdminAuditService.listLogs({ action: "DSR_COMPLETED" });
      const dsrAudit = auditLogs.logs.find((l) => l.targetId === dsr.id);
      expect(dsrAudit).toBeDefined();
      expect(dsrAudit?.action).toBe("DSR_COMPLETED");
    });
  });

  describe("5. Confiabilidade e Saúde do Banco de Dados", () => {
    it("deve executar ping e queries de verificação no banco em milissegundos", async () => {
      const start = Date.now();
      const result = await db.$queryRawUnsafe<Array<{ pong: number }>>("SELECT 1 as pong");
      const latency = Date.now() - start;

      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect(latency).toBeLessThan(1500); // Latência aceitável de rede
    });
  });
});
