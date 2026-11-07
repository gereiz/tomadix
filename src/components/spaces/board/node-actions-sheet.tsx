"use client";

import type { Dispatch, SetStateAction } from "react";
import type { Node } from "@xyflow/react";

interface NodeActionsSheetProps {
  nodeActionsTarget: Node;
  setNodeActionsTarget: Dispatch<SetStateAction<Node | null>>;
  setSafeDeleteTarget: Dispatch<SetStateAction<Node | null>>;
  setEditNode: Dispatch<SetStateAction<Node | null>>;
  setEditLabel: Dispatch<SetStateAction<string>>;
  setEditPrompt: Dispatch<SetStateAction<string>>;
  setPreviewNode: Dispatch<SetStateAction<Node | null>>;
  handleGenerateVideoFromNode: (nodeId: string) => void;
  duplicateNode: (node: Node) => void;
}

export function NodeActionsSheet({ nodeActionsTarget, setNodeActionsTarget, setSafeDeleteTarget, setEditNode, setEditLabel, setEditPrompt, setPreviewNode, handleGenerateVideoFromNode, duplicateNode }: NodeActionsSheetProps) {
  return (
    <div
      className="fixed inset-0 z-[115] flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4"
      onClick={() => setNodeActionsTarget(null)}
    >
      <div
        className="relative w-full max-w-sm rounded-t-3xl sm:rounded-2xl border border-white/15 bg-[#121620] p-5 shadow-2xl space-y-3 animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-2 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2 truncate">
            <span className="text-base">⚙️</span>
            <div className="truncate">
              <h4 className="text-xs font-bold text-white truncate max-w-[200px]">
                {String((nodeActionsTarget.data as any)?.label || "Ações do Item")}
              </h4>
              <p className="text-[10px] text-white/50 uppercase font-mono">{nodeActionsTarget.type}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setNodeActionsTarget(null)}
            className="rounded-lg p-1.5 text-xs text-white/40 hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>
    
        <div className="space-y-1.5 py-1">
          <button
            type="button"
            onClick={() => {
              setPreviewNode(nodeActionsTarget);
              setNodeActionsTarget(null);
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-medium text-white hover:bg-white/10 transition"
          >
            <span>👁️</span> Visualizar em Tela Cheia
          </button>
    
          <button
            type="button"
            onClick={() => {
              const d = nodeActionsTarget.data as Record<string, any>;
              setEditNode(nodeActionsTarget);
              setEditLabel(String(d?.label || ""));
              setEditPrompt(String(d?.prompt || d?.text || ""));
              setNodeActionsTarget(null);
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-medium text-white hover:bg-white/10 transition"
          >
            <span>✏️</span> Editar Informações / Renomear
          </button>
    
          <button
            type="button"
            onClick={() => {
              duplicateNode(nodeActionsTarget);
              setNodeActionsTarget(null);
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-medium text-white hover:bg-white/10 transition"
          >
            <span>📋</span> Duplicar no Board
          </button>
    
          {nodeActionsTarget.type === "IMAGE" && (
            <button
              type="button"
              onClick={() => {
                handleGenerateVideoFromNode(nodeActionsTarget.id);
                setNodeActionsTarget(null);
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-medium text-purple-300 hover:bg-purple-500/20 transition"
            >
              <span>🎥</span> Animar com Vídeo IA
            </button>
          )}
    
          {Boolean((nodeActionsTarget.data as any)?.imageUrl || (nodeActionsTarget.data as any)?.videoUrl) && (
            <button
              type="button"
              onClick={() => {
                const url = String((nodeActionsTarget.data as any)?.imageUrl || (nodeActionsTarget.data as any)?.videoUrl || "");
                const a = document.createElement("a");
                a.href = url;
                a.download = `space-item-${nodeActionsTarget.id}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setNodeActionsTarget(null);
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-medium text-white hover:bg-white/10 transition"
            >
              <span>⬇️</span> Baixar Arquivo
            </button>
          )}
    
          <button
            type="button"
            onClick={() => {
              const target = nodeActionsTarget;
              setNodeActionsTarget(null);
              setSafeDeleteTarget(target);
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-red-400 hover:bg-red-500/15 transition border-t border-white/5 mt-1 pt-2.5"
          >
            <span>🗑️</span> Excluir do Space Board
          </button>
        </div>
      </div>
    </div>
  );
}
