"use client";

import type { ScenesTabState } from "./use-scenes-tab";

interface ContinuityModalProps {
  s: ScenesTabState;
}

export function ContinuityModal({ s }: ContinuityModalProps) {
  const { setContinuityModalOpen, continuityReport, continuityLoading, continuityModalOpen } = s;
  if (!continuityModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center-safe justify-center bg-black/80 p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl max-h-[85dvh] overflow-y-auto rounded-3xl border border-white/10 bg-[#0f1218] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-purple-500/10 px-2 py-1 text-xs font-mono text-purple-300 border border-purple-500/20">
              SCRIPT CONTINUITY
            </span>
            <h3 className="text-base font-bold text-white">Relatório de Continuidade Cinematográfica</h3>
          </div>
          <button
            onClick={() => setContinuityModalOpen(false)}
            className="rounded-xl p-1.5 text-white/50 hover:bg-white/10 hover:text-white transition"
          >
            ✕
          </button>
        </div>
    
        <div className="mt-4">
          {continuityLoading ? (
            <div className="flex items-center justify-center py-12">
              <svg className="h-6 w-6 animate-spin text-purple-400" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            </div>
          ) : !continuityReport ? (
            <p className="text-xs text-white/50">Nenhum relatório disponível.</p>
          ) : (
            <div className="space-y-4">
              {/* Banner de Status Resumido */}
              <div
                className={`rounded-2xl border p-4 ${
                  continuityReport.status === "ok"
                    ? "border-primary/20 bg-primary/20 text-primary"
                    : continuityReport.status === "critical"
                    ? "border-red-500/20 bg-red-950/20 text-red-300"
                    : "border-amber-500/20 bg-amber-950/20 text-amber-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">
                    {continuityReport.status === "ok" && "✓ Continuidade Perfeita"}
                    {continuityReport.status === "critical" && "⚠ Inconsistências Críticas Detectadas"}
                    {continuityReport.status === "needs_attention" && "ℹ Pontos de Atenção Identificados"}
                  </span>
                  <span className="text-xs font-mono opacity-80">
                    {continuityReport.analyzedScenesCount} cenas analisadas
                  </span>
                </div>
                <div className="mt-2 flex gap-4 text-xs opacity-90">
                  <span>Críticos: {continuityReport.summary.critical}</span>
                  <span>Avisos: {continuityReport.summary.warning}</span>
                  <span>Sugestões: {continuityReport.summary.info}</span>
                </div>
              </div>
    
              {/* Lista de Alertas Explicáveis com Sugestões */}
              {continuityReport.warnings.length === 0 ? (
                <div className="rounded-2xl border border-white/5 bg-black/20 p-5 sm:p-8 text-center text-xs text-white/50">
                  Nenhuma quebra de continuidade detectada. As transições de ação, iluminação, ambiente e linha de olhar estão consistentes.
                </div>
              ) : (
                <div className="space-y-3">
                  {continuityReport.warnings.map((w, idx) => (
                    <div
                      key={idx}
                      className={`rounded-2xl border bg-black/40 p-4 space-y-2 ${
                        w.severity === "critical"
                          ? "border-red-500/30"
                          : w.severity === "warning"
                          ? "border-amber-500/30"
                          : "border-blue-500/30"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                              w.severity === "critical"
                                ? "bg-red-500/20 text-red-300"
                                : w.severity === "warning"
                                ? "bg-amber-500/20 text-amber-300"
                                : "bg-blue-500/20 text-blue-300"
                            }`}
                          >
                            {w.severity === "critical"
                              ? "Crítico"
                              : w.severity === "warning"
                              ? "Atenção"
                              : "Sugestão"}
                          </span>
                          <h5 className="font-bold text-xs text-white">{w.title}</h5>
                        </div>
    
                        {w.sceneOrderB && (
                          <span className="text-[10px] font-mono text-white/40">
                            Cena {w.sceneOrderA} → Cena {w.sceneOrderB}
                          </span>
                        )}
                      </div>
    
                      <p className="text-xs text-white/70">{w.message}</p>
    
                      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2 text-[11px] text-primary">
                        <strong>💡 Sugestão do Diretor:</strong> {w.suggestion}
                      </div>
                    </div>
                  ))}
                </div>
              )}
    
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setContinuityModalOpen(false)}
                  className="rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20 transition"
                >
                  Fechar Relatório
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
