"use client";

import { Spinner } from "@/components/ui/spinner";
import { getTemplateCreditCost } from "./helpers";
import type { PromptsTabState } from "./use-prompts-tab";

interface RegenerateModalProps {
  s: PromptsTabState;
}

export function RegenerateModal({ s }: RegenerateModalProps) {
  const { selectedTemplate, regeneratingVersion, setRegeneratingVersion, regenerateInstructions, setRegenerateInstructions, isRegenerating, handleRegenerateSubmit } = s;
  if (!regeneratingVersion) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="relative w-full max-w-lg rounded-3xl border border-white/20 bg-[#0f1218] p-6 shadow-2xl space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Regenerar a partir da Versão v{regeneratingVersion.versionNumber || 1}
        </h3>
        <p className="text-xs text-white/60">
          O snapshot dos parâmetros originais será reutilizado. Uma <strong>nova versão</strong> será gravada sem apagar a anterior.
        </p>
    
        <div>
          <label className="block text-xs font-semibold text-white/80 mb-1.5">
            Novas Instruções de Ajuste do Diretor (Opcional)
          </label>
          <textarea
            value={regenerateInstructions}
            onChange={(e) => setRegenerateInstructions(e.target.value)}
            placeholder="Ex: Corrigir velocidade do movimento de câmera, deixar contraste mais intenso..."
            rows={3}
            className="w-full rounded-xl border border-white/10 bg-black/60 p-3 text-xs text-white placeholder-white/30 focus:border-primary focus:outline-none resize-none"
          />
        </div>
    
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/10">
          <span className="text-xs text-white/50 flex items-center gap-1.5">
            <span className="text-amber-400 font-bold flex items-center gap-1">
              <span>🪙</span> {getTemplateCreditCost(regeneratingVersion.templateKey || selectedTemplate)} créditos
            </span>
            <span>• Nova versão</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setRegeneratingVersion(null)}
              className="rounded-xl px-4 py-2 text-xs font-medium text-white/70 hover:bg-white/10 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleRegenerateSubmit}
              disabled={isRegenerating}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-on-primary hover:opacity-90 shadow-md shadow-primary/20 transition disabled:opacity-50"
            >
              {isRegenerating ? (
                <>
                  <Spinner block className="h-3 w-3 border-2 border-white" />
                  <span>Regenerando...</span>
                </>
              ) : (
                <span>Criar Nova Versão ({getTemplateCreditCost(regeneratingVersion.templateKey || selectedTemplate)} cr)</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
