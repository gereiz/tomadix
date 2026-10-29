"use client";

import { VisualCoverageDashboard } from "@/components/visual-library/visual-coverage-dashboard";

export default function AdminVisualLibraryPage() {
  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-300 border border-amber-500/30">
              CINEMA ASSETS & DICTIONARY
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Biblioteca Visual de Referências
          </h1>
          <p className="text-xs text-white/50 max-w-2xl mt-1">
            Controle de cobertura, didática e governança dos ativos visuais para parâmetros cinematográficos e de vídeo da Tomadix.
          </p>
        </div>
      </div>

      <VisualCoverageDashboard />
    </div>
  );
}
