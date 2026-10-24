"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [genreFilter, setGenreFilter] = useState("all");
  const [sort, setSort] = useState("updated");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>({ total: 0, totalPages: 1 });

  // Modals state
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [projectDetails, setProjectDetails] = useState<any>(null);

  // Archive modal
  const [archiveTarget, setArchiveTarget] = useState<any>(null);
  const [archiveReason, setArchiveReason] = useState("");
  const [isArchiving, setIsArchiving] = useState(false);

  // Transfer modal
  const [transferTarget, setTransferTarget] = useState<any>(null);
  const [targetWorkspaceId, setTargetWorkspaceId] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);
  const [availableWorkspaces, setAvailableWorkspaces] = useState<any[]>([]);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: page.toString(),
        limit: "15",
        status: statusFilter,
        search,
        sort,
      });
      if (genreFilter !== "all") query.set("genre", genreFilter);

      const res = await fetch(`/api/admin/projects?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
        setPagination(data.pagination || { total: 0, totalPages: 1 });
      }
    } catch {
      showNotification("error", "Erro ao carregar lista de projetos.");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, genreFilter, sort, search]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProjects();
  };

  const handleViewDetails = async (projectId: string) => {
    setSelectedProject(projectId);
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/admin/projects/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setProjectDetails(data);
      } else {
        showNotification("error", "Falha ao carregar detalhes do projeto.");
      }
    } catch {
      showNotification("error", "Erro de conexão ao carregar detalhes.");
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleArchiveToggle = async (project: any) => {
    if (!project.isArchived) {
      setArchiveTarget(project);
      setArchiveReason("");
      return;
    }

    // Se já está arquivado, desarquivar diretamente
    try {
      const res = await fetch(`/api/admin/projects/${project.id}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unarchive" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showNotification("success", data.message || "Projeto desarquivado com sucesso.");
      fetchProjects();
    } catch (err: any) {
      showNotification("error", err.message || "Erro ao desarquivar projeto.");
    }
  };

  const handleConfirmArchive = async () => {
    if (!archiveTarget || !archiveReason.trim()) return;
    setIsArchiving(true);
    try {
      const res = await fetch(`/api/admin/projects/${archiveTarget.id}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "archive", reason: archiveReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showNotification("success", data.message || "Projeto arquivado com sucesso.");
      setArchiveTarget(null);
      setArchiveReason("");
      fetchProjects();
    } catch (err: any) {
      showNotification("error", err.message || "Erro ao arquivar projeto.");
    } finally {
      setIsArchiving(false);
    }
  };

  const handleOpenTransfer = async (project: any) => {
    setTransferTarget(project);
    setTargetWorkspaceId("");
    setTransferReason("");
    setLoadingWorkspaces(true);

    try {
      const res = await fetch("/api/admin/users?limit=50");
      if (res.ok) {
        const data = await res.json();
        const wsList: any[] = [];
        data.users?.forEach((u: any) => {
          u.memberships?.forEach((m: any) => {
            if (m.workspace && m.workspace.id !== project.workspaceId) {
              if (!wsList.some((w) => w.id === m.workspace.id)) {
                wsList.push({
                  id: m.workspace.id,
                  name: m.workspace.name,
                  owner: u.email,
                  plan: m.workspace.subscription?.planTier || "FREE",
                });
              }
            }
          });
        });
        setAvailableWorkspaces(wsList);
      }
    } catch {
      showNotification("error", "Não foi possível carregar workspaces para transferência.");
    } finally {
      setLoadingWorkspaces(false);
    }
  };

  const handleConfirmTransfer = async () => {
    if (!transferTarget || !targetWorkspaceId || !transferReason.trim()) return;
    setIsTransferring(true);
    try {
      const res = await fetch(`/api/admin/projects/${transferTarget.id}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetWorkspaceId, reason: transferReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showNotification("success", data.message || "Projeto transferido com sucesso.");
      setTransferTarget(null);
      setTargetWorkspaceId("");
      setTransferReason("");
      fetchProjects();
    } catch (err: any) {
      showNotification("error", err.message || "Falha ao transferir projeto.");
    } finally {
      setIsTransferring(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || !deleteReason.trim()) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/projects/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: deleteReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showNotification("success", data.message || "Projeto excluído com sucesso.");
      setDeleteTarget(null);
      setDeleteReason("");
      fetchProjects();
    } catch (err: any) {
      showNotification("error", err.message || "Erro ao excluir projeto.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast de Notificação */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 rounded-xl p-4 text-sm font-semibold shadow-2xl backdrop-blur-md transition-all ${
            notification.type === "success"
              ? "border border-emerald-500/40 bg-emerald-950/90 text-emerald-200"
              : "border border-rose-500/40 bg-rose-950/90 text-rose-200"
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Header do Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-semibold tracking-wider text-amber-400 uppercase">
              Operações de Conteúdo & SaaS
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Gestão Global de Projetos</span>
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-white/70 font-mono">
              {pagination.total} projetos
            </span>
          </h1>
          <p className="text-xs text-white/50 mt-1">
            Audite roteiros cinematográficos, transfira obras entre estúdios e supervisione ativos criados na plataforma.
          </p>
        </div>

        <button
          onClick={() => fetchProjects()}
          className="self-start sm:self-auto rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 transition flex items-center gap-1.5"
        >
          <span>🔄</span> Atualizar Lista
        </button>
      </div>

      {/* Filtros e Busca */}
      <div className="rounded-2xl border border-white/10 bg-[#0d1017]/80 p-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[240px]">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título, descrição, gênero ou nome do estúdio..."
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2 text-xs text-white placeholder-white/40 focus:border-amber-400 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white/80 focus:border-amber-400 focus:outline-none"
            >
              <option value="all">Status: Todos</option>
              <option value="active">Apenas Ativos</option>
              <option value="archived">Apenas Arquivados</option>
            </select>

            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white/80 focus:border-amber-400 focus:outline-none"
            >
              <option value="updated">Mais Recentes (Atualização)</option>
              <option value="newest">Mais Novos (Criação)</option>
              <option value="oldest">Mais Antigos (Criação)</option>
              <option value="title">Título (A-Z)</option>
            </select>

            <button
              type="submit"
              className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-black hover:bg-amber-300 transition"
            >
              Filtrar
            </button>
          </div>
        </form>
      </div>

      {/* Tabela de Projetos */}
      <div className="rounded-2xl border border-white/10 bg-[#0d1017]/90 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/10 bg-white/[0.02] text-white/50 uppercase font-mono tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3.5">Projeto</th>
                <th className="px-5 py-3.5">Estúdio / Dono</th>
                <th className="px-5 py-3.5 text-center">Ativos (Cenas / Personagens / Ambientes)</th>
                <th className="px-5 py-3.5 text-center">Gerações IA</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-right">Ações Administrativas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-white/80">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-white/40">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-amber-400 border-t-transparent mb-2" />
                    <p>Carregando projetos da plataforma...</p>
                  </td>
                </tr>
              ) : projects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-white/40">
                    Nenhum projeto encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                projects.map((project) => (
                  <tr key={project.id} className="hover:bg-white/[0.02] transition">
                    <td className="px-5 py-4">
                      <div>
                        <span className="font-bold text-white text-sm block">
                          {project.title}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-white/50">
                          <span className="rounded bg-white/5 px-1.5 py-0.5 border border-white/10 text-white/60">
                            {project.genre || "Geral"}
                          </span>
                          <span>•</span>
                          <span>{project.language}</span>
                          {project.durationSeconds && (
                            <>
                              <span>•</span>
                              <span>{project.durationSeconds}s</span>
                            </>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div>
                        <span className="font-semibold text-white block">
                          {project.workspaceName}
                        </span>
                        <span className="text-[11px] text-white/50 block">
                          {project.ownerEmail}
                        </span>
                        <span className="inline-block mt-0.5 rounded px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {project.planTier}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-center">
                      <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-1 font-mono text-[11px]">
                        <span title="Cenas" className="text-amber-300 font-bold">
                          🎬 {project.counts.scenes}
                        </span>
                        <span className="text-white/20">|</span>
                        <span title="Personagens" className="text-blue-300 font-bold">
                          👤 {project.counts.characters}
                        </span>
                        <span className="text-white/20">|</span>
                        <span title="Ambientes" className="text-purple-300 font-bold">
                          🏞️ {project.counts.environments}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-center">
                      <span className="rounded-lg bg-amber-500/10 px-2 py-1 font-mono font-bold text-amber-300 border border-amber-500/20 text-xs">
                        ⚡ {project.counts.generations}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-center">
                      {project.isArchived ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-1 text-[10px] font-bold text-rose-300 border border-rose-500/30">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-400" /> Arquivado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Ativo
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleViewDetails(project.id)}
                          className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-semibold text-white/80 hover:bg-white/10 hover:text-white transition"
                          title="Ver detalhes técnicos completos"
                        >
                          👁️ Detalhes
                        </button>

                        <button
                          onClick={() => handleOpenTransfer(project)}
                          className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-indigo-300 hover:bg-indigo-500/20 transition"
                          title="Transferir para outro Workspace"
                        >
                          🔄 Transferir
                        </button>

                        <button
                          onClick={() => handleArchiveToggle(project)}
                          className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition ${
                            project.isArchived
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                              : "border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                          }`}
                          title={project.isArchived ? "Desarquivar obra" : "Arquivar obra"}
                        >
                          {project.isArchived ? "Desarquivar" : "Arquivar"}
                        </button>

                        <button
                          onClick={() => {
                            setDeleteTarget(project);
                            setDeleteReason("");
                          }}
                          className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-rose-300 hover:bg-rose-500/20 transition"
                          title="Excluir projeto permanentemente"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-white/10 p-4 text-xs text-white/60">
            <div>
              Mostrando página <strong className="text-white">{pagination.page}</strong> de{" "}
              <strong className="text-white">{pagination.totalPages}</strong> (Total: {pagination.total})
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="rounded-xl border border-white/10 px-3 py-1.5 disabled:opacity-30 hover:bg-white/5 transition"
              >
                ← Anterior
              </button>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(page + 1)}
                className="rounded-xl border border-white/10 px-3 py-1.5 disabled:opacity-30 hover:bg-white/5 transition"
              >
                Próxima →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Detalhes do Projeto */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-white/15 bg-[#0d1017] p-6 sm:p-8 text-white shadow-2xl">
            <button
              onClick={() => {
                setSelectedProject(null);
                setProjectDetails(null);
              }}
              className="absolute top-6 right-6 text-white/40 hover:text-white transition text-lg"
            >
              ✕
            </button>

            {loadingDetails || !projectDetails ? (
              <div className="py-20 text-center text-white/50">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent mb-3" />
                <p>Carregando prontuário técnico do projeto...</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <span className="rounded bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 font-mono">
                    PROJETO ID: {projectDetails.project.id}
                  </span>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">
                    {projectDetails.project.title}
                  </h2>
                  <p className="mt-1 text-sm text-white/60">
                    {projectDetails.project.description || "Sem sinopse informada."}
                  </p>
                </div>

                {/* Cards de Métricas */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-center">
                    <span className="text-[10px] text-white/50 uppercase font-mono block">Cenas Decupadas</span>
                    <strong className="text-xl text-amber-300 font-bold mt-1 block">
                      {projectDetails.project._count.scenes}
                    </strong>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-center">
                    <span className="text-[10px] text-white/50 uppercase font-mono block">Personagens</span>
                    <strong className="text-xl text-blue-300 font-bold mt-1 block">
                      {projectDetails.project._count.characters}
                    </strong>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-center">
                    <span className="text-[10px] text-white/50 uppercase font-mono block">Ambientes</span>
                    <strong className="text-xl text-purple-300 font-bold mt-1 block">
                      {projectDetails.project._count.environments}
                    </strong>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-center">
                    <span className="text-[10px] text-white/50 uppercase font-mono block">Jobs Gemini IA</span>
                    <strong className="text-xl text-emerald-300 font-bold mt-1 block">
                      {projectDetails.project._count.generations}
                    </strong>
                  </div>
                </div>

                {/* Workspace Vinculado */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                  <h3 className="text-xs font-mono font-bold uppercase text-white/60 mb-3">
                    Estúdio & Titularidade
                  </h3>
                  <div className="grid sm:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-white/40 block">Workspace:</span>
                      <strong className="text-white font-semibold">
                        {projectDetails.project.workspace.name}
                      </strong>
                      <span className="text-[10px] text-white/40 block">
                        /{projectDetails.project.workspace.slug}
                      </span>
                    </div>
                    <div>
                      <span className="text-white/40 block">Plano Contratado:</span>
                      <span className="font-bold text-emerald-400">
                        {projectDetails.project.workspace.subscription?.planTier || "FREE"} (
                        {projectDetails.project.workspace.subscription?.status || "ACTIVE"})
                      </span>
                    </div>
                    <div>
                      <span className="text-white/40 block">Saldo de Créditos:</span>
                      <strong className="text-amber-300 font-mono font-bold">
                        ⚡ {projectDetails.project.workspace.creditsBalance} créditos
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Cenas Recentes */}
                <div>
                  <h3 className="text-xs font-mono font-bold uppercase text-white/60 mb-3">
                    Cenas Decupadas (Ordem Cronológica)
                  </h3>
                  {projectDetails.project.scenes.length === 0 ? (
                    <p className="text-xs text-white/40 italic">Nenhuma cena cadastrada no projeto.</p>
                  ) : (
                    <div className="space-y-2">
                      {projectDetails.project.scenes.map((scene: any) => (
                        <div
                          key={scene.id}
                          className="flex items-center justify-between rounded-xl border border-white/5 bg-black/40 p-3 text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/10 font-mono font-bold text-white">
                              {scene.order}
                            </span>
                            <div>
                              <strong className="text-white">{scene.title}</strong>
                              <p className="text-white/50 text-[11px] line-clamp-1">{scene.description}</p>
                            </div>
                          </div>
                          {scene.durationSeconds && (
                            <span className="text-[10px] text-white/40 font-mono">{scene.durationSeconds}s</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Histórico Recente de Auditoria deste Projeto */}
                {projectDetails.recentAuditLogs.length > 0 && (
                  <div>
                    <h3 className="text-xs font-mono font-bold uppercase text-white/60 mb-3">
                      Auditoria de Ações Administrativas no Projeto
                    </h3>
                    <div className="space-y-2">
                      {projectDetails.recentAuditLogs.map((log: any) => (
                        <div
                          key={log.id}
                          className="rounded-xl border border-white/5 bg-black/40 p-3 text-xs flex justify-between items-center"
                        >
                          <div>
                            <span className="font-mono text-amber-300 font-bold">{log.action}</span>
                            <p className="text-[11px] text-white/60 mt-0.5">
                              {log.details?.reason || JSON.stringify(log.details)}
                            </p>
                          </div>
                          <span className="text-[10px] text-white/40 font-mono">
                            {new Date(log.createdAt).toLocaleString("pt-BR")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Arquivar Projeto */}
      {archiveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl border border-amber-500/30 bg-[#0d1017] p-6 text-white shadow-2xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>⚠️</span> Arquivar Projeto
            </h2>
            <p className="mt-2 text-xs text-white/70 leading-relaxed">
              Você está prestes a arquivar o projeto <strong className="text-white">{archiveTarget.title}</strong>.
              Ele deixará de ser editável e ficará oculto para a produção normal do estúdio.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-white/80 mb-1">
                Justificativa Administrativa (Obrigatória):
              </label>
              <textarea
                rows={3}
                value={archiveReason}
                onChange={(e) => setArchiveReason(e.target.value)}
                placeholder="Ex: Violação das diretrizes de conteúdo / Solicitação do cliente..."
                className="w-full rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-white placeholder-white/30 focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setArchiveTarget(null)}
                className="rounded-xl border border-white/15 px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/10 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isArchiving || archiveReason.trim().length < 5}
                onClick={handleConfirmArchive}
                className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-black hover:bg-amber-300 disabled:opacity-50 transition"
              >
                {isArchiving ? "Arquivando..." : "Confirmar Arquivamento"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Transferir Projeto */}
      {transferTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl border border-indigo-500/30 bg-[#0d1017] p-6 text-white shadow-2xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>🔄</span> Transferir Projeto de Estúdio
            </h2>
            <p className="mt-2 text-xs text-white/70 leading-relaxed">
              Transfira a obra <strong className="text-white">{transferTarget.title}</strong> para outro Workspace.
              Todas as cenas, personagens e gerações serão movidas atomicamente.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1">
                  Selecione o Workspace de Destino:
                </label>
                {loadingWorkspaces ? (
                  <p className="text-xs text-white/40">Carregando estúdios...</p>
                ) : (
                  <select
                    value={targetWorkspaceId}
                    onChange={(e) => setTargetWorkspaceId(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/40 p-2.5 text-xs text-white focus:border-indigo-400 focus:outline-none"
                  >
                    <option value="">Selecione um Workspace...</option>
                    {availableWorkspaces.map((ws) => (
                      <option key={ws.id} value={ws.id}>
                        {ws.name} ({ws.owner} • Plano: {ws.plan})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1">
                  Justificativa da Transferência (Auditoria):
                </label>
                <textarea
                  rows={2}
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  placeholder="Ex: Reatribuição societária a pedido do proprietário..."
                  className="w-full rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-white placeholder-white/30 focus:border-indigo-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setTransferTarget(null)}
                className="rounded-xl border border-white/15 px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/10 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isTransferring || !targetWorkspaceId || transferReason.trim().length < 5}
                onClick={handleConfirmTransfer}
                className="rounded-xl bg-indigo-500 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-400 disabled:opacity-50 transition shadow-lg shadow-indigo-500/20"
              >
                {isTransferring ? "Transferindo..." : "Confirmar Transferência"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Excluir Projeto */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl border border-rose-500/40 bg-[#0d1017] p-6 text-white shadow-2xl">
            <h2 className="text-lg font-bold text-rose-300 flex items-center gap-2">
              <span>⚠️</span> Excluir Projeto Permanentemente
            </h2>
            <p className="mt-2 text-xs text-white/70 leading-relaxed">
              ATENÇÃO: A exclusão da obra <strong className="text-white">{deleteTarget.title}</strong> é irreversível.
              Todas as cenas, bíblias visuais e histórico de prompts associados serão removidos do banco de dados.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-white/80 mb-1">
                Justificativa Obrigatória da Exclusão:
              </label>
              <textarea
                rows={3}
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Ex: Notificação de direitos autorais / Exclusão solicitada por ordem judicial..."
                className="w-full rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-white placeholder-white/30 focus:border-rose-400 focus:outline-none"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl border border-white/15 px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/10 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting || deleteReason.trim().length < 5}
                onClick={handleConfirmDelete}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-50 transition shadow-lg shadow-rose-600/30"
              >
                {isDeleting ? "Excluindo..." : "Excluir Definitivamente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
