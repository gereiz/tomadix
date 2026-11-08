"use client";

import type { Dispatch, SetStateAction } from "react";
import type { Node } from "@xyflow/react";

interface SafeDeleteModalProps {
  safeDeleteTarget: Node;
  setSafeDeleteTarget: Dispatch<SetStateAction<Node | null>>;
  executeDeleteNode: (nodeId: string) => void;
}

export function SafeDeleteModal({ safeDeleteTarget, setSafeDeleteTarget, executeDeleteNode }: SafeDeleteModalProps) {
  return (
    <div className="fixed inset-0 overflow-y-auto z-[120] flex items-center-safe justify-center bg-black/80 p-3 sm:p-4">
      <div className="relative w-full max-w-md rounded-2xl border border-red-500/30 bg-[#121620] p-6 shadow-2xl space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 text-xl">
            🗑️
          </span>
          <div>
            <h3 className="text-base font-bold text-white">Excluir item do Space Board</h3>
            <p className="text-xs text-white/50">Esta ação remove o nó e todas as conexões vinculadas a ele</p>
          </div>
        </div>
    
        <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-white/50">Item:</span>
            <span className="font-semibold text-white truncate max-w-[240px]">
              {String((safeDeleteTarget.data as any)?.label || safeDeleteTarget.id)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white/50">Tipo no Canvas:</span>
            <span className="font-mono text-primary uppercase text-[10px]">{safeDeleteTarget.type}</span>
          </div>
        </div>
    
        <p className="text-xs text-white/70 leading-relaxed">
          Tem certeza que deseja excluir este item? Ele deixará de ser exibido no board e os links vinculados a ele serão desfeitos.
        </p>
    
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={() => setSafeDeleteTarget(null)}
            className="rounded-xl px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              executeDeleteNode(safeDeleteTarget.id);
              setSafeDeleteTarget(null);
            }}
            className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-500 transition shadow-lg shadow-red-600/30"
          >
            Sim, Excluir do Board
          </button>
        </div>
      </div>
    </div>
  );
}
