"use client";

import { useEffect, useState } from "react";

export function SubscriptionsTab() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>({ total: 0, totalPages: 1 });

  // Modal States
  const [selectedSub, setSelectedSub] = useState<any>(null);
  const [subDetails, setSubDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Edit Subscription Modal
  const [editModal, setEditModal] = useState<any>(null);
  const [editTier, setEditTier] = useState("PRO");
  const [editStatus, setEditStatus] = useState("ACTIVE");
  const [editInterval, setEditInterval] = useState("MONTHLY");
  const [editCancelAtPeriodEnd, setEditCancelAtPeriodEnd] = useState(false);
  const [editGrantCredits, setEditGrantCredits] = useState(true);
  const [editNotes, setEditNotes] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Extend Trial Modal
  const [trialModal, setTrialModal] = useState<any>(null);
  const [trialDays, setTrialDays] = useState(14);
  const [trialJustification, setTrialJustification] = useState("");
  const [savingTrial, setSavingTrial] = useState(false);

  // Cancel Modal
  const [cancelModal, setCancelModal] = useState<any>(null);
  const [cancelImmediate, setCancelImmediate] = useState(false);
  const [cancelJustification, setCancelJustification] = useState("");
  const [savingCancel, setSavingCancel] = useState(false);

  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: page.toString(),
        limit: "15",
      });
      if (statusFilter !== "all") query.set("status", statusFilter);
      if (tierFilter !== "all") query.set("tier", tierFilter);
      if (search.trim()) query.set("search", search.trim());

      const res = await fetch(`/api/admin/billing/subscriptions?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSubscriptions(data.subscriptions || []);
        setPagination(data.pagination || { total: 0, totalPages: 1 });
      }
    } catch {
      // Error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [page, statusFilter, tierFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchSubscriptions();
  };

  const handleViewDetails = async (subId: string) => {
    setSelectedSub(subId);
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/admin/billing/subscriptions/${subId}`);
      if (res.ok) {
        const data = await res.json();
        setSubDetails(data);
      }
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleOpenEdit = (sub: any) => {
    setEditModal(sub);
    setEditTier(sub.planTier);
    setEditStatus(sub.status);
    setEditInterval(sub.interval || "MONTHLY");
    setEditCancelAtPeriodEnd(Boolean(sub.cancelAtPeriodEnd));
    setEditGrantCredits(false);
    setEditNotes("");
  };

  const handleSaveEdit = async () => {
    if (!editModal) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/admin/billing/subscriptions/${editModal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planTier: editTier,
          status: editStatus,
          interval: editInterval,
          cancelAtPeriodEnd: editCancelAtPeriodEnd,
          grantCredits: editGrantCredits,
          notes: editNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setNotification({ type: "success", message: data.message });
      setEditModal(null);
      fetchSubscriptions();
      if (selectedSub === editModal.id) {
        handleViewDetails(editModal.id);
      }
    } catch (err: any) {
      setNotification({ type: "error", message: err.message || "Erro ao atualizar assinatura." });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleExtendTrial = async () => {
    if (!trialModal || trialDays <= 0 || !trialJustification.trim()) return;
    setSavingTrial(true);
    try {
      const res = await fetch(`/api/admin/billing/subscriptions/${trialModal.id}/extend-trial`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          days: trialDays,
          justification: trialJustification,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setNotification({ type: "success", message: data.message });
      setTrialModal(null);
      setTrialJustification("");
      fetchSubscriptions();
    } catch (err: any) {
      setNotification({ type: "error", message: err.message || "Erro ao estender trial." });
    } finally {
      setSavingTrial(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!cancelModal || !cancelJustification.trim()) return;
    setSavingCancel(true);
    try {
      const res = await fetch(`/api/admin/billing/subscriptions/${cancelModal.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          immediate: cancelImmediate,
          justification: cancelJustification,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setNotification({ type: "success", message: data.message });
      setCancelModal(null);
      setCancelJustification("");
      fetchSubscriptions();
    } catch (err: any) {
      setNotification({ type: "error", message: err.message || "Erro ao cancelar assinatura." });
    } finally {
      setSavingCancel(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Notificação local */}
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

      {/* Header & Filtros */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>Assinaturas Contratadas</span>
            <span className="rounded bg-indigo-500/20 border border-indigo-500/40 px-2 py-0.5 font-mono text-[10px] font-bold text-indigo-300">
              Live Subscriptions
            </span>
          </h2>
          <p className="text-xs text-white/50">
            Controle de status, upgrade/downgrade administrativo, renovação e extensões de teste para clientes.
          </p>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Buscar por workspace ou slug..."
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

      {/* Filtros por Status e Tier */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { key: "all", label: "Todas" },
            { key: "ACTIVE", label: "Ativas" },
            { key: "TRIALING", label: "Em Trial" },
            { key: "PAST_DUE", label: "Inadimplentes (Past Due)" },
            { key: "CANCELING", label: "Cancelamento Agendado" },
            { key: "CANCELED", label: "Canceladas" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setStatusFilter(tab.key);
                setPage(1);
              }}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                statusFilter === tab.key
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-white/40">Plano:</span>
          <select
            value={tierFilter}
            onChange={(e) => {
              setTierFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-white/10 bg-[#161c2e] px-2.5 py-1 text-xs text-white focus:outline-none"
          >
            <option value="all">Todos os Planos</option>
            <option value="FREE">FREE</option>
            <option value="PRO">PRO</option>
            <option value="TEAM">TEAM</option>
            <option value="ENTERPRISE">ENTERPRISE</option>
          </select>
        </div>
      </div>

      {/* Tabela de Assinaturas */}
      <div className="rounded-2xl border border-white/10 bg-[#0d111c] overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-white/50 animate-pulse">
            Carregando assinaturas da plataforma...
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="p-12 text-center text-xs text-white/50">
            Nenhuma assinatura encontrada para os critérios informados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-white/50">
                  <th className="p-3.5 font-medium">Workspace / Titular</th>
                  <th className="p-3.5 font-medium">Plano Contratado</th>
                  <th className="p-3.5 font-medium">Ciclo</th>
                  <th className="p-3.5 font-medium">Status</th>
                  <th className="p-3.5 font-medium">Créditos</th>
                  <th className="p-3.5 font-medium">Vencimento / Renovação</th>
                  <th className="p-3.5 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {subscriptions.map((sub) => {
                  const owner = sub.workspace.memberships?.[0]?.user;
                  return (
                    <tr key={sub.id} className="hover:bg-white/[0.02] transition">
                      <td className="p-3.5">
                        <div className="font-semibold text-white">{sub.workspace.name}</div>
                        <div className="text-[11px] text-white/40 font-mono">
                          {owner ? `${owner.email} (${owner.displayName || "Titular"})` : `slug: ${sub.workspace.slug}`}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-mono font-bold ${
                            sub.planTier === "ENTERPRISE"
                              ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                              : sub.planTier === "TEAM"
                              ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                              : sub.planTier === "PRO"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                              : "bg-white/5 text-white/60"
                          }`}
                        >
                          {sub.planTier}
                        </span>
                      </td>

                      <td className="p-3.5 font-mono text-[11px] text-white/70">
                        {sub.interval === "YEARLY" ? "Anual (12m)" : "Mensal"}
                      </td>

                      <td className="p-3.5">
                        {sub.status === "ACTIVE" ? (
                          <span className="rounded bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] text-emerald-400 font-semibold">
                            ATIVA
                          </span>
                        ) : sub.status === "TRIALING" ? (
                          <span className="rounded bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] text-amber-400 font-semibold">
                            TRIAL
                          </span>
                        ) : sub.status === "PAST_DUE" ? (
                          <span className="rounded bg-rose-500/15 border border-rose-500/40 px-2 py-0.5 text-[10px] text-rose-300 font-bold">
                            PAST DUE
                          </span>
                        ) : sub.status === "CANCELING" ? (
                          <span className="rounded bg-orange-500/10 border border-orange-500/30 px-2 py-0.5 text-[10px] text-orange-400 font-semibold">
                            CANCELANDO
                          </span>
                        ) : (
                          <span className="rounded bg-white/5 text-white/40 px-2 py-0.5 text-[10px]">
                            {sub.status}
                          </span>
                        )}
                        {sub.cancelAtPeriodEnd && (
                          <div className="text-[10px] text-rose-400/80 mt-0.5">Cancela no fim</div>
                        )}
                      </td>

                      <td className="p-3.5 font-mono text-emerald-400">
                        {sub.workspace.creditsBalance} cr
                      </td>

                      <td className="p-3.5 text-white/50 font-mono text-[11px]">
                        {sub.currentPeriodEnd
                          ? new Date(sub.currentPeriodEnd).toLocaleDateString("pt-BR")
                          : "Vitalício / Indeterminado"}
                      </td>

                      <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => handleViewDetails(sub.id)}
                          className="rounded-lg border border-white/10 px-2 py-1 text-[11px] text-white/80 hover:bg-white/10 transition"
                        >
                          Detalhes
                        </button>

                        <button
                          onClick={() => handleOpenEdit(sub)}
                          className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2 py-1 text-[11px] text-indigo-300 hover:bg-indigo-500/20 transition"
                        >
                          Alterar Plano
                        </button>

                        <button
                          onClick={() => setTrialModal(sub)}
                          className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-300 hover:bg-amber-500/20 transition"
                          title="Estender período de teste"
                        >
                          + Trial
                        </button>

                        {sub.status !== "CANCELED" && (
                          <button
                            onClick={() => setCancelModal(sub)}
                            className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[11px] text-rose-300 hover:bg-rose-500/20 transition"
                          >
                            Cancelar
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

        {/* Paginação */}
        <div className="flex items-center justify-between p-4 border-t border-white/10 text-xs text-white/50">
          <span>
            Mostrando página {pagination.page} de {pagination.totalPages} ({pagination.total} assinaturas)
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

      {/* Modal: Detalhes da Assinatura */}
      {selectedSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="max-w-2xl w-full rounded-2xl border border-white/15 bg-[#0f1422] p-6 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-base font-bold text-white">Prontuário da Assinatura</h3>
                <p className="text-xs text-white/40">Visualização de faturas, histórico contratual e workspace.</p>
              </div>
              <button
                onClick={() => {
                  setSelectedSub(null);
                  setSubDetails(null);
                }}
                className="text-white/60 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            {loadingDetails || !subDetails ? (
              <div className="p-8 text-center text-xs text-white/50 animate-pulse">
                Carregando prontuário da assinatura...
              </div>
            ) : (
              <div className="space-y-5 text-xs">
                {/* Resumo Geral */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <span className="text-white/40">Workspace</span>
                    <p className="text-sm font-bold text-white mt-1 truncate">
                      {subDetails.subscription.workspace.name}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <span className="text-white/40">Plano Atual</span>
                    <p className="text-sm font-bold text-amber-300 mt-1">
                      {subDetails.subscription.planTier} ({subDetails.subscription.interval})
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <span className="text-white/40">Créditos em Conta</span>
                    <p className="text-sm font-bold text-emerald-400 mt-1">
                      {subDetails.subscription.workspace.creditsBalance} cr
                    </p>
                  </div>
                </div>

                {/* Snapshots Contratuais (Grandfathering) */}
                <div>
                  <h4 className="font-bold text-white mb-2">Snapshots Contratuais Protegidos</h4>
                  {subDetails.snapshots.length === 0 ? (
                    <p className="text-white/40 italic">Nenhum contrato prévio arquivado para esta assinatura.</p>
                  ) : (
                    <div className="space-y-2">
                      {subDetails.snapshots.map((snap: any) => (
                        <div key={snap.id} className="rounded-lg bg-white/5 p-2.5">
                          <div className="flex justify-between text-white/80 font-mono text-[11px]">
                            <span>Versão: {snap.version} - Motivo: {snap.reason}</span>
                            <span>{new Date(snap.acceptedAt).toLocaleDateString("pt-BR")}</span>
                          </div>
                          <div className="text-[10px] text-white/50 mt-1">
                            Preço acordado: R$ {((snap.snapshotData?.previousPriceMonthly || 0) / 100).toFixed(2)}/mês | Créditos acordados: {snap.snapshotData?.previousMonthlyCredits || 0}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Histórico de Faturas */}
                <div>
                  <h4 className="font-bold text-white mb-2">Faturas e Cobranças</h4>
                  {subDetails.subscription.invoices.length === 0 ? (
                    <p className="text-white/40 italic">Nenhuma fatura registrada.</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {subDetails.subscription.invoices.map((inv: any) => (
                        <div
                          key={inv.id}
                          className="flex justify-between items-center rounded-lg bg-white/5 p-2.5 text-[11px]"
                        >
                          <div>
                            <span className="font-bold text-white">
                              R$ {((inv.amountPaid || inv.amountDue || 0) / 100).toFixed(2)}
                            </span>
                            <span className="text-white/40 ml-2">Status: {inv.status}</span>
                          </div>
                          <span className="text-white/40 font-mono">
                            {new Date(inv.createdAt).toLocaleDateString("pt-BR")}
                          </span>
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

      {/* Modal: Editar Assinatura */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="max-w-md w-full rounded-2xl border border-indigo-500/30 bg-[#0c1020] p-6 space-y-4">
            <h3 className="text-base font-bold text-indigo-300">Modificar Assinatura Comercial</h3>
            <p className="text-xs text-white/70 leading-relaxed">
              Alterando termos de serviço para o estúdio{" "}
              <strong className="text-white">{editModal.workspace.name}</strong>.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-white/70 block mb-1">
                  Plano Contratado
                </label>
                <select
                  value={editTier}
                  onChange={(e) => setEditTier(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#161c2e] p-2.5 text-xs text-white focus:outline-none"
                >
                  <option value="FREE">FREE</option>
                  <option value="PRO">PRO</option>
                  <option value="TEAM">TEAM</option>
                  <option value="ENTERPRISE">ENTERPRISE</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-white/70 block mb-1">
                  Ciclo de Cobrança
                </label>
                <select
                  value={editInterval}
                  onChange={(e) => setEditInterval(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#161c2e] p-2.5 text-xs text-white focus:outline-none"
                >
                  <option value="MONTHLY">Mensal</option>
                  <option value="YEARLY">Anual</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-white/70 block mb-1">
                  Status da Assinatura
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#161c2e] p-2.5 text-xs text-white focus:outline-none"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="TRIALING">TRIALING</option>
                  <option value="PAST_DUE">PAST_DUE</option>
                  <option value="CANCELING">CANCELING</option>
                  <option value="CANCELED">CANCELED</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-white/70 block mb-1">
                  Renovação Automática
                </label>
                <select
                  value={editCancelAtPeriodEnd ? "cancel" : "renew"}
                  onChange={(e) => setEditCancelAtPeriodEnd(e.target.value === "cancel")}
                  className="w-full rounded-xl border border-white/10 bg-[#161c2e] p-2.5 text-xs text-white focus:outline-none"
                >
                  <option value="renew">Renovar normalmente</option>
                  <option value="cancel">Cancelar ao fim do período</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/10 cursor-pointer text-xs text-white/80">
              <input
                type="checkbox"
                checked={editGrantCredits}
                onChange={(e) => setEditGrantCredits(e.target.checked)}
                className="rounded border-white/20 text-emerald-500 focus:ring-0"
              />
              <span>Conceder créditos mensais do novo plano imediatamente</span>
            </label>

            <div>
              <label className="text-[11px] font-semibold text-white/70 block mb-1">
                Anotações Administrativas (Auditoria)
              </label>
              <input
                type="text"
                placeholder="Ex: Upgrade de cortesia comercial acordado em reunião..."
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs text-white placeholder-white/30 focus:outline-none"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setEditModal(null)}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                disabled={savingEdit}
                onClick={handleSaveEdit}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {savingEdit ? "Salvando..." : "Salvar Alterações"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Estender Trial */}
      {trialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="max-w-md w-full rounded-2xl border border-amber-500/30 bg-[#16120d] p-6 space-y-4">
            <h3 className="text-base font-bold text-amber-300">Estender Período de Testes</h3>
            <p className="text-xs text-white/70 leading-relaxed">
              Adicionando dias extras ao período de trial de{" "}
              <strong className="text-white">{trialModal.workspace.name}</strong>.
            </p>

            <div>
              <label className="text-[11px] font-semibold text-white/70 block mb-1">
                Dias Extras a Adicionar
              </label>
              <input
                type="number"
                min={1}
                max={90}
                value={trialDays}
                onChange={(e) => setTrialDays(parseInt(e.target.value, 10) || 1)}
                className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-white/70 block mb-1">
                Justificativa Obrigatória (Auditoria) *
              </label>
              <input
                type="text"
                placeholder="Ex: Cliente em processo de validação técnica interna..."
                value={trialJustification}
                onChange={(e) => setTrialJustification(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs text-white placeholder-white/30 focus:outline-none"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setTrialModal(null)}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                disabled={savingTrial || !trialJustification.trim() || trialDays <= 0}
                onClick={handleExtendTrial}
                className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-black hover:bg-amber-400 disabled:opacity-40"
              >
                {savingTrial ? "Aplicando..." : "Confirmar Extensão"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Cancelar Assinatura */}
      {cancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="max-w-md w-full rounded-2xl border border-rose-500/30 bg-[#160d10] p-6 space-y-4">
            <h3 className="text-base font-bold text-rose-300">Cancelar Assinatura</h3>
            <p className="text-xs text-white/70 leading-relaxed">
              Você está prestes a cancelar a assinatura de{" "}
              <strong className="text-white">{cancelModal.workspace.name}</strong>.
            </p>

            <div className="space-y-2">
              <label className="flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/10 cursor-pointer text-xs text-white/80">
                <input
                  type="radio"
                  name="cancelType"
                  checked={!cancelImmediate}
                  onChange={() => setCancelImmediate(false)}
                  className="text-rose-500"
                />
                <span>Cancelar no final do ciclo atual (preserva período pago)</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/10 cursor-pointer text-xs text-white/80">
                <input
                  type="radio"
                  name="cancelType"
                  checked={cancelImmediate}
                  onChange={() => setCancelImmediate(true)}
                  className="text-rose-500"
                />
                <span className="text-rose-300 font-semibold">Cancelar imediatamente (interrompe acesso imediato)</span>
              </label>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-white/70 block mb-1">
                Justificativa Obrigatória (Auditoria) *
              </label>
              <textarea
                rows={3}
                placeholder="Informe o motivo do cancelamento (ex: Solicitação por ticket #1234, encerramento de contrato)..."
                value={cancelJustification}
                onChange={(e) => setCancelJustification(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs text-white placeholder-white/30 focus:outline-none"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setCancelModal(null)}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/5"
              >
                Voltar
              </button>
              <button
                disabled={savingCancel || !cancelJustification.trim()}
                onClick={handleCancelSubscription}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-40"
              >
                {savingCancel ? "Processando..." : "Confirmar Cancelamento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
