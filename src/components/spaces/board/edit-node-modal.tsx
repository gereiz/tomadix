"use client";

import type { Dispatch, SetStateAction } from "react";
import type { Node } from "@xyflow/react";

interface EditNodeModalProps {
  editNode: Node;
  setEditNode: Dispatch<SetStateAction<Node | null>>;
  editLabel: string;
  setEditLabel: Dispatch<SetStateAction<string>>;
  editPrompt: string;
  setEditPrompt: Dispatch<SetStateAction<string>>;
  setToastMessage: Dispatch<SetStateAction<string | null>>;
  handleUpdateNodeData: (nodeId: string, nextData: Record<string, unknown>) => void;
}

export function EditNodeModal({ editNode, setEditNode, editLabel, setEditLabel, editPrompt, setEditPrompt, setToastMessage, handleUpdateNodeData }: EditNodeModalProps) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4">
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#121620] p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span>✏️</span> Editar Item do Board
          </h3>
          <button onClick={() => setEditNode(null)} className="text-xs text-white/50 hover:text-white">
            ✕
          </button>
        </div>
    
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-white/70">Título / Rótulo</label>
            <input
              type="text"
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white focus:border-primary focus:outline-none"
            />
          </div>
    
          {(editNode.data.prompt !== undefined || editNode.data.text !== undefined) && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-white/70">Conteúdo / Prompt</label>
              <textarea
                rows={4}
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white focus:border-primary focus:outline-none resize-none"
              />
            </div>
          )}
        </div>
    
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={() => setEditNode(null)}
            className="rounded-xl px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/10 transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              const updateData: any = { label: editLabel };
              if (editNode.data.prompt !== undefined) updateData.prompt = editPrompt;
              if (editNode.data.text !== undefined) updateData.text = editPrompt;
    
              handleUpdateNodeData(editNode.id, updateData);
              setEditNode(null);
              setToastMessage("Informações atualizadas!");
              setTimeout(() => setToastMessage(null), 3000);
            }}
            className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-black shadow-lg shadow-primary/20 hover:bg-primary/90 transition"
          >
            Salvar Alterações
          </button>
        </div>
      </div>
    </div>
  );
}
