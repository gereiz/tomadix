"use client";

import React, { useState, useEffect } from "react";
import { Handle, NodeResizer, Position, type NodeProps } from "@xyflow/react";

export function PromptBoardNode({ id, data, selected }: NodeProps) {
  const d = (data || {}) as Record<string, any>;
  const label = d.label || "Prompt Cinematográfico";
  const [promptText, setPromptText] = useState(d.prompt || d.description || "");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setPromptText(d.prompt || d.description || "");
  }, [d.prompt, d.description]);

  const handleBlur = () => {
    if (d.onUpdateNodeData && promptText !== d.prompt) {
      d.onUpdateNodeData(id, { ...d, prompt: promptText });
    }
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(promptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="group relative select-none h-full w-full flex flex-col min-w-[240px] min-h-[160px]">
      <NodeResizer
        isVisible={Boolean(selected)}
        minWidth={200}
        minHeight={140}
        color="#10b981"
        handleClassName="!h-2.5 !w-2.5 !rounded-full !bg-primary !border-2 !border-white shadow-md"
        lineClassName="!border-primary/50"
      />

      <div className="mb-1 flex items-center justify-between px-1 text-[11px] font-medium text-on-surface-variant shrink-0">
        <span className="flex items-center gap-1.5 truncate">
          <span>📜</span>
          <span className="font-semibold truncate">{label}</span>
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
        className={`flex-1 w-full min-h-0 flex flex-col rounded-2xl border bg-surface-container p-3 shadow-lg transition-all ${selected
          ? "border-primary ring-2 ring-primary/30"
          : "border-outline-variant/40 hover:border-outline"
          }`}
      >
        <textarea
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          onBlur={handleBlur}
          onClick={(e) => e.stopPropagation()}
          placeholder="Escreva ou edite o prompt..."
          className="flex-1 w-full min-h-0 resize-none rounded-xl border border-outline-variant/30 bg-surface-container-low p-2.5 text-xs leading-relaxed text-on-surface focus:border-primary focus:outline-none"
        />

        <div className="mt-2 flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-lg border border-outline-variant/30 bg-surface-container-high px-2 py-1 text-[10px] font-medium text-on-surface-variant hover:text-on-surface"
          >
            {copied ? "✓ Copiado" : "📋 Copiar"}
          </button>

          {d.onGenerateFromPrompt && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                d.onGenerateFromPrompt(promptText, id);
              }}
              className="rounded-lg bg-primary/15 border border-primary/30 px-2.5 py-1 text-[10px] font-semibold text-primary hover:bg-primary/25 transition"
            >
              🎨 Gerar Imagem
            </button>
          )}
        </div>
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
