"use client";

import { createContext, useContext, useEffect, useState } from "react";

export interface ClientFeatureFlags {
  /** Geração de imagens e vídeos por IA habilitada pelo administrador. */
  mediaGenerationEnabled: boolean;
}

// Padrão seguro: até a flag chegar (ou se falhar), a mídia fica desligada e nada de geração aparece.
const DEFAULT_FLAGS: ClientFeatureFlags = { mediaGenerationEnabled: false };
const FeatureFlagsContext = createContext<ClientFeatureFlags>(DEFAULT_FLAGS);

/**
 * Lê as flags públicas em /api/features no navegador. Não depende da renderização do servidor,
 * porque as páginas são geradas estaticamente e um valor embutido no build ficaria desatualizado.
 */
export function FeatureFlagsProvider({ children }: { children: React.ReactNode }) {
  const [flags, setFlags] = useState<ClientFeatureFlags>(DEFAULT_FLAGS);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/features");
        if (!res.ok) return;
        const json = (await res.json()) as Partial<ClientFeatureFlags>;
        if (!cancelled) setFlags({ mediaGenerationEnabled: json.mediaGenerationEnabled === true });
      } catch {
        // sem rede: permanece desligado
      }
    };
    load();
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return <FeatureFlagsContext.Provider value={flags}>{children}</FeatureFlagsContext.Provider>;
}

export function useFeatureFlags(): ClientFeatureFlags {
  return useContext(FeatureFlagsContext);
}

/** Atalho: true quando a geração de imagens/vídeos está ligada. */
export function useMediaGeneration(): boolean {
  return useContext(FeatureFlagsContext).mediaGenerationEnabled;
}
