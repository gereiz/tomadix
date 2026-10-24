"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function AdminOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [commercial, setCommercial] = useState<any>(null);
  const [usage, setUsage] = useState<any>(null);
  const [usersSummary, setUsersSummary] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/billing/metrics").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/admin/usage?periodDays=30").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/admin/users?limit=5").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([commData, usageData, usersData]) => {
        setCommercial(commData);
        setUsage(usageData);
        setUsersSummary(usersData);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-24 rounded-2xl bg-white/5 border border-white/10" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-white/5 border border-white/10" />
          ))}
        </div>
      </div>
    );
  }

  const mrr = commercial?.mrr?.formattedBrl || "R$ 0,00";
  const conversionRate = commercial?.conversion?.ratePercent || 0;
  const churnRate = commercial?.churn?.ratePercent || 0;
  const totalWorkspaces = commercial?.totalWorkspaces || 0;
  const totalUsers = usersSummary?.pagination?.total || 0;

  const totalJobs = usage?.totals?.totalJobs || 0;
  const successRate = usage?.totals?.successRatePercent || 100;
  const totalTokens = (usage?.totals?.totalTokens || 0).toLocaleString("pt-BR");
  const estimatedApiCost = usage?.costs?.formattedBrl || "R$ 0,00";
  const stuckJobsCount = usage?.totals?.stuckJobsCount || 0;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-slate-900 to-indigo-950/30 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-semibold tracking-wider text-amber-400 uppercase">
              Operações Globais do SaaS
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Painel Executivo da Plataforma Tomadix
          </h1>
          <p className="text-sm text-white/60 mt-1">
            Métricas em tempo real sobre usuários, infraestrutura de IA da Google e faturamento.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/users"
            className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-black transition hover:bg-amber-300"
          >
            Gerenciar Usuários
          </Link>
          <Link
            href="/admin/usage"
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
          >
            Ver Consumo de IA
          </Link>
        </div>
      </div>

      {/* Operational Warnings if any */}
      {stuckJobsCount > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="text-xs font-bold text-amber-300">
                {stuckJobsCount} job(s) de geração travado(s) há mais de 15 minutos
              </p>
              <p className="text-[11px] text-white/60">
                Algumas chamadas à Gemini API excederam o tempo limite. É possível destravá-las no módulo de consumo.
              </p>
            </div>
          </div>
          <Link
            href="/admin/usage"
            className="rounded-lg bg-amber-400/20 border border-amber-400/30 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-400/30"
          >
            Destravar Jobs
          </Link>
        </div>
      )}

      {/* 4 Core KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-white/10 bg-[#0d111c] p-5">
          <span className="text-xs text-white/50 font-medium">Receita Recorrente (MRR)</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-400 font-mono">{mrr}</span>
            <span className="text-[11px] text-emerald-500/80 bg-emerald-500/10 px-2 py-0.5 rounded">
              Ativo
            </span>
          </div>
          <p className="text-[11px] text-white/40 mt-2">
            Baseado em {commercial?.conversion?.paidWorkspaces || 0} assinaturas pagas
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#0d111c] p-5">
          <span className="text-xs text-white/50 font-medium">Usuários & Workspaces</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-white font-mono">{totalUsers}</span>
            <span className="text-[11px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
              {totalWorkspaces} estúdios
            </span>
          </div>
          <p className="text-[11px] text-white/40 mt-2">
            Taxa de conversão: <strong className="text-white">{conversionRate}%</strong>
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#0d111c] p-5">
          <span className="text-xs text-white/50 font-medium">Gerações Gemini (30d)</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-white font-mono">{totalJobs}</span>
            <span className="text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
              {successRate}% sucesso
            </span>
          </div>
          <p className="text-[11px] text-white/40 mt-2">{totalTokens} tokens processados</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#0d111c] p-5">
          <span className="text-xs text-white/50 font-medium">Custo Estimado API (30d)</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-amber-300 font-mono">{estimatedApiCost}</span>
            <span className="text-[11px] text-white/40 font-mono">
              ${usage?.costs?.totalCostUsd || "0.00"} USD
            </span>
          </div>
          <p className="text-[11px] text-white/40 mt-2">Calculado por tokens reais Gemini</p>
        </div>
      </div>

      {/* Grid: Commercial Breakdown & Recent Users */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Commercial Distribution */}
        <div className="rounded-2xl border border-white/10 bg-[#0d111c] p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="text-sm font-bold text-white">Distribuição por Planos</h2>
            <Link href="/admin/billing" className="text-xs text-amber-400 hover:underline">
              Ver Planos
            </Link>
          </div>

          <div className="space-y-3">
            {commercial?.distributionByTier?.map((item: any) => (
              <div key={item.tier} className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white/80">{item.tier}</span>
                <span className="font-mono bg-white/5 px-2 py-1 rounded text-white/60">
                  {item.count} estúdio(s)
                </span>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-white/10 space-y-2">
            <div className="flex justify-between text-xs text-white/60">
              <span>Churn de Assinaturas:</span>
              <strong className="text-white">{churnRate}%</strong>
            </div>
            <div className="flex justify-between text-xs text-white/60">
              <span>Total de Créditos Concedidos:</span>
              <strong className="text-white">{commercial?.credits?.totalGranted || 0}</strong>
            </div>
            <div className="flex justify-between text-xs text-white/60">
              <span>Total de Créditos Consumidos:</span>
              <strong className="text-amber-300">{commercial?.credits?.totalConsumed || 0}</strong>
            </div>
          </div>
        </div>

        {/* Recent Registered Users */}
        <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-[#0d111c] p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="text-sm font-bold text-white">Usuários Recentes</h2>
            <Link href="/admin/users" className="text-xs text-amber-400 hover:underline">
              Ver Todos ({totalUsers})
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-white/40">
                  <th className="pb-2 font-medium">Usuário</th>
                  <th className="pb-2 font-medium">Papel</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Data Cadastro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {usersSummary?.users?.map((u: any) => (
                  <tr key={u.id} className="hover:bg-white/[0.02]">
                    <td className="py-2.5">
                      <div className="font-semibold text-white">{u.displayName || "Sem nome"}</div>
                      <div className="text-[11px] text-white/40 font-mono">{u.email}</div>
                    </td>
                    <td className="py-2.5">
                      <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] font-mono text-white/70">
                        {u.platformRole}
                      </span>
                    </td>
                    <td className="py-2.5">
                      {u.isSuspended ? (
                        <span className="rounded bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 text-[10px] text-rose-400 font-semibold">
                          Suspenso
                        </span>
                      ) : (
                        <span className="rounded bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] text-emerald-400 font-semibold">
                          Ativo
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 text-white/40 font-mono text-[11px]">
                      {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
