"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface MemberItem {
  id: string;
  userId: string;
  role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
  createdAt: string;
  user: {
    id: string;
    email: string;
    displayName: string | null;
  };
}

interface InviteItem {
  id: string;
  email: string;
  role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELED" | "EXPIRED";
  token: string;
  expiresAt: string;
  createdAt: string;
  invitedBy: {
    displayName: string | null;
    email: string;
  };
}

interface WorkspaceInfo {
  id: string;
  name: string;
  slug: string;
  isPersonal: boolean;
  isArchived: boolean;
  creditsBalance: number;
  planName: string;
  planTier: string;
  membersCount: number;
  maxMembers: number;
}

export default function WorkspaceMembersPage() {
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null);
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [invites, setInvites] = useState<InviteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "MEMBER" | "VIEWER">("MEMBER");
  const [generatedInviteUrl, setGeneratedInviteUrl] = useState<string | null>(null);

  // Transfer ownership modal state
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedNewOwnerId, setSelectedNewOwnerId] = useState("");

  // Edit workspace settings state
  const [editName, setEditName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);

  const loadData = async () => {
    try {
      // 1. Obter informações de assinatura e workspace ativo
      const subRes = await fetch("/api/billing/subscription");
      if (!subRes.ok) return;
      const subData = await subRes.json();
      const wsData = subData.data;

      setWorkspace({
        id: wsData.workspaceId,
        name: wsData.workspaceName,
        slug: "",
        isPersonal: false,
        isArchived: false,
        creditsBalance: wsData.creditsBalance,
        planName: wsData.planName,
        planTier: wsData.planTier,
        membersCount: wsData.membersCount,
        maxMembers: wsData.maxMembers,
      });

      setEditName(wsData.workspaceName);

      // 2. Obter membros e convites
      const [membersRes, invitesRes] = await Promise.all([
        fetch(`/api/workspaces/${wsData.workspaceId}/members`),
        fetch(`/api/workspaces/${wsData.workspaceId}/invites`),
      ]);

      if (membersRes.ok) {
        const mData = await membersRes.json();
        setMembers(mData.data || []);
      }

      if (invitesRes.ok) {
        const iData = await invitesRes.json();
        setInvites(iData.data || []);
      }
    } catch (err) {
      console.error("Erro ao carregar dados da equipe:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace || !inviteEmail.trim()) return;

    setActionLoading(true);
    setMessage(null);
    setGeneratedInviteUrl(null);

    try {
      const res = await fetch(`/api/workspaces/${workspace.id}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao gerar convite.");
      }

      const fullUrl = `${window.location.origin}${data.data.inviteUrl}`;
      setGeneratedInviteUrl(fullUrl);
      setMessage({ type: "success", text: "Convite gerado com sucesso!" });
      setInviteEmail("");
      loadData();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Falha ao convidar membro." });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    if (!workspace) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/workspaces/${workspace.id}/invites/${inviteId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Convite revogado com sucesso." });
        loadData();
      }
    } catch (err) {
      console.error("Erro ao revogar convite:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResendInvite = async (inviteId: string) => {
    if (!workspace) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/workspaces/${workspace.id}/invites/${inviteId}/resend`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        const fullUrl = `${window.location.origin}${data.data.inviteUrl}`;
        navigator.clipboard.writeText(fullUrl);
        setMessage({
          type: "success",
          text: `Convite reenviado! Link copiado para a área de transferência: ${fullUrl}`,
        });
        loadData();
      }
    } catch (err) {
      console.error("Erro ao reenviar convite:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateRole = async (membershipId: string, newRole: string) => {
    if (!workspace) return;
    setActionLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/workspaces/${workspace.id}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membershipId, role: newRole }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao atualizar papel.");
      }

      setMessage({ type: "success", text: "Papel de permissão atualizado com sucesso." });
      loadData();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Falha ao alterar papel." });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveMember = async (membershipId: string, memberEmail: string) => {
    if (!workspace) return;
    if (!confirm(`Tem certeza que deseja remover ${memberEmail} deste workspace?`)) return;

    setActionLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/workspaces/${workspace.id}/members?membershipId=${membershipId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao remover membro.");
      }

      setMessage({ type: "success", text: "Membro removido com sucesso." });
      loadData();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Falha ao remover membro." });
    } finally {
      setActionLoading(false);
    }
  };

  const handleTransferOwnership = async () => {
    if (!workspace || !selectedNewOwnerId) return;
    setActionLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/workspaces/${workspace.id}/transfer-ownership`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newOwnerMembershipId: selectedNewOwnerId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao transferir propriedade.");
      }

      setShowTransferModal(false);
      setMessage({
        type: "success",
        text: "Propriedade do estúdio transferida com sucesso! Você agora é ADMIN.",
      });
      loadData();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Falha na transferência." });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateWorkspaceName = async () => {
    if (!workspace || !editName.trim()) return;
    setActionLoading(true);

    try {
      const res = await fetch(`/api/workspaces/${workspace.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });

      if (res.ok) {
        setIsEditingName(false);
        setMessage({ type: "success", text: "Nome do workspace atualizado com sucesso." });
        loadData();
      }
    } catch (err) {
      console.error("Erro ao renomear workspace:", err);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07090e] p-8 text-center text-white/40">
        Carregando gestão da equipe...
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="min-h-screen bg-[#07090e] p-8 text-center text-white/50">
        Nenhum workspace selecionado.
      </div>
    );
  }

  const isLimitReached =
    workspace.maxMembers !== -1 && workspace.membersCount >= workspace.maxMembers;

  return (
    <div className="min-h-screen bg-[#07090e] text-white">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-3">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="rounded-lg border border-white/20 bg-white/5 px-3 py-1 text-xl font-bold text-white focus:outline-none focus:border-primary"
                  />
                  <button
                    onClick={handleUpdateWorkspaceName}
                    className="rounded-lg bg-primary px-3 py-1 text-xs font-bold text-black"
                  >
                    Salvar
                  </button>
                  <button
                    onClick={() => setIsEditingName(false)}
                    className="text-xs text-white/50 hover:text-white"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                    {workspace.name}
                  </h1>
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="text-xs text-white/40 hover:text-white transition"
                    title="Editar nome"
                  >
                    ✏️
                  </button>
                </div>
              )}

              <span className="rounded-full bg-primary/20 border border-primary/40 px-2.5 py-0.5 text-xs font-bold text-primary">
                Plano {workspace.planName}
              </span>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-white/50">
              Gerencie colaboradores, convites, permissões e configurações deste estúdio cinematográfico.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setShowInviteModal(true);
                setGeneratedInviteUrl(null);
              }}
              className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-on-primary transition hover:opacity-90 shadow-md shadow-primary/20"
            >
              ➕ Convidar Membro
            </button>
          </div>
        </div>

        {/* Feedback message */}
        {message && (
          <div
            className={`mt-6 rounded-xl p-4 text-sm font-medium ${
              message.type === "success"
                ? "bg-primary/60 border border-primary/40 text-primary"
                : "bg-red-950/60 border border-red-500/40 text-red-300"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Member Seats Limit Warning */}
        {isLimitReached && (
          <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-950/30 p-4 sm:flex sm:items-center sm:justify-between text-xs text-amber-200">
            <div>
              <span className="font-bold">Capacidade máxima de membros atingida: </span>
              {workspace.membersCount} / {workspace.maxMembers} membros ocupados no plano {workspace.planName}.
              Para colaborar com mais diretores e roteiristas, faça upgrade para o plano Team.
            </div>
            <Link
              href="/pricing"
              className="mt-3 sm:mt-0 inline-block shrink-0 rounded-lg bg-amber-400 px-3.5 py-1.5 text-xs font-bold text-black hover:bg-amber-300 transition"
            >
              Fazer Upgrade do Plano
            </Link>
          </div>
        )}

        {/* Active Members Table */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">
              Membros Ativos ({members.length})
            </h2>
            <div className="text-xs text-white/40">
              Assentos ocupados: {workspace.membersCount} /{" "}
              {workspace.maxMembers === -1 ? "Ilimitados" : workspace.maxMembers}
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02]">
            <table className="w-full text-left text-xs text-white/80">
              <thead className="border-b border-white/10 bg-white/[0.03] uppercase text-white/50">
                <tr>
                  <th className="px-5 py-3.5">Membro</th>
                  <th className="px-5 py-3.5">Papel no Estúdio</th>
                  <th className="px-5 py-3.5">Desde</th>
                  <th className="px-5 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {members.map((m) => {
                  const isOwner = m.role === "OWNER";
                  return (
                    <tr key={m.id}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 font-bold text-primary">
                            {m.user.displayName ? m.user.displayName[0].toUpperCase() : m.user.email[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-white">
                              {m.user.displayName || "Usuário"}
                            </div>
                            <div className="text-white/40 text-[11px]">{m.user.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        {isOwner ? (
                          <span className="rounded-md bg-primary/20 border border-primary/40 px-2 py-0.5 text-[10px] font-bold text-primary">
                            PROPRIETÁRIO (OWNER)
                          </span>
                        ) : (
                          <select
                            value={m.role}
                            onChange={(e) => handleUpdateRole(m.id, e.target.value)}
                            disabled={actionLoading}
                            className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-xs text-white focus:outline-none focus:border-primary"
                          >
                            <option value="ADMIN" className="bg-[#0d1017]">ADMIN (Administrador)</option>
                            <option value="MEMBER" className="bg-[#0d1017]">MEMBER (Criador)</option>
                            <option value="VIEWER" className="bg-[#0d1017]">VIEWER (Leitor)</option>
                          </select>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-white/50">
                        {new Date(m.createdAt).toLocaleDateString("pt-BR")}
                      </td>

                      <td className="px-5 py-3.5 text-right space-x-2">
                        {!isOwner && (
                          <button
                            onClick={() => handleRemoveMember(m.id, m.user.email)}
                            disabled={actionLoading}
                            className="text-red-400/80 hover:text-red-300 transition"
                            title="Remover membro"
                          >
                            Remover
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending Invites Section */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">
              Convites Pendentes ({invites.length})
            </h2>
          </div>

          {invites.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.01] p-8 text-center text-xs text-white/40">
              Nenhum convite pendente. Clique em &quot;Convidar Membro&quot; para adicionar colaboradores.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02]">
              <table className="w-full text-left text-xs text-white/80">
                <thead className="border-b border-white/10 bg-white/[0.03] uppercase text-white/50">
                  <tr>
                    <th className="px-5 py-3.5">E-mail Convidado</th>
                    <th className="px-5 py-3.5">Papel Atribuído</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Expiração</th>
                    <th className="px-5 py-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {invites.map((inv) => (
                    <tr key={inv.id}>
                      <td className="px-5 py-3.5 font-medium text-white">{inv.email}</td>
                      <td className="px-5 py-3.5 font-mono text-[11px] text-white/70">{inv.role}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                            inv.status === "PENDING"
                              ? "bg-amber-400/20 text-amber-300"
                              : inv.status === "ACCEPTED"
                              ? "bg-primary/20 text-primary"
                              : "bg-white/10 text-white/40"
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-white/40">
                        {new Date(inv.expiresAt).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-3">
                        {inv.status === "PENDING" && (
                          <>
                            <button
                              onClick={() => {
                                const url = `${window.location.origin}/invite/${inv.token}`;
                                navigator.clipboard.writeText(url);
                                setMessage({ type: "success", text: "Link copiado para a área de transferência!" });
                              }}
                              className="text-primary hover:underline"
                            >
                              Copiar Link
                            </button>
                            <button
                              onClick={() => handleResendInvite(inv.id)}
                              className="text-white/60 hover:text-white"
                            >
                              Renovar
                            </button>
                            <button
                              onClick={() => handleCancelInvite(inv.id)}
                              className="text-red-400 hover:text-red-300"
                            >
                              Revogar
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Ownership Transfer Section */}
        <div className="mt-14 border-t border-white/10 pt-10">
          <div className="rounded-2xl border border-red-500/20 bg-red-950/20 p-6 sm:flex sm:items-center sm:justify-between">
            <div>
              <h3 className="font-bold text-white">Transferência de Propriedade do Workspace</h3>
              <p className="mt-1 text-xs text-white/60 max-w-xl">
                Transfira a propriedade principal (OWNER) deste estúdio para outro membro da equipe.
                Você será automaticamente transicionado para o papel de ADMIN.
              </p>
            </div>
            <button
              onClick={() => setShowTransferModal(true)}
              className="mt-4 sm:mt-0 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs font-bold text-red-300 transition hover:bg-red-500/20"
            >
              Transferir Propriedade
            </button>
          </div>
        </div>

        {/* Invite Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="max-w-md w-full rounded-2xl border border-white/10 bg-[#0d1017] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Convidar Colaborador</h3>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="text-white/40 hover:text-white text-sm"
                >
                  ✕
                </button>
              </div>

              {generatedInviteUrl ? (
                <div className="space-y-4 pt-2">
                  <div className="rounded-xl bg-primary/60 border border-primary/40 p-4 space-y-2">
                    <p className="text-xs font-bold text-primary">
                      Link Seguro de Convite Gerado:
                    </p>
                    <input
                      type="text"
                      readOnly
                      value={generatedInviteUrl}
                      className="w-full rounded-lg border border-white/15 bg-black/50 p-2 text-xs font-mono text-white/80 select-all"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedInviteUrl);
                        alert("Link copiado!");
                      }}
                      className="w-full rounded-lg bg-primary py-2 text-xs font-bold text-on-primary hover:opacity-90 transition shadow-md shadow-primary/20"
                    >
                      Copiar Link de Convite
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      setShowInviteModal(false);
                      setGeneratedInviteUrl(null);
                    }}
                    className="w-full py-2 text-xs text-white/40 hover:text-white"
                  >
                    Fechar
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCreateInvite} className="space-y-4 pt-2">
                  <div>
                    <label className="block text-xs font-medium text-white/70 mb-1">
                      E-mail do Convidado
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="roteirista@cinema.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-white/70 mb-1">
                      Papel de Acesso
                    </label>
                    <select
                      value={inviteRole}
                      onChange={(e: any) => setInviteRole(e.target.value)}
                      className="w-full rounded-xl border border-white/15 bg-[#0d1017] px-3.5 py-2.5 text-xs text-white focus:border-primary focus:outline-none"
                    >
                      <option value="MEMBER">MEMBER — Criar e editar projetos e cenas</option>
                      <option value="ADMIN">ADMIN — Gestão de equipe, parâmetros e estúdio</option>
                      <option value="VIEWER">VIEWER — Apenas visualização de projetos</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowInviteModal(false)}
                      className="rounded-xl px-4 py-2 text-xs text-white/60 hover:text-white transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading || !inviteEmail.trim()}
                      className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-on-primary transition hover:opacity-90 shadow-md shadow-primary/20 disabled:opacity-50"
                    >
                      {actionLoading ? "Gerando..." : "Gerar Convite"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Transfer Ownership Modal */}
        {showTransferModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="max-w-md w-full rounded-2xl border border-white/10 bg-[#0d1017] p-6 space-y-4">
              <h3 className="text-lg font-bold text-white">Transferir Propriedade</h3>
              <p className="text-xs text-white/60">
                Selecione o membro que se tornará o novo PROPRIETÁRIO (OWNER) deste workspace.
              </p>

              <div className="space-y-3 pt-2">
                <select
                  value={selectedNewOwnerId}
                  onChange={(e) => setSelectedNewOwnerId(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-[#0d1017] px-3.5 py-2.5 text-xs text-white focus:border-primary focus:outline-none"
                >
                  <option value="">Selecione um membro...</option>
                  {members
                    .filter((m) => m.role !== "OWNER")
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.user.displayName ? `${m.user.displayName} (${m.user.email})` : m.user.email}
                      </option>
                    ))}
                </select>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowTransferModal(false)}
                    className="rounded-xl px-4 py-2 text-xs text-white/60 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleTransferOwnership}
                    disabled={actionLoading || !selectedNewOwnerId}
                    className="rounded-xl bg-red-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-red-600 disabled:opacity-50"
                  >
                    Confirmar Transferência
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
