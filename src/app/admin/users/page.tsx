"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface PermissionDef {
  id: string;
  label: string;
  category: string;
  description: string;
}

const ALL_PERMISSIONS: PermissionDef[] = [
  {
    id: "users:manage",
    label: "Gestão de Usuários",
    category: "Operações",
    description: "Suspender, reativar, editar perfil, revogar sessões e permissões.",
  },
  {
    id: "projects:manage",
    label: "Gestão de Projetos",
    category: "Operações",
    description: "Visualizar projetos globais, arquivar, transferir e excluir.",
  },
  {
    id: "plans:manage",
    label: "Planos e Assinaturas",
    category: "Comercial",
    description: "Gerenciar planos SaaS, recursos e alterar ou estender assinaturas.",
  },
  {
    id: "prices:manage",
    label: "Preços & Moedas",
    category: "Comercial",
    description: "Alterar precificação periódica e planos por intervalo.",
  },
  {
    id: "policies:manage",
    label: "Políticas Comerciais",
    category: "Comercial",
    description: "Configurar limites globais, custos de IA e políticas de consumo.",
  },
  {
    id: "credits:manage",
    label: "Gestão de Créditos",
    category: "Comercial",
    description: "Conceder bônus, ajustar saldos e realizar estornos no livro-razão.",
  },
  {
    id: "gateways:manage",
    label: "Gateways de Pagamento",
    category: "Técnico",
    description: "Configurar Stripe, Asaas ou outros provedores de pagamento.",
  },
  {
    id: "credentials:manage",
    label: "Credenciais de API",
    category: "Técnico",
    description: "Gerenciar chaves secretas de provedores e integração.",
  },
  {
    id: "webhooks:reprocess",
    label: "Reprocessar Webhooks",
    category: "Técnico",
    description: "Reexecutar eventos e disparos de webhook com falha.",
  },
  {
    id: "audit:read",
    label: "Visualização de Auditoria",
    category: "Governança",
    description: "Acessar o log imutável de todas as ações administrativas realizadas.",
  },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>({ total: 0, totalPages: 1 });

  // Details Modal
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [userDetails, setUserDetails] = useState<any>(null);

  // Edit User State
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editEmailConfirmed, setEditEmailConfirmed] = useState(false);
  const [editPlatformRole, setEditPlatformRole] = useState("USER");
  const [savingUser, setSavingUser] = useState(false);

  // Permissions Modal
  const [permissionsTarget, setPermissionsTarget] = useState<any>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [savingPermissions, setSavingPermissions] = useState(false);

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
        setEditDisplayName(data.user.displayName || "");
        setEditEmailConfirmed(Boolean(data.user.emailConfirmed));
        setEditPlatformRole(data.user.platformRole);
      }
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSaveUserDetails = async () => {
    if (!userDetails?.user?.id) return;
    setSavingUser(true);
    try {
      const res = await fetch(`/api/admin/users/${userDetails.user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: editDisplayName,
          emailConfirmed: editEmailConfirmed,
          platformRole: editPlatformRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setNotification({ type: "success", message: "Cadastro do usuário atualizado com sucesso." });
      handleViewDetails(userDetails.user.id);
      fetchUsers();
    } catch (err: any) {
      setNotification({ type: "error", message: err.message || "Erro ao atualizar usuário." });
    } finally {
      setSavingUser(false);
    }
  };

  const handleRevokeSession = async (sessionId?: string) => {
    if (!userDetails?.user?.id) return;
    try {
      const res = await fetch(`/api/admin/users/${userDetails.user.id}/revoke-sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setNotification({ type: "success", message: data.message });
      handleViewDetails(userDetails.user.id);
    } catch (err: any) {
      setNotification({ type: "error", message: err.message || "Erro ao revogar sessão." });
    }
  };

  const handleOpenPermissions = (user: any) => {
    const prefs = user.preferences as Record<string, any> | null;
    const existingPerms: string[] = Array.isArray(prefs?.adminPermissions)
      ? prefs?.adminPermissions
      : user.platformRole === "SUPER_ADMIN"
      ? ALL_PERMISSIONS.map((p) => p.id)
      : [];
    setSelectedPermissions(existingPerms);
    setPermissionsTarget(user);
  };

  const handleSavePermissions = async () => {
    if (!permissionsTarget) return;
    setSavingPermissions(true);
    try {
      const res = await fetch(`/api/admin/users/${permissionsTarget.id}/permissions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: selectedPermissions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setNotification({ type: "success", message: "Permissões administrativas salvas com sucesso." });
      setPermissionsTarget(null);
      fetchUsers();
      if (selectedUser === permissionsTarget.id) {
        handleViewDetails(permissionsTarget.id);
      }
    } catch (err: any) {
      setNotification({ type: "error", message: err.message || "Erro ao salvar permissões." });
    } finally {
      setSavingPermissions(false);
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
              ? "bg-primary/40 border border-primary/30 text-primary"
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
          <h1 className="text-xl font-bold text-white">Gestão Global de Usuários & Permissões</h1>
          <p className="text-xs text-white/50">
            Pesquisa, auditoria de contas, privilégios granulares, suspensão e gestão de créditos de estúdios.
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
                        <Link
                          href={`/admin/users/${u.id}`}
                          className="font-semibold text-white hover:text-indigo-400 transition inline-flex items-center gap-1.5 group"
                        >
                          <span>{u.displayName || "Sem nome"}</span>
                          <span className="text-[10px] text-indigo-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">➔</span>
                        </Link>
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
                            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary font-mono">
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
                          <span className="rounded bg-primary/10 border border-primary/30 px-2 py-0.5 text-[10px] text-primary font-semibold">
                            ATIVO
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 text-white/40 font-mono text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                      </td>

                      <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                        <Link
                          href={`/admin/users/${u.id}`}
                          className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-[11px] text-indigo-300 hover:bg-indigo-500/20 font-medium transition inline-flex items-center gap-1"
                          title="Abrir prontuário completo do usuário"
                        >
                          Prontuário ➔
                        </Link>

                        <button
                          onClick={() => handleViewDetails(u.id)}
                          className="rounded-lg border border-white/10 px-2.5 py-1 text-[11px] text-white/80 hover:bg-white/10 transition"
                        >
                          Rápido
                        </button>

                        <button
                          onClick={() => handleOpenPermissions(u)}
                          className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2 py-1 text-[11px] text-indigo-300 hover:bg-indigo-500/20 transition"
                          title="Permissões administrativas"
                        >
                          🔑 Permissões
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
                            className="rounded-lg border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] text-primary hover:bg-primary/20 transition"
                            title="Ajustar créditos do estúdio"
                          >
                            + Créditos
                          </button>
                        )}

                        {u.isSuspended ? (
                          <button
                            onClick={() => handleReactivate(u)}
                            className="rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] text-primary hover:bg-primary/20 font-semibold transition"
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

      {/* Modal: Detalhes e Gestão Completa do Usuário */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="max-w-3xl w-full rounded-2xl border border-white/15 bg-[#0f1422] p-6 max-h-[92vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-base font-bold text-white">Gerenciamento Completo de Usuário</h3>
                <p className="text-xs text-white/40">Visualização cadastral, sessões e governança da conta.</p>
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
                    <p className="text-lg font-bold text-primary mt-1">{userDetails.metrics.activeSessionsCount}</p>
                  </div>
                </div>

                {/* Edição Cadastral */}
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-4">
                  <h4 className="font-bold text-white">Editar Dados Cadastrais e Privilégios</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-white/60 block mb-1">
                        Nome de Exibição
                      </label>
                      <input
                        type="text"
                        value={editDisplayName}
                        onChange={(e) => setEditDisplayName(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-white/60 block mb-1">
                        Papel na Plataforma
                      </label>
                      <select
                        value={editPlatformRole}
                        onChange={(e) => setEditPlatformRole(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-[#161c2e] px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                      >
                        <option value="USER">USER (Padrão)</option>
                        <option value="ADMIN">ADMIN (Operador)</option>
                        <option value="SUPER_ADMIN">SUPER_ADMIN (Total)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-white/60 block mb-1">
                        Status do E-mail
                      </label>
                      <button
                        type="button"
                        onClick={() => setEditEmailConfirmed(!editEmailConfirmed)}
                        className={`w-full rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                          editEmailConfirmed
                            ? "bg-primary/20 border-primary/40 text-primary"
                            : "bg-rose-500/20 border-rose-500/40 text-rose-300"
                        }`}
                      >
                        {editEmailConfirmed ? "✓ E-mail Confirmado" : "✗ Pendente Confirmação"}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <span className="text-[11px] text-white/40">
                      ID: <span className="font-mono">{userDetails.user.id}</span> | Email: {userDetails.user.email}
                    </span>
                    <button
                      disabled={savingUser}
                      onClick={handleSaveUserDetails}
                      className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-black hover:bg-amber-300 disabled:opacity-50 transition"
                    >
                      {savingUser ? "Salvando..." : "Salvar Alterações"}
                    </button>
                  </div>
                </div>

                {/* Sessões Ativas e Segurança */}
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-white">Sessões Conectadas ({userDetails.user.sessions?.length || 0})</h4>
                    {userDetails.user.sessions?.length > 0 && (
                      <button
                        onClick={() => handleRevokeSession()}
                        className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs text-rose-300 hover:bg-rose-500/20 transition"
                      >
                        Revogar Todas as Sessões
                      </button>
                    )}
                  </div>

                  {userDetails.user.sessions?.length === 0 ? (
                    <p className="text-white/40 italic">Nenhuma sessão ativa neste momento.</p>
                  ) : (
                    <div className="space-y-2">
                      {userDetails.user.sessions.map((sess: any) => (
                        <div
                          key={sess.id}
                          className="flex justify-between items-center rounded-lg border border-white/5 bg-white/5 p-2.5"
                        >
                          <div>
                            <div className="text-[11px] font-mono text-white/90">
                              IP: {sess.ipAddress || "Desconhecido"}
                            </div>
                            <div className="text-[10px] text-white/40 truncate max-w-sm">
                              {sess.userAgent || "Navegador padrão"}
                            </div>
                            <div className="text-[10px] text-white/30">
                              Criada em: {new Date(sess.createdAt).toLocaleString("pt-BR")} | Expira: {new Date(sess.expiresAt).toLocaleDateString("pt-BR")}
                            </div>
                          </div>
                          <button
                            onClick={() => handleRevokeSession(sess.id)}
                            className="rounded border border-rose-500/30 px-2 py-1 text-[10px] text-rose-400 hover:bg-rose-500/10 transition"
                          >
                            Encerrar
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
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
                        <span className="rounded bg-primary/10 border border-primary/20 px-2 py-0.5 text-primary font-mono">
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

      {/* Modal: Permissões Granulares */}
      {permissionsTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="max-w-2xl w-full rounded-2xl border border-indigo-500/30 bg-[#0c1020] p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base font-bold text-indigo-300">Permissões Administrativas da Plataforma</h3>
                <p className="text-xs text-white/60">
                  Gerenciando privilégios para <strong className="text-white">{permissionsTarget.email}</strong>.
                </p>
              </div>
              <button
                onClick={() => setPermissionsTarget(null)}
                className="text-white/60 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setSelectedPermissions(ALL_PERMISSIONS.map((p) => p.id))}
                className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/80 hover:bg-white/10"
              >
                Conceder Todas
              </button>
              <button
                onClick={() => setSelectedPermissions([])}
                className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/80 hover:bg-white/10"
              >
                Revogar Todas
              </button>
            </div>

            <div className="space-y-2.5">
              {ALL_PERMISSIONS.map((perm) => {
                const isChecked = selectedPermissions.includes(perm.id);
                return (
                  <label
                    key={perm.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                      isChecked
                        ? "bg-indigo-950/30 border-indigo-500/40 text-white"
                        : "bg-white/[0.02] border-white/5 text-white/60 hover:bg-white/5"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPermissions([...selectedPermissions, perm.id]);
                        } else {
                          setSelectedPermissions(selectedPermissions.filter((id) => id !== perm.id));
                        }
                      }}
                      className="mt-0.5 rounded border-white/20 text-indigo-500 focus:ring-0"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-white">{perm.label}</span>
                        <span className="font-mono text-[10px] text-indigo-300/80 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                          {perm.id}
                        </span>
                        <span className="text-[10px] text-white/40 uppercase">({perm.category})</span>
                      </div>
                      <p className="text-[11px] text-white/50 mt-0.5">{perm.description}</p>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-white/10">
              <button
                onClick={() => setPermissionsTarget(null)}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                disabled={savingPermissions}
                onClick={handleSavePermissions}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-40"
              >
                {savingPermissions ? "Salvando..." : "Salvar Permissões"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Suspender Conta */}
      {suspendTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="max-w-md w-full rounded-2xl border border-primary/30 bg-[#0c1410] p-6 space-y-4">
            <h3 className="text-base font-bold text-primary">Ajuste de Créditos no Estúdio</h3>
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
                className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs text-white focus:border-primary focus:outline-none"
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
                className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs text-white placeholder-white/30 focus:border-primary focus:outline-none"
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
                className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-black hover:bg-primary-fixed disabled:opacity-40"
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
