"use client";

import Link from "next/link";
import { useMediaGeneration } from "@/components/providers/feature-flags-provider";

/** Aviso nas telas de admin de imagem/vídeo: a configuração continua possível, mas a função está desligada. */
export function MediaDisabledNotice() {
  const mediaEnabled = useMediaGeneration();
  if (mediaEnabled) return null;
  return (
    <div role="status" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
      A geração de imagens e vídeos está <strong>desligada</strong> para os usuários. Você pode configurar provedores, modelos e
      preços normalmente. Para liberar, ative “Geração de Imagens e Vídeos por IA” em{" "}
      <Link href="/admin/settings" className="font-semibold underline underline-offset-2">
        Configurações
      </Link>
      .
    </div>
  );
}
