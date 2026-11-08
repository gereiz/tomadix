"use client";

import { Spinner } from "@/components/ui/spinner";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface PermissionDef {
  id: string;
  label: string;
  category: string;
  description: string;
}

const ALL_PERMISSIONS: PermissionDef[] = [
  { id: "users:manage", label: "Gestão de Usuários", category: "Operações", description: "Suspender, reativar, editar perfil, revogar sessões e permissões." },
  { id: "projects:manage", label: "Gestão de Projetos", category: "Operações", description: "Visualizar projetos globais, arquivar, transferir e excluir." },
  { id: "plans:manage", label: "Planos e Assinaturas", category: "Comercial", description: "Gerenciar planos SaaS, recursos e alterar ou estender assinaturas." },
  { id: "prices:manage", label: "Preços & Moedas", category: "Comercial", description: "Alterar precificação periódica e planos por intervalo." },
  { id: "policies:manage", label: "Políticas Comerciais", category: "Comercial", description: "Configurar limites globais, custos de IA e políticas de consumo." },
  { id: "credits:manage", label: "Gestão de Créditos", category: "Comercial", description: "Conceder bônus, ajustar saldos e realizar estornos no livro-razão." },
  { id: "gateways:manage", label: "Gateways de Pagamento", category: "Técnico", description: "Configurar Stripe, Asaas ou outros provedores de pagamento." },
  { id: "credentials:manage", label: "Credenciais de API", category: "Técnico", description: "Gerenciar chaves secretas de provedores e integração." },
  { id: "webhooks:reprocess", label: "Reprocessar Webhooks", category: "Técnico", description: "Reexecutar eventos e disparos de webhook com falha." },
  { id: "audit:read", label: "Visualização de Auditoria", category: "Governança", description: "Acessar o log imutável de todas as ações administrativas realizadas." },
];

export default function AdminUserDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const userId = resolvedParams.id;
  const router = useRouter();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"profile" | "subscription" | "credits" | "projects" | "sessions" | "audit">("profile");

  // Edit Profile State
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editPlatformRole, setEditPlatformRole] = useState("USER");
  const [savingProfile, setSavingProfile] = useState(false);

  // Manual Email Verification Modal
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailJustification, setEmailJustification] = useState("");
  const [confirmingEmail, setConfirmingEmail] = useState(false);

  // Granular Permissions Modal
  const [permsModalOpen, setPermsModalOpen] = useState(false);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [savingPerms, setSavingPerms] = useState(false);

  // Suspend / Reactivate Modal
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [suspending, setSuspending] = useState(false);

  // Credit Adjust Modal
  const [creditModalOpen, setCreditModalOpen] = useState(false);
  const [creditAmount, setCreditAmount] = useState<number>(50);
  const [creditReason, setCreditReason] = useState("");
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
  const [adjustingCredit, setAdjustingCredit] = useState(false);

  // Entitlement Override Modal (Concessão Administrativa Temporária)
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [overrideTier, setOverrideTier] = useState("PRO");
  const [overrideCredits, setOverrideCredits] = useState<number>(100);
  const [overrideDays, setOverrideDays] = useState<number>(30);
  const [overrideReason, setOverrideReason] = useState("");
  const [savingOverride, setSavingOverride] = useState(false);

  // Alteração Efetiva de Plano (Definitivo)
  const [changePlanModalOpen, setChangePlanModalOpen] = useState(false);
  const [targetPlanTier, setTargetPlanTier] = useState("PRO");
  const [grantPlanCredits, setGrantPlanCredits] = useState(true);
  const [changePlanReason, setChangePlanReason] = useState("");
  const [changingPlan, setChangingPlan] = useState(false);

  // Project Transfer Modal
  const [transferProjectTarget, setTransferProjectTarget] = useState<any>(null);
  const [transferTargetWs, setTransferTargetWs] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [transferringProject, setTransferringProject] = useState(false);

  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const loadUserDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setEditDisplayName(json.user.displayName || "");
        setEditPlatformRole(json.user.platformRole);
        if (json.user.memberships?.[0]?.workspaceId) {
          setSelectedWorkspaceId(json.user.memberships[0].workspaceId);
        }
        const prefs = json.user.preferences as any;
        setSelectedPerms(Array.isArray(prefs?.adminPermissions) ? prefs.adminPermissions : []);
      } else {
        const err = await res.json();
        setNotification({ type: "error", message: err.error || "Usuário não encontrado." });
      }
    } catch (e: any) {
      setNotification({ type: "error", message: e.message || "Erro ao consultar dados." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserDetails();
  }, [userId]);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: editDisplayName,
          platformRole: editPlatformRole,
        }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error);

      setNotification({ type: "success", message: "Dados cadastrais atualizados com sucesso." });
      loadUserDetails();
    } catch (err: any) {
      setNotification({ type: "error", message: err.message });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleManualEmailVerification = async () => {
    if (!emailJustification.trim() || emailJustification.trim().length < 5) return;
    setConfirmingEmail(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/confirm-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ justification: emailJustification }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error);

      setNotification({ type: "success", message: resData.message });
      setEmailModalOpen(false);
      setEmailJustification("");
      loadUserDetails();
    } catch (err: any) {
      setNotification({ type: "error", message: err.message });
    } finally {
      setConfirmingEmail(false);
    }
  };

  const handleSavePermissions = async () => {
    setSavingPerms(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/permissions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: selectedPerms }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error);

      setNotification({ type: "success", message: "Permissões granulares salvas com sucesso." });
      setPermsModalOpen(false);
      loadUserDetails();
    } catch (err: any) {
      setNotification({ type: "error", message: err.message });
    } finally {
      setSavingPerms(false);
    }
  };

  const handleToggleSuspend = async () => {
    setSuspending(true);
    try {
      const endpoint = data.user.isSuspended
        ? `/api/admin/users/${userId}/reactivate`
        : `/api/admin/users/${userId}/suspend`;
      const body = data.user.isSuspended
        ? { reason: "Reativação administrativa manual" }
        : { reason: suspendReason };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error);

      setNotification({ type: "success", message: resData.message });
      setSuspendModalOpen(false);
      setSuspendReason("");
      loadUserDetails();
    } catch (err: any) {
      setNotification({ type: "error", message: err.message });
    } finally {
      setSuspending(false);
    }
  };

  const handleAdjustCredits = async () => {
    if (!selectedWorkspaceId || creditAmount === 0 || !creditReason.trim()) return;
    setAdjustingCredit(true);
    try {
      const res = await fetch("/api/admin/users/credits/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: selectedWorkspaceId,
          amount: creditAmount,
          reason: creditReason,
        }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error);

      setNotification({ type: "success", message: `Ajuste de ${creditAmount} créditos realizado com sucesso.` });
      setCreditModalOpen(false);
      setCreditReason("");
      loadUserDetails();
    } catch (err: any) {
      setNotification({ type: "error", message: err.message });
    } finally {
      setAdjustingCredit(false);
    }
  };

  const handleGrantOverride = async () => {
    if (!overrideReason.trim()) return;
    setSavingOverride(true);
    try {
      const expiresAt = new Date(Date.now() + overrideDays * 24 * 60 * 60 * 1000).toISOString();
      const res = await fetch(`/api/admin/users/${userId}/entitlements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: selectedWorkspaceId,
          grantedPlanTier: overrideTier,
          courtesyCredits: overrideCredits,
          expiresAt,
          reason: overrideReason,
        }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error);

      setNotification({ type: "success", message: "Concessão administrativa aplicada com sucesso." });
      setOverrideModalOpen(false);
      setOverrideReason("");
      loadUserDetails();
    } catch (err: any) {
      setNotification({ type: "error", message: err.message });
    } finally {
      setSavingOverride(false);
    }
  };

  const handleChangePlan = async () => {
    if (!selectedWorkspaceId || !changePlanReason.trim()) return;
    setChangingPlan(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/change-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: selectedWorkspaceId,
          planTier: targetPlanTier,
          grantCredits: grantPlanCredits,
          reason: changePlanReason,
        }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error);

      setNotification({ type: "success", message: resData.message });
      setChangePlanModalOpen(false);
      setChangePlanReason("");
      loadUserDetails();
    } catch (err: any) {
      setNotification({ type: "error", message: err.message });
    } finally {
      setChangingPlan(false);
    }
  };

  const handleRevokeOverride = async (overrideId: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/entitlements?overrideId=${overrideId}`, {
        method: "DELETE",
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error);

      setNotification({ type: "success", message: "Concessão administrativa revogada com sucesso." });
      loadUserDetails();
    } catch (err: any) {
      setNotification({ type: "error", message: err.message });
    }
  };

  const handleRevokeSession = async (sessionId?: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/revoke-sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error);

      setNotification({ type: "success", message: resData.message });
      loadUserDetails();
    } catch (err: any) {
      setNotification({ type: "error", message: err.message });
    }
  };

  const handleTransferProject = async () => {
    if (!transferProjectTarget || !transferTargetWs.trim() || !transferReason.trim()) return;
    setTransferringProject(true);
    try {
      const res = await fetch(`/api/admin/projects/${transferProjectTarget.id}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetWorkspaceId: transferTargetWs.trim(),
          reason: transferReason.trim(),
        }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error);

      setNotification({ type: "success", message: resData.message });
      setTransferProjectTarget(null);
      setTransferTargetWs("");
      setTransferReason("");
      loadUserDetails();
    } catch (err: any) {
      setNotification({ type: "error", message: err.message });
    } finally {
      setTransferringProject(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-white/50 flex flex-col items-center gap-3 animate-pulse">
        <Spinner block className="h-6 w-6 border-2 border-amber-400" />
        Carregando prontuário operacional do usuário...
      </div>
    );
  }

  if (!data?.user) {
    return (
      <div className="p-8 text-center text-xs text-rose-300">
        Usuário não encontrado ou sem permissão de acesso.
        <div className="mt-4">
          <Link href="/admin/users" className="text-amber-400 underline">
            Retornar à lista de usuários
          </Link>
        </div>
      </div>
    );
  }

  const u = data.user;
  const primaryWorkspace = u.memberships?.[0]?.workspace;
  const primarySubscription = primaryWorkspace?.subscription;

  return (
    <div className="space-y-6">
      {/* Notificação Superior */}
      {notification && (
        <div
          className={`p-4 rounded-xl text-xs flex justify-between items-center ${
            notification.type === "success"
              ? "bg-primary/10 border border-primary/30 text-primary"
              : "bg-rose-950/40 border border-rose-500/30 text-rose-300"
          }`}
        >
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="font-bold ml-4">
            ✕
          </button>
        </div>
      )}

      {/* Header com Navegação e Identificação */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/users"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition"
            title="Voltar à lista de usuários"
          >
            ←
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-white">{u.displayName || "Usuário Sem Nome"}</h1>
              <span
                className={`rounded px-2 py-0.5 text-[10px] font-mono font-bold ${
                  u.platformRole === "SUPER_ADMIN"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    : u.platformRole === "ADMIN"
                    ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                    : "bg-white/5 text-white/60"
                }`}
              >
                {u.platformRole}
              </span>
              {u.isSuspended ? (
                <span className="rounded bg-rose-500/15 border border-rose-500/40 px-2 py-0.5 text-[10px] text-rose-300 font-bold">
                  CONTA SUSPENSA
                </span>
              ) : (
                <span className="rounded bg-primary/10 border border-primary/30 px-2 py-0.5 text-[10px] text-primary font-semibold">
                  CONTA ATIVA
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-white/40 mt-1 font-mono">
              <span>{u.email}</span>
              <span>•</span>
              <span className={u.emailConfirmed ? "text-primary" : "text-amber-400"}>
                {u.emailConfirmed ? "✓ E-mail Confirmado" : "✗ E-mail Não Confirmado"}
              </span>
              <span>•</span>
              <span>Cadastro: {new Date(u.createdAt).toLocaleDateString("pt-BR")}</span>
              <span>•</span>
              <span>ID: {u.id}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {u.isSuspended ? (
            <button
              onClick={handleToggleSuspend}
              className="rounded-xl border border-primary/30 bg-primary/10 px-3.5 py-2 text-xs font-bold text-primary hover:bg-primary/20 transition"
            >
              Reativar Conta
            </button>
          ) : (
            <button
              onClick={() => setSuspendModalOpen(true)}
              className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition"
            >
              Suspender Conta
            </button>
          )}

          <button
            onClick={() => setCreditModalOpen(true)}
            className="rounded-xl bg-amber-400 px-3.5 py-2 text-xs font-bold text-black hover:bg-amber-300 transition"
          >
            Ajustar Créditos (+ / -)
          </button>
        </div>
      </div>

      {/* Cartões de Métricas Agregadas */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-xs">
        <div className="rounded-xl border border-white/10 bg-[#0d111c] p-3.5">
          <span className="text-white/40">Workspaces</span>
          <p className="text-lg font-bold text-white mt-1">{data.metrics.totalWorkspaces}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#0d111c] p-3.5">
          <span className="text-white/40">Projetos</span>
          <p className="text-lg font-bold text-white mt-1">{data.metrics.totalProjects}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#0d111c] p-3.5">
          <span className="text-white/40">Personagens / Locações</span>
          <p className="text-lg font-bold text-white mt-1">
            {data.metrics.totalCharacters} / {data.metrics.totalEnvironments}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#0d111c] p-3.5">
          <span className="text-white/40">Cenas Criadas</span>
          <p className="text-lg font-bold text-white mt-1">{data.metrics.totalScenes}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#0d111c] p-3.5">
          <span className="text-white/40">Gerações de IA</span>
          <p className="text-lg font-bold text-amber-300 mt-1">{data.metrics.totalGenerations}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#0d111c] p-3.5">
          <span className="text-white/40">Créditos Disponíveis</span>
          <p className="text-lg font-bold text-primary font-mono mt-1">
            {data.metrics.credits.available} cr
          </p>
        </div>
      </div>

      {/* Navegação por Abas Internas */}
      <div className="flex items-center gap-1.5 border-b border-white/10 pb-2 text-xs">
        {[
          { key: "profile", label: "Perfil & Permissões", icon: "👤" },
          { key: "subscription", label: "Plano & Concessões", icon: "💳" },
          { key: "credits", label: "Extrato & Ledger de Créditos", icon: "🪙" },
          { key: "projects", label: `Projetos Vinculados (${data.userProjects?.length || 0})`, icon: "🎬" },
          { key: "sessions", label: `Sessões Ativas (${data.user.sessions?.length || 0})`, icon: "🔐" },
          { key: "audit", label: "Trilha de Auditoria", icon: "🛡️" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`rounded-lg px-3 py-1.5 font-medium transition flex items-center gap-1.5 ${
              activeTab === tab.key
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ABA 1: PERFIL & PERMISSÕES */}
      {activeTab === "profile" && (
        <div className="space-y-6 text-xs">
          <div className="rounded-2xl border border-white/10 bg-[#0d111c] p-6 space-y-4">
            <h3 className="text-sm font-bold text-white">Dados Cadastrais e Papel Administrativo</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-white/60 block mb-1 font-semibold">Nome de Exibição</label>
                <input
                  type="text"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-white/60 block mb-1 font-semibold">Papel na Plataforma</label>
                <select
                  value={editPlatformRole}
                  onChange={(e) => setEditPlatformRole(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#161c2e] px-3 py-2 text-white focus:outline-none"
                >
                  <option value="USER">USER (Cliente Padrão)</option>
                  <option value="ADMIN">ADMIN (Operador de Suporte)</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN (Acesso Total)</option>
                </select>
              </div>

              <div>
                <label className="text-white/60 block mb-1 font-semibold">Verificação de E-mail</label>
                <div className="flex items-center gap-2">
                  <span
                    className={`flex-1 rounded-xl border px-3 py-2 text-center font-semibold ${
                      u.emailConfirmed
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "bg-amber-500/10 border-amber-500/30 text-amber-300"
                    }`}
                  >
                    {u.emailConfirmed ? "Confirmado" : "Pendente"}
                  </span>
                  {!u.emailConfirmed && (
                    <button
                      onClick={() => setEmailModalOpen(true)}
                      className="rounded-xl border border-amber-500/40 bg-amber-500/20 px-3 py-2 font-bold text-amber-300 hover:bg-amber-500/30 transition whitespace-nowrap"
                    >
                      Confirmar Manualmente
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-white/5">
              <button
                onClick={() => setPermsModalOpen(true)}
                className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-2 font-bold text-indigo-300 hover:bg-indigo-500/20 transition flex items-center gap-1.5"
              >
                <span>🔑</span> Gerenciar Permissões Granulares ({selectedPerms.length} ativas)
              </button>

              <button
                disabled={savingProfile}
                onClick={handleSaveProfile}
                className="rounded-xl bg-amber-400 px-5 py-2 font-bold text-black hover:bg-amber-300 disabled:opacity-50 transition"
              >
                {savingProfile ? "Salvando..." : "Salvar Alterações"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: PLANO, ASSINATURA & CONCESSÕES ADMINISTRATIVAS */}
      {activeTab === "subscription" && (
        <div className="space-y-6 text-xs">
          <div className="rounded-2xl border border-white/10 bg-[#0d111c] p-6 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-white">Contrato e Plano Ativo</h3>
                <p className="text-white/40">Visualização de termos contratados e concessões temporárias de cortesia.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setTargetPlanTier(primarySubscription?.planTier || "PRO");
                    setChangePlanModalOpen(true);
                  }}
                  className="rounded-xl border border-primary/40 bg-primary/15 px-3.5 py-2 font-bold text-primary hover:bg-primary/25 transition flex items-center gap-1.5"
                  title="Alterar definitivamente o plano contratado do estúdio"
                >
                  <span>🔄</span> Alterar Plano Efetivo
                </button>
                <button
                  onClick={() => setOverrideModalOpen(true)}
                  className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-2 font-bold text-indigo-300 hover:bg-indigo-500/20 transition flex items-center gap-1.5"
                >
                  <span>🎁</span> Conceder Acesso / Plano Temporário
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3.5">
                <span className="text-white/40">Plano Contratado</span>
                <p className="text-base font-bold text-white mt-1">
                  {primarySubscription?.planTier || "FREE"}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3.5">
                <span className="text-white/40">Ciclo de Faturamento</span>
                <p className="text-base font-bold text-white mt-1">
                  {primarySubscription?.interval === "YEARLY" ? "Anual" : "Mensal"}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3.5">
                <span className="text-white/40">Status do Contrato</span>
                <p className="text-base font-bold text-primary mt-1">
                  {primarySubscription?.status || "ACTIVE"}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3.5">
                <span className="text-white/40">Vencimento / Renovação</span>
                <p className="text-base font-bold text-white/80 font-mono mt-1">
                  {primarySubscription?.currentPeriodEnd
                    ? new Date(primarySubscription.currentPeriodEnd).toLocaleDateString("pt-BR")
                    : "Vitalício"}
                </p>
              </div>
            </div>

            {/* Concessões Administrativas Ativas */}
            <div className="pt-4 border-t border-white/10">
              <h4 className="font-bold text-white mb-2">Concessões Administrativas Vigentes (Overrides)</h4>
              {data.entitlementOverrides?.length === 0 ? (
                <p className="text-white/40 italic">Nenhuma concessão temporária ativa para este usuário.</p>
              ) : (
                <div className="space-y-2">
                  {data.entitlementOverrides.map((ov: any) => (
                    <div
                      key={ov.id}
                      className={`flex justify-between items-center rounded-xl border p-3 ${
                        ov.isActive
                          ? "bg-indigo-950/20 border-indigo-500/30 text-white"
                          : "bg-white/5 border-white/5 text-white/40 opacity-60"
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-indigo-300">
                          {ov.grantedPlanTier ? `Plano ${ov.grantedPlanTier}` : "Cortesia de Créditos"}
                          {ov.courtesyCredits && ` (+${ov.courtesyCredits} créditos)`}
                        </div>
                        <div className="text-[11px] text-white/50 mt-0.5">
                          Motivo: {ov.reason} | Expira: {ov.expiresAt ? new Date(ov.expiresAt).toLocaleDateString("pt-BR") : "Indeterminado"}
                        </div>
                      </div>
                      {ov.isActive && (
                        <button
                          onClick={() => handleRevokeOverride(ov.id)}
                          className="rounded-lg border border-rose-500/30 px-2.5 py-1 text-[11px] text-rose-300 hover:bg-rose-500/10 transition"
                        >
                          Revogar
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ABA 3: EXTRATO & LEDGER DE CRÉDITOS */}
      {activeTab === "credits" && (
        <div className="space-y-6 text-xs">
          <div className="grid grid-cols-4 gap-3">
            <div className="rounded-xl border border-white/10 bg-[#0d111c] p-3.5">
              <span className="text-white/40">Saldo Atual</span>
              <p className="text-lg font-bold text-primary font-mono mt-1">
                {data.metrics.credits.available} cr
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#0d111c] p-3.5">
              <span className="text-white/40">Total Recebido</span>
              <p className="text-lg font-bold text-white font-mono mt-1">
                +{data.metrics.credits.granted} cr
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#0d111c] p-3.5">
              <span className="text-white/40">Total Consumido</span>
              <p className="text-lg font-bold text-rose-300 font-mono mt-1">
                -{data.metrics.credits.consumed} cr
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#0d111c] p-3.5">
              <span className="text-white/40">Ajustes Manuais</span>
              <p className="text-lg font-bold text-amber-300 font-mono mt-1">
                {data.metrics.credits.adjusted} cr
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0d111c] overflow-hidden">
            <div className="p-4 border-b border-white/10 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-white">Livro-Razão Imutável (Credit Ledger)</h3>
                <p className="text-white/40">Histórico detalhado de deduções por IA, renovações e intervenções manuais.</p>
              </div>
              <button
                onClick={() => setCreditModalOpen(true)}
                className="rounded-xl bg-amber-400 px-3.5 py-1.5 text-xs font-bold text-black hover:bg-amber-300 transition"
              >
                + / - Novo Ajuste
              </button>
            </div>

            {data.recentLedgerEntries?.length === 0 ? (
              <div className="p-8 text-center text-white/40 italic">Nenhuma movimentação registrada no livro-razão.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/[0.02] border-b border-white/10 text-white/50">
                    <tr>
                      <th className="p-3">Data/Hora</th>
                      <th className="p-3">Movimentação</th>
                      <th className="p-3">Saldo Após</th>
                      <th className="p-3">Motivo / Identificador</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data.recentLedgerEntries.map((entry: any) => (
                      <tr key={entry.id} className="hover:bg-white/[0.02]">
                        <td className="p-3 font-mono text-white/50">
                          {new Date(entry.createdAt).toLocaleString("pt-BR")}
                        </td>
                        <td className="p-3 font-bold font-mono">
                          <span className={entry.amount > 0 ? "text-primary" : "text-rose-400"}>
                            {entry.amount > 0 ? `+${entry.amount}` : entry.amount} cr
                          </span>
                        </td>
                        <td className="p-3 font-mono text-white/80">{entry.balanceAfter} cr</td>
                        <td className="p-3 text-white/70">{entry.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA 4: PROJETOS VINCULADOS */}
      {activeTab === "projects" && (
        <div className="space-y-4 text-xs">
          <div className="rounded-2xl border border-white/10 bg-[#0d111c] overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <h3 className="text-sm font-bold text-white">Projetos do Usuário</h3>
              <p className="text-white/40">Visualização de dependências criativas e opção de transferência de estúdio.</p>
            </div>

            {data.userProjects?.length === 0 ? (
              <div className="p-8 text-center text-white/40 italic">O usuário não possui projetos criados.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/[0.02] border-b border-white/10 text-white/50">
                    <tr>
                      <th className="p-3">Título do Projeto</th>
                      <th className="p-3">Gênero / Idioma</th>
                      <th className="p-3">Cenas / Personagens</th>
                      <th className="p-3">Gerações</th>
                      <th className="p-3">Última Atualização</th>
                      <th className="p-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data.userProjects.map((proj: any) => (
                      <tr key={proj.id} className="hover:bg-white/[0.02]">
                        <td className="p-3">
                          <div className="font-semibold text-white">{proj.title}</div>
                          <div className="text-[10px] text-white/40 font-mono">ID: {proj.id}</div>
                        </td>
                        <td className="p-3 text-white/70">
                          {proj.genre || "N/A"} ({proj.language})
                        </td>
                        <td className="p-3 font-mono text-white/80">
                          {proj._count?.scenes || 0} cenas • {proj._count?.characters || 0} personagens
                        </td>
                        <td className="p-3 font-mono text-amber-300">
                          {proj._count?.generations || 0} jobs
                        </td>
                        <td className="p-3 font-mono text-white/50">
                          {new Date(proj.updatedAt).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => setTransferProjectTarget(proj)}
                            className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-[11px] text-indigo-300 hover:bg-indigo-500/20 transition"
                          >
                            Transferir
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA 5: SESSÕES CONECTADAS */}
      {activeTab === "sessions" && (
        <div className="space-y-4 text-xs">
          <div className="rounded-2xl border border-white/10 bg-[#0d111c] p-6 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-white">Sessões Ativas ({u.sessions?.length || 0})</h3>
                <p className="text-white/40">Controle de dispositivos autenticados e revogação de tokens.</p>
              </div>
              {u.sessions?.length > 0 && (
                <button
                  onClick={() => handleRevokeSession()}
                  className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-1.5 font-bold text-rose-300 hover:bg-rose-500/20 transition"
                >
                  Revogar Todas as Sessões
                </button>
              )}
            </div>

            {u.sessions?.length === 0 ? (
              <p className="text-white/40 italic">Nenhuma sessão ativa no momento.</p>
            ) : (
              <div className="space-y-2">
                {u.sessions.map((s: any) => (
                  <div key={s.id} className="flex justify-between items-center rounded-xl bg-white/5 p-3">
                    <div>
                      <div className="font-mono text-white font-semibold">IP: {s.ipAddress || "Desconhecido"}</div>
                      <div className="text-[11px] text-white/40 truncate max-w-md">{s.userAgent || "Navegador padrão"}</div>
                      <div className="text-[10px] text-white/30">
                        Criada: {new Date(s.createdAt).toLocaleString("pt-BR")} | Expira: {new Date(s.expiresAt).toLocaleDateString("pt-BR")}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRevokeSession(s.id)}
                      className="rounded-lg border border-rose-500/30 px-2.5 py-1 text-[11px] text-rose-300 hover:bg-rose-500/10 transition"
                    >
                      Encerrar Sessão
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA 6: TRILHA DE AUDITORIA */}
      {activeTab === "audit" && (
        <div className="space-y-4 text-xs">
          <div className="rounded-2xl border border-white/10 bg-[#0d111c] overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <h3 className="text-sm font-bold text-white">Trilha de Auditoria no Registro do Usuário</h3>
              <p className="text-white/40">Eventos de suspensão, alteração de papel, créditos e verificações manuais.</p>
            </div>

            {data.recentAuditLogs?.length === 0 ? (
              <div className="p-8 text-center text-white/40 italic">Nenhum evento registrado na auditoria.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/[0.02] border-b border-white/10 text-white/50">
                    <tr>
                      <th className="p-3">Data/Hora</th>
                      <th className="p-3">Ação</th>
                      <th className="p-3">Operador Admin</th>
                      <th className="p-3">Detalhes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data.recentAuditLogs.map((log: any) => (
                      <tr key={log.id} className="hover:bg-white/[0.02]">
                        <td className="p-3 font-mono text-white/50">
                          {new Date(log.createdAt).toLocaleString("pt-BR")}
                        </td>
                        <td className="p-3 font-mono text-amber-400 font-bold">{log.action}</td>
                        <td className="p-3 font-mono text-white/70">{log.adminUserId}</td>
                        <td className="p-3 text-white/70 max-w-sm truncate">
                          {log.details?.reason || log.details?.justification || JSON.stringify(log.details || {})}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: VERIFICAÇÃO MANUAL DE E-MAIL COM JUSTIFICATIVA */}
      {emailModalOpen && (
        <div className="fixed inset-0 overflow-y-auto z-50 flex items-center-safe justify-center bg-black/80 p-3 sm:p-4">
          <div className="max-w-md w-full rounded-2xl border border-amber-500/30 bg-[#16120d] p-6 space-y-4">
            <h3 className="text-base font-bold text-amber-300">Confirmação Manual de E-mail</h3>
            <p className="text-xs text-white/70 leading-relaxed">
              Você está prestes a validar manualmente o endereço <strong className="text-white">{u.email}</strong>.
              Essa operação deixa explícito na auditoria que a validação foi concedida por um administrador da plataforma.
            </p>

            <div>
              <label className="text-[11px] font-semibold text-white/70 block mb-1">
                Justificativa Obrigatória (Auditoria) *
              </label>
              <textarea
                rows={3}
                placeholder="Ex: Confirmação realizada via atendimento telefônico ou documento corporativo..."
                value={emailJustification}
                onChange={(e) => setEmailJustification(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs text-white placeholder-white/30 focus:outline-none"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setEmailModalOpen(false)}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                disabled={confirmingEmail || emailJustification.trim().length < 5}
                onClick={handleManualEmailVerification}
                className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-black hover:bg-amber-300 disabled:opacity-40"
              >
                {confirmingEmail ? "Confirmando..." : "Confirmar E-mail"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PERMISSÕES GRANULARES */}
      {permsModalOpen && (
        <div className="fixed inset-0 overflow-y-auto z-50 flex items-center-safe justify-center bg-black/80 p-3 sm:p-4">
          <div className="max-w-2xl w-full rounded-2xl border border-indigo-500/30 bg-[#0c1020] p-6 space-y-4 max-h-[90dvh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base font-bold text-indigo-300">Privilégios Administrativos Granulares</h3>
                <p className="text-xs text-white/60">Configuração de permissões pontuais para {u.email}.</p>
              </div>
              <button onClick={() => setPermsModalOpen(false)} className="text-white/60 hover:text-white font-bold">
                ✕
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setSelectedPerms(ALL_PERMISSIONS.map((p) => p.id))}
                className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/80 hover:bg-white/10"
              >
                Conceder Todas
              </button>
              <button
                onClick={() => setSelectedPerms([])}
                className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/80 hover:bg-white/10"
              >
                Revogar Todas
              </button>
            </div>

            <div className="space-y-2.5">
              {ALL_PERMISSIONS.map((perm) => {
                const isChecked = selectedPerms.includes(perm.id);
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
                        if (e.target.checked) setSelectedPerms([...selectedPerms, perm.id]);
                        else setSelectedPerms(selectedPerms.filter((id) => id !== perm.id));
                      }}
                      className="mt-0.5 rounded border-white/20 text-indigo-500 focus:ring-0"
                    />
                    <div className="flex-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{perm.label}</span>
                        <span className="font-mono text-[10px] text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                          {perm.id}
                        </span>
                        <span className="text-[10px] text-white/40">({perm.category})</span>
                      </div>
                      <p className="text-[11px] text-white/50 mt-0.5">{perm.description}</p>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-white/10">
              <button
                onClick={() => setPermsModalOpen(false)}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                disabled={savingPerms}
                onClick={handleSavePermissions}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {savingPerms ? "Salvando..." : "Salvar Permissões"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: AJUSTAR CRÉDITOS (+ / -) */}
      {creditModalOpen && (
        <div className="fixed inset-0 overflow-y-auto z-50 flex items-center-safe justify-center bg-black/80 p-3 sm:p-4">
          <div className="max-w-md w-full rounded-2xl border border-primary/30 bg-[#0c141c] p-6 space-y-4">
            <h3 className="text-base font-bold text-primary">Ajuste de Créditos (+ Concessão / - Retirada)</h3>
            <p className="text-xs text-white/70 leading-relaxed">
              Informe um valor positivo para adicionar créditos ou negativo para retirar. O sistema impede saldos negativos.
            </p>

            <div>
              <label className="text-[11px] font-semibold text-white/70 block mb-1">
                Workspace / Estúdio Alvo
              </label>
              <select
                value={selectedWorkspaceId}
                onChange={(e) => setSelectedWorkspaceId(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#161c2e] p-2.5 text-xs text-white focus:outline-none"
              >
                {u.memberships?.map((m: any) => (
                  <option key={m.workspace.id} value={m.workspace.id}>
                    {m.workspace.name} (Saldo atual: {m.workspace.creditsBalance} cr)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-white/70 block mb-1">
                Quantidade de Créditos (positivo para adicionar, negativo para retirar)
              </label>
              <input
                type="number"
                value={creditAmount}
                onChange={(e) => setCreditAmount(parseInt(e.target.value, 10) || 0)}
                className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-white/70 block mb-1">
                Justificativa Obrigatória (Auditoria) *
              </label>
              <input
                type="text"
                placeholder="Ex: Bonificação promocional, estorno por falha, compensação de cobrança..."
                value={creditReason}
                onChange={(e) => setCreditReason(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs text-white placeholder-white/30 focus:outline-none"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setCreditModalOpen(false)}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                disabled={adjustingCredit || creditAmount === 0 || !creditReason.trim()}
                onClick={handleAdjustCredits}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-on-primary hover:bg-primary-fixed disabled:opacity-40"
              >
                {adjustingCredit ? "Processando..." : "Confirmar Ajuste"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ALTERAÇÃO DEFINITIVA DE PLANO */}
      {changePlanModalOpen && (
        <div className="fixed inset-0 overflow-y-auto z-50 flex items-center-safe justify-center bg-black/80 p-3 sm:p-4">
          <div className="max-w-md w-full rounded-2xl border border-primary/40 bg-[#0c141c] p-6 space-y-4">
            <h3 className="text-base font-bold text-primary">Alterar Plano Contratado do Estúdio</h3>
            <p className="text-xs text-white/70 leading-relaxed">
              Atualiza efetivamente o plano contratado do workspace, aplicando imediatamente as novas cotas de workspaces, projetos, membros e recursos.
            </p>

            <div>
              <label className="text-[11px] font-semibold text-white/70 block mb-1">Selecione o Novo Plano</label>
              <select
                value={targetPlanTier}
                onChange={(e) => setTargetPlanTier(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#16202e] p-2.5 text-xs text-white focus:outline-none focus:border-primary"
              >
                <option value="FREE">FREE — Plano Gratuito (2 Projetos, 1 Membro)</option>
                <option value="PRO">PRO — Tomadix Pro (20 Projetos, 3 Membros, 500 cr/mês)</option>
                <option value="TEAM">TEAM — Tomadix Studio Team (Projetos Ilimitados, 10 Membros, 2.500 cr/mês)</option>
                <option value="ENTERPRISE">ENTERPRISE — Tomadix Enterprise (Ilimitado, 10.000 cr/mês)</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="grantPlanCreditsCheck"
                checked={grantPlanCredits}
                onChange={(e) => setGrantPlanCredits(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-white/5 text-primary focus:ring-primary/50"
              />
              <label htmlFor="grantPlanCreditsCheck" className="text-xs text-white/80 cursor-pointer">
                Conceder créditos mensais do novo plano imediatamente
              </label>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-white/70 block mb-1">Justificativa Formal da Alteração *</label>
              <input
                type="text"
                placeholder="Ex: Upgrade comercial autorizado, migração de plano, cortesia contratual..."
                value={changePlanReason}
                onChange={(e) => setChangePlanReason(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setChangePlanModalOpen(false)}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                disabled={changingPlan || !changePlanReason.trim()}
                onClick={handleChangePlan}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-on-primary hover:bg-primary-fixed disabled:opacity-40 transition"
              >
                {changingPlan ? "Salvando..." : "Confirmar Alteração de Plano"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONCESSÃO ADMINISTRATIVA TEMPORÁRIA (OVERRIDE) */}
      {overrideModalOpen && (
        <div className="fixed inset-0 overflow-y-auto z-50 flex items-center-safe justify-center bg-black/80 p-3 sm:p-4">
          <div className="max-w-md w-full rounded-2xl border border-indigo-500/30 bg-[#0c1020] p-6 space-y-4">
            <h3 className="text-base font-bold text-indigo-300">Conceder Plano Temporário / Cortesia</h3>
            <p className="text-xs text-white/70 leading-relaxed">
              Concede acesso a recursos de um plano superior por período determinado com expiração automática.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-white/70 block mb-1">Plano Concedido</label>
                <select
                  value={overrideTier}
                  onChange={(e) => setOverrideTier(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#161c2e] p-2.5 text-xs text-white focus:outline-none"
                >
                  <option value="PRO">PRO</option>
                  <option value="TEAM">TEAM</option>
                  <option value="ENTERPRISE">ENTERPRISE</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-white/70 block mb-1">Duração (Dias)</label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={overrideDays}
                  onChange={(e) => setOverrideDays(parseInt(e.target.value, 10) || 1)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-white/70 block mb-1">Créditos de Bônus (Opcional)</label>
              <input
                type="number"
                min={0}
                value={overrideCredits}
                onChange={(e) => setOverrideCredits(parseInt(e.target.value, 10) || 0)}
                className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-white/70 block mb-1">Justificativa Formal *</label>
              <input
                type="text"
                placeholder="Ex: Parceria comercial estratégica, avaliação para contratação anual..."
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs text-white placeholder-white/30 focus:outline-none"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setOverrideModalOpen(false)}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                disabled={savingOverride || !overrideReason.trim()}
                onClick={handleGrantOverride}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-40"
              >
                {savingOverride ? "Aplicando..." : "Confirmar Concessão"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TRANSFERÊNCIA DE PROJETO */}
      {transferProjectTarget && (
        <div className="fixed inset-0 overflow-y-auto z-50 flex items-center-safe justify-center bg-black/80 p-3 sm:p-4">
          <div className="max-w-md w-full rounded-2xl border border-indigo-500/30 bg-[#0c1020] p-6 space-y-4">
            <h3 className="text-base font-bold text-indigo-300">Transferir Projeto entre Estúdios</h3>
            <p className="text-xs text-white/70 leading-relaxed">
              Transferindo o projeto <strong className="text-white">{transferProjectTarget.title}</strong> para outro workspace.
              Todos os personagens, ambientes, cenas e versões serão mantidos intactos.
            </p>

            <div>
              <label className="text-[11px] font-semibold text-white/70 block mb-1">
                ID do Workspace de Destino *
              </label>
              <input
                type="text"
                placeholder="Cole o ID do Workspace de destino..."
                value={transferTargetWs}
                onChange={(e) => setTransferTargetWs(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs text-white font-mono placeholder-white/30 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-white/70 block mb-1">
                Justificativa Formal (Auditoria) *
              </label>
              <input
                type="text"
                placeholder="Ex: Reatribuição de propriedade solicitada pelo diretor de produção..."
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs text-white placeholder-white/30 focus:outline-none"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setTransferProjectTarget(null)}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                disabled={transferringProject || !transferTargetWs.trim() || !transferReason.trim()}
                onClick={handleTransferProject}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-40"
              >
                {transferringProject ? "Transferindo..." : "Confirmar Transferência"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SUSPENDER CONTA */}
      {suspendModalOpen && (
        <div className="fixed inset-0 overflow-y-auto z-50 flex items-center-safe justify-center bg-black/80 p-3 sm:p-4">
          <div className="max-w-md w-full rounded-2xl border border-rose-500/30 bg-[#160d10] p-6 space-y-4">
            <h3 className="text-base font-bold text-rose-300">Suspender Conta de Usuário</h3>
            <p className="text-xs text-white/70 leading-relaxed">
              Você está prestes a suspender <strong className="text-white">{u.email}</strong>. Todas as sessões serão imediatamente encerradas.
            </p>

            <div>
              <label className="text-[11px] font-semibold text-white/70 block mb-1">Justificativa Obrigatória *</label>
              <textarea
                rows={3}
                placeholder="Informe o motivo da suspensão..."
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs text-white placeholder-white/30 focus:outline-none"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setSuspendModalOpen(false)}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                disabled={suspending || suspendReason.trim().length < 5}
                onClick={handleToggleSuspend}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-40"
              >
                {suspending ? "Suspendendo..." : "Confirmar Suspensão"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
