"use client";

import type { EnvironmentAiFields, EnvironmentAiState } from "./types";

interface EnvironmentAiModalProps {
  ai: EnvironmentAiState;
}

export function EnvironmentAiModal({ ai }: EnvironmentAiModalProps) {
  const { prompt: aiPrompt, setPrompt: setAiPrompt, fields, setField, loading: aiLoading, error: aiError, submit: handleSubmitAiGenerate, close } = ai;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-[#0f1218] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span className="text-primary">✨</span> Gerar Ambiente / Locação com IA
            </h3>
            <p className="mt-1 text-xs text-white/50">
              Concepção cenográfica de iluminação dramática, adereços e atmosfera visual.
            </p>
          </div>
          <button
            onClick={() => close()}
            className="rounded-xl p-1.5 text-white/50 hover:bg-white/10 hover:text-white transition"
          >
            ✕
          </button>
        </div>
    
        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-white/70 mb-1.5">
              Conceito do Ambiente / Locação *
            </label>
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Ex: Laboratório clandestino de inteligência artificial em um hangar abandonado, iluminação fria volumétrica, cabos pendurados e chuva no telhado de zinco..."
              rows={3}
              className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white placeholder-white/30 focus:border-primary focus:outline-none resize-none"
            />
          </div>
    
          <div>
            <label className="block text-xs font-medium text-white/70 mb-1.5">
              Tipo de Locação
            </label>
            <select
              value={fields.locationType}
              onChange={(e) => setField("locationType", e.target.value as EnvironmentAiFields["locationType"])}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white focus:border-primary focus:outline-none"
            >
              <option value="INTERIOR" className="bg-[#0f1218]">Interior (INT.)</option>
              <option value="EXTERIOR" className="bg-[#0f1218]">Exterior (EXT.)</option>
              <option value="HYBRID" className="bg-[#0f1218]">Híbrido (INT./EXT.)</option>
              <option value="STUDIO" className="bg-[#0f1218]">Estúdio / Fundo Controlado</option>
            </select>
          </div>
    
          {aiError && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
              {aiError}
            </div>
          )}
        </div>
    
        <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
          <span className="text-xs text-white/50 flex items-center gap-1.5">
            <span className="text-amber-400 font-bold flex items-center gap-1">
              <span>🪙</span> 3 créditos
            </span>
            <span>• Tabela de créditos</span>
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => close()}
              className="rounded-xl px-4 py-2 text-xs font-medium text-white/70 hover:bg-white/10 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmitAiGenerate}
              disabled={aiLoading}
              className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-on-primary shadow-lg hover:opacity-90 disabled:opacity-50 transition"
            >
              {aiLoading ? "Concebendo Ambiente..." : "Gerar Ambiente"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
