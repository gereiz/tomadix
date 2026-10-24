"use client";

import { useEffect, useState } from "react";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>({ total: 0, totalPages: 1 });

  // Modals state
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [userDetails, setUserDetails] = useState<any>(null);

  // Suspend modal
  const [suspendTarget, setSuspendTarget] = useState<any>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [suspending, setSuspending] = useState(false);

  // Credit adjust modal
  const [creditTarget, setCreditTarget] = useState<any>(null);
  const [creditAmount, setCreditAmount] = useState<number>(50);
  const [creditReason, setCreditReason] = useState("");
  const [adjustingCredit, setAdjustingCredit] = useState(false);

  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: page.toString(),
        limit: "15",
        status: statusFilter,
        search,
      });

      const res = await fetch(`/api/admin/users?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setPagination(data.pagination || { total: 0, totalPages: 1 });
      }
    } catch {
      // Error handling
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleViewDetails = async (userId: string) => {
    setSelectedUser(userId);
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setUserDetails(data);
      }
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSuspend = async () => {
    if (!suspendTarget || !suspendReason.trim()) return;
    setSuspending(true);
    try {
      const res = await fetch(`/api/admin/users/${suspendTarget.id}/suspend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: suspendReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setNotification({ type: "success", message: data.message });
      setSuspendTarget(null);
      setSuspendReason("");
      fetchUsers();
    } catch (err: any) {
      setNotification({ type: "error", message: err.message || "Erro ao suspender usuário." });
    } finally {
      setSuspending(false);
    }
  };

  const handleReactivate = async (targetUser: any) => {
    try {
      const res = await fetch(`/api/admin/users/${targetUser.id}/reactivate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Reativação administrativa manual" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setNotification({ type: "success", message: data.message });
      fetchUsers();
    } catch (err: any) {
      setNotification({ type: "error", message: err.message || "Erro ao reativar usuário." });
    }
  };

  const handleAdjustCredits = async () => {
    if (!creditTarget || !creditReason.trim()) return;
    setAdjustingCredit(true);
    try {
      const res = await fetch("/api/admin/users/credits/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: creditTarget.workspaceId,
          amount: creditAmount,
          reason: creditReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setNotification({ type: "success", message: data.message });
      setCreditTarget(null);
      setCreditReason("");
      fetchUsers();
    } catch (err: any) {
      setNotification({ type: "error", message: err.message || "Erro ao ajustar créditos." });
    } finally {
      setAdjustingCredit(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {notification && (
        <div
          className={`p-4 rounded-xl text-xs flex justify-between items-center ${
            notification.type === "success"
              ? "bg-emerald-950/40 border border-emerald-500/30 text-emerald-300"
              : "bg-rose-950/40 border border-rose-500/30 text-rose-300"
          }`}
        >
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="font-bold ml-4">
            ✕
          </button>
        </div>
      )}

      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Gestão Global de Usuários</h1>
          <p className="text-xs text-white/50">
            Pesquisa, auditoria de contas, suspensão e gestão de créditos de estúdios.
          </p>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Buscar por e-mail ou nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs text-white placeholder-white/40 focus:border-amber-400 focus:outline-none w-64"
          />
          <button
            type="submit"
            className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-black hover:bg-amber-300 transition"
          >
            Buscar
          </button>
        </form>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        {[
          { key: "all", label: "Todos os Usuários" },
          { key: "active", label: "Apenas Ativos" },
          { key: "suspended", label: "Contas Suspensas" },
          { key: "unconfirmed", label: "E-mail Não Confirmado" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setStatusFilter(tab.key);
              setPage(1);
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              statusFilter === tab.key
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Users Table */}
      <div className="rounded-2xl border border-white/10 bg-[#0d111c] overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-white/50 animate-pulse">
            Carregando usuários do sistema...
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-xs text-white/50">
            Nenhum usuário encontrado para os filtros selecionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-white/50">
                  <th className="p-3.5 font-medium">Usuário</th>
                  <th className="p-3.5 font-medium">Papel Plataforma</th>
                  <th className="p-3.5 font-medium">Workspaces</th>
                  <th className="p-3.5 font-medium">Status</th>
                  <th className="p-3.5 font-medium">Cadastro</th>
                  <th className="p-3.5 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map((u) => {
                  const primaryWs = u.memberships[0]?.workspace;
                  return (
                    <tr key={u.id} className="hover:bg-white/[0.02] transition">
                      <td className="p-3.5">
                        <div className="font-semibold text-white">{u.displayName || "Sem nome"}</div>
                        <div className="text-[11px] text-white/40 font-mono">{u.email}</div>
                      </td>

                      <td className="p-3.5">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-mono font-semibold ${
                            u.platformRole === "SUPER_ADMIN"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                              : u.platformRole === "ADMIN"
                              ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                              : "bg-white/5 text-white/60"
                          }`}
                        >
                          {u.platformRole}
                        </span>
                      </td>

                      <td className="p-3.5">
                        {primaryWs ? (
                          <div className="flex items-center gap-2">
                            <span className="text-white/80">{primaryWs.name}</span>
                            <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-400 font-mono">
                              {primaryWs.creditsBalance} cr
                            </span>
                            {primaryWs.subscription && (
                              <span className="text-[10px] text-white/40 uppercase">
                                ({primaryWs.subscription.planTier})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-white/30 italic">Sem workspace</span>
                        )}
                      </td>

                      <td className="p-3.5">
                        {u.isSuspended ? (
                          <div>
                            <span className="rounded bg-rose-500/15 border border-rose-500/40 px-2 py-0.5 text-[10px] text-rose-300 font-bold">
                              SUSPENSO
                            </span>
                            {u.suspensionReason && (
                              <p className="text-[10px] text-rose-400/80 mt-1 max-w-[200px] truncate" title={u.suspensionReason}>
                                {u.suspensionReason}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="rounded bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] text-emerald-400 font-semibold">
                            ATIVO
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 text-white/40 font-mono text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                      </td>

                      <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => handleViewDetails(u.id)}
                          className="rounded-lg border border-white/10 px-2.5 py-1 text-[11px] text-white/80 hover:bg-white/10 transition"
                        >
                          Detalhes
                        </button>

                        {primaryWs && (
                          <button
                            onClick={() =>
                              setCreditTarget({
                                workspaceId: primaryWs.id,
                                workspaceName: primaryWs.name,
                                userEmail: u.email,
                              })
                            }
                            className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-300 hover:bg-emerald-500/20 transition"
                            title="Ajustar créditos do estúdio"
                          >
                            + Créditos
                          </button>
                        )}

                        {u.isSuspended ? (
                          <button
                            onClick={() => handleReactivate(u)}
                            className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-300 hover:bg-emerald-500/20 font-semibold transition"
                          >
                            Reativar
                          </button>
                        ) : (
                          <button
                            onClick={() => setSuspendTarget(u)}
                            className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px] text-rose-300 hover:bg-rose-500/20 transition"
                          >
                            Suspender
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between p-4 border-t border-white/10 text-xs text-white/50">
          <span>
            Mostrando página {pagination.page} de {pagination.totalPages} ({pagination.total} usuários)
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-white/10 px-3 py-1 text-white hover:bg-white/5 disabled:opacity-30"
            >
              Anterior
            </button>
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-white/10 px-3 py-1 text-white hover:bg-white/5 disabled:opacity-30"
            >
              Próxima
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Detalhes do Usuário */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="max-w-2xl w-full rounded-2xl border border-white/15 bg-[#0f1422] p-6 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-base font-bold text-white">Detalhes Operacionais do Usuário</h3>
                <p className="text-xs text-white/40">Visualização de metadados sem violação de sigilo criativo.</p>
              </div>
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setUserDetails(null);
                }}
                className="text-white/60 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            {loadingDetails || !userDetails ? (
              <div className="p-8 text-center text-xs text-white/50 animate-pulse">
                Carregando registros do usuário...
              </div>
            ) : (
              <div className="space-y-6 text-xs">
                {/* Métricas Agregadas */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <span className="text-white/40">Workspaces</span>
                    <p className="text-lg font-bold text-white mt-1">{userDetails.metrics.totalWorkspaces}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <span className="text-white/40">Projetos</span>
                    <p className="text-lg font-bold text-white mt-1">{userDetails.metrics.totalProjects}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <span className="text-white/40">Gerações IA</span>
                    <p className="text-lg font-bold text-amber-300 mt-1">{userDetails.metrics.totalGenerations}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <span className="text-white/40">Sessões Ativas</span>
                    <p className="text-lg font-bold text-emerald-400 mt-1">{userDetails.metrics.activeSessionsCount}</p>
                  </div>
                </div>

                {/* Workspaces Associados */}
                <div>
                  <h4 className="font-bold text-white mb-2">Workspaces e Planos</h4>
                  <div className="space-y-2">
                    {userDetails.user.memberships.map((m: any) => (
                      <div
                        key={m.id}
                        className="rounded-xl border border-white/10 bg-white/5 p-3 flex justify-between items-center"
                      >
                        <div>
                          <div className="font-semibold text-white">{m.workspace.name}</div>
                          <div className="text-[11px] text-white/40 font-mono">
                            Papel: {m.role} | Plano: {m.workspace.subscription?.planTier || "FREE"}
                          </div>
                        </div>
                        <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-emerald-400 font-mono">
                          {m.workspace.creditsBalance} créditos
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Histórico Recente de Auditoria */}
                <div>
                  <h4 className="font-bold text-white mb-2">Ações de Auditoria no Registro</h4>
                  {userDetails.recentAuditLogs.length === 0 ? (
                    <p className="text-white/40 italic">Nenhum evento registrado para este usuário.</p>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {userDetails.recentAuditLogs.map((log: any) => (
                        <div key={log.id} className="rounded-lg bg-white/5 p-2 text-[11px]">
                          <div className="flex justify-between text-white/70">
                            <span className="font-mono text-amber-400">{log.action}</span>
                            <span className="text-white/40">{new Date(log.createdAt).toLocaleString("pt-BR")}</span>
                          </div>
                          {log.details?.reason && (
                            <p className="text-white/50 mt-1">Motivo: {log.details.reason}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Suspender Conta */}
      {suspendTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="max-w-md w-full rounded-2xl border border-rose-500/30 bg-[#160d10] p-6 space-y-4">
            <h3 className="text-base font-bold text-rose-300">Suspender Conta de Usuário</h3>
            <p className="text-xs text-white/70 leading-relaxed">
              Você está prestes a suspender a conta de{" "}
              <strong className="text-white">{suspendTarget.email}</strong>. Todas as sessões ativas serão
              imediatamente revogadas e o usuário não poderá acessar o Tomadix.
            </p>

            <div>
              <label className="text-[11px] font-semibold text-white/70 block mb-1">
                Justificativa Obrigatória (Auditoria) *
              </label>
              <textarea
                rows={3}
                placeholder="Informe o motivo da suspensão (ex: Violação dos termos de uso, chargeback fraudulento)..."
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white placeholder-white/30 focus:border-rose-400 focus:outline-none"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => {
                  setSuspendTarget(null);
                  setSuspendReason("");
                }}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                disabled={suspending || suspendReason.trim().length < 5}
                onClick={handleSuspend}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-40"
              >
                {suspending ? "Suspendendo..." : "Confirmar Suspensão"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Ajustar Créditos */}
      {creditTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="max-w-md w-full rounded-2xl border border-emerald-500/30 bg-[#0c1410] p-6 space-y-4">
            <h3 className="text-base font-bold text-emerald-300">Ajuste de Créditos no Estúdio</h3>
            <p className="text-xs text-white/70 leading-relaxed">
              Ajustando saldo de créditos para o estúdio{" "}
              <strong className="text-white">{creditTarget.workspaceName}</strong> ({creditTarget.userEmail}).
            </p>

            <div>
              <label className="text-[11px] font-semibold text-white/70 block mb-1">
                Quantidade de Créditos (positivo para concessão, negativo para estorno)
              </label>
              <input
                type="number"
                value={creditAmount}
                onChange={(e) => setCreditAmount(parseInt(e.target.value, 10) || 0)}
                className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs text-white focus:border-emerald-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-white/70 block mb-1">
                Justificativa para o Ajuste *
              </label>
              <input
                type="text"
                placeholder="Ex: Bonificação promocional, compensação por instabilidade..."
                value={creditReason}
                onChange={(e) => setCreditReason(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs text-white placeholder-white/30 focus:border-emerald-400 focus:outline-none"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => {
                  setCreditTarget(null);
                  setCreditReason("");
                }}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                disabled={adjustingCredit || !creditReason.trim() || creditAmount === 0}
                onClick={handleAdjustCredits}
                className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-black hover:bg-emerald-400 disabled:opacity-40"
              >
                {adjustingCredit ? "Aplicando..." : "Aplicar Ajuste"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
