import { db } from "@/lib/db";
import { GeminiApiKey, GeminiKeyStatus, GeminiSelectionStrategy, Prisma } from "@prisma/client";
import { encryptApiKey, decryptApiKey, maskApiKey } from "./gemini-key-security";
import { ClassifiedGeminiError } from "./gemini-error-classifier";
import { GoogleGenAI } from "@google/genai";

export interface CreateGeminiKeyInput {
  name: string;
  apiKey: string;
  priority?: number;
  isActive?: boolean;
  allowedModels?: string[];
  notes?: string;
}

export interface UpdateGeminiKeyInput {
  name?: string;
  apiKey?: string; // Se fornecida, substitui a chave anterior
  priority?: number;
  isActive?: boolean;
  allowedModels?: string[];
  notes?: string;
}

export interface GeminiKeyPublicView {
  id: string;
  name: string;
  maskedKey: string;
  isActive: boolean;
  priority: number;
  status: GeminiKeyStatus;
  requestsCount: number;
  successCount: number;
  failuresCount: number;
  consecutiveFailures: number;
  successRate: number;
  lastUsedAt: Date | null;
  lastSuccessAt: Date | null;
  lastFailedAt: Date | null;
  cooldownUntil: Date | null;
  isCoolingDown: boolean;
  cooldownRemainingSeconds: number;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  allowedModels: string[];
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class GeminiKeyManagerService {
  /**
   * Obtém as configurações globais de seleção e failover do Gemini.
   */
  static async getSettings() {
    let settings = await db.geminiSettings.findFirst();

    if (!settings) {
      settings = await db.geminiSettings.create({
        data: {
          selectionStrategy: GeminiSelectionStrategy.SEQUENTIAL_PRIORITY,
          maxConsecutiveFailures: 3,
          cooldownSeconds: 300,
          requestTimeoutMs: 45000,
          maxAttemptsPerOperation: 3,
          envKeyFallbackAllowed: true,
        },
      });
    }

    return settings;
  }

  /**
   * Atualiza as configurações globais de failover.
   */
  static async updateSettings(
    data: {
      selectionStrategy?: GeminiSelectionStrategy;
      maxConsecutiveFailures?: number;
      cooldownSeconds?: number;
      requestTimeoutMs?: number;
      maxAttemptsPerOperation?: number;
      envKeyFallbackAllowed?: boolean;
    },
    adminUserId?: string
  ) {
    const current = await this.getSettings();

    return db.geminiSettings.update({
      where: { id: current.id },
      data: {
        ...data,
        updatedByUserId: adminUserId || null,
      },
    });
  }

  /**
   * Inicializa automaticamente a primeira chave no banco a partir de process.env.GEMINI_API_KEY
   * caso nenhuma chave tenha sido cadastrada ainda.
   */
  static async seedInitialKeyFromEnv() {
    const count = await db.geminiApiKey.count();
    if (count > 0) return;

    const envKey = process.env.GEMINI_API_KEY;
    if (envKey && envKey.trim().length > 10) {
      await db.geminiApiKey.create({
        data: {
          name: "Chave Principal (Variável de Ambiente)",
          apiKey: encryptApiKey(envKey.trim()),
          maskedKey: maskApiKey(envKey.trim()),
          isActive: true,
          priority: 1,
          status: GeminiKeyStatus.HEALTHY,
          notes: "Criada automaticamente a partir da variável de ambiente GEMINI_API_KEY do servidor.",
        },
      });
    }
  }

  /**
   * Converte o registro interno de banco para a visão pública administrativa segura (sem raw apiKey).
   */
  private static formatKeyForAdmin(key: GeminiApiKey): GeminiKeyPublicView {
    const total = key.requestsCount;
    const successRate = total > 0 ? Math.round((key.successCount / total) * 100) : 100;
    const now = Date.now();
    const cooldownTime = key.cooldownUntil ? key.cooldownUntil.getTime() : 0;
    const isCoolingDown = cooldownTime > now;
    const cooldownRemainingSeconds = isCoolingDown ? Math.ceil((cooldownTime - now) / 1000) : 0;

    return {
      id: key.id,
      name: key.name,
      maskedKey: key.maskedKey,
      isActive: key.isActive,
      priority: key.priority,
      status: key.status,
      requestsCount: key.requestsCount,
      successCount: key.successCount,
      failuresCount: key.failuresCount,
      consecutiveFailures: key.consecutiveFailures,
      successRate,
      lastUsedAt: key.lastUsedAt,
      lastSuccessAt: key.lastSuccessAt,
      lastFailedAt: key.lastFailedAt,
      cooldownUntil: key.cooldownUntil,
      isCoolingDown,
      cooldownRemainingSeconds,
      lastErrorCode: key.lastErrorCode,
      lastErrorMessage: key.lastErrorMessage,
      allowedModels: key.allowedModels,
      notes: key.notes,
      createdAt: key.createdAt,
      updatedAt: key.updatedAt,
    };
  }

  /**
   * Lista todas as chaves cadastradas para o painel administrativo.
   */
  static async listKeys(): Promise<GeminiKeyPublicView[]> {
    await this.seedInitialKeyFromEnv();

    const keys = await db.geminiApiKey.findMany({
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    });

    return keys.map((k) => this.formatKeyForAdmin(k));
  }

  /**
   * Cadastra uma nova chave de API Gemini no sistema.
   */
  static async createKey(input: CreateGeminiKeyInput, adminUserId?: string): Promise<GeminiKeyPublicView> {
    const rawKey = input.apiKey?.trim();
    if (!rawKey || rawKey.length < 10) {
      throw new Error("A API Key informada é inválida ou muito curta.");
    }

    const name = input.name?.trim() || "Nova Chave Gemini";
    const masked = maskApiKey(rawKey);
    const encrypted = encryptApiKey(rawKey);

    // Se priority não for fornecida, coloca como próxima na fila
    let priority = input.priority;
    if (!priority || priority < 1) {
      const maxPriority = await db.geminiApiKey.aggregate({
        _max: { priority: true },
      });
      priority = (maxPriority._max.priority || 0) + 1;
    }

    const created = await db.geminiApiKey.create({
      data: {
        name,
        apiKey: encrypted,
        maskedKey: masked,
        priority,
        isActive: input.isActive ?? true,
        allowedModels: input.allowedModels || [],
        notes: input.notes?.trim() || null,
        status: GeminiKeyStatus.HEALTHY,
        createdById: adminUserId || null,
      },
    });

    return this.formatKeyForAdmin(created);
  }

  /**
   * Atualiza uma chave existente.
   */
  static async updateKey(id: string, input: UpdateGeminiKeyInput): Promise<GeminiKeyPublicView> {
    const existing = await db.geminiApiKey.findUnique({ where: { id } });
    if (!existing) {
      throw new Error(`Chave [${id}] não encontrada.`);
    }

    const updateData: Prisma.GeminiApiKeyUpdateInput = {};

    if (typeof input.name === "string" && input.name.trim() !== "") {
      updateData.name = input.name.trim();
    }
    if (typeof input.isActive === "boolean") {
      updateData.isActive = input.isActive;
    }
    if (typeof input.priority === "number" && input.priority >= 1) {
      updateData.priority = input.priority;
    }
    if (Array.isArray(input.allowedModels)) {
      updateData.allowedModels = input.allowedModels;
    }
    if (input.notes !== undefined) {
      updateData.notes = input.notes?.trim() || null;
    }

    // Se o operador inseriu uma nova API Key para atualizar
    if (input.apiKey && input.apiKey.trim().length >= 10) {
      const cleanKey = input.apiKey.trim();
      updateData.apiKey = encryptApiKey(cleanKey);
      updateData.maskedKey = maskApiKey(cleanKey);
      // Se a chave estava inválida, restaura para HEALTHY ao trocar
      updateData.status = GeminiKeyStatus.HEALTHY;
      updateData.consecutiveFailures = 0;
      updateData.cooldownUntil = null;
    }

    const updated = await db.geminiApiKey.update({
      where: { id },
      data: updateData,
    });

    return this.formatKeyForAdmin(updated);
  }

  /**
   * Remove uma chave de API com confirmação.
   */
  static async deleteKey(id: string) {
    const existing = await db.geminiApiKey.findUnique({ where: { id } });
    if (!existing) {
      throw new Error(`Chave [${id}] não encontrada.`);
    }

    await db.geminiApiKey.delete({ where: { id } });
    return { success: true, message: `Chave "${existing.name}" removida com sucesso.` };
  }

  /**
   * Reordena as prioridades das chaves na sequência indicada de IDs.
   */
  static async reorderPriorities(orderedIds: string[]) {
    await db.$transaction(async (tx) => {
      for (let i = 0; i < orderedIds.length; i++) {
        await tx.geminiApiKey.update({
          where: { id: orderedIds[i] },
          data: { priority: i + 1 },
        });
      }
    });

    return this.listKeys();
  }

  /**
   * Teste ao vivo individual de uma chave no Google Gemini:
   * Executa uma chamada real de verificação medindo latência e status operacional.
   */
  static async testKey(id: string): Promise<{
    success: boolean;
    latencyMs: number;
    model: string;
    message: string;
    errorCode?: string;
  }> {
    const keyRecord = await db.geminiApiKey.findUnique({ where: { id } });
    if (!keyRecord) {
      throw new Error(`Chave [${id}] não encontrada.`);
    }

    const rawApiKey = decryptApiKey(keyRecord.apiKey);
    const testModel = "gemini-3.5-flash";
    const startTime = Date.now();

    try {
      const ai = new GoogleGenAI({ apiKey: rawApiKey });
      const response = await ai.models.generateContent({
        model: testModel,
        contents: "Responda apenas com a palavra 'OK' para teste de conectividade de API.",
      });

      const latencyMs = Date.now() - startTime;
      const text = response.text?.trim() || "";

      // Atualiza o registro como ativo e saudável
      await db.geminiApiKey.update({
        where: { id },
        data: {
          status: GeminiKeyStatus.HEALTHY,
          consecutiveFailures: 0,
          cooldownUntil: null,
          lastSuccessAt: new Date(),
          lastUsedAt: new Date(),
          lastErrorCode: null,
          lastErrorMessage: null,
        },
      });

      return {
        success: true,
        latencyMs,
        model: testModel,
        message: `Chave operacional! Resposta recebida em ${latencyMs}ms (${text}).`,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      const errorMsg = err?.message || String(err);
      const isAuth = errorMsg.includes("API_KEY_INVALID") || errorMsg.includes("unauthorized") || err?.status === 401 || err?.status === 403;

      await db.geminiApiKey.update({
        where: { id },
        data: {
          status: isAuth ? GeminiKeyStatus.INVALID : GeminiKeyStatus.DEGRADED,
          lastFailedAt: new Date(),
          lastUsedAt: new Date(),
          lastErrorCode: isAuth ? "AUTH_ERROR" : "TEST_FAILED",
          lastErrorMessage: errorMsg.slice(0, 200),
        },
      });

      return {
        success: false,
        latencyMs,
        model: testModel,
        message: `Falha no teste: ${errorMsg}`,
        errorCode: isAuth ? "AUTH_ERROR" : "TEST_FAILED",
      };
    }
  }

  /**
   * Obtém a lista de chaves elegíveis para execução de uma operação Gemini,
   * descriptografando a raw key e ordenando conforme a estratégia ativa.
   */
  static async getEligibleKeys(modelName: string): Promise<Array<{
    id: string;
    name: string;
    rawApiKey: string;
    maskedKey: string;
    priority: number;
    status: GeminiKeyStatus;
  }>> {
    await this.seedInitialKeyFromEnv();
    const settings = await this.getSettings();
    const now = new Date();

    // 1. Busca chaves ativas que não estejam explicitamente com status INVALID
    const candidateKeys = await db.geminiApiKey.findMany({
      where: {
        isActive: true,
        status: { not: GeminiKeyStatus.INVALID },
        OR: [
          { cooldownUntil: null },
          { cooldownUntil: { lte: now } }, // Circuit Breaker: período de espera encerrado
        ],
      },
    });

    // 2. Filtra por restrição de modelos (se a chave definir allowedModels)
    const compatibleKeys = candidateKeys.filter((k) => {
      if (!k.allowedModels || k.allowedModels.length === 0) return true;
      return k.allowedModels.includes(modelName);
    });

    // 3. Aplica a Estratégia de Seleção configurada
    let sortedKeys = [...compatibleKeys];

    switch (settings.selectionStrategy) {
      case GeminiSelectionStrategy.LEAST_USED:
        // Menor volume de requisições primeiro
        sortedKeys.sort((a, b) => a.requestsCount - b.requestsCount || a.priority - b.priority);
        break;

      case GeminiSelectionStrategy.BALANCED:
        // Distribui entre as chaves de mesma prioridade
        sortedKeys.sort((a, b) => {
          if (a.priority !== b.priority) return a.priority - b.priority;
          return a.requestsCount - b.requestsCount;
        });
        break;

      case GeminiSelectionStrategy.SEQUENTIAL_PRIORITY:
      default:
        // Prioridade sequencial rigorosa (1º -> 2º -> 3º)
        sortedKeys.sort((a, b) => {
          if (a.priority !== b.priority) return a.priority - b.priority;
          return b.successCount - a.successCount;
        });
        break;
    }

    return sortedKeys.map((k) => ({
      id: k.id,
      name: k.name,
      rawApiKey: decryptApiKey(k.apiKey),
      maskedKey: k.maskedKey,
      priority: k.priority,
      status: k.status,
    }));
  }

  /**
   * Registra sucesso na execução com uma chave específica.
   */
  static async recordKeySuccess(keyId: string, durationMs: number) {
    if (!keyId || keyId === "ENV_FALLBACK") return;

    await db.geminiApiKey.update({
      where: { id: keyId },
      data: {
        requestsCount: { increment: 1 },
        successCount: { increment: 1 },
        consecutiveFailures: 0,
        status: GeminiKeyStatus.HEALTHY,
        cooldownUntil: null,
        lastSuccessAt: new Date(),
        lastUsedAt: new Date(),
        lastErrorCode: null,
        lastErrorMessage: null,
      },
    });
  }

  /**
   * Registra falha na execução com uma chave e aciona Circuit Breaker / Rate Limit quando aplicável.
   */
  static async recordKeyFailure(keyId: string, error: ClassifiedGeminiError, durationMs: number) {
    if (!keyId || keyId === "ENV_FALLBACK") return;

    // Erros de schema ou validação de formato não são falhas da chave de API
    if (error.errorCode === "SCHEMA_VALIDATION_ERROR" || error.errorCode === "INVALID_ARGUMENT") {
      return;
    }

    const settings = await this.getSettings();
    const key = await db.geminiApiKey.findUnique({ where: { id: keyId } });
    if (!key) return;

    const newConsecutiveFailures = key.consecutiveFailures + 1;
    let newStatus = key.status;
    let newCooldown: Date | null = null;
    let newIsActive = key.isActive;

    // Se for erro de autenticação (401/403): marca imediatamente como INVALID e desativa
    if (error.isAuthError) {
      newStatus = GeminiKeyStatus.INVALID;
      newIsActive = false;
    } else if (error.isQuotaOrRateLimit) {
      // Se for 429: aplica cooldown com base no Retry-After ou padrão
      const cooldownSecs = error.retryAfterSeconds || 60;
      newStatus = GeminiKeyStatus.RATE_LIMITED;
      newCooldown = new Date(Date.now() + cooldownSecs * 1000);
    } else if (newConsecutiveFailures >= settings.maxConsecutiveFailures) {
      // Circuit Breaker disparado por excesso de falhas consecutivas
      newStatus = GeminiKeyStatus.SUSPENDED;
      newCooldown = new Date(Date.now() + settings.cooldownSeconds * 1000);
    } else {
      newStatus = GeminiKeyStatus.DEGRADED;
    }

    await db.geminiApiKey.update({
      where: { id: keyId },
      data: {
        requestsCount: { increment: 1 },
        failuresCount: { increment: 1 },
        consecutiveFailures: newConsecutiveFailures,
        status: newStatus,
        isActive: newIsActive,
        cooldownUntil: newCooldown,
        lastFailedAt: new Date(),
        lastUsedAt: new Date(),
        lastErrorCode: error.errorCode,
        lastErrorMessage: (error.friendlyMessage || "Falha na chamada Gemini").slice(0, 200),
      },
    });
  }
}

