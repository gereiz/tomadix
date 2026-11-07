import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    // Defaults do Prisma (maxWait 2s / timeout 5s) estouram sob carga com pool pequeno.
    transactionOptions: { maxWait: 5000, timeout: 15000 },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

/**
 * Executa uma operação no banco de dados com retentativas automáticas
 * para absorver instabilidades transitórias de rede ou pooler (ex: P1001).
 */
export async function withDbRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 2,
  delayMs = 1200
): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (err: any) {
      lastError = err;
      const isConnectionError =
        err?.code === "P1001" ||
        err?.code === "P1017" ||
        err?.message?.includes("Can't reach database server") ||
        err?.message?.includes("timed out") ||
        err?.message?.includes("connection closed") ||
        err?.message?.includes("Connection refused");

      if (isConnectionError && attempt < maxRetries) {
        console.warn(
          `[Prisma/Supabase] Instabilidade transitória no pooler detectada. Tentando reconexão (${attempt + 1}/${maxRetries})...`
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}
