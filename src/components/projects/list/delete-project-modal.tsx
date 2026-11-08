"use client";

import type { ProjectsListTabState } from "./use-projects-list";

interface DeleteProjectModalProps {
  s: ProjectsListTabState;
}

export function DeleteProjectModal({ s }: DeleteProjectModalProps) {
  const { projectToDelete, setProjectToDelete, handleConfirmDelete } = s;
  if (!projectToDelete) return null;

  return (
    <div className="fixed inset-0 overflow-y-auto z-50 flex items-center-safe justify-center bg-black/80 p-3 sm:p-4">
      <div className="w-full max-w-md rounded-3xl border border-red-500/30 bg-[#141215] p-6 shadow-2xl">
        <div className="flex items-center gap-3 text-red-400">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-white">Excluir Projeto</h3>
        </div>
    
        <p className="mt-3 text-sm leading-relaxed text-white/70">
          Você tem certeza de que deseja excluir permanentemente o projeto{" "}
          <strong className="text-white font-semibold">&quot;{projectToDelete.title}&quot;</strong>?
        </p>
    
        <div className="mt-3 rounded-xl border border-red-500/20 bg-red-950/20 p-3 text-xs text-red-300/80">
          Esta ação removerá todos os personagens, ambientes, cenas e versões de prompts vinculados a este projeto. Essa operação não pode ser desfeita.
        </div>
    
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setProjectToDelete(null)}
            className="rounded-xl border border-white/15 px-4 py-2 text-xs font-medium text-white/70 hover:bg-white/5"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmDelete}
            className="rounded-xl bg-red-600 px-5 py-2 text-xs font-semibold text-white transition hover:bg-red-500 active:scale-[0.98]"
          >
            Confirmar Exclusão
          </button>
        </div>
      </div>
    </div>
  );
}
