import bcrypt from "bcryptjs";
import crypto from "crypto";

const BCRYPT_ROUNDS = 12;

/**
 * Cria o hash seguro de uma senha usando bcrypt.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Compara a senha informada com o hash bcrypt.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Gera um token aleatório criptograficamente seguro (256 bits).
 */
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Gera um hash SHA-256 do token para armazenamento seguro no banco de dados.
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Rate Limiter em memória para proteção contra força bruta e DoS
interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

/**
 * Limpa periodicamente registros expirados do rate limiter
 */
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (record.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);

if (cleanupInterval && typeof cleanupInterval.unref === "function") {
  cleanupInterval.unref();
}

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

/**
 * Aplica rate limiting em uma chave identificadora (ex: IP ou IP+endpoint).
 * Retorna { success: boolean, remaining: number, resetAt: number }.
 */
export function checkRateLimit(
  key: string,
  options: RateLimitOptions = { limit: 10, windowMs: 60 * 1000 }
): { success: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const existing = rateLimitStore.get(key);

  if (!existing || existing.resetAt <= now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + options.windowMs,
    });
    return {
      success: true,
      remaining: options.limit - 1,
      resetAt: now + options.windowMs,
    };
  }

  if (existing.count >= options.limit) {
    return {
      success: false,
      remaining: 0,
      resetAt: existing.resetAt,
    };
  }

  existing.count += 1;
  return {
    success: true,
    remaining: options.limit - existing.count,
    resetAt: existing.resetAt,
  };
}
