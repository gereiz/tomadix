export interface RateLimitRule {
  limit: number; // Número máximo de requisições
  windowSeconds: number; // Janela de tempo em segundos
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number; // Timestamp em ms
  retryAfter: number; // Segundos restantes
}

interface WindowRecord {
  timestamps: number[];
}

// Armazenamento em memória com limpeza automática
const store = new Map<string, WindowRecord>();

// Limpeza periódica de chaves inativas a cada 2 minutos
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      record.timestamps = record.timestamps.filter((ts) => now - ts < 300000);
      if (record.timestamps.length === 0) {
        store.delete(key);
      }
    }
  }, 120000);
}

export const RATE_LIMIT_RULES = {
  AUTH: { limit: 10, windowSeconds: 60 } as RateLimitRule, // 10 tentativas / min
  AI_GENERATION: { limit: 30, windowSeconds: 60 } as RateLimitRule, // 30 gerações / min
  SENSITIVE_ACTIONS: { limit: 15, windowSeconds: 60 } as RateLimitRule, // 15 ações sensíveis / min
  GENERAL_API: { limit: 120, windowSeconds: 60 } as RateLimitRule, // 120 reqs / min
};

/**
 * Validador de Rate Limiting baseado em janela deslizante (Sliding Window).
 */
export function checkRateLimit(key: string, rule: RateLimitRule): RateLimitResult {
  const now = Date.now();
  const windowMs = rule.windowSeconds * 1000;
  const cutoff = now - windowMs;

  let record = store.get(key);
  if (!record) {
    record = { timestamps: [] };
    store.set(key, record);
  }

  // Remove requisições fora da janela atual
  record.timestamps = record.timestamps.filter((ts) => ts > cutoff);

  const resetAt = record.timestamps.length > 0 ? record.timestamps[0] + windowMs : now + windowMs;
  const retryAfter = Math.max(1, Math.ceil((resetAt - now) / 1000));

  if (record.timestamps.length >= rule.limit) {
    return {
      success: false,
      limit: rule.limit,
      remaining: 0,
      resetAt,
      retryAfter,
    };
  }

  // Registra a nova requisição
  record.timestamps.push(now);

  return {
    success: true,
    limit: rule.limit,
    remaining: rule.limit - record.timestamps.length,
    resetAt,
    retryAfter: 0,
  };
}

/**
 * Objeto wrapper para facilitar injeção de dependência e testes
 */
export const rateLimiter = {
  check: checkRateLimit,
  reset: resetRateLimiterStore,
  RULES: RATE_LIMIT_RULES,
};

/**
 * Utilitário para limpar o armazenamento (útil para testes unitários).
 */
export function resetRateLimiterStore() {
  store.clear();
}
