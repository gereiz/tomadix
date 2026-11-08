"use client";

import type { PromptsTabState } from "./use-prompts-tab";

interface CompareVersionsModalProps {
  s: PromptsTabState;
}

export function CompareVersionsModal({ s }: CompareVersionsModalProps) {
  const { setCompareModalOpen, compareVersionAId, setCompareVersionAId, compareVersionBId, setCompareVersionBId, comparisonResult, comparingLoading, handleCompareSubmit, succeededVersions, compareModalOpen } = s;
  if (!compareModalOpen) return null;

  return (
    <div className="fixed inset-0 overflow-y-auto z-50 flex items-center-safe justify-center bg-black/80 p-3 sm:p-4">
      <div className="relative w-full max-w-4xl rounded-3xl border border-white/20 bg-[#0f1218] p-6 shadow-2xl space-y-4 max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Comparador de Versões (Diff)
          </h3>
          <button
            onClick={() => setCompareModalOpen(false)}
            className="text-white/60 hover:text-white"
          >
            ✕
          </button>
        </div>
    
        {/* Seleção das Versões */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-white/80 mb-1">Versão Base (A)</label>
            <select
              value={compareVersionAId}
              onChange={(e) => setCompareVersionAId(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs text-white focus:outline-none"
            >
              {succeededVersions.map((v) => (
                <option key={v.id} value={v.id}>
                  v{v.versionNumber || 1} - {v.templateKey} ({new Date(v.createdAt).toLocaleDateString("pt-BR")})
                </option>
              ))}
            </select>
          </div>
    
          <div>
            <label className="block text-xs font-semibold text-white/80 mb-1">Versão Comparada (B)</label>
            <select
              value={compareVersionBId}
              onChange={(e) => setCompareVersionBId(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs text-white focus:outline-none"
            >
              {succeededVersions.map((v) => (
                <option key={v.id} value={v.id}>
                  v{v.versionNumber || 1} - {v.templateKey} ({new Date(v.createdAt).toLocaleDateString("pt-BR")})
                </option>
              ))}
            </select>
          </div>
        </div>
    
        <div className="flex justify-end">
          <button
            onClick={handleCompareSubmit}
            disabled={comparingLoading || compareVersionAId === compareVersionBId}
            className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary-fixed transition disabled:opacity-50"
          >
            {comparingLoading ? "Comparando..." : "Executar Comparação"}
          </button>
        </div>
    
        {/* Resultado da Comparação */}
        {comparisonResult && (
          <div className="space-y-4 pt-3 border-t border-white/10">
            {comparisonResult.identical ? (
              <div className="rounded-xl bg-primary/10 border border-primary/20 p-3 text-xs text-primary text-center">
                As duas versões possuem conteúdo JSON e prompts de texto idênticos.
              </div>
            ) : (
              <>
                {/* Chaves Modificadas */}
                {comparisonResult.jsonDiff.modifiedKeys.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-white mb-2">Chaves JSON com Alterações:</h4>
                    <div className="space-y-2">
                      {comparisonResult.jsonDiff.modifiedKeys.map((m: any) => (
                        <div key={m.key} className="p-3 rounded-xl bg-black/60 border border-white/10 text-xs">
                          <span className="font-mono text-primary block font-semibold mb-1">{m.key}</span>
                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div className="p-2 rounded bg-red-950/20 border border-red-500/20 text-red-200">
                              <span className="text-[10px] uppercase text-red-400 block">Versão A:</span>
                              {typeof m.from === "object" ? JSON.stringify(m.from) : String(m.from)}
                            </div>
                            <div className="p-2 rounded bg-primary/20 border border-primary/20 text-primary">
                              <span className="text-[10px] uppercase text-primary block">Versão B:</span>
                              {typeof m.to === "object" ? JSON.stringify(m.to) : String(m.to)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
    
                {/* Comparação Lado a Lado do Prompt em Texto */}
                <div>
                  <h4 className="text-xs font-bold text-white mb-2">Texto do Prompt Lado a Lado:</h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl border border-white/10 bg-black/60 p-3 whitespace-pre-wrap text-white/80 max-h-48 overflow-y-auto">
                      <span className="text-[10px] text-white/40 block font-semibold mb-1 uppercase">Versão A</span>
                      {comparisonResult.versionA.outputText || "N/A"}
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/60 p-3 whitespace-pre-wrap text-white/80 max-h-48 overflow-y-auto">
                      <span className="text-[10px] text-primary block font-semibold mb-1 uppercase">Versão B</span>
                      {comparisonResult.versionB.outputText || "N/A"}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
