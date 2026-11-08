"use client";

import { CINEMA_PRESETS, getGenreVisual } from "./helpers";
import type { ProjectsListTabState } from "./use-projects-list";

interface PresetsModalProps {
  s: ProjectsListTabState;
}

export function PresetsModal({ s }: PresetsModalProps) {
  const { setIsPresetsModalOpen, handleApplyPreset, isPresetsModalOpen } = s;
  if (!isPresetsModalOpen) return null;

  return (
    <div className="fixed inset-0 overflow-y-auto z-50 flex items-center-safe justify-center bg-black/80 p-3 sm:p-4">
      <div className="relative max-h-[90dvh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-outline-variant/40 bg-surface-container-low p-6 sm:p-8 shadow-2xl">
        <div className="flex items-center justify-between border-b border-outline-variant/30 pb-4">
          <div>
            <span className="text-xs uppercase tracking-wider text-primary font-label-code font-semibold">
              Templates Pré-Configurados
            </span>
            <h2 className="mt-1 text-2xl font-bold font-headline-md text-on-surface">
              Presets Rápidos de Produção
            </h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Escolha uma predefinição para preencher instantaneamente a direção de arte e parâmetros técnicos.
            </p>
          </div>
          <button
            onClick={() => setIsPresetsModalOpen(false)}
            className="rounded-xl p-2 text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition"
          >
            ✕
          </button>
        </div>
    
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {CINEMA_PRESETS.map((preset) => {
            const visual = getGenreVisual(preset.genre);
            return (
              <div
                key={preset.title}
                onClick={() => handleApplyPreset(preset)}
                className="p-5 rounded-2xl bg-surface-container/70 border border-outline-variant/30 hover:border-primary/50 hover:bg-surface-container transition-all cursor-pointer group shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase font-label-caps ${visual.badge}`}>
                      {preset.genre}
                    </span>
                    <span className="font-label-code text-[11px] text-on-surface-variant">
                      {preset.aspectRatio} • {preset.targetPlatform}
                    </span>
                  </div>
                  <h4 className="font-bold text-base text-on-surface group-hover:text-primary transition-colors">
                    {preset.title}
                  </h4>
                  <p className="mt-2 text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
                    {preset.description}
                  </p>
                </div>
    
                <div className="mt-4 pt-3 border-t border-outline-variant/20 flex items-center justify-between text-xs">
                  <span className="text-on-surface-variant/70 font-mono">{preset.durationSeconds}s • {preset.pacing}</span>
                  <span className="text-primary font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    Usar Preset →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
