"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function AdminOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"today" | "7d" | "30d" | "90d">("30d");
  const [data, setData] = useState<any>(null);

  const loadSummary = (selectedPeriod: string) => {
    setLoading(true);
    fetch(`/api/admin/dashboard/summary?period=${selectedPeriod}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((resData) => {
        if (resData) setData(resData);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSummary(period);
  }, [period]);

  const commercial = data?.commercial;
  const usage = data?.usage;
  const stats = data?.stats;

  const mrr = commercial?.mrr?.formattedBrl || "R$ 0,00";
  const conversionRate = commercial?.conversion?.ratePercent || 0;
  const totalWorkspaces = stats?.totalWorkspaces || 0;
  const totalUsers = stats?.totalUsers || 0;
  const activeUsers = stats?.activeUsers || 0;
  const totalProjects = stats?.totalProjects || 0;

  const totalJobs = usage?.totals?.totalJobs || 0;
  const successRate = usage?.totals?.successRatePercent || 100;
  const totalTokens = (usage?.totals?.totalTokens || 0).toLocaleString("pt-BR");
  const estimatedApiCost = usage?.costs?.formattedBrl || "R$ 0,00";
  const stuckJobsCount = usage?.totals?.stuckJobsCount || 0;

  return (
    <div className="space-y-8">
      {/* Top Welcome / Header with Quick Actions & Period Filter */}
      <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-slate-900 to-indigo-950/20 p-6 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-mono font-semibold tracking-wider text-amber-400 uppercase">
              Operações Globais do SaaS
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Painel Executivo da Plataforma Tomadix
          </h1>
          <p className="text-sm text-white/60 mt-1 max-w-2xl">
            Visão consolidada em tempo real sobre estúdios, infraestrutura de IA da Google, métricas comerciais e auditoria operacional.
          </p>
        </div>

        {/* Period Selector & Quick Links */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Period selector */}
          <div className="flex rounded-xl bg-black/40 border border-white/10 p-1 text-xs">
            {(
              [
                { id: "today", label: "Hoje" },
                { id: "7d", label: "7 dias" },
                { id: "30d", label: "30 dias" },
                { id: "90d", label: "90 dias" },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriod(p.id)}
                className={`rounded-lg px-3 py-1 font-medium transition ${
                  period === p.id
                    ? "bg-amber-400 text-black font-bold shadow-sm"
                    : "text-white/60 hover:text-white"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <Link
            href="/admin/users"
            className="rounded-xl bg-amber-400 px-3.5 py-1.5 text-xs font-bold text-black transition hover:bg-amber-300 shadow-sm shadow-amber-500/10"
          >
            Usuários
          </Link>
          <Link
            href="/admin/customization"
            className="rounded-xl border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
          >
            Personalização
          </Link>
          <Link
            href="/admin/settings"
            className="rounded-xl border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
          >
            Configurações
          </Link>
        </div>
      </div>

      {/* Operational Warning if stuck jobs */}
      {stuckJobsCount > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="text-xs font-bold text-amber-300">
                {stuckJobsCount} job(s) de geração pendente(s) há mais de 15 minutos
              </p>
              <p className="text-[11px] text-white/60">
                Algumas chamadas à API Gemini excederam o tempo limite. É possível destravá-las no módulo de consumo.
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

      {/* Loading Skeletons */}
      {loading && !data ? (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 rounded-xl bg-white/5 border border-white/10" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="h-64 rounded-xl bg-white/5 border border-white/10" />
            <div className="lg:col-span-2 h-64 rounded-xl bg-white/5 border border-white/10" />
          </div>
        </div>
      ) : (
        <>
          {/* 4 Core KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-white/10 bg-[#0d111c] p-5 transition hover:border-emerald-500/30">
              <span className="text-xs text-white/50 font-medium">Receita Recorrente (MRR)</span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-emerald-400 font-mono">{mrr}</span>
                <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                  Ativo
                </span>
              </div>
              <p className="text-[11px] text-white/40 mt-2">
                Baseado em {commercial?.conversion?.paidWorkspaces || 0} assinatura(s) paga(s)
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#0d111c] p-5 transition hover:border-indigo-500/30">
              <span className="text-xs text-white/50 font-medium">Usuários & Estúdios</span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-white font-mono">{totalUsers}</span>
                <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
                  {totalWorkspaces} estúdios
                </span>
              </div>
              <p className="text-[11px] text-white/40 mt-2 flex items-center justify-between">
                <span>{activeUsers} ativos</span>
                <span>{totalProjects} projetos</span>
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#0d111c] p-5 transition hover:border-amber-500/30">
              <span className="text-xs text-white/50 font-medium">Gerações Gemini ({data?.periodDays}d)</span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-white font-mono">{totalJobs}</span>
                <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                  {successRate}% sucesso
                </span>
              </div>
              <p className="text-[11px] text-white/40 mt-2">{totalTokens} tokens processados</p>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#0d111c] p-5 transition hover:border-amber-500/30">
              <span className="text-xs text-white/50 font-medium">Custo Estimado API ({data?.periodDays}d)</span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-amber-300 font-mono">{estimatedApiCost}</span>
                <span className="text-[10px] text-white/40 font-mono">
                  ${usage?.costs?.totalCostUsd || "0.00"} USD
                </span>
              </div>
              <p className="text-[11px] text-white/40 mt-2">Calculado por tokens reais consumidos</p>
            </div>
          </div>

          {/* Grid: Plan Distribution & Recent Users */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Commercial Distribution */}
            <div className="rounded-2xl border border-white/10 bg-[#0d111c] p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-white">Distribuição por Planos</h2>
                  <p className="text-[11px] text-white/40">Assinaturas e estúdios cadastrados</p>
                </div>
                <Link href="/admin/billing" className="text-xs text-amber-400 hover:underline font-medium">
                  Planos ➔
                </Link>
              </div>

              <div className="space-y-3">
                {commercial?.distributionByTier?.map((item: any) => (
                  <div key={item.tier} className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white/80">{item.tier}</span>
                    <span className="font-mono bg-white/5 border border-white/10 px-2.5 py-1 rounded-md text-white/70">
                      {item.count} estúdio(s)
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-white/10 space-y-2">
                <div className="flex justify-between text-xs text-white/60">
                  <span>Taxa de Conversão:</span>
                  <strong className="text-emerald-400">{conversionRate}%</strong>
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
                <div>
                  <h2 className="text-sm font-bold text-white">Usuários Recentes</h2>
                  <p className="text-[11px] text-white/40">Últimos registros na plataforma</p>
                </div>
                <Link href="/admin/users" className="text-xs text-amber-400 hover:underline font-medium">
                  Ver Todos ({totalUsers}) ➔
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-white/40">
                      <th className="pb-2.5 font-medium">Usuário</th>
                      <th className="pb-2.5 font-medium">Papel</th>
                      <th className="pb-2.5 font-medium">Status</th>
                      <th className="pb-2.5 font-medium">Data Cadastro</th>
                      <th className="pb-2.5 font-medium text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data?.recentUsers?.map((u: any) => (
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
                        <td className="py-2.5 text-right">
                          <Link
                            href={`/admin/users?search=${encodeURIComponent(u.email)}`}
                            className="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[11px] text-white/70 hover:bg-white/10 hover:text-white"
                          >
                            Gerenciar
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Recent Administrative Audit Activities */}
          <div className="rounded-2xl border border-white/10 bg-[#0d111c] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h2 className="text-sm font-bold text-white">Atividades Administrativas Recentes</h2>
                <p className="text-[11px] text-white/40">
                  Trilha de auditoria das últimas ações executadas por operadores
                </p>
              </div>
              <Link href="/admin/audit" className="text-xs text-amber-400 hover:underline font-medium">
                Ver Trilha Completa ➔
              </Link>
            </div>

            {data?.recentAuditLogs?.length === 0 ? (
              <div className="py-8 text-center text-xs text-white/40">
                Nenhuma ação administrativa recente registrada no período.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-white/40">
                      <th className="pb-2 font-medium">Ação</th>
                      <th className="pb-2 font-medium">Responsável</th>
                      <th className="pb-2 font-medium">Alvo</th>
                      <th className="pb-2 font-medium">Resultado</th>
                      <th className="pb-2 font-medium text-right">Data/Hora</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data?.recentAuditLogs?.map((log: any) => (
                      <tr key={log.id} className="hover:bg-white/[0.02]">
                        <td className="py-2.5 font-mono text-[11px] text-amber-300 font-semibold">
                          {log.action}
                        </td>
                        <td className="py-2.5 text-white/70">
                          {log.adminUser?.displayName || log.adminUser?.email || "Sistema"}
                        </td>
                        <td className="py-2.5 text-white/50 font-mono text-[11px]">
                          {log.targetType} {log.targetId ? `(${log.targetId.substring(0, 10)}...)` : ""}
                        </td>
                        <td className="py-2.5">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                              log.result === "SUCCESS"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            }`}
                          >
                            {log.result}
                          </span>
                        </td>
                        <td className="py-2.5 text-right text-white/40 font-mono text-[11px]">
                          {new Date(log.createdAt).toLocaleString("pt-BR")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
