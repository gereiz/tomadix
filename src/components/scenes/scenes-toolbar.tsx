"use client";

import type { ScenesTabState } from "./use-scenes-tab";

interface ScenesToolbarProps {
  s: ScenesTabState;
}

export function ScenesToolbar({ s }: ScenesToolbarProps) {
  const { scenes, filterMode, setFilterMode, checkSceneReadiness, handleOpenCreate, handleRunContinuityCheck, handleOpenSequence, handleOpenScript } = s;


  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        {/* Filtros de Prontidão */}
        <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/10">
          {(["all", "ready", "incomplete"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                filterMode === mode
                  ? "bg-primary/20 text-primary border border-primary/30 font-semibold"
                  : "text-white/60 hover:text-white"
              }`}
            >
              {mode === "all" && `Todas (${scenes.length})`}
              {mode === "ready" &&
                `Prontas (${scenes.filter((s) => checkSceneReadiness(s).isReady).length})`}
              {mode === "incomplete" &&
                `Incompletas (${scenes.filter((s) => !checkSceneReadiness(s).isReady).length})`}
            </button>
          ))}
        </div>
    
        {/* Botão de Análise de Continuidade */}
        <button
          onClick={handleRunContinuityCheck}
          className="flex items-center gap-1.5 rounded-xl border border-purple-500/30 bg-purple-500/10 px-3 py-2 text-xs font-semibold text-purple-300 hover:bg-purple-500/20 transition shadow-sm"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Análise de Continuidade
        </button>
    
        {/* Botão Sequência com IA */}
        <button
          onClick={handleOpenSequence}
          className="flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition shadow-sm"
          title="Gerar sequência contínua de cenas com IA (GEN_SCENE_SEQUENCE)"
        >
          <span>✨</span>
          Criar cenas com IA
        </button>
    
        {/* Botão Roteiro com IA */}
        <button
          onClick={handleOpenScript}
          className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition shadow-sm"
          title="Gerar roteiro cinematográfico completo com IA (GEN_SCRIPT)"
        >
          <span>🎬</span>
          Roteiro com IA
        </button>
      </div>
    
      {/* Botão Nova Cena */}
      <button
        onClick={handleOpenCreate}
        className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-on-primary shadow-lg hover:opacity-90 transition"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Nova Cena
      </button>
    </div>
  );
}
