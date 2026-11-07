"use client";

import React, { useState, useEffect } from "react";
import { Handle, NodeResizer, Position, type NodeProps } from "@xyflow/react";

export function VideoGeneratorBoardNode({ id, data, selected }: NodeProps) {
  const d = (data || {}) as Record<string, any>;
  const label = d.label || "Gerador de vídeos #1";
  const previewUrl = d.imageUrl || d.startFrameUrl || "";
  const motionPrompt =
    d.prompt ||
    "High-altitude cinematic camera movement, smooth tracking shot, volumetric lighting, 4k photorealistic motion...";
  const aspectRatio = d.aspectRatio || "9:16";

  const [localPrompt, setLocalPrompt] = useState(motionPrompt);
  const [localRatio, setLocalRatio] = useState(aspectRatio);

  useEffect(() => {
    setLocalPrompt(motionPrompt);
  }, [motionPrompt]);

  const commitChange = (nextPrompt: string, nextRatio: string) => {
    if (d.onUpdateNodeData) {
      d.onUpdateNodeData(id, {
        ...d,
        prompt: nextPrompt,
        aspectRatio: nextRatio,
      });
    }
  };

  return (
    <div className="group relative select-none h-full w-full flex flex-col min-w-[260px] min-h-[340px]">
      <NodeResizer
        isVisible={Boolean(selected)}
        minWidth={240}
        minHeight={300}
        color="#a855f7"
        handleClassName="!h-2.5 !w-2.5 !rounded-full !bg-purple-500 !border-2 !border-white shadow-md"
        lineClassName="!border-purple-500/50"
      />

      {/* Top Floating Label (Magnific style) */}
      <div className="mb-1.5 flex items-center justify-between px-1 text-[11px] font-medium text-on-surface-variant shrink-0">
        <span className="flex items-center gap-1.5 truncate">
          <span>🎬</span>
          <span className="font-mono font-semibold truncate">{label}</span>
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <span className="rounded-full bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 text-[9px] font-bold text-purple-400">
            {d.videoUrl ? "VÍDEO PRONTO" : "VÍDEO IA"}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              d.onOpenNodeActions?.(id);
            }}
            className="rounded px-1.5 py-0.5 text-[11px] font-bold text-white/70 hover:bg-white/10 hover:text-white transition"
            title="Ações do item"
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

      {/* Video Card Container */}
      <div
        className={`theme-preserve-dark relative flex-1 w-full min-h-0 flex flex-col overflow-hidden rounded-2xl border bg-[#0d111a] text-white shadow-2xl transition-all ${selected
          ? "border-purple-400 ring-2 ring-purple-500/40"
          : "border-white/15 hover:border-purple-400/50"
          }`}
      >
        {/* Visual Frame Area */}
        <div className="relative flex-1 w-full min-h-0 overflow-hidden bg-gradient-to-br from-indigo-950/80 via-[#0b0f19] to-purple-950/70">
          {d.videoUrl ? (
            <video
              src={d.videoUrl}
              controls
              playsInline
              className="h-full w-full object-cover"
            />
          ) : previewUrl ? (
            <img
              src={previewUrl}
              alt={label}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover opacity-90 pointer-events-none"
              draggable={false}
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center">
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/10 text-xl shadow-inner">
                ▶
              </div>
              <p className="text-xs font-semibold text-white/90">
                Pipeline de Vídeo IA
              </p>
              <p className="mt-1 text-[10px] text-white/55 leading-tight">
                Gere diretamente ou conecte imagem de referência à esquerda
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  d.onTriggerVideoGen?.(id);
                }}
                className="mt-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-lg hover:from-purple-400 hover:to-indigo-500 transition"
              >
                🚀 Gerar Vídeo com IA
              </button>
            </div>
          )}

          {/* Top Ratio & Status Pill */}
          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-auto">
            <select
              value={localRatio}
              onChange={(e) => {
                setLocalRatio(e.target.value);
                commitChange(localPrompt, e.target.value);
              }}
              onClick={(e) => e.stopPropagation()}
              className="rounded-lg border border-white/20 bg-black/60 px-2 py-0.5 text-[10px] font-mono text-white focus:outline-none"
            >
              <option value="9:16">9:16 Vertical</option>
              <option value="16:9">16:9 Cinema</option>
              <option value="1:1">1:1 Square</option>
            </select>
            {d.videoUrl ? (
              <a
                href={d.videoUrl}
                download={`video-${id}.mp4`}
                onClick={(e) => e.stopPropagation()}
                className="rounded-lg bg-emerald-500/30 border border-emerald-500/40 px-2 py-0.5 text-[9px] font-semibold text-emerald-300 hover:bg-emerald-500/50"
              >
                ⬇ Baixar MP4
              </a>
            ) : (
              <span className="rounded-lg bg-black/60 border border-white/15 px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider text-purple-300">
                Pollinations API
              </span>
            )}
          </div>

          {/* Bottom Motion Prompt Overlay */}
          {!d.videoUrl && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent p-3 pt-6 pointer-events-auto">
              <textarea
                rows={2}
                value={localPrompt}
                onChange={(e) => setLocalPrompt(e.target.value)}
                onBlur={() => commitChange(localPrompt, localRatio)}
                onClick={(e) => e.stopPropagation()}
                placeholder="Descreva o movimento de câmera e ação do vídeo..."
                className="w-full resize-none rounded-lg border border-white/10 bg-black/40 p-2 text-[11px] leading-snug text-white/95 placeholder:text-white/40 focus:border-purple-400 focus:outline-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* Left Connection Handles for Start Frame, End Frame & Prompt */}
      <Handle
        type="target"
        id="start-frame"
        position={Position.Left}
        style={{ top: "30%" }}
        title="Conectar Frame Inicial (Imagem)"
        className="!h-14 !w-14 !rounded-full !border-[3px] !border-purple-400 !bg-[#0b101b] shadow-lg shadow-purple-500/30 transition-transform hover:scale-125 cursor-crosshair flex items-center justify-center group/handle"
      >
        <span className="h-2 w-2 rounded-full bg-purple-400 pointer-events-none group-hover/handle:scale-125 transition-transform" />
      </Handle>
      <Handle
        type="target"
        id="end-frame"
        position={Position.Left}
        style={{ top: "65%" }}
        title="Conectar Frame Final (Imagem)"
        className="!h-14 !w-14 !rounded-full !border-[3px] !border-purple-400 !bg-[#0b101b] shadow-lg shadow-purple-500/30 transition-transform hover:scale-125 cursor-crosshair flex items-center justify-center group/handle"
      >
        <span className="h-2 w-2 rounded-full bg-purple-400 pointer-events-none group-hover/handle:scale-125 transition-transform" />
      </Handle>
      <Handle
        type="target"
        id="motion-prompt"
        position={Position.Left}
        style={{ top: "85%" }}
        title="Conectar Prompt de Movimento"
        className="!h-14 !w-14 !rounded-full !border-[3px] !border-amber-400 !bg-[#0b101b] shadow-lg shadow-amber-500/30 transition-transform hover:scale-125 cursor-crosshair flex items-center justify-center group/handle"
      >
        <span className="h-2 w-2 rounded-full bg-amber-400 pointer-events-none group-hover/handle:scale-125 transition-transform" />
      </Handle>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-14 !w-14 !rounded-full !border-[3px] !border-purple-400 !bg-[#0b101b] shadow-lg shadow-purple-500/30 transition-transform hover:scale-125 cursor-crosshair flex items-center justify-center group/handle"
        title="Puxar conexão para outro nó ou espaço vazio"
      >
        <span className="h-2 w-2 rounded-full bg-purple-400 pointer-events-none group-hover/handle:scale-125 transition-transform" />
      </Handle>
    </div>
  );
}
