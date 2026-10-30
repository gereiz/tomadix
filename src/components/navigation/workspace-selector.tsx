"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface WorkspaceItem {
  id: string;
  name: string;
  slug: string;
  isPersonal?: boolean;
  isArchived?: boolean;
  role: string;
}

export function WorkspaceSelector() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceItem | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchWorkspaces = async () => {
    try {
      const res = await fetch("/api/workspaces");
      if (res.ok) {
        const data = await res.json();
        const list: WorkspaceItem[] = data.data || [];
        setWorkspaces(list);

        // Identificar workspace ativo a partir do cookie ou primeiro da lista
        const cookieMatch = document.cookie.match(/cineprompt_active_workspace=([^;]+)/);
        const activeId = cookieMatch ? cookieMatch[1] : null;
        const found = list.find((w) => w.id === activeId) || list[0] || null;
        setActiveWorkspace(found);
      }
    } catch (err) {
      console.error("Erro ao carregar workspaces:", err);
    }
  };

  useEffect(() => {
    fetchWorkspaces();

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSwitch = async (workspaceId: string) => {
    if (workspaceId === activeWorkspace?.id) {
      setIsOpen(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/workspaces/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });

      if (res.ok) {
        const target = workspaces.find((w) => w.id === workspaceId);
        if (target) setActiveWorkspace(target);
        setIsOpen(false);
        window.dispatchEvent(new CustomEvent("tomadix:workspace-switched", { detail: { workspaceId } }));
        router.refresh();
        window.location.reload();
      }
    } catch (err) {
      console.error("Erro ao alternar workspace:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newWorkspaceName.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao criar workspace.");
      }

      setShowCreateModal(false);
      setNewWorkspaceName("");
      await fetchWorkspaces();

      // Alternar para o novo workspace
      if (data.data?.id) {
        await handleSwitch(data.data.id);
      }
    } catch (err: any) {
      setError(err.message || "Falha ao criar workspace.");
    } finally {
      setLoading(false);
    }
  };

  if (!activeWorkspace) return null;

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 sm:gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-2 sm:px-3 py-1.5 text-xs text-white transition hover:bg-white/[0.08]"
      >
        <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md bg-emerald-400/20 text-[10px] font-bold text-emerald-300">
          🏢
        </div>
        <div className="flex flex-col text-left truncate">
          <span className="font-semibold truncate max-w-[80px] xs:max-w-[100px] sm:max-w-[140px]">
            {activeWorkspace.name}
          </span>
        </div>
        <span className="hidden sm:inline rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-300 flex-shrink-0">
          {activeWorkspace.role}
        </span>
        <svg
          className={`h-3 w-3 sm:h-3.5 sm:w-3.5 text-white/40 transition-transform flex-shrink-0 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 sm:right-auto sm:left-0 mt-2 w-64 max-w-[calc(100vw-2rem)] origin-top-right sm:origin-top-left rounded-2xl border border-white/15 bg-[#0d1017] p-2 shadow-2xl z-50 backdrop-blur-xl">
          <div className="px-3 py-2 text-[10px] uppercase font-bold tracking-wider text-white/40 border-b border-white/10">
            Seus Estúdios & Equipes
          </div>

          <div className="mt-1 max-h-56 overflow-y-auto space-y-1">
            {workspaces.map((ws) => {
              const isActive = ws.id === activeWorkspace.id;
              return (
                <button
                  key={ws.id}
                  onClick={() => handleSwitch(ws.id)}
                  disabled={loading}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition ${
                    isActive
                      ? "bg-emerald-400/10 text-emerald-300 border border-emerald-400/20"
                      : "text-white/80 hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-sm">{ws.isPersonal ? "👤" : "👥"}</span>
                    <span className="truncate font-medium">{ws.name}</span>
                  </div>
                  <span className="text-[10px] text-white/40 font-mono uppercase">
                    {ws.role}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
            <button
              onClick={() => {
                setIsOpen(false);
                setShowCreateModal(true);
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/10 transition"
            >
              <span>➕</span> Criar Novo Workspace
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                router.push("/workspace/members");
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-white/60 hover:bg-white/5 transition"
            >
              <span>⚙️</span> Gestão da Equipe & Membros
            </button>
          </div>
        </div>
      )}

      {/* Modal Criar Workspace */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="max-w-md w-full rounded-2xl border border-white/10 bg-[#0d1017] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Criar Novo Workspace</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-white/40 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-white/60">
              Crie um novo estúdio para organizar produções cinematográficas independentes ou colaborar com equipes.
            </p>

            {error && (
              <div className="rounded-xl bg-red-950/50 border border-red-500/40 p-3 text-xs text-red-300">
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-white/70 mb-1">
                  Nome do Estúdio ou Produtora
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Solaris Filmes"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl px-4 py-2 text-xs text-white/60 hover:text-white transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !newWorkspaceName.trim()}
                  className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? "Criando..." : "Criar Estúdio"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
