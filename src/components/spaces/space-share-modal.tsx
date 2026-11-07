"use client";

import { MemberPicker } from "./share/member-picker";
import type { SpaceVisibilityType } from "./share/types";
import { useSpaceSharing } from "./share/use-space-sharing";
import { VisibilityOptions } from "./share/visibility-options";

export type { SpaceVisibilityType } from "./share/types";

interface SpaceShareModalProps {
  projectId: string;
  projectTitle?: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: (result: { visibility: SpaceVisibilityType; selectedCount: number }) => void;
}

export function SpaceShareModal({ projectId, projectTitle, isOpen, onClose, onUpdated }: SpaceShareModalProps) {
  const s = useSpaceSharing({ projectId, projectTitle, isOpen, onClose, onUpdated });

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="space-share-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-white/15 bg-[#101418] p-6 text-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary text-sm">
                🔗
              </span>
              <h2 id="space-share-title" className="text-lg font-bold text-white">
                Compartilhar Space
              </h2>
            </div>
            <p className="mt-1 text-xs text-white/60">
              Defina quem pode visualizar e colaborar no board{" "}
              <span className="font-semibold text-white/90">&ldquo;{s.title}&rdquo;</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/60 hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>

        {s.loading ? (
          <div className="py-12 text-center text-sm text-white/60">
            Carregando configurações de acesso da equipe...
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {s.error && (
              <div
                role="alert"
                className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-300"
              >
                {s.error}
              </div>
            )}

            <VisibilityOptions value={s.visibility} disabled={!s.canManageSharing} onChange={s.setVisibility} />

            {s.visibility === "SELECTED" && (
              <MemberPicker
                members={s.filteredMembers}
                ownerUserId={s.ownerUserId}
                selectedMap={s.selectedMap}
                search={s.memberSearch}
                disabled={!s.canManageSharing}
                onSearchChange={s.setMemberSearch}
                onToggle={s.toggleMember}
                onPermissionChange={s.setMemberPermission}
              />
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={s.copyLink}
                className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <span>{s.copiedLink ? "✅" : "🔗"}</span>
                <span>{s.copiedLink ? "Link copiado!" : "Copiar link do Space"}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white/70 hover:bg-white/10 hover:text-white"
                >
                  Cancelar
                </button>
                {s.canManageSharing && (
                  <button
                    type="button"
                    onClick={s.save}
                    disabled={s.saving}
                    className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-on-primary shadow-md shadow-primary/20 transition hover:opacity-90 disabled:opacity-50"
                  >
                    {s.saving ? "Salvando..." : "Salvar Compartilhamento"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
