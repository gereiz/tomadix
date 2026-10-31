import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { GeminiMultiProvider } from "./gemini-multi-provider";

export class GeminiError extends Error {
  constructor(message: string, public code: string, public statusCode: number = 500) {
    super(message);
    this.name = "GeminiError";
  }
}

export class GeminiAuthError extends GeminiError {
  constructor(message = "Chave de API do Gemini inválida ou não autorizada.") {
    super(message, "AUTH_ERROR", 401);
  }
}

export class GeminiQuotaError extends GeminiError {
  constructor(message = "Limite de requisições ou cota da Gemini API excedido.") {
    super(message, "QUOTA_EXCEEDED", 429);
  }
}

export class GeminiTimeoutError extends GeminiError {
  constructor(message = "Tempo limite esgotado ao aguardar resposta da Gemini API.") {
    super(message, "TIMEOUT", 504);
  }
}

export class GeminiInvalidJsonError extends GeminiError {
  constructor(message = "A Gemini API não retornou uma estrutura JSON válida.", public rawResponse?: string) {
    super(message, "INVALID_JSON", 502);
  }
}

export class GeminiValidationError extends GeminiError {
  constructor(message: string, public validationErrors: any) {
    super(message, "VALIDATION_FAILED", 422);
  }
}

export class GeminiUnavailableError extends GeminiError {
  constructor(
    message = "Os servidores da Gemini API estão enfrentando alta demanda temporária (Erro 503). Por favor, tente novamente em instantes."
  ) {
    super(message, "MODEL_UNAVAILABLE", 503);
  }
}

export interface GeminiStructuredOutput<T> {
  data: T;
  rawText: string;
  model: string;
  tokens?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export async function generateStructuredJson<T>(
  instructions: string,
  schema: z.ZodType<T>,
  options?: {
    model?: string;
    systemInstruction?: string;
    timeoutMs?: number;
    feature?: string;
    operationId?: string;
    workspaceId?: string;
    projectId?: string;
    userId?: string;
  }
): Promise<GeminiStructuredOutput<T>> {
  const primaryModel = options?.model || process.env.GEMINI_DEFAULT_MODEL || "gemini-3.5-flash";
  const timeoutMs = options?.timeoutMs || 45000;
  const feature = options?.feature || "STRUCTURED_GENERATION";
  const operationId = options?.operationId || `op_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  // Delegar ao orquestrador central de failover multi-chaves
  const failoverResult = await GeminiMultiProvider.executeWithFailover<{
    data: T;
    rawText: string;
    model: string;
  }>(
    {
      feature,
      model: primaryModel,
      operationId,
      workspaceId: options?.workspaceId,
      projectId: options?.projectId,
      userId: options?.userId,
      timeoutMs,
    },
    async (activeApiKey, currentSelectedModel) => {
      // Modelos resilientes para tolerância a picos de demanda 503 dentro da chave ativa
      const candidateModels = Array.from(
        new Set([currentSelectedModel, "gemini-3.5-flash", "gemini-3.6-flash", "gemini-3.7-flash", "gemini-3.8-flash"])
      );

      const ai = new GoogleGenAI({ apiKey: activeApiKey });
      let lastAttemptError: any = null;

      for (let i = 0; i < candidateModels.length; i++) {
        const candidateModel = candidateModels[i];

        try {
          const response = await ai.models.generateContent({
            model: candidateModel,
            contents: instructions,
            config: {
              responseMimeType: "application/json",
              systemInstruction: options?.systemInstruction,
            },
          });

          const rawText = response.text;
          if (!rawText || rawText.trim() === "") {
            throw new GeminiError("O modelo Gemini retornou uma resposta vazia.", "EMPTY_RESPONSE", 502);
          }

          // Limpar delimitadores markdown se o modelo os incluir
          let cleanJson = rawText.trim();
          if (cleanJson.startsWith("```json")) {
            cleanJson = cleanJson.replace(/^```json\s*/i, "").replace(/\s*```$/, "");
          } else if (cleanJson.startsWith("```")) {
            cleanJson = cleanJson.replace(/^```\s*/, "").replace(/\s*```$/, "");
          }

          let parsed: unknown;
          try {
            parsed = JSON.parse(cleanJson);
          } catch {
            throw new GeminiInvalidJsonError("Falha ao analisar o JSON retornado pelo Gemini.", rawText);
          }

          // Validação estrita do schema Zod
          const validationResult = schema.safeParse(parsed);
          if (!validationResult.success) {
            throw new GeminiValidationError(
              "A resposta gerada pelo Gemini não atende ao schema contratual.",
              validationResult.error.flatten()
            );
          }

          const usage = (response as any).usageMetadata;
          const tokens = usage
            ? {
                inputTokens: usage.promptTokenCount ?? 0,
                outputTokens: usage.candidatesTokenCount ?? 0,
              }
            : undefined;

          return {
            data: {
              data: validationResult.data,
              rawText: cleanJson,
              model: candidateModel,
            },
            tokens,
          };
        } catch (error: any) {
          if (error instanceof GeminiValidationError || error instanceof GeminiInvalidJsonError) {
            throw error;
          }

          const msg = error?.message?.toLowerCase() || "";
          const isUnavailable =
            error?.status === 503 ||
            msg.includes("503") ||
            msg.includes("unavailable") ||
            msg.includes("high demand") ||
            msg.includes("overloaded");

          lastAttemptError = error;

          // Se for 503 e houver outro modelo candidato, tenta o próximo modelo com a mesma chave
          if (isUnavailable && i < candidateModels.length - 1) {
            console.warn(
              `[GeminiProvider] Modelo ${candidateModel} sobrecarregado (503). Alternando modelo interno para ${candidateModels[i + 1]}...`
            );
            continue;
          }

          // Caso contrário, lança o erro para ser capturado pelo failover de chaves
          throw error;
        }
      }

      throw lastAttemptError;
    }
  );

  return {
    data: failoverResult.data.data,
    rawText: failoverResult.data.rawText,
    model: failoverResult.data.model,
    tokens: failoverResult.tokens,
  };
}
