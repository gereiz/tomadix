"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { OnboardingModal, OnboardingState } from "@/components/onboarding/onboarding-modal";
import { ToastNotification } from "@/components/ui/toast";
import { PlanLimitModal } from "@/components/ui/plan-limit-modal";

interface DashboardData {
  user: {
    id: string;
    displayName: string;
    email: string;
    emailConfirmed: boolean;
    onboardingCompleted: boolean;
    onboardingStep: number;
  };
  workspace: {
    id: string;
    name: string;
    slug: string;
    isPersonal: boolean;
    creditsBalance: number;
  };
  usageSummary: {
    planTier: string;
    planName: string;
    projectsCount: number;
    maxProjects: number;
    membersCount: number;
    maxMembers: number;
    creditsBalance: number;
    monthlyCredits: number;
    canCreateProject: boolean;
    canAddMember: boolean;
  };
  stats: {
    totalProjects: number;
    totalScenes: number;
    totalCharacters: number;
    totalEnvironments: number;
    totalPromptsCount: number;
  };
  recentProjects: Array<{
    id: string;
    title: string;
    description: string;
    genre: string | null;
    updatedAt: string;
    _count: {
      characters: number;
      scenes: number;
      environments: number;
    };
  }>;
  recentGenerations: Array<{
    id: string;
    projectId: string;
    templateKey: string;
    targetTool: string;
    modelName: string;
    outputText: string | null;
    outputJson: any;
    createdAt: string;
    scene?: {
      title: string;
      order: number;
    } | null;
  }>;
  recentCreditTransactions: Array<{
    id: string;
    amount: number;
    balanceAfter: number;
    type: string;
    description: string | null;
    createdAt: string;
  }>;
  pendingInvites: Array<{
    id: string;
    token: string;
    role: string;
    expiresAt: string;
    workspace: {
      id: string;
      name: string;
      slug: string;
    };
    invitedBy: {
      displayName: string | null;
      email: string;
    };
  }>;
  alerts: Array<{
    id: string;
    type: "warning" | "info" | "action" | "danger";
    title: string;
    message: string;
    ctaText?: string;
    ctaHref?: string;
  }>;
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [onboardingState, setOnboardingState] = useState<OnboardingState | null>(null);

  // Notificações
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: "success" | "error" | "warning" | "info";
  } | null>(null);

  // Modal de limite
  const [limitModalOpen, setLimitModalOpen] = useState(false);

  const showToast = useCallback(
    (text: string, type: "success" | "error" | "warning" | "info" = "success") => {
      setToastMessage({ text, type });
      setTimeout(() => setToastMessage(null), 5000);
    },
    []
  );

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/dashboard");
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        throw new Error("Erro ao carregar os dados reais do estúdio.");
      }
      const json = await res.json();
      setData(json.data);

      // Carregar estado de onboarding
      const onbRes = await fetch("/api/onboarding");
      if (onbRes.ok) {
        const onbJson = await onbRes.json();
        setOnboardingState(onbJson.data);
        if (onbJson.data && !onbJson.data.onboardingCompleted) {
          setIsOnboardingOpen(true);
        }
      }
    } catch (err: any) {
      setError(err.message || "Erro desconhecido ao carregar o dashboard.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleRestartTutorial = async () => {
    try {
      const res = await fetch("/api/onboarding/reset", { method: "POST" });
      if (res.ok) {
        const json = await res.json();
        setOnboardingState(json.data);
        setIsOnboardingOpen(true);
        showToast("Tutorial reiniciado do passo 1!", "info");
      } else {
        setIsOnboardingOpen(true);
      }
    } catch {
      setIsOnboardingOpen(true);
    }
  };

  // Ações de convites pendentes
  const handleAcceptInvite = async (token: string) => {
    try {
      const res = await fetch(`/api/invites/${token}/accept`, { method: "POST" });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || "Falha ao aceitar convite.");
      showToast("Convite aceito! Você agora faz parte do estúdio.", "success");
      fetchDashboardData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleDeclineInvite = async (token: string) => {
    try {
      const res = await fetch(`/api/invites/${token}/decline`, { method: "POST" });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || "Falha ao recusar convite.");
      showToast("Convite recusado.", "info");
      fetchDashboardData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0d12] text-white">
        <main className="mx-auto max-w-7xl px-6 py-12">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-64 rounded-xl bg-white/10" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-32 rounded-2xl bg-white/5 border border-white/5" />
              ))}
            </div>
            <div className="h-64 rounded-3xl bg-white/5 border border-white/5" />
          </div>
        </main>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#0b0d12] text-white">
        <main className="mx-auto max-w-7xl px-6 py-12">
          <div className="rounded-3xl border border-red-500/20 bg-red-950/20 p-8 text-center">
            <h2 className="text-xl font-bold text-red-400">Falha ao Carregar Dashboard</h2>
            <p className="mt-2 text-sm text-white/60">{error}</p>
            <button
              onClick={fetchDashboardData}
              className="mt-5 rounded-xl border border-white/15 px-5 py-2.5 text-xs font-semibold text-white hover:bg-white/10"
            >
              Tentar Novamente
            </button>
          </div>
        </main>
      </div>
    );
  }

  const { user, workspace, usageSummary, stats, recentProjects, recentGenerations, pendingInvites, alerts } = data;

  return (
    <div className="min-h-screen bg-[#0b0d12] text-white">
      <main className="mx-auto max-w-7xl px-6 py-8 sm:py-10">
        {/* Cabeçalho do Dashboard */}
        <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-6 md:flex-row md:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                Painel do Criador
              </span>
              <span className="text-white/30">•</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] font-semibold text-white/70">
                {workspace.name}
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  usageSummary.planTier === "FREE"
                    ? "border border-white/10 bg-white/5 text-white/60"
                    : "border border-amber-400/30 bg-amber-400/10 text-amber-300"
                }`}
              >
                {usageSummary.planName}
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
              Olá, {user.displayName}!
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-white/50">
              Visão geral da sua produção cinematográfica, consumo de créditos e projetos em andamento.
            </p>
          </div>

          {/* Atalhos Rápidos do Cabeçalho */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleRestartTutorial}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 transition shadow-sm"
              title="Reiniciar o tutorial de introdução a partir da etapa 1"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reiniciar Tutorial
            </button>
            <button
              onClick={() => setIsOnboardingOpen(true)}
              className="rounded-xl border border-white/15 px-3.5 py-2 text-xs font-medium text-white/80 hover:bg-white/10 hover:text-white transition"
            >
              ✨ Guia de Início
            </button>
            <button
              onClick={() => {
                if (!usageSummary.canCreateProject) {
                  setLimitModalOpen(true);
                } else {
                  router.push("/projects");
                }
              }}
              className="flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2 text-xs font-bold text-black transition hover:bg-emerald-300 shadow-md shadow-emerald-400/20"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Novo Projeto
            </button>
          </div>
        </div>

        {/* Avisos Contextuais do Sistema */}
        {alerts.length > 0 && (
          <div className="mt-6 space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border p-4 backdrop-blur-md transition ${
                  alert.type === "danger"
                    ? "border-red-500/40 bg-red-950/30 text-red-200"
                    : alert.type === "warning"
                    ? "border-amber-500/40 bg-amber-950/30 text-amber-200"
                    : "border-blue-500/40 bg-blue-950/30 text-blue-200"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm">{alert.title}</h4>
                    <p className="mt-0.5 text-xs opacity-90 leading-relaxed">{alert.message}</p>
                  </div>
                </div>
                {alert.ctaText && alert.ctaHref && (
                  <Link
                    href={alert.ctaHref}
                    className={`shrink-0 rounded-xl px-4 py-1.5 text-xs font-bold transition self-end sm:self-center ${
                      alert.type === "danger" || alert.type === "warning"
                        ? "bg-amber-400 text-black hover:bg-amber-300"
                        : "bg-blue-400 text-black hover:bg-blue-300"
                    }`}
                  >
                    {alert.ctaText} →
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Seção de Convites de Equipe Pendentes */}
        {pendingInvites.length > 0 && (
          <div className="mt-6 rounded-3xl border border-purple-500/30 bg-gradient-to-r from-purple-950/20 via-neutral-900 to-black p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-purple-300">
                Convites de Equipe Pendentes ({pendingInvites.length})
              </h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {pendingInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex flex-col justify-between rounded-2xl border border-white/10 bg-black/40 p-4 gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-white text-sm">{invite.workspace.name}</h4>
                      <span className="rounded-lg bg-purple-400/20 px-2 py-0.5 text-[10px] font-bold text-purple-200">
                        {invite.role}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-white/50">
                      Convidado por: {invite.invitedBy.displayName || invite.invitedBy.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                    <button
                      onClick={() => handleAcceptInvite(invite.token)}
                      className="flex-1 rounded-xl bg-purple-500 py-1.5 text-xs font-bold text-white hover:bg-purple-400 transition"
                    >
                      Aceitar
                    </button>
                    <button
                      onClick={() => handleDeclineInvite(invite.token)}
                      className="rounded-xl border border-white/10 px-3 py-1.5 text-xs text-white/60 hover:text-white hover:bg-white/5 transition"
                    >
                      Recusar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4 Cards de Métricas Principais (DADOS 100% REAIS) */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Projetos */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-white/50">
                Projetos no Estúdio
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                </svg>
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{stats.totalProjects}</span>
              <span className="text-xs text-white/50">
                {usageSummary.maxProjects === -1 ? "/ Ilimitados" : `/ ${usageSummary.maxProjects} max`}
              </span>
            </div>
            {usageSummary.maxProjects !== -1 && (
              <div className="mt-3">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full rounded-full ${
                      usageSummary.projectsCount >= usageSummary.maxProjects
                        ? "bg-amber-400"
                        : "bg-emerald-400"
                    }`}
                    style={{
                      width: `${Math.min(100, (usageSummary.projectsCount / usageSummary.maxProjects) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Cenas Decupadas */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-white/50">
                Cenas Decupadas
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-400/10 text-blue-400 border border-blue-400/20">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{stats.totalScenes}</span>
              <span className="text-xs text-white/50">em produção</span>
            </div>
            <p className="mt-3 text-[11px] text-white/40">Sequenciadas com continuidade</p>
          </div>

          {/* Card 3: Personagens & Locações */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-white/50">
                Bíblia Visual
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-400/10 text-purple-400 border border-purple-400/20">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">
                {stats.totalCharacters + stats.totalEnvironments}
              </span>
              <span className="text-xs text-white/50">entidades</span>
            </div>
            <p className="mt-3 text-[11px] text-white/40">
              {stats.totalCharacters} personagens • {stats.totalEnvironments} ambientes
            </p>
          </div>

          {/* Card 4: Saldo de Créditos IA */}
          <div className="rounded-3xl border border-amber-500/20 bg-amber-500/[0.03] p-5 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                Créditos de IA
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-white">{usageSummary.creditsBalance}</span>
                <span className="text-xs text-white/50">créditos</span>
              </div>
              <Link
                href="/workspace/billing"
                className="text-xs font-semibold text-amber-400 hover:text-amber-300 underline underline-offset-4"
              >
                Recarregar
              </Link>
            </div>
            <p className="mt-3 text-[11px] text-white/50">
              {stats.totalPromptsCount} prompts cinematográficos gerados
            </p>
          </div>
        </div>

        {/* Grid de Seções: Projetos Recentes + Últimas Gerações de IA */}
        <div className="mt-10 grid gap-8 lg:grid-cols-3">
          {/* Coluna 1 & 2: Projetos Recentes */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Projetos Recentes</h2>
                <p className="text-xs text-white/50">Seus universos e roteiros em desenvolvimento ativo</p>
              </div>
              <Link
                href="/projects"
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition"
              >
                Ver todos os projetos ({stats.totalProjects}) →
              </Link>
            </div>

            {recentProjects.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 p-8 text-center bg-white/[0.01]">
                <p className="text-sm text-white/50">Nenhum projeto ativo neste estúdio ainda.</p>
                <div className="mt-4 flex justify-center gap-3">
                  <button
                    onClick={() => setIsOnboardingOpen(true)}
                    className="rounded-xl border border-white/15 px-4 py-2 text-xs text-white/80 hover:bg-white/10"
                  >
                    Usar Template de Início
                  </button>
                  <Link
                    href="/projects"
                    className="rounded-xl bg-emerald-400 px-4 py-2 text-xs font-bold text-black hover:bg-emerald-300"
                  >
                    Criar do Zero
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {recentProjects.map((p) => (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}`}
                    className="group rounded-3xl border border-white/10 bg-white/[0.02] p-5 hover:border-emerald-500/40 hover:bg-white/[0.04] transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold text-white/60">
                        {p.genre || "Geral"}
                      </span>
                      <span className="text-[11px] text-white/40">
                        {new Date(p.updatedAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>

                    <h3 className="mt-3 text-base font-bold text-white group-hover:text-emerald-300 transition line-clamp-1">
                      {p.title}
                    </h3>
                    <p className="mt-1 text-xs text-white/50 line-clamp-2 leading-relaxed">
                      {p.description || "Sem descrição informada."}
                    </p>

                    <div className="mt-4 flex items-center gap-3 pt-3 border-t border-white/5 text-[11px] text-white/60">
                      <span>🎬 {p._count.scenes} cenas</span>
                      <span>•</span>
                      <span>👤 {p._count.characters} personagens</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Coluna 3: Feed de Últimas Gerações de Prompts */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Últimas Gerações</h2>
                <p className="text-xs text-white/50">Histórico recente de prompts compilados</p>
              </div>
            </div>

            {recentGenerations.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 p-6 text-center text-xs text-white/40 bg-white/[0.01]">
                Nenhum prompt gerado ainda. Acesse uma cena para compilar seus primeiros prompts.
              </div>
            ) : (
              <div className="space-y-3">
                {recentGenerations.map((gen) => (
                  <Link
                    key={gen.id}
                    href={`/projects/${gen.projectId}`}
                    className="block rounded-2xl border border-white/10 bg-white/[0.02] p-4 hover:border-white/20 transition"
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-semibold text-emerald-400">
                        {gen.targetTool || "Prompt IA"}
                      </span>
                      <span className="text-white/40">
                        {new Date(gen.createdAt).toLocaleDateString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {gen.scene && (
                      <p className="mt-1 text-xs font-medium text-white/90">
                        Cena {gen.scene.order}: {gen.scene.title}
                      </p>
                    )}
                    <p className="mt-1 text-[11px] text-white/60 line-clamp-2 font-mono">
                      {gen.outputText || "Prompt estruturado em JSON"}
                    </p>
                  </Link>
                ))}
              </div>
            )}

            {/* Banner Comercial Integrado */}
            <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-emerald-950/20 to-black p-5">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-400 text-xs font-bold">
                  ★
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                  Desbloqueie o Máximo Potencial
                </span>
              </div>
              <p className="mt-2 text-xs text-white/70 leading-relaxed">
                Com o Plano PRO você ganha 2.500 créditos mensais, projetos ilimitados e compatibilidade total com Runway Gen-3 e Sora.
              </p>
              <Link
                href="/pricing"
                className="mt-4 block rounded-xl bg-gradient-to-r from-emerald-400 to-teal-300 py-2 text-center text-xs font-bold text-black transition hover:opacity-95 shadow-md shadow-emerald-400/10"
              >
                Conhecer os Planos PRO & TEAM
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Modal de Onboarding / Boas-vindas */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        state={onboardingState}
        onStateUpdate={fetchDashboardData}
      />

      {/* Modal de Limite do Plano */}
      <PlanLimitModal
        isOpen={limitModalOpen}
        onClose={() => setLimitModalOpen(false)}
        title="Limite de Projetos Atingido"
        message={`Você atingiu o limite de ${usageSummary.projectsCount}/${usageSummary.maxProjects} projetos do ${usageSummary.planName}. Faça upgrade para continuar criando novos projetos sem restrições.`}
        planName={usageSummary.planName}
        currentUsage={usageSummary.projectsCount}
        maxLimit={usageSummary.maxProjects}
      />

      {/* Toast Flutuante */}
      <ToastNotification
        message={toastMessage}
        onClose={() => setToastMessage(null)}
      />
    </div>
  );
}
