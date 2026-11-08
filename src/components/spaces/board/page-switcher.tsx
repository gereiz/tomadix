"use client";

import type { BoardSummary } from "../types";

interface PageSwitcherProps {
  boards: BoardSummary[];
  activeBoardId: string;
  canEdit: boolean;
  handleSelectBoardPage: (boardId: string) => void;
  handleCreateBoardPage: () => void;
}

export function PageSwitcher({ boards, activeBoardId, canEdit, handleSelectBoardPage, handleCreateBoardPage }: PageSwitcherProps) {
  return (
    <div className="pointer-events-auto absolute bottom-3.5 left-3 right-16 z-20 flex max-w-max items-center gap-1.5 overflow-x-auto no-scrollbar rounded-xl sm:left-3.5 sm:right-auto border border-outline-variant/30 bg-surface-container/95 p-1 shadow-xl">
      {boards.map((b) => {
        const active = b.id === activeBoardId;
        return (
          <button
            key={b.id}
            type="button"
            onClick={() => handleSelectBoardPage(b.id)}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ${active
              ? "bg-surface-container-high text-on-surface font-semibold shadow-sm"
              : "text-on-surface-variant hover:text-on-surface"
              }`}
          >
            <span>📄</span>
            <span>{b.name}</span>
          </button>
        );
      })}
      {canEdit && (
        <button
          type="button"
          onClick={handleCreateBoardPage}
          title="Nova página de Board"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold sm:h-6 sm:w-6 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
        >
          +
        </button>
      )}
    </div>
  );
}
