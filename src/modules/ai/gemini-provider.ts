import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

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
  }
): Promise<GeminiStructuredOutput<T>> {
  // Acesso estrito no servidor
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    throw new GeminiAuthError("GEMINI_API_KEY não configurada no servidor.");
  }

  const primaryModel = options?.model || process.env.GEMINI_DEFAULT_MODEL || "gemini-3.5-flash";
  const timeoutMs = options?.timeoutMs || 45000;

  // Lista de modelos resilientes para contingência automática em picos de alta demanda (503)
  const candidateModels = Array.from(
    new Set([primaryModel, "gemini-3.5-flash", "gemini-3.6-flash", "gemini-3.7-flash", "gemini-3.8-flash"])
  );

  const ai = new GoogleGenAI({ apiKey });
  let lastError: any = null;

  for (let i = 0; i < candidateModels.length; i++) {
    const currentModel = candidateModels[i];

    try {
      // Envio com timeout
      const generatePromise = ai.models.generateContent({
        model: currentModel,
        contents: instructions,
        config: {
          responseMimeType: "application/json",
          systemInstruction: options?.systemInstruction,
        },
      });

      let timeoutTimer: NodeJS.Timeout | null = null;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutTimer = setTimeout(() => {
          reject(new GeminiTimeoutError(`Requisição ao Gemini excedeu o limite de ${timeoutMs / 1000}s.`));
        }, timeoutMs);
      });

      const response = await Promise.race([generatePromise, timeoutPromise]).finally(() => {
        if (timeoutTimer) clearTimeout(timeoutTimer);
      });

      const rawText = response.text;
      if (!rawText || rawText.trim() === "") {
        throw new GeminiError("O modelo Gemini retornou uma resposta vazia.", "EMPTY_RESPONSE", 502);
      }

      // Limpar possíveis delimitadores markdown de código se o modelo os incluir
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

      // Validação estrita com o Zod schema do template
      const validationResult = schema.safeParse(parsed);
      if (!validationResult.success) {
        throw new GeminiValidationError(
          "A resposta gerada pelo Gemini não atende ao schema contratual do template.",
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
        data: validationResult.data,
        rawText: cleanJson,
        model: currentModel,
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
        msg.includes("high demand");

      lastError = error;

      // Se for erro 503 e ainda existirem modelos alternativos disponíveis, tenta o próximo
      if (isUnavailable && i < candidateModels.length - 1) {
        console.warn(`[GeminiProvider] Modelo ${currentModel} sobrecarregado (503). Alternando automaticamente para ${candidateModels[i + 1]}...`);
        continue;
      }

      if (error instanceof GeminiError) {
        throw error;
      }

      if (msg.includes("api_key") || msg.includes("unauthorized") || msg.includes("forbidden") || error?.status === 401 || error?.status === 403) {
        throw new GeminiAuthError("Chave de API do Gemini inválida ou não autorizada.");
      }

      if (msg.includes("quota") || msg.includes("resource_exhausted") || error?.status === 429) {
        throw new GeminiQuotaError("Limite de cota da Gemini API excedido. Tente novamente mais tarde.");
      }

      if (msg.includes("timeout") || msg.includes("deadline")) {
        throw new GeminiTimeoutError();
      }

      if (isUnavailable) {
        throw new GeminiUnavailableError();
      }

      throw new GeminiError(
        `Falha na comunicação com a Gemini API: ${error?.message || "Erro desconhecido."}`,
        "API_ERROR",
        error?.status || 500
      );
    }
  }

  throw lastError instanceof GeminiError ? lastError : new GeminiUnavailableError();
}
