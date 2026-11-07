"use client";

import React from "react";
import { Handle, NodeResizer, Position, type NodeProps } from "@xyflow/react";

export function EntityBoardNode({ id, data, selected }: NodeProps) {
  const d = (data || {}) as Record<string, any>;
  const entityType = d.entityType || "ENTITY";
  const badge =
    entityType === "CHARACTER"
      ? { icon: "👤", label: "Personagem", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" }
      : entityType === "ENVIRONMENT"
        ? { icon: "🏛️", label: "Ambiente", color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30" }
        : { icon: "🎬", label: "Cena", color: "text-amber-400 bg-amber-500/10 border-amber-500/30" };

  return (
    <div className="group relative select-none h-full w-full flex flex-col min-w-[220px] min-h-[160px]">
      <NodeResizer
        isVisible={Boolean(selected)}
        minWidth={180}
        minHeight={140}
        color="#06b6d4"
        handleClassName="!h-2.5 !w-2.5 !rounded-full !bg-cyan-500 !border-2 !border-white shadow-md"
        lineClassName="!border-cyan-500/50"
      />

      <div className="mb-1 flex items-center justify-between px-1 text-[11px] text-on-surface-variant shrink-0">
        <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${badge.color}`}>
          <span>{badge.icon}</span>
          <span>{badge.label}</span>
        </span>
        <div className="flex items-center gap-1 shrink-0">
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

      <div
        className={`flex-1 w-full min-h-0 flex flex-col overflow-hidden rounded-2xl border bg-surface-container p-3 shadow-lg transition-all ${selected
          ? "border-primary ring-2 ring-primary/30"
          : "border-outline-variant/40 hover:border-outline"
          }`}
      >
        {d.imageUrl && (
          <div className="mb-2 flex-1 w-full min-h-[90px] overflow-hidden rounded-xl bg-black/30">
            <img
              src={d.imageUrl}
              alt={d.title || d.label}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover pointer-events-none"
            />
          </div>
        )}
        <h4 className="text-xs font-bold text-on-surface truncate shrink-0">
          {d.title || d.label || "Elemento"}
        </h4>
        {d.description && (
          <p className="mt-1 line-clamp-3 text-[11px] text-on-surface-variant leading-relaxed">
            {d.description}
          </p>
        )}
      </div>

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
