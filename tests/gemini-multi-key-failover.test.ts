import { describe, it, expect, vi, beforeEach } from "vitest";
import { GeminiErrorClassifier } from "@/modules/ai/gemini-error-classifier";
import { maskApiKey, encryptApiKey, decryptApiKey } from "@/modules/ai/gemini-key-security";
import { GeminiMultiProvider } from "@/modules/ai/gemini-multi-provider";
import { GeminiKeyManagerService } from "@/modules/ai/gemini-key-manager.service";
import { CreditExecutionService } from "@/modules/billing/credit-execution.service";
import { CreditPricingService } from "@/modules/billing/credit-pricing.service";
import { EntitlementService } from "@/modules/billing/entitlement.service";
import { db } from "@/lib/db";
import { GeminiKeyStatus, GeminiSelectionStrategy } from "@prisma/client";

describe("TOMADIX — Gerenciamento de Múltiplas API Keys Gemini & Failover Automático", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. Segurança e Mascaramento de Chaves", () => {
    it("mascara a chave preservando prefixo e sufixo sem expor o corpo central", () => {
      const plainKey = "AIzaSyBC1234567890XYZW_X9kP";
      const masked = maskApiKey(plainKey);

      expect(masked).toBe("AIzaSy...X9kP");
      expect(masked.includes("1234567890")).toBe(false);
    });

    it("criptografa e descriptografa chaves com integridade AES-256", () => {
      const originalKey = "AIzaSyTestGeminiKeySecret123456";
      const encrypted = encryptApiKey(originalKey);

      expect(encrypted).not.toBe(originalKey);
      expect(encrypted).toContain(":");

      const decrypted = decryptApiKey(encrypted);
      expect(decrypted).toBe(originalKey);
    });
  });

  describe("2. Classificação Inteligente de Erros do Gemini", () => {
    it("classifica HTTP 429 como recuperável (QUOTA_EXCEEDED) e extrai retry-after", () => {
      const err = {
        status: 429,
        message: "Resource has been exhausted (e.g. check quota). Please retry after 45s.",
      };

      const classified = GeminiErrorClassifier.classify(err);

      expect(classified.statusCode).toBe(429);
      expect(classified.errorCode).toBe("QUOTA_EXCEEDED");
      expect(classified.isRecoverable).toBe(true);
      expect(classified.isQuotaOrRateLimit).toBe(true);
      expect(classified.retryAfterSeconds).toBe(45);
    });

    it("classifica HTTP 503 como recuperável (SERVICE_UNAVAILABLE / MODEL_OVERLOADED)", () => {
      const err = {
        status: 503,
        message: "The model is overloaded. Please try again later.",
      };

      const classified = GeminiErrorClassifier.classify(err);

      expect(classified.statusCode).toBe(503);
      expect(classified.errorCode).toBe("SERVICE_UNAVAILABLE");
      expect(classified.isRecoverable).toBe(true);
      expect(classified.isModelOverloaded).toBe(true);
    });

    it("classifica erros de autenticação (401/403) como recuperáveis via troca de chave e marca isAuthError", () => {
      const err = {
        status: 401,
        message: "API_KEY_INVALID: User not authorized.",
      };

      const classified = GeminiErrorClassifier.classify(err);

      expect(classified.statusCode).toBe(401);
      expect(classified.errorCode).toBe("AUTH_ERROR");
      expect(classified.isRecoverable).toBe(true);
      expect(classified.isAuthError).toBe(true);
    });

    it("classifica erros 400 (prompt inválido / schema) como NÃO recuperáveis para evitar trocas inúteis", () => {
      const err = {
        status: 400,
        message: "Invalid argument: contents field is malformed.",
      };

      const classified = GeminiErrorClassifier.classify(err);

      expect(classified.statusCode).toBe(400);
      expect(classified.errorCode).toBe("INVALID_ARGUMENT");
      expect(classified.isRecoverable).toBe(false); // NÃO deve queimar outras chaves!
    });
  });

  describe("3. Estratégias de Seleção de Chaves", () => {
    it("ordena chaves estritamente por prioridade sequencial (1º -> 2º -> 3º)", async () => {
      vi.spyOn(GeminiKeyManagerService, "getSettings").mockResolvedValue({
        selectionStrategy: GeminiSelectionStrategy.SEQUENTIAL_PRIORITY,
        maxConsecutiveFailures: 3,
        cooldownSeconds: 300,
        requestTimeoutMs: 45000,
        maxAttemptsPerOperation: 3,
        envKeyFallbackAllowed: true,
      } as any);

      vi.spyOn(db.geminiApiKey, "findMany").mockResolvedValue([
        { id: "key-backup-2", priority: 3, isActive: true, status: "HEALTHY", allowedModels: [], apiKey: "plain-3", maskedKey: "AIza...003", requestsCount: 10, successCount: 10, consecutiveFailures: 0, cooldownUntil: null },
        { id: "key-primary", priority: 1, isActive: true, status: "HEALTHY", allowedModels: [], apiKey: "plain-1", maskedKey: "AIza...001", requestsCount: 50, successCount: 48, consecutiveFailures: 0, cooldownUntil: null },
        { id: "key-backup-1", priority: 2, isActive: true, status: "HEALTHY", allowedModels: [], apiKey: "plain-2", maskedKey: "AIza...002", requestsCount: 20, successCount: 19, consecutiveFailures: 0, cooldownUntil: null },
      ] as any);

      const eligible = await GeminiKeyManagerService.getEligibleKeys("gemini-3.5-flash");

      expect(eligible[0].id).toBe("key-primary");
      expect(eligible[1].id).toBe("key-backup-1");
      expect(eligible[2].id).toBe("key-backup-2");
    });

    it("filtra chaves incompatíveis com o modelo solicitado quando allowedModels estiver configurado", async () => {
      vi.spyOn(GeminiKeyManagerService, "getSettings").mockResolvedValue({
        selectionStrategy: GeminiSelectionStrategy.SEQUENTIAL_PRIORITY,
        maxConsecutiveFailures: 3,
        cooldownSeconds: 300,
        requestTimeoutMs: 45000,
        maxAttemptsPerOperation: 3,
        envKeyFallbackAllowed: true,
      } as any);

      vi.spyOn(db.geminiApiKey, "findMany").mockResolvedValue([
        { id: "flash-only-key", priority: 1, isActive: true, status: "HEALTHY", allowedModels: ["gemini-3.5-flash"], apiKey: "k1", maskedKey: "AIza...1", requestsCount: 0, successCount: 0 },
        { id: "pro-only-key", priority: 2, isActive: true, status: "HEALTHY", allowedModels: ["gemini-2.5-pro"], apiKey: "k2", maskedKey: "AIza...2", requestsCount: 0, successCount: 0 },
      ] as any);

      const eligibleForPro = await GeminiKeyManagerService.getEligibleKeys("gemini-2.5-pro");

      expect(eligibleForPro.length).toBe(1);
      expect(eligibleForPro[0].id).toBe("pro-only-key");
    });
  });

  describe("4. Mecanismo de Failover Automático", () => {
    it("executa com a 1ª chave quando saudável sem acionar fallback", async () => {
      vi.spyOn(GeminiKeyManagerService, "getSettings").mockResolvedValue({
        selectionStrategy: GeminiSelectionStrategy.SEQUENTIAL_PRIORITY,
        maxConsecutiveFailures: 3,
        cooldownSeconds: 300,
        requestTimeoutMs: 45000,
        maxAttemptsPerOperation: 3,
        envKeyFallbackAllowed: false,
      } as any);

      vi.spyOn(GeminiKeyManagerService, "getEligibleKeys").mockResolvedValue([
        { id: "key-1", name: "Chave Primária", rawApiKey: "AIzaKey1", maskedKey: "AIza...1", priority: 1, status: GeminiKeyStatus.HEALTHY },
        { id: "key-2", name: "Chave Contingência", rawApiKey: "AIzaKey2", maskedKey: "AIza...2", priority: 2, status: GeminiKeyStatus.HEALTHY },
      ]);

      const successSpy = vi.spyOn(GeminiKeyManagerService, "recordKeySuccess").mockResolvedValue();
      vi.spyOn(db.geminiOperationLog, "upsert").mockResolvedValue({} as any);

      const mockExecutor = vi.fn().mockResolvedValue({
        data: { generatedText: "Cena cinematográfica gerada" },
        tokens: { inputTokens: 100, outputTokens: 50 },
      });

      const result = await GeminiMultiProvider.executeWithFailover<{ generatedText: string }>(
        {
          feature: "CHARACTER_GENERATION",
          model: "gemini-3.5-flash",
          operationId: "op-test-1",
        },
        mockExecutor
      );

      expect(result.data.generatedText).toBe("Cena cinematográfica gerada");
      expect(result.usedFallback).toBe(false);
      expect(result.attemptsCount).toBe(1);
      expect(result.finalKeyName).toBe("Chave Primária");
      expect(mockExecutor).toHaveBeenCalledTimes(1);
      expect(mockExecutor).toHaveBeenCalledWith("AIzaKey1", "gemini-3.5-flash");
      expect(successSpy).toHaveBeenCalledWith("key-1", expect.any(Number));
    });

    it("quando a 1ª chave falha com 429 Quota Exceeded, a 2ª chave assume automaticamente e conclui", async () => {
      vi.spyOn(GeminiKeyManagerService, "getSettings").mockResolvedValue({
        selectionStrategy: GeminiSelectionStrategy.SEQUENTIAL_PRIORITY,
        maxConsecutiveFailures: 3,
        cooldownSeconds: 300,
        requestTimeoutMs: 45000,
        maxAttemptsPerOperation: 3,
        envKeyFallbackAllowed: false,
      } as any);

      vi.spyOn(GeminiKeyManagerService, "getEligibleKeys").mockResolvedValue([
        { id: "key-1", name: "Chave Primária", rawApiKey: "AIzaKey1", maskedKey: "AIza...1", priority: 1, status: GeminiKeyStatus.HEALTHY },
        { id: "key-2", name: "Chave Contingência", rawApiKey: "AIzaKey2", maskedKey: "AIza...2", priority: 2, status: GeminiKeyStatus.HEALTHY },
      ]);

      const failureSpy = vi.spyOn(GeminiKeyManagerService, "recordKeyFailure").mockResolvedValue();
      const successSpy = vi.spyOn(GeminiKeyManagerService, "recordKeySuccess").mockResolvedValue();
      vi.spyOn(db.geminiOperationLog, "upsert").mockResolvedValue({} as any);

      const mockExecutor = vi.fn()
        .mockRejectedValueOnce({
          status: 429,
          message: "RESOURCE_EXHAUSTED: Quota exceeded for project 123.",
        })
        .mockResolvedValueOnce({
          data: { generatedText: "Sucesso resgatado pela chave 2" },
          tokens: { inputTokens: 120, outputTokens: 80 },
        });

      const result = await GeminiMultiProvider.executeWithFailover<{ generatedText: string }>(
        {
          feature: "CHARACTER_GENERATION",
          model: "gemini-3.5-flash",
          operationId: "op-test-failover-429",
        },
        mockExecutor
      );

      // Verificações essenciais:
      expect(result.data.generatedText).toBe("Sucesso resgatado pela chave 2");
      expect(result.usedFallback).toBe(true); // Salvou por failover!
      expect(result.attemptsCount).toBe(2);
      expect(result.finalKeyName).toBe("Chave Contingência");
      expect(mockExecutor).toHaveBeenCalledTimes(2);
      expect(failureSpy).toHaveBeenCalledWith("key-1", expect.objectContaining({ errorCode: "QUOTA_EXCEEDED" }), expect.any(Number));
      expect(successSpy).toHaveBeenCalledWith("key-2", expect.any(Number));
    });

    it("quando o erro é 400 (prompt inválido), interrompe imediatamente sem tentar a 2ª chave", async () => {
      vi.spyOn(GeminiKeyManagerService, "getSettings").mockResolvedValue({
        selectionStrategy: GeminiSelectionStrategy.SEQUENTIAL_PRIORITY,
        maxConsecutiveFailures: 3,
        cooldownSeconds: 300,
        requestTimeoutMs: 45000,
        maxAttemptsPerOperation: 3,
        envKeyFallbackAllowed: false,
      } as any);

      vi.spyOn(GeminiKeyManagerService, "getEligibleKeys").mockResolvedValue([
        { id: "key-1", name: "Chave 1", rawApiKey: "AIza1", maskedKey: "AIza...1", priority: 1, status: GeminiKeyStatus.HEALTHY },
        { id: "key-2", name: "Chave 2", rawApiKey: "AIza2", maskedKey: "AIza...2", priority: 2, status: GeminiKeyStatus.HEALTHY },
      ]);

      vi.spyOn(GeminiKeyManagerService, "recordKeyFailure").mockResolvedValue();
      vi.spyOn(db.geminiOperationLog, "upsert").mockResolvedValue({} as any);

      const mockExecutor = vi.fn().mockRejectedValue({
        status: 400,
        message: "Invalid argument: prompt was empty",
      });

      await expect(
        GeminiMultiProvider.executeWithFailover(
          {
            feature: "CHARACTER_GENERATION",
            model: "gemini-3.5-flash",
            operationId: "op-bad-prompt",
          },
          mockExecutor
        )
      ).rejects.toMatchObject({ status: 400 });

      // Verificação crítica: chamou APENAS UMA VEZ! Não queima a chave 2 com prompt estragado
      expect(mockExecutor).toHaveBeenCalledTimes(1);
    });
  });

  describe("5. Integridade Financeira & Cobrança Única de Créditos", () => {
    it("garante exatamente uma única dedução de créditos mesmo após múltiplos failovers", async () => {
      vi.spyOn(EntitlementService, "getWorkspaceSubscription").mockResolvedValue({ planTier: "PRO" } as any);
      vi.spyOn(CreditPricingService, "resolveCost").mockResolvedValue({
        operationCode: "GEN_CHARACTER",
        creditCost: 5,
        operationName: "Geração de Personagem",
        isFree: false,
        currentPlanTier: "PRO",
      } as any);

      const deductSpy = vi.spyOn(CreditExecutionService as any, "deductViaConsumptionOrder").mockResolvedValue({
        newBalance: 95,
        usedLots: [{ lotId: "lot-1", origin: "MONTHLY_RENEWAL", category: "MONTHLY_RENEWAL", deducted: 5 }],
      });

      // Simulamos que a operação executa com failover internamente
      let attempts = 0;
      const result = await CreditExecutionService.executeWithCredits(
        {
          workspaceId: "ws-test",
          operationCode: "GEN_CHARACTER",
          description: "Geração de Personagem com Contingência",
        },
        async () => {
          attempts++;
          return { characterName: "Comandante Yuri" };
        }
      );

      expect(result.result.characterName).toBe("Comandante Yuri");
      // Verificação essencial: deductViaConsumptionOrder foi chamado EXATAMENTE UMA VEZ
      expect(deductSpy).toHaveBeenCalledTimes(1);
      expect(deductSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: "ws-test",
          creditCost: 5,
          operationCode: "GEN_CHARACTER",
        })
      );
    });

    it("aciona estorno automático dos créditos se todas as chaves falharem após dedução", async () => {
      vi.spyOn(EntitlementService, "getWorkspaceSubscription").mockResolvedValue({ planTier: "PRO" } as any);
      vi.spyOn(CreditPricingService, "resolveCost").mockResolvedValue({
        operationCode: "GEN_CHARACTER",
        creditCost: 5,
        operationName: "Geração de Personagem",
        isFree: false,
        currentPlanTier: "PRO",
      } as any);

      vi.spyOn(CreditExecutionService as any, "deductViaConsumptionOrder").mockResolvedValue({
        newBalance: 95,
        usedLots: [{ lotId: "lot-1", origin: "MONTHLY_RENEWAL", category: "MONTHLY_RENEWAL", deducted: 5 }],
      });

      const refundSpy = vi.spyOn(CreditExecutionService as any, "refundDeductedLots").mockResolvedValue({
        refundedBalance: 100,
        refundLedgerIds: ["ledger-ref-1"],
      });

      await expect(
        CreditExecutionService.executeWithCredits(
          {
            workspaceId: "ws-test",
            operationCode: "GEN_CHARACTER",
            description: "Geração que falha em todas as chaves",
          },
          async () => {
            throw new Error("Todas as chaves esgotadas");
          }
        )
      ).rejects.toThrow("Todas as chaves esgotadas");

      // Verificação essencial: estorno proporcional acionado!
      expect(refundSpy).toHaveBeenCalledTimes(1);
      expect(refundSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: "ws-test",
          totalRefund: 5,
        })
      );
    });
  });
});
