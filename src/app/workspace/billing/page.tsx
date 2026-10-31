"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface UsageSummary {
  workspaceId: string;
  workspaceName: string;
  planTier: "FREE" | "PRO" | "TEAM" | "ENTERPRISE";
  planName: string;
  status: "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELING" | "CANCELED" | "UNPAID";
  interval: "MONTHLY" | "YEARLY";
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  projectsCount: number;
  maxProjects: number;
  membersCount: number;
  maxMembers: number;
  creditsBalance: number;
  monthlyCredits: number;
  canCreateProject: boolean;
  canAddMember: boolean;
  features: string[];
}

interface InvoiceItem {
  id: string;
  amountDue: number;
  amountPaid: number;
  currency: string;
  status: string;
  hostedInvoiceUrl?: string;
  paidAt?: string;
  createdAt: string;
}

export default function WorkspaceBillingPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const loadData = async () => {
    try {
      const [subRes, invRes] = await Promise.all([
        fetch("/api/billing/subscription"),
        fetch("/api/billing/invoices"),
      ]);

      if (subRes.ok) {
        const subData = await subRes.json();
        setSummary(subData.data);
      }

      if (invRes.ok) {
        const invData = await invRes.json();
        setInvoices(invData.data || []);
      }
    } catch (err) {
      console.error("Erro ao carregar dados de cobrança:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCancelSubscription = async (atPeriodEnd: boolean) => {
    if (!summary?.workspaceId) return;
    setActionLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/billing/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: summary.workspaceId,
          atPeriodEnd,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao solicitar cancelamento.");
      }

      setMessage({
        type: "success",
        text: atPeriodEnd
          ? "Cancelamento agendado. Seu acesso permanecerá ativo até o final do ciclo faturado."
          : "Assinatura cancelada com sucesso.",
      });

      setShowCancelModal(false);
      loadData();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Falha ao processar solicitação." });
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07090e] p-8 text-center text-white/50">
        Carregando informações da assinatura...
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="min-h-screen bg-[#07090e] p-8 text-center text-white/60">
        Nenhum workspace selecionado.
      </div>
    );
  }

  const isPastDue = summary.status === "PAST_DUE" || summary.status === "UNPAID";
  const isCanceling = summary.status === "CANCELING" || summary.cancelAtPeriodEnd;

  return (
    <div className="min-h-screen bg-[#07090e] text-white">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Assinatura & Cobrança
              </h1>
              <span className="rounded-md bg-white/10 px-2.5 py-0.5 text-xs text-white/70">
                {summary.workspaceName}
              </span>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-white/50">
              Controle de plano, limites de uso, faturamento e créditos do estúdio.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/pricing"
              className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-on-primary transition hover:opacity-90 shadow-md shadow-primary/20"
            >
              Fazer Upgrade / Mudar Plano
            </Link>
          </div>
        </div>

        {/* Feedback alerts */}
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

        {/* Warning Banners */}
        {isPastDue && (
          <div className="mt-6 rounded-2xl border border-red-500/40 bg-red-950/50 p-5 text-red-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-red-400">
              <span>⚠️</span> Pagamento Pendente ou Recusado
            </div>
            <p className="text-xs text-red-200/80">
              Houve uma falha na renovação da sua assinatura. Seus direitos de criação de novos projetos e
              gerações estão suspensos temporariamente. Atualize seu método de pagamento para reativar seu estúdio.
            </p>
            <div className="pt-2">
              <Link
                href="/pricing"
                className="inline-block rounded-lg bg-red-500 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-red-600"
              >
                Regularizar Pagamento
              </Link>
            </div>
          </div>
        )}

        {isCanceling && (
          <div className="mt-6 rounded-2xl border border-amber-500/40 bg-amber-950/40 p-4 text-xs text-amber-200">
            <span className="font-bold">Aviso de Cancelamento:</span> Sua assinatura foi agendada para término em{" "}
            <strong>{formatDate(summary.currentPeriodEnd)}</strong>. Você continuará com acesso aos recursos
            até esta data, quando retornará ao plano gratuito.
          </div>
        )}

        {/* Current Plan Overview Card */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs uppercase tracking-wider text-white/40">Plano Ativo</span>
                <div className="flex items-center gap-3 mt-1">
                  <h2 className="text-2xl font-extrabold text-white">{summary.planName}</h2>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      summary.status === "ACTIVE"
                        ? "bg-primary/20 text-primary border border-primary/30"
                        : summary.status === "PAST_DUE"
                        ? "bg-red-400/20 text-red-300 border border-red-400/30"
                        : "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                    }`}
                  >
                    {summary.status}
                  </span>
                </div>
              </div>

              {summary.planTier !== "FREE" && (
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/50 transition hover:bg-white/5 hover:text-white"
                >
                  Cancelar Assinatura
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-white/10 text-xs">
              <div>
                <span className="text-white/40">Ciclo de Faturamento</span>
                <p className="mt-1 font-semibold text-white">
                  {summary.interval === "YEARLY" ? "Anual" : "Mensal"}
                </p>
              </div>

              <div>
                <span className="text-white/40">Término do Ciclo Atual</span>
                <p className="mt-1 font-semibold text-white">
                  {summary.currentPeriodEnd ? formatDate(summary.currentPeriodEnd) : "Contínuo"}
                </p>
              </div>

              <div>
                <span className="text-white/40">Renovação Automática</span>
                <p className="mt-1 font-semibold text-white">
                  {summary.cancelAtPeriodEnd ? "Desativada" : "Ativada"}
                </p>
              </div>
            </div>

            {/* Features check */}
            <div className="pt-4 border-t border-white/10">
              <span className="text-xs uppercase tracking-wider text-white/40 block mb-3">
                Direitos Habilitados
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-white/80">
                {summary.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-primary font-bold">✓</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Credit Counter Box */}
          <div className="rounded-2xl border border-primary/20 bg-gradient-to-b from-primary/10 to-transparent p-6 flex flex-col justify-between">
            <div>
              <span className="text-xs uppercase tracking-wider text-primary/80 font-semibold">
                Saldo de Créditos IA
              </span>
              <div className="mt-2 text-4xl font-extrabold text-white">
                {summary.creditsBalance}
                <span className="text-xs font-normal text-white/40 ml-2">créditos</span>
              </div>
              <p className="mt-2 text-xs text-white/60">
                Créditos são utilizados para compor cenas, bíblias visuais e prompts cinematográficos com os modelos Gemini AI.
              </p>
            </div>

            <div className="pt-6 border-t border-primary/10">
              <div className="text-[11px] text-white/40 flex justify-between mb-1">
                <span>Cota mensal do plano:</span>
                <span className="font-semibold text-white">{summary.monthlyCredits} créditos</span>
              </div>
            </div>
          </div>
        </div>

        {/* Usage Counters (Entitlements) */}
        <div className="mt-10">
          <h3 className="text-lg font-bold text-white mb-4">Limites e Consumo do Estúdio</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Projects Meter */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white">Projetos Ativos</span>
                <span className="font-mono text-white/70">
                  {summary.projectsCount} / {summary.maxProjects === -1 ? "∞" : summary.maxProjects}
                </span>
              </div>

              <div className="mt-3 h-2 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    summary.maxProjects !== -1 && summary.projectsCount >= summary.maxProjects
                      ? "bg-red-400"
                      : "bg-primary"
                  }`}
                  style={{
                    width:
                      summary.maxProjects === -1
                        ? "20%"
                        : `${Math.min(100, (summary.projectsCount / summary.maxProjects) * 100)}%`,
                  }}
                />
              </div>

              <p className="mt-2 text-[11px] text-white/40">
                {summary.maxProjects === -1
                  ? "Seu plano permite projetos ilimitados."
                  : summary.projectsCount >= summary.maxProjects
                  ? "Limite atingido. Faça upgrade para iniciar novas produções."
                  : `Você pode criar mais ${summary.maxProjects - summary.projectsCount} projeto(s).`}
              </p>
            </div>

            {/* Members Meter */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white">Membros da Equipe</span>
                <span className="font-mono text-white/70">
                  {summary.membersCount} / {summary.maxMembers === -1 ? "∞" : summary.maxMembers}
                </span>
              </div>

              <div className="mt-3 h-2 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    summary.maxMembers !== -1 && summary.membersCount >= summary.maxMembers
                      ? "bg-amber-400"
                      : "bg-primary"
                  }`}
                  style={{
                    width:
                      summary.maxMembers === -1
                        ? "15%"
                        : `${Math.min(100, (summary.membersCount / summary.maxMembers) * 100)}%`,
                  }}
                />
              </div>

              <p className="mt-2 text-[11px] text-white/40">
                {summary.maxMembers === 1
                  ? "Plano individual. Para colaborar com equipe, escolha o plano Team."
                  : `Capacidade máxima de ${summary.maxMembers} membros.`}
              </p>
            </div>
          </div>
        </div>

        {/* Invoice & Payment History */}
        <div className="mt-12">
          <h3 className="text-lg font-bold text-white mb-4">Histórico de Cobrança & Faturas</h3>

          {invoices.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.01] p-8 text-center text-xs text-white/40">
              Nenhuma fatura registrada neste workspace até o momento.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.01]">
              <table className="w-full text-left text-xs text-white/80">
                <thead className="border-b border-white/10 bg-white/[0.03] uppercase text-white/50">
                  <tr>
                    <th className="px-5 py-3.5">Data</th>
                    <th className="px-5 py-3.5">Valor</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Comprovante</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td className="px-5 py-3.5 text-white">{formatDate(inv.createdAt)}</td>
                      <td className="px-5 py-3.5 font-semibold text-white">
                        {formatCurrency(inv.amountPaid || inv.amountDue)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                            inv.status === "paid"
                              ? "bg-primary/20 text-primary"
                              : "bg-red-400/20 text-red-300"
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {inv.hostedInvoiceUrl ? (
                          <a
                            href={inv.hostedInvoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline font-semibold"
                          >
                            Abrir Fatura ↗
                          </a>
                        ) : (
                          <span className="text-white/30">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Cancellation Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="max-w-md w-full rounded-2xl border border-white/10 bg-[#0d1017] p-6 space-y-4">
              <h3 className="text-lg font-bold text-white">Confirmar Cancelamento</h3>
              <p className="text-xs text-white/60">
                Você tem certeza que deseja cancelar sua assinatura? Você pode optar por manter o acesso
                até o encerramento do ciclo pago ou cancelar imediatamente.
              </p>

              <div className="space-y-2 pt-2">
                <button
                  onClick={() => handleCancelSubscription(true)}
                  disabled={actionLoading}
                  className="w-full rounded-xl bg-white/10 py-2.5 text-xs font-semibold text-white transition hover:bg-white/20 disabled:opacity-50"
                >
                  Cancelar ao final do período (Recomendado)
                </button>
                <button
                  onClick={() => handleCancelSubscription(false)}
                  disabled={actionLoading}
                  className="w-full rounded-xl bg-red-500/20 border border-red-500/40 py-2.5 text-xs font-semibold text-red-300 transition hover:bg-red-500/30 disabled:opacity-50"
                >
                  Cancelar Imediatamente
                </button>
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="w-full py-2 text-xs text-white/40 hover:text-white"
                >
                  Voltar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
