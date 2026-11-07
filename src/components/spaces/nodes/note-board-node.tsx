"use client";

import React, { useState, useEffect } from "react";
import { Handle, NodeResizer, Position, type NodeProps } from "@xyflow/react";

export function NoteBoardNode({ id, data, selected }: NodeProps) {
  const d = (data || {}) as Record<string, any>;
  const [text, setText] = useState(d.text || "");

  useEffect(() => {
    setText(d.text || "");
  }, [d.text]);

  return (
    <div
      className={`group relative select-none h-full w-full flex flex-col min-w-[180px] min-h-[140px] rounded-2xl border p-3 shadow-lg transition-all ${selected
        ? "border-amber-400 ring-2 ring-amber-400/30"
        : "border-amber-500/30"
        } bg-amber-500/10`}
    >
      <NodeResizer
        isVisible={Boolean(selected)}
        minWidth={160}
        minHeight={120}
        color="#f59e0b"
        handleClassName="!h-2.5 !w-2.5 !rounded-full !bg-amber-400 !border-2 !border-white shadow-md"
        lineClassName="!border-amber-400/50"
      />

      <div className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-amber-400 shrink-0">
        <span>📝 Nota da Equipe</span>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              d.onOpenNodeActions?.(id);
            }}
            className="rounded px-1.5 py-0.5 text-[11px] font-bold text-amber-300/80 hover:bg-amber-400/20 hover:text-amber-200 transition"
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
              className="text-red-400 hover:text-red-300 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition"
              title="Remover do board (Delete)"
            >
              ✕
            </button>
          )}
        </div>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => d.onUpdateNodeData?.(id, { ...d, text })}
        onClick={(e) => e.stopPropagation()}
        placeholder="Escreva uma anotação ou direção criativa..."
        className="flex-1 w-full min-h-0 resize-none bg-transparent text-xs leading-relaxed text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none"
      />
      <Handle
        type="target"
        position={Position.Left}
        className="!h-14 !w-14 !rounded-full !border-[3px] !border-amber-400 !bg-[#0b101b] shadow-lg shadow-amber-500/30 transition-transform hover:scale-125 cursor-crosshair flex items-center justify-center group/handle"
        title="Ponto de conexão (Entrada)"
      >
        <span className="h-2 w-2 rounded-full bg-amber-400 pointer-events-none group-hover/handle:scale-125 transition-transform" />
      </Handle>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-14 !w-14 !rounded-full !border-[3px] !border-amber-400 !bg-[#0b101b] shadow-lg shadow-amber-500/30 transition-transform hover:scale-125 cursor-crosshair flex items-center justify-center group/handle"
        title="Puxar conexão para outro nó ou espaço vazio"
      >
        <span className="h-2 w-2 rounded-full bg-amber-400 pointer-events-none group-hover/handle:scale-125 transition-transform" />
      </Handle>
    </div>
  );
}
