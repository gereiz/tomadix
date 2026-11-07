"use client";

import type { ScenesTabState } from "./use-scenes-tab";

interface ExpandSceneModalProps {
  s: ScenesTabState;
}

export function ExpandSceneModal({ s }: ExpandSceneModalProps) {
  const { setExpandModalOpen, sceneToExpand, expandType, setExpandType, expandCount, setExpandCount, expandDirectives, setExpandDirectives, expandLoading, expandError, handleSubmitExpand, expandModalOpen } = s;
  if (!expandModalOpen || !sceneToExpand) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-[#0f1218] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span className="text-primary">✨</span> Expandir Cena com IA
            </h3>
            <p className="mt-1 text-xs text-white/50">
              Desdobre &quot;{sceneToExpand.title}&quot; em sub-planos, planos detalhe ou variações de ângulo.
            </p>
          </div>
          <button
            onClick={() => setExpandModalOpen(false)}
            className="rounded-xl p-1.5 text-white/50 hover:bg-white/10 hover:text-white transition"
          >
            ✕
          </button>
        </div>
    
        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-white/70 mb-1.5">
              Tipo de Desdobramento Cinematográfico
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "SUB_SHOTS", label: "Sub-Planos (Geral → Médio → Detalhe)" },
                { id: "CAMERA_ANGLES", label: "Variações de Ângulo & Contra-Campo" },
                { id: "DETAIL_SHOTS", label: "Planos Detalhe e Inserts" },
                { id: "MICRO_ACTIONS", label: "Micro-Ações e Batidas Dramáticas" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setExpandType(t.id as any)}
                  className={`rounded-xl border p-2.5 text-left text-xs transition ${
                    expandType === t.id
                      ? "border-primary bg-primary/10 text-primary font-semibold"
                      : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
    
          <div>
            <label className="block text-xs font-medium text-white/70 mb-1.5">
              Quantidade de Sub-Planos Derivados ({expandCount})
            </label>
            <input
              type="range"
              min="2"
              max="4"
              value={expandCount}
              onChange={(e) => setExpandCount(parseInt(e.target.value, 10))}
              className="w-full accent-primary cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-white/40 mt-1">
              <span>2 planos</span>
              <span>3 planos (Recomendado)</span>
              <span>4 planos</span>
            </div>
          </div>
    
          <div>
            <label className="block text-xs font-medium text-white/70 mb-1.5">
              Diretivas Adicionais do Diretor (Opcional)
            </label>
            <textarea
              value={expandDirectives}
              onChange={(e) => setExpandDirectives(e.target.value)}
              placeholder="Ex: Enfatizar o olhar de desconfiança do personagem principal antes do disparo..."
              rows={2}
              className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white placeholder-white/30 focus:border-primary focus:outline-none resize-none"
            />
          </div>
    
          {expandError && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
              {expandError}
            </div>
          )}
        </div>
    
        <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
          <span className="text-xs text-white/50 flex items-center gap-1.5">
            <span className="text-amber-400 font-bold flex items-center gap-1">
              <span>🪙</span> 5 créditos
            </span>
            <span>• Tabela de créditos</span>
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setExpandModalOpen(false)}
              className="rounded-xl px-4 py-2 text-xs font-medium text-white/70 hover:bg-white/10 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmitExpand}
              disabled={expandLoading}
              className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-on-primary shadow-lg hover:opacity-90 disabled:opacity-50 transition"
            >
              {expandLoading ? "Decupando com IA..." : "Expandir com IA"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
