"use client";

import { useEffect, useState } from "react";
import { GatewaysTab } from "./components/gateways-tab";
import { WebhooksTab } from "./components/webhooks-tab";

type SectionTab =
  | "overview"
  | "plans"
  | "limits"
  | "credit_policies"
  | "subscription_policies"
  | "promotions"
  | "general_settings"
  | "history"
  | "gateways"
  | "webhooks";

export default function AdminBillingPage() {
  const [activeTab, setActiveTab] = useState<SectionTab>("overview");
  const [loading, setLoading] = useState(true);

  // Dados
  const [metrics, setMetrics] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Estados de Modais
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [savingPlan, setSavingPlan] = useState(false);
  const [duplicateModal, setDuplicateModal] = useState<{ sourceTier: string; name: string; targetTier: string } | null>(null);
  const [archiveModal, setArchiveModal] = useState<any>(null);
  const [policyEditModal, setPolicyEditModal] = useState<{ key: string; label: string; value: any; dataType: string; justification: string } | null>(null);

  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Carregamento inicial
  const loadData = async () => {
    setLoading(true);
    try {
      const [plansRes, metricsRes, policiesRes, snapshotsRes, auditRes] = await Promise.all([
        fetch("/api/admin/billing/plans"),
        fetch("/api/admin/billing/metrics"),
        fetch("/api/admin/billing/policies"),
        fetch("/api/admin/billing/snapshots?limit=20"),
        fetch("/api/admin/audit?limit=20"),
      ]);

      if (plansRes.ok) {
        const d = await plansRes.json();
        setPlans(d.plans || []);
      }
      if (metricsRes.ok) {
        const d = await metricsRes.json();
        setMetrics(d.metrics || null);
      }
      if (policiesRes.ok) {
        const d = await policiesRes.json();
        setPolicies(d.policies || []);
      }
      if (snapshotsRes.ok) {
        const d = await snapshotsRes.json();
        setSnapshots(d.snapshots || []);
      }
      if (auditRes.ok) {
        const d = await auditRes.json();
        setAuditLogs(d.logs || []);
      }
    } catch (err: any) {
      setNotification({ type: "error", message: "Erro ao carregar dados comerciais: " + err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handlers para Planos
  const handleTogglePlan = async (tier: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/billing/plans/${tier}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setNotification({ type: "success", message: data.message });
      loadData();
    } catch (err: any) {
      setNotification({ type: "error", message: err.message });
    }
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    setSavingPlan(true);
    try {
      const res = await fetch("/api/admin/billing/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingPlan),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setNotification({ type: "success", message: data.message });
      setEditingPlan(null);
      loadData();
    } catch (err: any) {
      setNotification({ type: "error", message: err.message });
    } finally {
      setSavingPlan(false);
    }
  };

  const handleArchivePlan = async () => {
    if (!archiveModal) return;
    try {
      const res = await fetch(`/api/admin/billing/plans/${archiveModal.tier}/archive`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setNotification({ type: "success", message: data.message });
      setArchiveModal(null);
      loadData();
    } catch (err: any) {
      setNotification({ type: "error", message: err.message });
    }
  };

  const handleDuplicatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!duplicateModal) return;
    try {
      const res = await fetch(`/api/admin/billing/plans/${duplicateModal.sourceTier}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetTier: duplicateModal.targetTier,
          name: duplicateModal.name,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setNotification({ type: "success", message: data.message });
      setDuplicateModal(null);
      loadData();
    } catch (err: any) {
      setNotification({ type: "error", message: err.message });
    }
  };

  // Handler para Políticas Globais
  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!policyEditModal) return;
    try {
      let finalVal = policyEditModal.value;
      if (policyEditModal.dataType === "number") finalVal = Number(finalVal);
      if (policyEditModal.dataType === "boolean") finalVal = Boolean(finalVal);
      if (policyEditModal.dataType === "json" && typeof finalVal === "string") {
        try {
          finalVal = JSON.parse(finalVal);
        } catch {
          throw new Error("Formato JSON inválido.");
        }
      }

      const res = await fetch("/api/admin/billing/policies", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: policyEditModal.key,
          value: finalVal,
          justification: policyEditModal.justification,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setNotification({ type: "success", message: data.message });
      setPolicyEditModal(null);
      loadData();
    } catch (err: any) {
      setNotification({ type: "error", message: err.message });
    }
  };

  const formatBrl = (cents: number) => {
    return ((cents || 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  // Filtragem de políticas por categoria
  const creditPolicies = policies.filter((p) => p.category === "CREDITS");
  const subscriptionPolicies = policies.filter((p) => p.category === "SUBSCRIPTIONS");
  const generalPolicies = policies.filter((p) => p.category === "COMMERCIALIZATION" || p.category === "GENERAL");

  return (
    <div className="space-y-6">
      {/* Notificação Superior */}
      {notification && (
        <div
          className={`p-4 rounded-xl text-xs flex justify-between items-center transition ${
            notification.type === "success"
              ? "bg-emerald-950/40 border border-emerald-500/30 text-emerald-300"
              : "bg-rose-950/40 border border-rose-500/30 text-rose-300"
          }`}
        >
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="font-bold ml-4 hover:opacity-75">
            ✕
          </button>
        </div>
      )}

      {/* Header Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Central de Gestão Comercial e Planos</span>
            <span className="rounded bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-300">
              SaaS Engine
            </span>
          </h1>
          <p className="text-xs text-white/50 mt-1">
            Controle de preços em centavos sem ponto flutuante, limites de uso, políticas declarativas de créditos e versionamento contratual.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/10 hover:text-white transition flex items-center gap-1.5 self-start"
        >
          <span>🔄</span> {loading ? "Atualizando..." : "Recarregar Dados"}
        </button>
      </div>

      {/* Barra de Navegação das 8 Seções */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-white/10 pb-3 text-xs">
        {[
          { id: "overview", label: "1. Visão Geral", icon: "📊" },
          { id: "plans", label: "2. Planos & Preços", icon: "💳" },
          { id: "limits", label: "3. Limites & Recursos", icon: "⚡" },
          { id: "credit_policies", label: "4. Políticas de Créditos", icon: "🪙" },
          { id: "subscription_policies", label: "5. Políticas de Assinatura", icon: "🔄" },
          { id: "promotions", label: "6. Promoções & Ofertas", icon: "🏷️" },
          { id: "general_settings", label: "7. Configurações Gerais", icon: "⚙️" },
          { id: "history", label: "8. Auditoria & Snapshots", icon: "🛡️" },
          { id: "gateways", label: "9. Gateways de Pagamento", icon: "🌐" },
          { id: "webhooks", label: "10. Webhooks & Eventos", icon: "📡" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as SectionTab)}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 font-semibold transition flex items-center gap-1.5 ${
              activeTab === tab.id
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/10"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* SEÇÃO 1: VISÃO GERAL COMERCIAL */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {metrics ? (
            <>
              {/* Cards de Métricas Principais */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-white/10 bg-[#0d111c] p-5">
                  <div className="flex items-center justify-between text-xs text-white/50">
                    <span>MRR Estimado</span>
                    <span>📈</span>
                  </div>
                  <div className="mt-2 text-2xl font-bold font-mono text-emerald-400">
                    {metrics.mrr?.formattedBrl || "R$ 0,00"}
                  </div>
                  <p className="mt-1 text-[11px] text-white/40">Receita Recorrente Mensal contratada</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0d111c] p-5">
                  <div className="flex items-center justify-between text-xs text-white/50">
                    <span>Taxa de Conversão</span>
                    <span>🎯</span>
                  </div>
                  <div className="mt-2 text-2xl font-bold font-mono text-white">
                    {metrics.conversion?.ratePercent || 0}%
                  </div>
                  <p className="mt-1 text-[11px] text-white/40">
                    {metrics.conversion?.paidWorkspaces || 0} estúdios pagantes de {metrics.totalWorkspaces || 0}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0d111c] p-5">
                  <div className="flex items-center justify-between text-xs text-white/50">
                    <span>Taxa de Churn</span>
                    <span>📉</span>
                  </div>
                  <div className="mt-2 text-2xl font-bold font-mono text-amber-300">
                    {metrics.churn?.ratePercent || 0}%
                  </div>
                  <p className="mt-1 text-[11px] text-white/40">{metrics.churn?.canceledCount || 0} cancelamentos acumulados</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0d111c] p-5">
                  <div className="flex items-center justify-between text-xs text-white/50">
                    <span>Créditos Concedidos</span>
                    <span>🪙</span>
                  </div>
                  <div className="mt-2 text-2xl font-bold font-mono text-white">
                    {(metrics.credits?.totalGranted || 0).toLocaleString()}
                  </div>
                  <p className="mt-1 text-[11px] text-white/40">
                    Consumidos: {(metrics.credits?.totalConsumed || 0).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Distribuição por Tier */}
              <div className="rounded-2xl border border-white/10 bg-[#0d111c] p-6">
                <h3 className="text-sm font-bold text-white mb-4">Distribuição de Estúdios por Plano</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {metrics.distributionByTier?.map((item: any) => (
                    <div key={item.tier} className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 font-mono">
                        {item.tier}
                      </span>
                      <div className="text-2xl font-bold font-mono text-white mt-1">{item.count}</div>
                      <span className="text-[11px] text-white/40">estúdios</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.01] p-12 text-center text-xs text-white/40">
              Carregando métricas comerciais consolidadas...
            </div>
          )}
        </div>
      )}

      {/* SEÇÃO 2: PLANOS E PREÇOS */}
      {activeTab === "plans" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((p) => (
              <div
                key={p.tier}
                className={`rounded-2xl border p-5 flex flex-col justify-between transition ${
                  p.isActive && p.commercialStatus === "ACTIVE"
                    ? "border-white/10 bg-[#0d111c]"
                    : "border-white/5 bg-white/[0.01] opacity-60"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-xs font-bold text-amber-400">{p.tier}</span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        p.commercialStatus === "ACTIVE"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : p.commercialStatus === "DRAFT"
                          ? "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                          : "bg-rose-500/10 text-rose-300 border border-rose-500/20"
                      }`}
                    >
                      {p.commercialStatus || (p.isActive ? "ACTIVE" : "DRAFT")}
                    </span>
                  </div>

                  {p.badge && (
                    <span className="inline-block mb-2 rounded bg-emerald-400/20 border border-emerald-400/40 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                      {p.badge}
                    </span>
                  )}

                  <h3 className="text-base font-bold text-white">{p.name}</h3>
                  <p className="text-xs text-white/50 mt-1 line-clamp-2">{p.description}</p>

                  <div className="mt-4 pt-4 border-t border-white/5">
                    <div className="text-xl font-bold font-mono text-white">
                      {formatBrl(p.priceMonthly)}
                      <span className="text-xs font-normal text-white/40">/mês</span>
                    </div>
                    <div className="text-[11px] text-white/40 mt-1">
                      Anual: {formatBrl(p.priceYearly)}
                    </div>
                  </div>

                  <div className="mt-4 space-y-1.5 text-xs text-white/70">
                    <div className="flex justify-between">
                      <span className="text-white/40">Créditos / mês:</span>
                      <strong className="text-white font-mono">{p.monthlyCredits}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/40">Projetos:</span>
                      <strong className="text-white font-mono">
                        {p.unlimitedProjects || p.maxProjects === -1 ? "Ilimitados" : p.maxProjects}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/40">Membros:</span>
                      <strong className="text-white font-mono">
                        {p.unlimitedMembers || p.maxMembers === -1 ? "Ilimitados" : p.maxMembers}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/40">Assinaturas:</span>
                      <strong className="text-amber-300 font-mono">{p._count?.subscriptions || 0}</strong>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-white/5 flex flex-wrap gap-2">
                  <button
                    onClick={() =>
                      setEditingPlan({
                        ...p,
                        preserveExistingContracts: true,
                      })
                    }
                    className="flex-1 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition text-center"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleTogglePlan(p.tier, p.isActive)}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                      p.isActive
                        ? "bg-rose-500/10 text-rose-300 border border-rose-500/20 hover:bg-rose-500/20"
                        : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20"
                    }`}
                  >
                    {p.isActive ? "Desativar" : "Ativar"}
                  </button>
                  <button
                    onClick={() =>
                      setDuplicateModal({
                        sourceTier: p.tier,
                        name: `${p.name} (Cópia)`,
                        targetTier: "PRO",
                      })
                    }
                    className="rounded-lg bg-white/5 px-2 py-1.5 text-xs text-white/60 hover:text-white hover:bg-white/10 transition"
                    title="Duplicar Plano"
                  >
                    📋
                  </button>
                  <button
                    onClick={() => setArchiveModal(p)}
                    className="rounded-lg bg-white/5 px-2 py-1.5 text-xs text-rose-400 hover:bg-rose-500/10 transition"
                    title="Arquivar Plano"
                  >
                    📦
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SEÇÃO 3: LIMITES E FUNCIONALIDADES */}
      {activeTab === "limits" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-[#0d111c] overflow-hidden">
            <div className="p-4 border-b border-white/10 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-white">Matriz de Limites e Direitos por Plano</h3>
                <p className="text-xs text-white/40">Valores aplicados estritamente no servidor sem tolerâncias client-side.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.02] border-b border-white/10 text-white/50">
                  <tr>
                    <th className="p-3.5">Plano / Tier</th>
                    <th className="p-3.5">Projetos</th>
                    <th className="p-3.5">Membros</th>
                    <th className="p-3.5">Personagens</th>
                    <th className="p-3.5">Ambientes</th>
                    <th className="p-3.5">Cenas</th>
                    <th className="p-3.5">Gerações Simultâneas</th>
                    <th className="p-3.5">Rate Limit (/min)</th>
                    <th className="p-3.5">Templates Premium</th>
                    <th className="p-3.5 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-white/80">
                  {plans.map((p) => (
                    <tr key={p.tier} className="hover:bg-white/[0.01]">
                      <td className="p-3.5 font-bold font-mono text-white flex items-center gap-2">
                        <span>{p.name}</span>
                        <span className="text-[10px] text-white/40 font-normal font-mono">({p.tier})</span>
                      </td>
                      <td className="p-3.5 font-mono">
                        {p.unlimitedProjects || p.maxProjects === -1 ? (
                          <span className="text-emerald-400 font-bold">Ilimitado</span>
                        ) : (
                          p.maxProjects
                        )}
                      </td>
                      <td className="p-3.5 font-mono">
                        {p.unlimitedMembers || p.maxMembers === -1 ? (
                          <span className="text-emerald-400 font-bold">Ilimitado</span>
                        ) : (
                          p.maxMembers
                        )}
                      </td>
                      <td className="p-3.5 font-mono">
                        {p.unlimitedCharacters ? (
                          <span className="text-emerald-400 font-bold">Ilimitado</span>
                        ) : (
                          p.maxCharacters || "Padrão"
                        )}
                      </td>
                      <td className="p-3.5 font-mono">
                        {p.unlimitedEnvironments ? (
                          <span className="text-emerald-400 font-bold">Ilimitado</span>
                        ) : (
                          p.maxEnvironments || "Padrão"
                        )}
                      </td>
                      <td className="p-3.5 font-mono">
                        {p.unlimitedScenes ? (
                          <span className="text-emerald-400 font-bold">Ilimitado</span>
                        ) : (
                          p.maxScenes || "Padrão"
                        )}
                      </td>
                      <td className="p-3.5 font-mono">{p.maxConcurrentJobs || 1}x</td>
                      <td className="p-3.5 font-mono">{p.rateLimitPerMin || 30} req/min</td>
                      <td className="p-3.5 font-mono">
                        {p.hasPremiumTemplates ? "✅ Liberado" : "❌ Restrito"}
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => setEditingPlan({ ...p, preserveExistingContracts: true })}
                          className="rounded bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-white/80 hover:bg-white/10"
                        >
                          Configurar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SEÇÃO 4: POLÍTICAS DE CRÉDITOS */}
      {activeTab === "credit_policies" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-[#0d111c] p-6 space-y-4">
            <h3 className="text-sm font-bold text-white">Regras Globais de Gestão de Créditos</h3>
            <p className="text-xs text-white/50">
              Parâmetros de concessão, renovação mensal, saldo acumulado e limites de cortesia manual.
            </p>

            <div className="divide-y divide-white/5 mt-4">
              {creditPolicies.map((policy) => (
                <div key={policy.key} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-white">{policy.label}</h4>
                    <p className="text-[11px] text-white/40 mt-0.5">{policy.description}</p>
                    <span className="font-mono text-[10px] text-amber-400/80 mt-1 inline-block">
                      Chave: {policy.key}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="rounded bg-white/5 border border-white/10 px-3 py-1 font-mono text-xs text-white">
                      {typeof policy.value === "object" ? JSON.stringify(policy.value) : String(policy.value)}
                    </span>
                    <button
                      onClick={() =>
                        setPolicyEditModal({
                          key: policy.key,
                          label: policy.label,
                          value: policy.value,
                          dataType: policy.dataType,
                          justification: "",
                        })
                      }
                      className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition"
                    >
                      Alterar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SEÇÃO 5: POLÍTICAS DE ASSINATURA */}
      {activeTab === "subscription_policies" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-[#0d111c] p-6 space-y-4">
            <h3 className="text-sm font-bold text-white">Ciclo de Vida das Assinaturas e Contratos</h3>
            <p className="text-xs text-white/50">
              Regras de teste grátis, tolerância de inadimplência e preservação de preço (Grandfathering).
            </p>

            <div className="divide-y divide-white/5 mt-4">
              {subscriptionPolicies.map((policy) => (
                <div key={policy.key} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-white">{policy.label}</h4>
                    <p className="text-[11px] text-white/40 mt-0.5">{policy.description}</p>
                    <span className="font-mono text-[10px] text-amber-400/80 mt-1 inline-block">
                      Chave: {policy.key}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="rounded bg-white/5 border border-white/10 px-3 py-1 font-mono text-xs text-white">
                      {typeof policy.value === "object" ? JSON.stringify(policy.value) : String(policy.value)}
                    </span>
                    <button
                      onClick={() =>
                        setPolicyEditModal({
                          key: policy.key,
                          label: policy.label,
                          value: policy.value,
                          dataType: policy.dataType,
                          justification: "",
                        })
                      }
                      className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition"
                    >
                      Alterar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SEÇÃO 6: PROMOÇÕES E OFERTAS */}
      {activeTab === "promotions" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-[#0d111c] p-6 space-y-4">
            <h3 className="text-sm font-bold text-white">Campanhas Promocionais e Preços Especiais</h3>
            <p className="text-xs text-white/50">
              Configure preços com desconto temporário, data de início e término por plano.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {plans.map((p) => (
                <div key={p.tier} className="rounded-xl border border-white/5 bg-white/[0.02] p-4 flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold text-white">{p.name}</span>
                    <div className="text-[11px] text-white/40 mt-1">
                      Preço Normal: {formatBrl(p.priceMonthly)} / mês
                    </div>
                    {p.promoPriceMonthly ? (
                      <div className="text-xs font-mono text-emerald-400 font-bold mt-1">
                        Promoção: {formatBrl(p.promoPriceMonthly)} / mês
                      </div>
                    ) : (
                      <span className="text-[10px] text-white/30 italic">Nenhuma promoção ativa</span>
                    )}
                  </div>

                  <button
                    onClick={() => setEditingPlan({ ...p, preserveExistingContracts: true })}
                    className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 transition"
                  >
                    Ajustar Oferta
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SEÇÃO 7: CONFIGURAÇÕES GERAIS */}
      {activeTab === "general_settings" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-[#0d111c] p-6 space-y-4">
            <h3 className="text-sm font-bold text-white">Configurações Gerais de Comercialização</h3>
            <p className="text-xs text-white/50">
              Defina o plano padrão de novos estúdios, disponibilidade do plano FREE e mensagens de upgrade.
            </p>

            <div className="divide-y divide-white/5 mt-4">
              {generalPolicies.map((policy) => (
                <div key={policy.key} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-white">{policy.label}</h4>
                    <p className="text-[11px] text-white/40 mt-0.5">{policy.description}</p>
                    <span className="font-mono text-[10px] text-amber-400/80 mt-1 inline-block">
                      Chave: {policy.key}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="rounded bg-white/5 border border-white/10 px-3 py-1 font-mono text-xs text-white">
                      {typeof policy.value === "object" ? JSON.stringify(policy.value) : String(policy.value)}
                    </span>
                    <button
                      onClick={() =>
                        setPolicyEditModal({
                          key: policy.key,
                          label: policy.label,
                          value: policy.value,
                          dataType: policy.dataType,
                          justification: "",
                        })
                      }
                      className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition"
                    >
                      Alterar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SEÇÃO 8: AUDITORIA E SNAPSHOTS */}
      {activeTab === "history" && (
        <div className="space-y-6">
          {/* Snapshots Comerciais */}
          <div className="rounded-2xl border border-white/10 bg-[#0d111c] overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <h3 className="text-sm font-bold text-white">Snapshots Contratuais Ativos (Grandfathering)</h3>
              <p className="text-xs text-white/40">Condições congeladas e aceitas por estúdios cujos planos sofreram reajuste.</p>
            </div>

            {snapshots.length === 0 ? (
              <div className="p-8 text-center text-xs text-white/40">
                Nenhum contrato antigo sob grandfathering registrado até o momento.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/[0.02] border-b border-white/10 text-white/50">
                    <tr>
                      <th className="p-3.5">Data de Aceite</th>
                      <th className="p-3.5">Plano Contratado</th>
                      <th className="p-3.5">Workspace</th>
                      <th className="p-3.5">Condições Preservadas</th>
                      <th className="p-3.5">Motivo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-white/80">
                    {snapshots.map((s) => (
                      <tr key={s.id} className="hover:bg-white/[0.01]">
                        <td className="p-3.5 font-mono text-white/50">
                          {new Date(s.acceptedAt).toLocaleString("pt-BR")}
                        </td>
                        <td className="p-3.5 font-bold font-mono text-amber-400">{s.planTier}</td>
                        <td className="p-3.5 font-mono text-white">{s.workspaceId}</td>
                        <td className="p-3.5 font-mono text-[11px] text-white/70">
                          Mensal: {formatBrl(s.snapshotData?.previousPriceMonthly)} | Créditos: {s.snapshotData?.previousMonthlyCredits}
                        </td>
                        <td className="p-3.5 text-white/40">{s.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Trilha de Auditoria Recente */}
          <div className="rounded-2xl border border-white/10 bg-[#0d111c] overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <h3 className="text-sm font-bold text-white">Trilha de Auditoria Comercial Recente</h3>
              <p className="text-xs text-white/40">Registro imutável de quem alterou preços, planos e políticas comerciais.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.02] border-b border-white/10 text-white/50">
                  <tr>
                    <th className="p-3.5">Data/Hora</th>
                    <th className="p-3.5">Administrador</th>
                    <th className="p-3.5">Ação</th>
                    <th className="p-3.5">Alvo</th>
                    <th className="p-3.5">Detalhes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-white/80">
                  {auditLogs
                    .filter((l) => l.action.startsWith("PLAN_") || l.action.startsWith("COMMERCIAL_"))
                    .slice(0, 10)
                    .map((log) => (
                      <tr key={log.id} className="hover:bg-white/[0.01]">
                        <td className="p-3.5 font-mono text-white/40">
                          {new Date(log.createdAt).toLocaleString("pt-BR")}
                        </td>
                        <td className="p-3.5 font-bold text-white">
                          {log.adminUser?.displayName || log.adminUser?.email || log.adminUserId}
                        </td>
                        <td className="p-3.5 font-mono text-amber-300">{log.action}</td>
                        <td className="p-3.5 font-mono text-white/60">{log.targetId || "-"}</td>
                        <td className="p-3.5 font-mono text-[11px] text-white/50 max-w-xs truncate">
                          {JSON.stringify(log.details)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SEÇÃO 9: GESTÃO DE GATEWAYS DE PAGAMENTO */}
      {activeTab === "gateways" && (
        <GatewaysTab onNotify={(type, msg) => setNotification({ type, message: msg })} />
      )}

      {/* SEÇÃO 10: MONITORAMENTO DE WEBHOOKS */}
      {activeTab === "webhooks" && (
        <WebhooksTab onNotify={(type, msg) => setNotification({ type, message: msg })} />
      )}

      {/* MODAL 1: EDITAR / CONFIGURAR PLANO COMPLETO */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="max-w-2xl w-full rounded-2xl border border-white/10 bg-[#0d111c] p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-base font-bold text-white">Configurar Plano Comercial ({editingPlan.tier})</h3>
                <p className="text-xs text-white/50">Edição de identificação, precificação em centavos e limites de uso.</p>
              </div>
              <button onClick={() => setEditingPlan(null)} className="text-white/40 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-white/60 block mb-1">Nome Comercial</label>
                  <input
                    type="text"
                    required
                    value={editingPlan.name}
                    onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-white/60 block mb-1">Badge Promocional (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: Mais Escolhido, Promoção"
                    value={editingPlan.badge || ""}
                    onChange={(e) => setEditingPlan({ ...editingPlan, badge: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-white/60 block mb-1">Descrição Comercial</label>
                <textarea
                  rows={2}
                  required
                  value={editingPlan.description}
                  onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-white"
                />
              </div>

              {/* Preços */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                <div>
                  <label className="text-white/60 block mb-1">Preço Mensal (Centavos)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingPlan.priceMonthly}
                    onChange={(e) => setEditingPlan({ ...editingPlan, priceMonthly: parseInt(e.target.value || "0") })}
                    className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-white font-mono"
                  />
                  <span className="text-[10px] text-white/40 mt-1 block">
                    Equivalente: {formatBrl(editingPlan.priceMonthly)}
                  </span>
                </div>
                <div>
                  <label className="text-white/60 block mb-1">Preço Anual (Centavos)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingPlan.priceYearly}
                    onChange={(e) => setEditingPlan({ ...editingPlan, priceYearly: parseInt(e.target.value || "0") })}
                    className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-white font-mono"
                  />
                  <span className="text-[10px] text-white/40 mt-1 block">
                    Equivalente: {formatBrl(editingPlan.priceYearly)}
                  </span>
                </div>
                <div>
                  <label className="text-white/60 block mb-1">Créditos de IA / Mês</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingPlan.monthlyCredits}
                    onChange={(e) => setEditingPlan({ ...editingPlan, monthlyCredits: parseInt(e.target.value || "0") })}
                    className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-white font-mono"
                  />
                </div>
              </div>

              {/* Limites de Entidades */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-white/60">Projetos Máx</label>
                    <label className="text-[10px] text-amber-400 flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingPlan.unlimitedProjects || editingPlan.maxProjects === -1}
                        onChange={(e) =>
                          setEditingPlan({
                            ...editingPlan,
                            unlimitedProjects: e.target.checked,
                            maxProjects: e.target.checked ? -1 : 10,
                          })
                        }
                      />
                      Ilimitado
                    </label>
                  </div>
                  <input
                    type="number"
                    disabled={editingPlan.unlimitedProjects || editingPlan.maxProjects === -1}
                    value={editingPlan.unlimitedProjects || editingPlan.maxProjects === -1 ? "" : editingPlan.maxProjects}
                    onChange={(e) => setEditingPlan({ ...editingPlan, maxProjects: parseInt(e.target.value || "1") })}
                    placeholder="Ilimitado"
                    className="w-full rounded-xl border border-white/10 bg-white/5 p-2 text-white font-mono disabled:opacity-40"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-white/60">Membros Máx</label>
                    <label className="text-[10px] text-amber-400 flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingPlan.unlimitedMembers || editingPlan.maxMembers === -1}
                        onChange={(e) =>
                          setEditingPlan({
                            ...editingPlan,
                            unlimitedMembers: e.target.checked,
                            maxMembers: e.target.checked ? -1 : 5,
                          })
                        }
                      />
                      Ilimitado
                    </label>
                  </div>
                  <input
                    type="number"
                    disabled={editingPlan.unlimitedMembers || editingPlan.maxMembers === -1}
                    value={editingPlan.unlimitedMembers || editingPlan.maxMembers === -1 ? "" : editingPlan.maxMembers}
                    onChange={(e) => setEditingPlan({ ...editingPlan, maxMembers: parseInt(e.target.value || "1") })}
                    placeholder="Ilimitado"
                    className="w-full rounded-xl border border-white/10 bg-white/5 p-2 text-white font-mono disabled:opacity-40"
                  />
                </div>

                <div>
                  <label className="text-white/60 block mb-1">Concorrência Máx</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={editingPlan.maxConcurrentJobs || 1}
                    onChange={(e) => setEditingPlan({ ...editingPlan, maxConcurrentJobs: parseInt(e.target.value || "1") })}
                    className="w-full rounded-xl border border-white/10 bg-white/5 p-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-white/60 block mb-1">Rate Limit (/min)</label>
                  <input
                    type="number"
                    min="5"
                    max="120"
                    value={editingPlan.rateLimitPerMin || 30}
                    onChange={(e) => setEditingPlan({ ...editingPlan, rateLimitPerMin: parseInt(e.target.value || "30") })}
                    className="w-full rounded-xl border border-white/10 bg-white/5 p-2 text-white font-mono"
                  />
                </div>
              </div>

              {/* Toggles de Funcionalidades */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <label className="flex items-center gap-2 p-3 rounded-xl border border-white/5 bg-white/[0.02] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingPlan.hasPremiumTemplates ?? true}
                    onChange={(e) => setEditingPlan({ ...editingPlan, hasPremiumTemplates: e.target.checked })}
                  />
                  <span>Templates Premium Liberados</span>
                </label>
                <label className="flex items-center gap-2 p-3 rounded-xl border border-white/5 bg-white/[0.02] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingPlan.isPublic ?? true}
                    onChange={(e) => setEditingPlan({ ...editingPlan, isPublic: e.target.checked })}
                  />
                  <span>Visível na Página Pública de Preços</span>
                </label>
              </div>

              {/* Checkbox de Grandfathering */}
              <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3.5 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="grandfatheringCheckbox"
                  checked={editingPlan.preserveExistingContracts ?? true}
                  onChange={(e) => setEditingPlan({ ...editingPlan, preserveExistingContracts: e.target.checked })}
                  className="mt-0.5"
                />
                <label htmlFor="grandfatheringCheckbox" className="cursor-pointer text-[11px] text-amber-200/90 leading-relaxed">
                  <strong>Preservar condições para assinantes atuais (Grandfathering):</strong> se os preços ou limites forem alterados, clientes ativos manterão os valores contratuais vigentes em seus snapshots sem reajuste surpresa.
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/20"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPlan}
                  className="rounded-xl bg-amber-400 px-5 py-2 text-xs font-bold text-black hover:bg-amber-300 transition"
                >
                  {savingPlan ? "Salvando Alterações..." : "Salvar Plano & Políticas"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: DUPLICAR PLANO */}
      {duplicateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="max-w-md w-full rounded-2xl border border-white/10 bg-[#0d111c] p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Duplicar Plano ({duplicateModal.sourceTier})</h3>
            <p className="text-xs text-white/50">Crie um novo plano rascunho com base nas configurações existentes.</p>

            <form onSubmit={handleDuplicatePlan} className="space-y-4 text-xs">
              <div>
                <label className="text-white/60 block mb-1">Nome da Nova Versão</label>
                <input
                  type="text"
                  required
                  value={duplicateModal.name}
                  onChange={(e) => setDuplicateModal({ ...duplicateModal, name: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setDuplicateModal(null)}
                  className="rounded-xl bg-white/10 px-4 py-2 font-semibold text-white/70 hover:bg-white/20"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-400 px-5 py-2 font-bold text-black hover:bg-amber-300"
                >
                  Confirmar Duplicação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ARQUIVAR PLANO */}
      {archiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="max-w-md w-full rounded-2xl border border-rose-500/30 bg-[#0d111c] p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>⚠️</span>
              <span>Arquivar Plano {archiveModal.name}?</span>
            </h3>
            <p className="text-xs text-white/60 leading-relaxed">
              O plano deixará de ser exibido na página de preços pública e novos estúdios não poderão contratá-lo. As assinaturas já ativas neste plano continuarão operando normalmente.
            </p>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setArchiveModal(null)}
                className="rounded-xl bg-white/10 px-4 py-2 font-semibold text-white/70 hover:bg-white/20"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleArchivePlan}
                className="rounded-xl bg-rose-500 px-5 py-2 font-bold text-white hover:bg-rose-600"
              >
                Sim, Arquivar Plano
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: EDITAR POLÍTICA GLOBAL */}
      {policyEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="max-w-md w-full rounded-2xl border border-white/10 bg-[#0d111c] p-6 space-y-4">
            <h3 className="text-base font-bold text-white">{policyEditModal.label}</h3>
            <p className="text-xs font-mono text-amber-400/80">Chave: {policyEditModal.key}</p>

            <form onSubmit={handleSavePolicy} className="space-y-4 text-xs">
              <div>
                <label className="text-white/60 block mb-1">Novo Valor</label>
                {policyEditModal.dataType === "boolean" ? (
                  <select
                    value={policyEditModal.value ? "true" : "false"}
                    onChange={(e) => setPolicyEditModal({ ...policyEditModal, value: e.target.value === "true" })}
                    className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-white"
                  >
                    <option value="true" className="bg-[#0b0e17]">Verdadeiro (Ativado)</option>
                    <option value="false" className="bg-[#0b0e17]">Falso (Desativado)</option>
                  </select>
                ) : (
                  <input
                    type={policyEditModal.dataType === "number" ? "number" : "text"}
                    required
                    value={typeof policyEditModal.value === "object" ? JSON.stringify(policyEditModal.value) : policyEditModal.value}
                    onChange={(e) => setPolicyEditModal({ ...policyEditModal, value: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-white font-mono"
                  />
                )}
              </div>

              <div>
                <label className="text-white/60 block mb-1">Justificativa para Auditoria</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Ajuste de alinhamento com a diretoria comercial"
                  value={policyEditModal.justification}
                  onChange={(e) => setPolicyEditModal({ ...policyEditModal, justification: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setPolicyEditModal(null)}
                  className="rounded-xl bg-white/10 px-4 py-2 font-semibold text-white/70 hover:bg-white/20"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-400 px-5 py-2 font-bold text-black hover:bg-amber-300"
                >
                  Salvar Política
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
