"use client";

import type { ScenesTabState } from "./use-scenes-tab";

interface DeleteSceneModalProps {
  s: ScenesTabState;
}

export function DeleteSceneModal({ s }: DeleteSceneModalProps) {
  const { setDeleteModalOpen, sceneToDelete, deleteLoading, handleConfirmDelete, deleteModalOpen } = s;
  if (!deleteModalOpen || !sceneToDelete) return null;

  return (
    <div className="fixed inset-0 overflow-y-auto z-50 flex items-center-safe justify-center bg-black/80 p-3 sm:p-4">
      <div className="relative w-full max-w-md rounded-3xl border border-red-500/20 bg-[#0f1218] p-6 shadow-2xl">
        <h3 className="text-base font-bold text-red-300">Excluir Cena?</h3>
        <p className="mt-2 text-xs text-white/70">
          Tem certeza que deseja excluir permanentemente a cena{" "}
          <strong className="text-white">&quot;{sceneToDelete.title}&quot;</strong> (Ordem #{sceneToDelete.order})?
    
        </p>
        <p className="mt-2 text-[11px] text-white/50">
          A ordem das cenas subsequentes será recompactada automaticamente.
        </p>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={() => setDeleteModalOpen(false)}
            className="rounded-xl px-4 py-2 text-xs font-medium text-white/70 hover:bg-white/10 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmDelete}
            disabled={deleteLoading}
            className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50 transition"
          >
            {deleteLoading ? "Excluindo..." : "Sim, Excluir"}
          </button>
        </div>
      </div>
    </div>
  );
}
