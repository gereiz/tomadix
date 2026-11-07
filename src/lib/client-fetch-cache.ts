/**
 * Cache de leitura para `fetch` no cliente: deduplica requisições simultâneas e reaproveita
 * respostas bem-sucedidas por um TTL curto. Vários componentes (navbar, badge de créditos, listas,
 * formulários) consultam os mesmos endpoints (/api/auth/me, /api/billing/subscription,
 * /api/workspaces); aqui eles passam a compartilhar uma única requisição.
 *
 * - Devolve sempre um `Response` clonado, então os consumidores continuam usando `res.ok`/`res.json()`.
 * - Só respostas OK ficam em cache (um 401 nunca é reaproveitado após o login).
 * - É invalidado automaticamente pelos eventos globais de créditos e troca de workspace.
 */

interface CacheEntry {
  promise: Promise<Response>;
  expiresAt: number;
}

const entries = new Map<string, CacheEntry>();

/** TTL padrão (ms) por endpoint; endpoints fora da tabela usam o padrão de 5s. */
const DEFAULT_TTL_MS = 5_000;

export function cachedFetch(url: string, ttlMs: number = DEFAULT_TTL_MS): Promise<Response> {
  const now = Date.now();
  const hit = entries.get(url);
  if (hit && hit.expiresAt > now) {
    return hit.promise.then((res) => res.clone());
  }

  const promise = fetch(url).then((res) => {
    if (!res.ok) {
      // Não reaproveita falhas (ex.: 401 antes do login)
      if (entries.get(url)?.promise === promise) entries.delete(url);
    }
    return res;
  });
  promise.catch(() => {
    if (entries.get(url)?.promise === promise) entries.delete(url);
  });

  entries.set(url, { promise, expiresAt: now + ttlMs });
  return promise.then((res) => res.clone());
}

/** Descarta entradas em cache. Sem argumento limpa tudo; com prefixo limpa só as URLs que o usam. */
export function invalidateClientCache(prefix?: string): void {
  if (!prefix) {
    entries.clear();
    return;
  }
  for (const key of entries.keys()) {
    if (key.startsWith(prefix)) entries.delete(key);
  }
}

if (typeof window !== "undefined") {
  // Registrado no carregamento do módulo: roda antes dos listeners dos componentes
  // que importam este arquivo, garantindo que o refetch posterior vá à rede.
  window.addEventListener("tomadix:credits-updated", () => invalidateClientCache("/api/billing"));
  window.addEventListener("tomadix:workspace-switched", () => invalidateClientCache());
}
