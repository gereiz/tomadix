"use client";

import { useMediaGeneration } from "@/components/providers/feature-flags-provider";
import type { Dispatch, SetStateAction } from "react";
import type { Node } from "@xyflow/react";

interface PreviewModalProps {
  previewNode: Node;
  setPreviewNode: Dispatch<SetStateAction<Node | null>>;
  handleGenerateVideoFromNode: (nodeId: string) => void;
}

export function PreviewModal({ previewNode, setPreviewNode, handleGenerateVideoFromNode }: PreviewModalProps) {
  // Chave global do admin: sem mídia, somem as ações de vídeo/imagem
  const mediaEnabled = useMediaGeneration();
  return (
    <div
      className="fixed inset-0 overflow-y-auto z-[130] flex items-center-safe justify-center bg-black/90 p-3 sm:p-4"
      onClick={() => setPreviewNode(null)}
    >
      <div
        className="relative max-w-4xl max-h-[90dvh] w-full flex flex-col items-center justify-center space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setPreviewNode(null)}
          className="absolute top-2 right-2 z-10 rounded-full bg-black/60 p-2 text-white/70 hover:bg-black/80 hover:text-white transition"
        >
          ✕
        </button>
    
        {Boolean((previewNode.data as any)?.imageUrl) && (
          <img loading="lazy" decoding="async"
            src={String((previewNode.data as any)?.imageUrl)}
            alt={String((previewNode.data as any)?.label || "Preview")}
            className="max-h-[75dvh] w-auto max-w-full rounded-2xl object-contain shadow-2xl border border-white/10"
          />
        )}
    
        {Boolean((previewNode.data as any)?.videoUrl) && (
          <video
            src={String((previewNode.data as any)?.videoUrl)}
            controls
            autoPlay
            playsInline
            className="max-h-[75dvh] w-auto max-w-full rounded-2xl shadow-2xl border border-white/10"
          />
        )}
    
        <div className="w-full bg-[#121620]/90 border border-white/10 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <h4 className="font-bold text-white text-sm">{String((previewNode.data as any)?.label || "Item")}</h4>
            {Boolean((previewNode.data as any)?.prompt) && (
              <p className="text-white/60 text-xs mt-0.5 line-clamp-2 max-w-xl">
                {String((previewNode.data as any)?.prompt)}
              </p>
            )}
          </div>
    
          <div className="flex items-center gap-2">
            {mediaEnabled && previewNode.type === "IMAGE" && (
              <button
                onClick={() => {
                  const id = previewNode.id;
                  setPreviewNode(null);
                  handleGenerateVideoFromNode(id);
                }}
                className="rounded-xl bg-purple-500/20 border border-purple-500/30 px-3.5 py-1.5 text-xs font-semibold text-purple-300 hover:bg-purple-500/30 transition"
              >
                🎥 Gerar Vídeo IA
              </button>
            )}
            <a
              href={String((previewNode.data as any)?.imageUrl || (previewNode.data as any)?.videoUrl || "")}
              download={`space-preview-${previewNode.id}`}
              className="rounded-xl bg-white/10 border border-white/20 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition"
            >
              ⬇ Baixar Original
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
