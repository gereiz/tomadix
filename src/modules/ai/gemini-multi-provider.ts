import { db } from "@/lib/db";
import { GeminiKeyManagerService } from "./gemini-key-manager.service";
import { GeminiErrorClassifier, ClassifiedGeminiError } from "./gemini-error-classifier";
import { maskApiKey } from "./gemini-key-security";
import {
  GeminiError,
  GeminiAuthError,
  GeminiQuotaError,
  GeminiTimeoutError,
  GeminiUnavailableError,
} from "./gemini-provider";

export interface FailoverExecutionOptions {
  feature: string;
  model: string;
  operationId: string;
  workspaceId?: string;
  projectId?: string;
  userId?: string;
  timeoutMs?: number;
}

export interface FailoverExecutionResult<T> {
  data: T;
  model: string;
  finalKeyName: string;
  usedFallback: boolean;
  attemptsCount: number;
  durationMs: number;
  tokens?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export class GeminiMultiProvider {
  /**
   * Executa uma operação Gemini com orquestração inteligente de failover automático,
   * classificação de erros, Circuit Breaker, controle de idempotência e zero duplicação de custos.
   */
  static async executeWithFailover<T>(
    options: FailoverExecutionOptions,
    executor: (apiKey: string, selectedModel: string) => Promise<{
      data: T;
      tokens?: { inputTokens: number; outputTokens: number };
    }>
  ): Promise<FailoverExecutionResult<T>> {
    const {
      feature,
      model,
      operationId,
      workspaceId,
      projectId,
      userId,
      timeoutMs = 45000,
    } = options;

    const overallStart = Date.now();
    const settings = await GeminiKeyManagerService.getSettings();

    // 1. Obter chaves elegíveis no banco ordenadas pela estratégia de seleção ativa
    let candidateKeys = await GeminiKeyManagerService.getEligibleKeys(model);

    // Se nenhuma chave do banco estiver elegível, verifica se pode usar a variável de ambiente
    if (candidateKeys.length === 0 && settings.envKeyFallbackAllowed && process.env.GEMINI_API_KEY) {
      const envKey = process.env.GEMINI_API_KEY.trim();
      if (envKey.length >= 10) {
        candidateKeys = [
          {
            id: "ENV_FALLBACK",
            name: "Variável GEMINI_API_KEY (Servidor)",
            rawApiKey: envKey,
            maskedKey: maskApiKey(envKey),
            priority: 999,
            status: "HEALTHY" as any,
          },
        ];
      }
    }

    if (candidateKeys.length === 0) {
      throw new GeminiUnavailableError(
        "Nenhuma API Key do Gemini está ativa ou disponível no momento. Verifique o Gerenciamento de APIs Gemini no console administrativo."
      );
    }

    // Limita as tentativas à quantidade configurada em settings
    const maxAttempts = Math.min(candidateKeys.length, settings.maxAttemptsPerOperation);
    const keysToTry = candidateKeys.slice(0, maxAttempts);

    const attemptsHistory: Array<{
      keyId: string;
      keyName: string;
      attemptNumber: number;
      success: boolean;
      durationMs: number;
      statusCode?: number;
      errorCode?: string;
      errorMessage?: string;
      isRecoverable: boolean;
    }> = [];

    let lastError: any = null;
    let lastClassified: ClassifiedGeminiError | null = null;

    // 2. Loop de tentativas com failover sequencial determinístico
    for (let index = 0; index < keysToTry.length; index++) {
      const currentKey = keysToTry[index];
      const attemptNumber = index + 1;
      const attemptStart = Date.now();

      try {
        // Envio da operação com timeout controlado
        let timer: NodeJS.Timeout | null = null;
        const timeoutPromise = new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            reject(new GeminiTimeoutError(`Requisição ao Gemini excedeu o limite de ${timeoutMs / 1000}s na chave ${currentKey.name}.`));
          }, timeoutMs);
        });

        const executionPromise = executor(currentKey.rawApiKey, model);
        const result = await Promise.race([executionPromise, timeoutPromise]).finally(() => {
          if (timer) clearTimeout(timer);
        });

        const durationMs = Date.now() - attemptStart;
        const totalDurationMs = Date.now() - overallStart;

        // Registrar tentativa bem-sucedida
        attemptsHistory.push({
          keyId: currentKey.id,
          keyName: currentKey.name,
          attemptNumber,
          success: true,
          durationMs,
          isRecoverable: false,
        });

        // Atualizar métricas da chave no banco
        await GeminiKeyManagerService.recordKeySuccess(currentKey.id, durationMs);

        // Salvar log auditável de operação no banco de dados
        await this.persistOperationLog({
          operationId,
          feature,
          model,
          workspaceId,
          projectId,
          userId,
          success: true,
          usedFallback: index > 0,
          attemptsCount: attemptNumber,
          primaryKeyName: keysToTry[0].name,
          finalKeyName: currentKey.name,
          durationMs: totalDurationMs,
          inputTokens: result.tokens?.inputTokens,
          outputTokens: result.tokens?.outputTokens,
          attempts: attemptsHistory,
        });

        return {
          data: result.data,
          model,
          finalKeyName: currentKey.name,
          usedFallback: index > 0,
          attemptsCount: attemptNumber,
          durationMs: totalDurationMs,
          tokens: result.tokens,
        };
      } catch (err: any) {
        const attemptDuration = Date.now() - attemptStart;
        const classified = GeminiErrorClassifier.classify(err);
        lastError = err;
        lastClassified = classified;

        // Registrar tentativa falha no histórico
        attemptsHistory.push({
          keyId: currentKey.id,
          keyName: currentKey.name,
          attemptNumber,
          success: false,
          durationMs: attemptDuration,
          statusCode: classified.statusCode,
          errorCode: classified.errorCode,
          errorMessage: classified.friendlyMessage,
          isRecoverable: classified.isRecoverable,
        });

        // Atualizar falhas da chave e acionar Circuit Breaker quando cabível
        await GeminiKeyManagerService.recordKeyFailure(currentKey.id, classified, attemptDuration);

        // Se o erro NÃO for recuperável por troca de chave (ex: prompt 400 inválido, violação de segurança, erro de schema)
        // Interrompe imediatamente para não queimar chaves atoa!
        if (!classified.isRecoverable) {
          await this.persistOperationLog({
            operationId,
            feature,
            model,
            workspaceId,
            projectId,
            userId,
            success: false,
            usedFallback: false,
            attemptsCount: attemptNumber,
            primaryKeyName: keysToTry[0].name,
            finalKeyName: currentKey.name,
            durationMs: Date.now() - overallStart,
            statusCode: classified.statusCode,
            errorCode: classified.errorCode,
            errorMessage: classified.friendlyMessage,
            attempts: attemptsHistory,
          });

          throw err;
        }

        // Se o erro É recuperável e ainda há chaves na lista, avisa e segue para a próxima
        if (index < keysToTry.length - 1) {
          console.warn(
            `[GeminiFailover] Chave "${currentKey.name}" falhou com [${classified.errorCode}] (HTTP ${classified.statusCode}). Acionando fallback automático para "${keysToTry[index + 1].name}"...`
          );
          continue;
        }
      }
    }

    // Se todas as chaves elegíveis falharam
    const totalDurationMs = Date.now() - overallStart;

    await this.persistOperationLog({
      operationId,
      feature,
      model,
      workspaceId,
      projectId,
      userId,
      success: false,
      usedFallback: keysToTry.length > 1,
      attemptsCount: keysToTry.length,
      primaryKeyName: keysToTry[0].name,
      finalKeyName: keysToTry[keysToTry.length - 1].name,
      durationMs: totalDurationMs,
      statusCode: lastClassified?.statusCode || 500,
      errorCode: lastClassified?.errorCode || "FAILOVER_EXHAUSTED",
      errorMessage: lastClassified?.friendlyMessage || "Todas as chaves de API disponíveis apresentaram falha.",
      attempts: attemptsHistory,
    });

    if (lastClassified?.isQuotaOrRateLimit) {
      throw new GeminiQuotaError(
        `Todas as ${keysToTry.length} API Keys do Gemini configuradas atingiram o limite de requisições/quota temporariamente.`
      );
    }

    if (lastClassified?.isAuthError) {
      throw new GeminiAuthError("As chaves de API do Gemini disponíveis no sistema estão inválidas ou sem autorização.");
    }

    if (lastClassified?.isModelOverloaded) {
      throw new GeminiUnavailableError();
    }

    throw lastError instanceof GeminiError
      ? lastError
      : new GeminiError(
          `Falha após tentar ${keysToTry.length} chave(s) Gemini: ${lastClassified?.friendlyMessage || lastError?.message}`,
          lastClassified?.errorCode || "FAILOVER_FAILED",
          lastClassified?.statusCode || 500
        );
  }

  /**
   * Grava o log de operação e as tentativas associadas no banco com proteção de falha silenciosa.
   */
  private static async persistOperationLog(data: {
    operationId: string;
    feature: string;
    model: string;
    workspaceId?: string;
    projectId?: string;
    userId?: string;
    success: boolean;
    usedFallback: boolean;
    attemptsCount: number;
    primaryKeyName?: string;
    finalKeyName?: string;
    durationMs: number;
    inputTokens?: number;
    outputTokens?: number;
    statusCode?: number;
    errorCode?: string;
    errorMessage?: string;
    attempts: any[];
  }) {
    try {
      await db.geminiOperationLog.upsert({
        where: { operationId: data.operationId },
        create: {
          operationId: data.operationId,
          feature: data.feature,
          model: data.model,
          workspaceId: data.workspaceId || null,
          projectId: data.projectId || null,
          userId: data.userId || null,
          success: data.success,
          usedFallback: data.usedFallback,
          attemptsCount: data.attemptsCount,
          primaryKeyName: data.primaryKeyName || null,
          finalKeyName: data.finalKeyName || null,
          durationMs: data.durationMs,
          inputTokens: data.inputTokens || null,
          outputTokens: data.outputTokens || null,
          statusCode: data.statusCode || null,
          errorCode: data.errorCode || null,
          errorMessage: data.errorMessage || null,
          attempts: {
            create: data.attempts.map((att) => ({
              apiKeyId: att.keyId !== "ENV_FALLBACK" ? att.keyId : null,
              keyName: att.keyName,
              attemptNumber: att.attemptNumber,
              success: att.success,
              durationMs: att.durationMs,
              statusCode: att.statusCode || null,
              errorCode: att.errorCode || null,
              errorMessage: att.errorMessage || null,
              isRecoverable: att.isRecoverable || false,
            })),
          },
        },
        update: {
          success: data.success,
          usedFallback: data.usedFallback,
          attemptsCount: data.attemptsCount,
          finalKeyName: data.finalKeyName || null,
          durationMs: data.durationMs,
          statusCode: data.statusCode || null,
          errorCode: data.errorCode || null,
          errorMessage: data.errorMessage || null,
        },
      });
    } catch (e) {
      console.error("[GeminiMultiProvider] Falha não crítica ao salvar log de operação:", e);
    }
  }
}

