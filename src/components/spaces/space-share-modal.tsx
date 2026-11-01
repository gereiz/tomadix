"use client";

import { useEffect, useState } from "react";

export type SpaceVisibilityType = "PRIVATE" | "TEAM" | "SELECTED";

interface WorkspaceMemberOption {
  userId: string;
  displayName: string;
  email: string;
  workspaceRole: string;
}

interface SelectedMemberEntry {
  userId: string;
  canEdit: boolean;
  displayName?: string;
  email?: string;
}

interface SpaceShareModalProps {
  projectId: string;
  projectTitle?: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: (result: { visibility: SpaceVisibilityType; selectedCount: number }) => void;
}

export function SpaceShareModal({
  projectId,
  projectTitle,
  isOpen,
  onClose,
  onUpdated,
}: SpaceShareModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const [title, setTitle] = useState(projectTitle || "Space");
  const [visibility, setVisibility] = useState<SpaceVisibilityType>("TEAM");
  const [ownerUserId, setOwnerUserId] = useState<string>("");
  const [canManageSharing, setCanManageSharing] = useState<boolean>(true);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMemberOption[]>([]);
  const [selectedMap, setSelectedMap] = useState<Record<string, { canEdit: boolean }>>({});
  const [memberSearch, setMemberSearch] = useState("");

  useEffect(() => {
    if (!isOpen || !projectId) return;
    setLoading(true);
    setError(null);

    fetch(`/api/projects/${projectId}/sharing`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "Não foi possível carregar opções de compartilhamento.");
        }
        return json.data;
      })
      .then((data) => {
        setTitle(data.title || projectTitle || "Space");
        setVisibility(data.visibility || "TEAM");
        setOwnerUserId(data.ownerUserId || "");
        setCanManageSharing(Boolean(data.canManageSharing));
        setWorkspaceMembers(data.workspaceMembers || []);

        const initialSelected: Record<string, { canEdit: boolean }> = {};
        for (const sm of (data.selectedMembers || []) as SelectedMemberEntry[]) {
          initialSelected[sm.userId] = { canEdit: sm.canEdit ?? true };
        }
        setSelectedMap(initialSelected);
      })
      .catch((err: any) => {
        setError(err.message || "Erro ao carregar compartilhamento.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, projectId, projectTitle]);

  if (!isOpen) return null;

  const toggleMember = (userId: string) => {
    if (!canManageSharing) return;
    setSelectedMap((prev) => {
      const next = { ...prev };
      if (next[userId]) {
        delete next[userId];
      } else {
        next[userId] = { canEdit: true };
      }
      return next;
    });
  };

  const setMemberPermission = (userId: string, canEdit: boolean) => {
    if (!canManageSharing) return;
    setSelectedMap((prev) => ({
      ...prev,
      [userId]: { canEdit },
    }));
  };

  const handleCopyLink = () => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/projects/${projectId}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSave = async () => {
    if (!canManageSharing) return;
    setSaving(true);
    setError(null);

    try {
      const membersPayload = Object.entries(selectedMap).map(([userId, cfg]) => ({
        userId,
        canEdit: cfg.canEdit,
      }));

      const res = await fetch(`/api/projects/${projectId}/sharing`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visibility,
          members: membersPayload,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Falha ao salvar compartilhamento.");
      }

      onUpdated?.({
        visibility,
        selectedCount: membersPayload.length,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Erro ao salvar compartilhamento.");
    } finally {
      setSaving(false);
    }
  };

  const filteredMembers = workspaceMembers.filter((m) => {
    if (!memberSearch.trim()) return true;
    const q = memberSearch.toLowerCase();
    return (
      m.displayName.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl border border-white/15 bg-[#101418] p-6 text-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary text-sm">
                🔗
              </span>
              <h2 className="text-lg font-bold text-white">
                Compartilhar Space
              </h2>
            </div>
            <p className="mt-1 text-xs text-white/60">
              Defina quem pode visualizar e colaborar no board{" "}
              <span className="font-semibold text-white/90">&ldquo;{title}&rdquo;</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/60 hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-white/60">
            Carregando configurações de acesso da equipe...
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-300">
                {error}
              </div>
            )}

            {/* Opções de Visibilidade */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-white/50">
                Nível de Visibilidade no Workspace
              </label>

              {(
                [
                  {
                    id: "PRIVATE" as const,
                    icon: "🔒",
                    title: "Privado (Somente eu)",
                    desc: "Apenas você (e administradores do Workspace) podem acessar este Space.",
                  },
                  {
                    id: "TEAM" as const,
                    icon: "👥",
                    title: "Toda a equipe do Workspace",
                    desc: "Todos os membros do Workspace atual podem abrir e colaborar no board.",
                  },
                  {
                    id: "SELECTED" as const,
                    icon: "🎯",
                    title: "Membros selecionados",
                    desc: "Escolha exatamente quais membros da equipe visualizam ou editam este Space.",
                  },
                ]
              ).map((opt) => {
                const active = visibility === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={!canManageSharing}
                    onClick={() => setVisibility(opt.id)}
                    className={`flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition ${
                      active
                        ? "border-primary bg-primary/10 shadow-sm shadow-primary/10"
                        : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                    } ${!canManageSharing ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    <span className="mt-0.5 text-lg">{opt.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-white">
                          {opt.title}
                        </span>
                        <span
                          className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                            active ? "border-primary bg-primary text-black" : "border-white/30"
                          }`}
                        >
                          {active && <span className="text-[10px] font-bold">✓</span>}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-white/60">{opt.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Seleção granular de membros quando visibility === SELECTED */}
            {visibility === "SELECTED" && (
              <div className="space-y-2.5 rounded-xl border border-white/10 bg-black/30 p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-white/80">
                    Membros com acesso ({Object.keys(selectedMap).length} selecionados)
                  </span>
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Buscar membro..."
                    className="w-44 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-xs text-white placeholder:text-white/40 focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
                  {filteredMembers.length === 0 ? (
                    <div className="py-4 text-center text-xs text-white/40">
                      Nenhum membro encontrado na equipe.
                    </div>
                  ) : (
                    filteredMembers.map((member) => {
                      const isOwnerOrAdmin =
                        member.userId === ownerUserId ||
                        member.workspaceRole === "OWNER" ||
                        member.workspaceRole === "ADMIN";
                      const isChecked = isOwnerOrAdmin || Boolean(selectedMap[member.userId]);
                      const canEdit = isOwnerOrAdmin
                        ? true
                        : (selectedMap[member.userId]?.canEdit ?? true);

                      return (
                        <div
                          key={member.userId}
                          className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 transition ${
                            isChecked
                              ? "border-primary/30 bg-primary/5"
                              : "border-white/5 bg-white/[0.02]"
                          }`}
                        >
                          <label className="flex flex-1 cursor-pointer items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={isOwnerOrAdmin || !canManageSharing}
                              onChange={() => toggleMember(member.userId)}
                              className="h-4 w-4 rounded border-white/20 accent-emerald-400"
                            />
                            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold uppercase text-white">
                              {member.displayName.substring(0, 1)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 truncate text-xs font-semibold text-white">
                                <span className="truncate">{member.displayName}</span>
                                {member.userId === ownerUserId && (
                                  <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-mono text-amber-300">
                                    Criador
                                  </span>
                                )}
                                {(member.workspaceRole === "OWNER" ||
                                  member.workspaceRole === "ADMIN") && (
                                  <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-mono text-white/70">
                                    {member.workspaceRole}
                                  </span>
                                )}
                              </div>
                              <div className="truncate text-[11px] text-white/50">
                                {member.email}
                              </div>
                            </div>
                          </label>

                          {isChecked && !isOwnerOrAdmin && (
                            <select
                              value={canEdit ? "edit" : "view"}
                              disabled={!canManageSharing}
                              onChange={(e) =>
                                setMemberPermission(
                                  member.userId,
                                  e.target.value === "edit"
                                )
                              }
                              className="rounded-lg border border-white/15 bg-black/50 px-2 py-1 text-[11px] font-medium text-white focus:border-primary focus:outline-none"
                            >
                              <option value="edit">Pode editar</option>
                              <option value="view">Somente ver</option>
                            </select>
                          )}

                          {isOwnerOrAdmin && (
                            <span className="text-[11px] font-medium text-white/40">
                              Acesso total
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Rodapé de Ações */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <span>{copiedLink ? "✅" : "🔗"}</span>
                <span>{copiedLink ? "Link copiado!" : "Copiar link do Space"}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white/70 hover:bg-white/10 hover:text-white"
                >
                  Cancelar
                </button>
                {canManageSharing && (
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-on-primary shadow-md shadow-primary/20 transition hover:opacity-90 disabled:opacity-50"
                  >
                    {saving ? "Salvando..." : "Salvar Compartilhamento"}
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

