"use client";

import { cachedFetch } from "@/lib/client-fetch-cache";
import { useEffect, useState } from "react";

interface WorkspaceOption {
  id: string;
  name: string;
  role: string;
  isArchived?: boolean;
}

interface TransferProjectModalProps {
  projectId: string;
  projectTitle: string;
  currentWorkspaceId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function TransferProjectModal({
  projectId,
  projectTitle,
  currentWorkspaceId,
  isOpen,
  onClose,
  onSuccess,
}: TransferProjectModalProps) {
  const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    cachedFetch("/api/workspaces", 10_000)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.data) {
          // Filtrar apenas outros workspaces ativos onde o usuário pode criar projetos (OWNER, ADMIN, MEMBER)
          const valid = (data.data as WorkspaceOption[]).filter(
            (w) => w.id !== currentWorkspaceId && !w.isArchived && w.role !== "VIEWER"
          );
          setWorkspaces(valid);
          if (valid.length > 0) setSelectedTargetId(valid[0].id);
        }
      })
      .catch((err) => console.error("Erro ao buscar workspaces:", err));
  }, [isOpen, currentWorkspaceId]);

  if (!isOpen) return null;

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTargetId) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetWorkspaceId: selectedTargetId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao transferir projeto.");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Falha na transferência do projeto.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 overflow-y-auto z-50 flex items-center-safe justify-center bg-black/80 p-3 sm:p-4 text-white">
      <div className="max-w-md w-full rounded-2xl border border-white/10 bg-[#0d1017] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Transferir Projeto</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white text-sm">
            ✕
          </button>
        </div>

        <p className="text-xs text-white/60">
          Transfira o projeto <strong>&quot;{projectTitle}&quot;</strong> para outro estúdio sob sua gestão.
          Todos os personagens, ambientes, cenas e histórico de prompts permanecerão intactos.
        </p>

        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-950/50 p-3 text-xs text-red-300">
            {error}
          </div>
        )}

        {workspaces.length === 0 ? (
          <div className="rounded-xl bg-white/5 p-4 text-center text-xs text-white/50">
            Você não possui outros estúdios com permissão de criação de projetos.
          </div>
        ) : (
          <form onSubmit={handleTransfer} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1">
                Workspace de Destino
              </label>
              <select
                value={selectedTargetId}
                onChange={(e) => setSelectedTargetId(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-[#0d1017] px-3.5 py-2.5 text-xs text-white focus:border-primary focus:outline-none"
              >
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} (Seu papel: {w.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-[11px] text-amber-200/80">
              ⚠️ O limite de projetos do plano do workspace de destino será verificado antes da transferência.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-xs text-white/60 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !selectedTargetId}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-on-primary transition hover:opacity-90 disabled:opacity-50 shadow-md shadow-primary/20"
              >
                {loading ? "Transferindo..." : "Confirmar Transferência"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
