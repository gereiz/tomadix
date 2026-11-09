"use client";

import { createContext, useContext, useEffect, useState } from "react";

export interface ClientFeatureFlags {
  /** Geração de imagens por IA habilitada pelo administrador. */
  imageGenerationEnabled: boolean;
  /** Geração de vídeos por IA habilitada pelo administrador. */
  videoGenerationEnabled: boolean;
}

// Padrão seguro: até a flag chegar (ou se falhar), imagens e vídeos ficam desligados e nada de geração aparece.
const DEFAULT_FLAGS: ClientFeatureFlags = { imageGenerationEnabled: false, videoGenerationEnabled: false };
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
        if (!cancelled) {
          setFlags({
            imageGenerationEnabled: json.imageGenerationEnabled === true,
            videoGenerationEnabled: json.videoGenerationEnabled === true,
          });
        }
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

export interface MediaFlags {
  image: boolean;
  video: boolean;
  /** Imagens OU vídeos ligados. */
  any: boolean;
}

/** Quais gerações de mídia estão ligadas: use `image` ou `video` conforme o que o elemento gera. */
export function useMediaFlags(): MediaFlags {
  const { imageGenerationEnabled: image, videoGenerationEnabled: video } = useContext(FeatureFlagsContext);
  return { image, video, any: image || video };
}
