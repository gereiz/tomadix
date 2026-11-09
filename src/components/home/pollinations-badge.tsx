"use client";

import { useMediaGeneration } from "@/components/providers/feature-flags-provider";

/** Selo do provedor de geração: só aparece quando a geração de imagens/vídeos está ligada. */
export function PollinationsBadge() {
  const mediaEnabled = useMediaGeneration();
  if (!mediaEnabled) return null;
  return (
    <a href="https://pollinations.ai/?ref=badge">
      <img
        src="https://raw.githubusercontent.com/pollinations/pollinations/main/packages/ui/src/brand/badge-made-with.svg"
        alt="Made with pollinations.ai"
        width={160}
        height={30}
        loading="lazy"
        decoding="async"
        className="h-7 w-auto"
      />
    </a>
  );
}
