"use client";

import type { SaveStatus } from "../types";

interface BoardTopBarProps {
  projectTitle: string;
  saveStatus: SaveStatus;
  canEdit: boolean;
  onSwitchToClassicStudio?: () => void;
  onOpenShareModal?: () => void;
}

export function BoardTopBar({ projectTitle, saveStatus, canEdit, onSwitchToClassicStudio, onOpenShareModal }: BoardTopBarProps) {
  return (
    <div className="pointer-events-none absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2">
      {/* Left: Space Breadcrumb & Status */}
      <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-outline-variant/30 bg-surface-container/90 px-3 py-1.5 shadow-lg">
        <span className="text-sm">✨</span>
        <span className="text-xs font-bold text-on-surface truncate max-w-[200px]">
          {projectTitle}
        </span>
        <span className="text-on-surface-variant/40">•</span>
        <span className="text-[11px] font-medium text-on-surface-variant">
          {saveStatus === "saving"
            ? "⏳ Salvando..."
            : saveStatus === "unsaved"
              ? "● Alterações pendentes"
              : "✓ Sincronizado"}
        </span>
        {!canEdit && (
          <span className="rounded bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
            Somente Leitura
          </span>
        )}
      </div>
    
      {/* Right: Quick Actions, Classic Studio Switcher & Share Button */}
      <div className="pointer-events-auto flex items-center gap-2">
        {onSwitchToClassicStudio && (
          <button
            type="button"
            onClick={onSwitchToClassicStudio}
            className="flex items-center gap-1.5 rounded-xl border border-outline-variant/30 bg-surface-container/90 px-3 py-1.5 text-xs font-medium text-on-surface-variant shadow-lg transition hover:bg-surface-container-high hover:text-on-surface"
            title="Alternar para as abas detalhadas de Personagens, Ambientes, Roteiro e Cenas"
          >
            <span>🎬</span>
            <span className="hidden sm:inline">Estúdio Detalhado (Cenas & Personagens)</span>
          </button>
        )}
    
        {onOpenShareModal && (
          <button
            type="button"
            onClick={onOpenShareModal}
            className="flex items-center gap-1.5 rounded-xl bg-on-surface px-3.5 py-1.5 text-xs font-semibold text-surface shadow-lg transition hover:opacity-90"
          >
            <span>🔗</span>
            <span>Compartilhar</span>
          </button>
        )}
      </div>
    </div>
  );
}
