"use client";

import type { ProjectDetailTabState } from "./use-project-detail";

interface VisualBibleModalProps {
  s: ProjectDetailTabState;
}

export function VisualBibleModal({ s }: VisualBibleModalProps) {
  const { vbModalOpen, setVbModalOpen, vbReference, setVbReference, vbDirectives, setVbDirectives, vbLoading, vbError, handleSubmitVisualBible, project } = s;
  if (!project) return null;

  return (
    <>
    {vbModalOpen && (
      <div className="fixed inset-0 overflow-y-auto z-50 flex items-center-safe justify-center bg-black/80 p-3 sm:p-4">
        <div className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-[#0f1218] p-6 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span className="text-primary">✨</span> Compilar Bíblia Visual com IA
              </h3>
              <p className="mt-1 text-xs text-white/50">
                Defina diretrizes fotográficas e direção de arte para orientar todas as gerações.
              </p>
            </div>
            <button
              onClick={() => setVbModalOpen(false)}
              className="rounded-xl p-1.5 text-white/50 hover:bg-white/10 hover:text-white transition"
            >
              ✕
            </button>
          </div>
    
          <div className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1.5">
                Referência Cinematográfica / Diretor de Fotografia (Opcional)
              </label>
              <input
                type="text"
                value={vbReference}
                onChange={(e) => setVbReference(e.target.value)}
                placeholder="Ex: Roger Deakins (Blade Runner 2049), Gordon Willis, Hoyte van Hoytema..."
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/30 focus:border-primary focus:outline-none"
              />
            </div>
    
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1.5">
                Diretivas Adicionais de Arte (Opcional)
              </label>
              <textarea
                value={vbDirectives}
                onChange={(e) => setVbDirectives(e.target.value)}
                placeholder="Ex: Paleta fria de azul e âmbar, luz difusa em névoa, granulação de filme 35mm marcante..."
                rows={3}
                className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white placeholder-white/30 focus:border-primary focus:outline-none resize-none"
              />
            </div>
    
            {vbError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                {vbError}
              </div>
            )}
          </div>
    
          <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
            <span className="text-xs text-white/50 flex items-center gap-1.5">
              <span className="text-amber-400 font-bold flex items-center gap-1">
                <span>🪙</span> 10 créditos
              </span>
              <span>• Tabela de créditos</span>
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setVbModalOpen(false)}
                className="rounded-xl px-4 py-2 text-xs font-medium text-white/70 hover:bg-white/10 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmitVisualBible}
                disabled={vbLoading}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-on-primary shadow-lg hover:opacity-90 disabled:opacity-50 transition"
              >
                {vbLoading ? "Compilando Bíblia..." : "Compilar com IA"}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
