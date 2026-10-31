export interface ClassifiedGeminiError {
  statusCode: number;
  errorCode: string;
  isRecoverable: boolean;
  isAuthError: boolean;
  isQuotaOrRateLimit: boolean;
  isTimeout: boolean;
  isModelOverloaded: boolean;
  retryAfterSeconds: number | null;
  friendlyMessage: string;
  rawErrorName: string;
}

export class GeminiErrorClassifier {
  /**
   * Analisa e classifica exaustivamente um erro retornado pelo Gemini SDK, Node fetch ou rede.
   */
  static classify(error: any): ClassifiedGeminiError {
    const errorMsg = (error?.message || String(error || "")).toLowerCase();
    const errorStatus = Number(error?.status || error?.statusCode || error?.response?.status || 0);
    const errorName = error?.name || "Error";

    // Extrair Retry-After de cabeçalhos ou mensagem se presente
    let retryAfterSeconds: number | null = null;
    const retryHeader = error?.response?.headers?.get?.("retry-after") || error?.headers?.["retry-after"];
    if (retryHeader) {
      const parsed = parseInt(String(retryHeader), 10);
      if (!isNaN(parsed) && parsed > 0) {
        retryAfterSeconds = parsed;
      }
    } else {
      const retryMatch = errorMsg.match(/retry\s+after\s+(\d+)\s*(s|sec|seconds)?/i);
      if (retryMatch && retryMatch[1]) {
        retryAfterSeconds = parseInt(retryMatch[1], 10);
      }
    }

    // 1. Erros de Autenticação / Autorização (401 / 403 / API Key inválida)
    if (
      errorStatus === 401 ||
      errorStatus === 403 ||
      errorMsg.includes("api_key") ||
      errorMsg.includes("api key not valid") ||
      errorMsg.includes("unauthorized") ||
      errorMsg.includes("forbidden") ||
      errorMsg.includes("permission_denied") ||
      errorMsg.includes("caller does not have permission")
    ) {
      return {
        statusCode: errorStatus || 401,
        errorCode: "AUTH_ERROR",
        isRecoverable: true, // Recuperável via troca por outra chave válida!
        isAuthError: true,
        isQuotaOrRateLimit: false,
        isTimeout: false,
        isModelOverloaded: false,
        retryAfterSeconds: null,
        friendlyMessage: "Chave de API do Gemini não autorizada, revogada ou inválida.",
        rawErrorName: errorName,
      };
    }

    // 2. Erros de Quota / Limite de Requisições (429 / RESOURCE_EXHAUSTED)
    if (
      errorStatus === 429 ||
      errorMsg.includes("quota") ||
      errorMsg.includes("resource_exhausted") ||
      errorMsg.includes("rate limit") ||
      errorMsg.includes("too many requests") ||
      errorMsg.includes("credits") ||
      errorMsg.includes("exceeded your current quota")
    ) {
      return {
        statusCode: 429,
        errorCode: "QUOTA_EXCEEDED",
        isRecoverable: true,
        isAuthError: false,
        isQuotaOrRateLimit: true,
        isTimeout: false,
        isModelOverloaded: false,
        retryAfterSeconds: retryAfterSeconds || 60, // Padrão de 60s se não informado
        friendlyMessage: "Limite de requisições ou cota da API Gemini atingido para esta chave.",
        rawErrorName: errorName,
      };
    }

    // 3. Erros de Sobrecarga e Indisponibilidade dos Servidores do Google (503 / UNAVAILABLE)
    if (
      errorStatus === 503 ||
      errorMsg.includes("503") ||
      errorMsg.includes("unavailable") ||
      errorMsg.includes("high demand") ||
      errorMsg.includes("overloaded") ||
      errorMsg.includes("the model is overloaded")
    ) {
      return {
        statusCode: 503,
        errorCode: "SERVICE_UNAVAILABLE",
        isRecoverable: true,
        isAuthError: false,
        isQuotaOrRateLimit: false,
        isTimeout: false,
        isModelOverloaded: true,
        retryAfterSeconds: retryAfterSeconds || 30,
        friendlyMessage: "Servidores da Gemini API enfrentando alta demanda temporária (503).",
        rawErrorName: errorName,
      };
    }

    // 4. Erros de Timeout e Conexão (504 / ETIMEDOUT / DEADLINE_EXCEEDED)
    if (
      errorStatus === 504 ||
      errorStatus === 408 ||
      errorMsg.includes("timeout") ||
      errorMsg.includes("deadline") ||
      errorMsg.includes("timed out") ||
      errorMsg.includes("etimedout") ||
      errorMsg.includes("econnreset") ||
      errorMsg.includes("fetch failed") ||
      errorMsg.includes("network error")
    ) {
      return {
        statusCode: 504,
        errorCode: "TIMEOUT",
        isRecoverable: true,
        isAuthError: false,
        isQuotaOrRateLimit: false,
        isTimeout: true,
        isModelOverloaded: false,
        retryAfterSeconds: null,
        friendlyMessage: "Tempo limite esgotado ou falha temporária de conexão com o Gemini.",
        rawErrorName: errorName,
      };
    }

    // 5. Outros Erros de Infraestrutura do Google (500 / 502)
    if (errorStatus === 500 || errorStatus === 502 || errorMsg.includes("bad gateway") || errorMsg.includes("internal error")) {
      return {
        statusCode: errorStatus || 500,
        errorCode: "SERVER_ERROR",
        isRecoverable: true,
        isAuthError: false,
        isQuotaOrRateLimit: false,
        isTimeout: false,
        isModelOverloaded: false,
        retryAfterSeconds: 15,
        friendlyMessage: "Erro interno temporário de infraestrutura da Gemini API.",
        rawErrorName: errorName,
      };
    }

    // 6. Erros de Parâmetros / Requisição Inválida (400 / INVALID_ARGUMENT) — NÃO RECUPERÁVEL POR TROCA DE CHAVE
    if (
      errorStatus === 400 ||
      errorMsg.includes("invalid argument") ||
      errorMsg.includes("bad request") ||
      errorMsg.includes("malformed")
    ) {
      return {
        statusCode: 400,
        errorCode: "INVALID_ARGUMENT",
        isRecoverable: false, // Não adianta trocar de chave se o prompt ou schema for inválido
        isAuthError: false,
        isQuotaOrRateLimit: false,
        isTimeout: false,
        isModelOverloaded: false,
        retryAfterSeconds: null,
        friendlyMessage: "Parâmetros de requisição ou prompt inválidos para o modelo.",
        rawErrorName: errorName,
      };
    }

    // 7. Erros de Filtro de Segurança / Conteúdo Bloqueado — NÃO RECUPERÁVEL
    if (
      errorMsg.includes("safety") ||
      errorMsg.includes("blocked") ||
      errorMsg.includes("content policy") ||
      errorMsg.includes("safety rating")
    ) {
      return {
        statusCode: 400,
        errorCode: "CONTENT_POLICY_BLOCKED",
        isRecoverable: false,
        isAuthError: false,
        isQuotaOrRateLimit: false,
        isTimeout: false,
        isModelOverloaded: false,
        retryAfterSeconds: null,
        friendlyMessage: "Geração interrompida pelas políticas de segurança de conteúdo do Gemini.",
        rawErrorName: errorName,
      };
    }

    // 8. Erros de Validação Contratual Zod / Resposta Vazia — NÃO RECUPERÁVEL
    if (
      errorMsg.includes("validation_failed") ||
      errorMsg.includes("schema") ||
      errorMsg.includes("invalid_json")
    ) {
      return {
        statusCode: 422,
        errorCode: "SCHEMA_VALIDATION_ERROR",
        isRecoverable: false,
        isAuthError: false,
        isQuotaOrRateLimit: false,
        isTimeout: false,
        isModelOverloaded: false,
        retryAfterSeconds: null,
        friendlyMessage: "Resposta do modelo não atende ao contrato de dados esperado.",
        rawErrorName: errorName,
      };
    }

    // Padrão: Erro genérico
    return {
      statusCode: errorStatus || 500,
      errorCode: "UNKNOWN_GEMINI_ERROR",
      isRecoverable: errorStatus >= 500, // Se status >= 500 tenta outra chave por prudência
      isAuthError: false,
      isQuotaOrRateLimit: false,
      isTimeout: false,
      isModelOverloaded: false,
      retryAfterSeconds: null,
      friendlyMessage: error?.message || "Erro inesperado na chamada ao Google Gemini.",
      rawErrorName: errorName,
    };
  }
}

