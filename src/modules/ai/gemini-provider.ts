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
      // Modelos resilientes reais oficiais para tolerância a picos de demanda 503 dentro da chave ativa
      const candidateModels = Array.from(
        new Set([currentSelectedModel, "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"])
      ).filter(Boolean);

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

          // Pré-processamento e desempacotamento resiliente de wrappers JSON
          let unwrapped: any = parsed;
          if (Array.isArray(parsed) && parsed.length > 0) {
            unwrapped = parsed[0];
          } else if (typeof parsed === "object" && parsed !== null) {
            const keys = Object.keys(parsed);
            if (keys.length === 1 && typeof (parsed as any)[keys[0]] === "object" && (parsed as any)[keys[0]] !== null && !Array.isArray((parsed as any)[keys[0]])) {
              const singleKey = keys[0].toLowerCase();
              if (["character", "personagem", "data", "result", "response", "environment", "ambiente", "screenplay", "roteiro", "bible", "visualbible"].includes(singleKey)) {
                unwrapped = (parsed as any)[keys[0]];
              }
            }
          }

          // Validação com tolerância a aliases comuns
          let validationResult = schema.safeParse(unwrapped);

          if (!validationResult.success && typeof unwrapped === "object" && unwrapped !== null) {
            // Tentativa de adaptação automática de chaves comuns em português/inglês
            const rawObj = unwrapped as Record<string, any>;
            const adapted: Record<string, any> = { ...rawObj };

            const pickString = (...candidates: any[]) => {
              for (const c of candidates) {
                if (typeof c === "string" && c.trim().length > 0) return c.trim();
              }
              return undefined;
            };

            adapted.name = pickString(adapted.name, adapted.nome, adapted.titulo, adapted.character_name, adapted.location_name);
            adapted.description = pickString(adapted.description, adapted.descricao, adapted.detalhes, adapted.bio, adapted.summary);
            adapted.role = pickString(adapted.role, adapted.papel, adapted.funcao);
            adapted.archetype = pickString(adapted.archetype, adapted.arquetipo, adapted.tipo);
            adapted.type = pickString(adapted.type, adapted.tipo, adapted.locationType);

            if (!adapted.attributes && (adapted.atributos || adapted.caracteristicas || adapted.visual)) {
              adapted.attributes = adapted.atributos || adapted.caracteristicas || adapted.visual;
            }

            const secondAttempt = schema.safeParse(adapted);
            if (secondAttempt.success) {
              validationResult = secondAttempt;
            } else {
              // Terceira tentativa: passar valores padrão vazios para campos ausentes se o schema permitir
              const thirdAttempt = schema.safeParse({ ...adapted, ...schema.safeParse({}).data });
              if (thirdAttempt.success) {
                validationResult = thirdAttempt;
              }
            }
          }

          if (!validationResult.success) {
            console.warn(
              `[GeminiProvider] Validação de schema falhou no modelo "${candidateModel}":`,
              JSON.stringify(validationResult.error.flatten()),
              "\nResposta bruta recebida:",
              cleanJson.slice(0, 300)
            );

            // Se houver outro modelo candidato, dá oportunidade ao próximo
            if (i < candidateModels.length - 1) {
              console.warn(`[GeminiProvider] Tentando modelo candidato seguinte: ${candidateModels[i + 1]}...`);
              continue;
            }

            // Fallback de última instância: se schema aceitar objeto padrão {}
            const defaultFallback = schema.safeParse({});
            if (defaultFallback.success) {
              console.warn("[GeminiProvider] Aplicando fallback com defaults de schema.");
              validationResult = defaultFallback;
            } else {
              throw new GeminiValidationError(
                "A resposta gerada pelo Gemini não atende ao schema contratual.",
                validationResult.error.flatten()
              );
            }
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
