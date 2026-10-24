"use client";

import { useEffect, useState } from "react";

export default function AdminUsagePage() {
  const [period, setPeriod] = useState<number>(30);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [resolvingStuck, setResolvingStuck] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/usage?periodDays=${period}`);
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [period]);

  const handleResolveStuck = async (jobIds: string[]) => {
    setResolvingStuck(true);
    try {
      const res = await fetch("/api/admin/usage/resolve-stuck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setNotification({ type: "success", message: data.message });
      fetchMetrics();
    } catch (err: any) {
      setNotification({ type: "error", message: err.message });
    } finally {
      setResolvingStuck(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-20 rounded-2xl bg-white/5 border border-white/10" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-white/5 border border-white/10" />
          ))}
        </div>
      </div>
    );
  }

  const totals = metrics?.totals || {};
  const costs = metrics?.costs || {};
  const models = metrics?.models || [];
  const stuckJobs = metrics?.stuckJobs || [];
  const recentFailures = metrics?.recentFailures || [];
  const topWorkspaces = metrics?.topWorkspaces || [];

  return (
    <div className="space-y-8">
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

      {/* Header and Period Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Consumo, Custos e Performance da Gemini API</h1>
          <p className="text-xs text-white/50">
            Métricas de latência, consumo de tokens, estimativas reais de custo e saúde do motor de IA.
          </p>
        </div>

        <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 p-1 text-xs">
          {[
            { days: 7, label: "7 dias" },
            { days: 30, label: "30 dias" },
            { days: 90, label: "90 dias" },
          ].map((item) => (
            <button
              key={item.days}
              onClick={() => setPeriod(item.days)}
              className={`rounded-lg px-3 py-1 font-medium transition ${
                period === item.days
                  ? "bg-amber-400 text-black font-semibold"
                  : "text-white/60 hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="rounded-xl border border-white/10 bg-[#0d111c] p-4">
          <span className="text-[11px] text-white/50 font-medium">Gerações Totais</span>
          <div className="mt-2 text-2xl font-bold font-mono text-white">{totals.totalJobs || 0}</div>
          <span className="text-[11px] text-white/40 mt-1 block">No período selecionado</span>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#0d111c] p-4">
          <span className="text-[11px] text-white/50 font-medium">Taxa de Sucesso</span>
          <div className="mt-2 text-2xl font-bold font-mono text-emerald-400">
            {totals.successRatePercent || 100}%
          </div>
          <span className="text-[11px] text-white/40 mt-1 block">
            {totals.failedJobs || 0} falha(s) registrada(s)
          </span>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#0d111c] p-4">
          <span className="text-[11px] text-white/50 font-medium">Tokens Processados</span>
          <div className="mt-2 text-2xl font-bold font-mono text-indigo-300">
            {(totals.totalTokens || 0).toLocaleString("pt-BR")}
          </div>
          <span className="text-[11px] text-white/40 mt-1 block">
            {(totals.inputTokens || 0).toLocaleString("pt-BR")} in / {(totals.outputTokens || 0).toLocaleString("pt-BR")} out
          </span>
        </div>

        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-amber-300/80 font-medium">Custo Estimado API</span>
            <span className="rounded bg-amber-400/20 text-[9px] font-bold text-amber-300 px-1.5 py-0.5">
              ESTIMATIVA
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-amber-300">
            {costs.formattedBrl || "R$ 0,00"}
          </div>
          <span className="text-[11px] text-white/40 mt-1 block font-mono">
            ${costs.totalCostUsd || 0} USD (1 USD ≈ R$ {costs.exchangeRateUsdBrl || "5.60"})
          </span>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#0d111c] p-4">
          <span className="text-[11px] text-white/50 font-medium">Créditos de Estúdio</span>
          <div className="mt-2 text-2xl font-bold font-mono text-white">
            {totals.creditsConsumed || 0}
          </div>
          <span className="text-[11px] text-white/40 mt-1 block">Consumidos no período</span>
        </div>
      </div>

      {/* Model Breakdown */}
      <div className="rounded-2xl border border-white/10 bg-[#0d111c] p-6 space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <span>Consumo Detalhado por Modelo Google Gemini</span>
          <span className="text-[10px] text-white/40 font-normal">
            (Diferenciação transparente de tokens e estimativas de custo)
          </span>
        </h2>

        {models.length === 0 ? (
          <p className="text-xs text-white/40 italic">Nenhum job registrado no período.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-white/50">
                  <th className="p-3 font-medium">Modelo</th>
                  <th className="p-3 font-medium">Jobs Executados</th>
                  <th className="p-3 font-medium">Input Tokens</th>
                  <th className="p-3 font-medium">Output Tokens</th>
                  <th className="p-3 font-medium">Custo Estimado (USD)</th>
                  <th className="p-3 font-medium">Custo Estimado (BRL)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {models.map((m: any) => (
                  <tr key={m.modelName} className="hover:bg-white/[0.02]">
                    <td className="p-3 text-white font-semibold font-sans">{m.modelName}</td>
                    <td className="p-3 text-white/80">{m.jobsCount}</td>
                    <td className="p-3 text-white/60">{m.inputTokens.toLocaleString("pt-BR")}</td>
                    <td className="p-3 text-white/60">{m.outputTokens.toLocaleString("pt-BR")}</td>
                    <td className="p-3 text-white/80">${m.estimatedCostUsd}</td>
                    <td className="p-3 text-amber-300 font-bold">
                      {m.estimatedCostBrl.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stuck Jobs Section */}
      {stuckJobs.length > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-950/10 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                <span>⚠️ Jobs de Geração Travados ({stuckJobs.length})</span>
              </h2>
              <p className="text-xs text-white/60">
                Jobs que iniciaram há mais de 15 minutos sem resposta de conclusão da API.
              </p>
            </div>

            <button
              disabled={resolvingStuck}
              onClick={() => handleResolveStuck(stuckJobs.map((j: any) => j.id))}
              className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-black hover:bg-amber-300 disabled:opacity-40 transition"
            >
              {resolvingStuck ? "Destravando..." : "Destravar Todos os Jobs"}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-white/40">
                  <th className="pb-2 font-medium">Job ID</th>
                  <th className="pb-2 font-medium">Estúdio / Projeto</th>
                  <th className="pb-2 font-medium">Modelo</th>
                  <th className="pb-2 font-medium">Iniciado Em</th>
                  <th className="pb-2 font-medium text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                {stuckJobs.map((j: any) => (
                  <tr key={j.id}>
                    <td className="py-2.5 text-white/60">{j.id}</td>
                    <td className="py-2.5 text-white font-sans">
                      {j.project?.workspace?.name} / {j.project?.title}
                    </td>
                    <td className="py-2.5 text-amber-300">{j.modelName}</td>
                    <td className="py-2.5 text-white/40">
                      {new Date(j.createdAt).toLocaleTimeString("pt-BR")}
                    </td>
                    <td className="py-2.5 text-right font-sans">
                      <button
                        onClick={() => handleResolveStuck([j.id])}
                        className="rounded bg-white/10 px-2 py-0.5 text-[10px] text-white hover:bg-white/20"
                      >
                        Destravar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Failures & Top Workspaces */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Failures */}
        <div className="rounded-2xl border border-white/10 bg-[#0d111c] p-6 space-y-4">
          <h2 className="text-sm font-bold text-white">Falhas Recentes da Gemini API</h2>
          {recentFailures.length === 0 ? (
            <p className="text-xs text-white/40 italic">Nenhuma falha recente registrada.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto text-xs">
              {recentFailures.map((f: any) => (
                <div key={f.id} className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 space-y-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-mono text-rose-300 font-semibold">{f.modelName}</span>
                    <span className="text-white/40">{new Date(f.createdAt).toLocaleString("pt-BR")}</span>
                  </div>
                  <p className="text-white/80 font-mono text-[11px] line-clamp-2">
                    {f.errorMessage || "Erro desconhecido retornado pela API."}
                  </p>
                  <span className="text-[10px] text-white/40 block">
                    Projeto: {f.project?.workspace?.name} - {f.project?.title}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Workspaces by Usage */}
        <div className="rounded-2xl border border-white/10 bg-[#0d111c] p-6 space-y-4">
          <h2 className="text-sm font-bold text-white">Distribuição de Uso (Top Estúdios)</h2>
          {topWorkspaces.length === 0 ? (
            <p className="text-xs text-white/40 italic">Nenhum dado de uso registrado no período.</p>
          ) : (
            <div className="space-y-3">
              {topWorkspaces.map((ws: any) => (
                <div key={ws.workspaceId} className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white/80 truncate max-w-[240px]">{ws.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono bg-white/5 px-2.5 py-1 rounded text-amber-300 font-bold">
                      {ws.jobsCount} gerações
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
