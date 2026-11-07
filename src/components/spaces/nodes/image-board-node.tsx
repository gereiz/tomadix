"use client";

import React from "react";
import { Handle, NodeResizer, Position, type NodeProps } from "@xyflow/react";

export function ImageBoardNode({ id, data, selected }: NodeProps) {
  const d = (data || {}) as Record<string, any>;
  const imageUrl = d.imageUrl || "";
  const label = d.label || d.modelId || "Imagem IA";
  const prompt = d.prompt || "";
  const aspectRatio = d.aspectRatio || "1:1";

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!imageUrl) return;
    const downloadUrl = `/api/images/download?url=${encodeURIComponent(
      imageUrl
    )}&filename=${encodeURIComponent(`space-image-${id}.png`)}`;
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `space-image-${id}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="group relative select-none h-full w-full flex flex-col min-w-[180px] min-h-[180px]">
      <NodeResizer
        isVisible={Boolean(selected)}
        minWidth={160}
        minHeight={160}
        color="#10b981"
        handleClassName="!h-2.5 !w-2.5 !rounded-full !bg-primary !border-2 !border-white shadow-md"
        lineClassName="!border-primary/50"
      />

      {/* Top Floating Label (Magnific style) */}
      <div className="mb-1.5 flex items-center justify-between px-1 text-[11px] font-medium text-on-surface-variant shrink-0">
        <span className="flex items-center gap-1.5 truncate max-w-[200px]">
          <span className="text-xs">🖼️</span>
          <span className="font-mono font-semibold truncate">{label}</span>
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              d.onOpenNodeActions?.(id);
            }}
            className="rounded px-1.5 py-0.5 text-[11px] font-bold text-white/70 hover:bg-white/10 hover:text-white transition"
            title="Ações do item (Menu / Mobile)"
          >
            ⋯
          </button>
          {d.onDeleteNode && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                d.onDeleteNode(id);
              }}
              className="rounded px-1.5 py-0.5 text-[10px] text-red-400 hover:bg-red-500/15 transition opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
              title="Remover do board (Delete)"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Main Image Card */}
      <div
        onClick={() => {
          if (imageUrl && d.onPreviewNode) {
            d.onPreviewNode(id);
          }
        }}
        className={`relative flex-1 w-full h-full min-h-0 overflow-hidden rounded-2xl border bg-[#0e121b] shadow-xl transition-all cursor-pointer ${selected
          ? "border-primary ring-2 ring-primary/40 shadow-primary/20"
          : "border-outline-variant/40 hover:border-outline"
          }`}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={prompt || label}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover pointer-events-none"
            draggable={false}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-white/40">
            Sem imagem
          </div>
        )}

        {/* Hover Overlay with Prompt & Actions */}
        <div className="theme-preserve-dark absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          {prompt && (
            <p className="line-clamp-3 text-[11px] leading-snug text-white/90">
              {prompt}
            </p>
          )}
          <div className="mt-2 flex items-center justify-between gap-1.5">
            <span className="rounded bg-white/15 px-1.5 py-0.5 font-mono text-[9px] text-white/80">
              {aspectRatio}
            </span>
            <div className="flex items-center gap-1.5">
              {d.onGenerateVideoFromNode && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    d.onGenerateVideoFromNode(id);
                  }}
                  className="rounded-lg bg-purple-500/30 border border-purple-500/50 px-2 py-1 text-[10px] font-semibold text-purple-200 hover:bg-purple-500/50 transition"
                  title="Animar esta imagem gerando Vídeo IA"
                >
                  🎥 Vídeo
                </button>
              )}
              <button
                type="button"
                onClick={handleDownload}
                className="rounded-lg bg-white/20 px-2 py-1 text-[10px] font-semibold text-white hover:bg-white/30 transition"
              >
                ⬇ Baixar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Handles Aumentados para Fácil Conexão */}
      <Handle
        type="target"
        position={Position.Left}
        className="!h-14 !w-14 !rounded-full !border-[3px] !border-emerald-400 !bg-[#0b101b] shadow-lg shadow-emerald-500/30 transition-transform hover:scale-125 cursor-crosshair flex items-center justify-center group/handle"
        title="Ponto de conexão (Entrada)"
      >
        <span className="h-2 w-2 rounded-full bg-emerald-400 pointer-events-none group-hover/handle:scale-125 transition-transform" />
      </Handle>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-14 !w-14 !rounded-full !border-[3px] !border-emerald-400 !bg-[#0b101b] shadow-lg shadow-emerald-500/30 transition-transform hover:scale-125 cursor-crosshair flex items-center justify-center group/handle"
        title="Puxar conexão para outro nó ou espaço vazio"
      >
        <span className="h-2 w-2 rounded-full bg-emerald-400 pointer-events-none group-hover/handle:scale-125 transition-transform" />
      </Handle>
    </div>
  );
}
