"use client";

import Link from "next/link";
import { useMediaFlags } from "@/components/providers/feature-flags-provider";

type Kind = "image" | "video" | "both";

const LABEL: Record<Kind, string> = {
  image: "imagens",
  video: "vídeos",
  both: "imagens e vídeos",
};

/** Aviso nas telas de admin de imagem/vídeo: a configuração continua possível, mas a função está desligada. */
export function MediaDisabledNotice({ kind = "both" }: { kind?: Kind }) {
  const { image, video } = useMediaFlags();
  const off = kind === "image" ? !image : kind === "video" ? !video : !image || !video;
  if (!off) return null;
  const offLabel = kind === "both" ? LABEL[!image && !video ? "both" : !image ? "image" : "video"] : LABEL[kind];
  return (
    <div role="status" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
      A geração de <strong>{offLabel}</strong> está <strong>desligada</strong> para os usuários. Você pode configurar provedores,
      modelos e preços normalmente. Para liberar, ative em{" "}
      <Link href="/admin/settings?tab=features" className="font-semibold underline underline-offset-2">
        Configurações &gt; Recursos de IA
      </Link>
      .
    </div>
  );
}
