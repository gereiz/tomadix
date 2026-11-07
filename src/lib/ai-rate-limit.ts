import { NextResponse } from "next/server";
import { checkRateLimit, RATE_LIMIT_RULES } from "@/lib/rate-limiter";

/**
 * Aplica o limite de gerações de IA por workspace (janela deslizante).
 * Retorna uma resposta 429 pronta quando excedido, ou null quando liberado.
 *
 * Observação: o contador fica em memória do processo; em ambiente com várias
 * instâncias o limite é aproximado (por instância), mas ainda protege contra
 * cliques repetidos e laços acidentais. Os créditos continuam sendo a barreira principal.
 */
export function aiRateLimitResponse(workspaceId: string): NextResponse | null {
  const result = checkRateLimit(`ai:${workspaceId}`, RATE_LIMIT_RULES.AI_GENERATION);
  if (result.success) return null;

  return NextResponse.json(
    {
      error: "Muitas gerações em pouco tempo. Aguarde alguns instantes e tente novamente.",
      code: "RATE_LIMITED",
      retryAfter: result.retryAfter,
    },
    { status: 429, headers: { "Retry-After": String(result.retryAfter) } }
  );
}
