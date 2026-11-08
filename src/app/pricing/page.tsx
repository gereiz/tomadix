"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface PlanItem {
  id: string;
  tier: "FREE" | "PRO" | "TEAM" | "ENTERPRISE";
  code?: string;
  name: string;
  description: string;
  badge?: string | null;
  isHighlighted?: boolean;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  maxProjects: number;
  unlimitedProjects?: boolean;
  maxMembers: number;
  unlimitedMembers?: boolean;
  monthlyCredits: number;
  adhesionCredits?: number;
  dailyCredits?: number;
  dailyCreditsAccumulative?: boolean;
  isFreePlan?: boolean;
  annualDiscountPercent?: number;
  features: string[];
  enabledTemplates: string[];
  exportAllowed: boolean;
  visualBibleAdvanced: boolean;
}

interface CurrentSubscription {
  planTier: string;
  planName: string;
  status: string;
  interval: string;
  workspaceId: string;
  workspaceName: string;
}

export default function PricingPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [currentSub, setCurrentSub] = useState<CurrentSubscription | null>(null);
  const [simulations, setSimulations] = useState<Record<string, any>>({});
  const [expandedCapacityTier, setExpandedCapacityTier] = useState<string | null>(null);
  const [interval, setInterval] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [plansRes, subRes, simRes] = await Promise.all([
          fetch("/api/billing/plans"),
          fetch("/api/billing/subscription"),
          fetch("/api/billing/plans/usage-simulation"),
        ]);

        if (plansRes.ok) {
          const plansData = await plansRes.json();
          setPlans(plansData.data || []);
        }

        if (simRes.ok) {
          const simData = await simRes.json();
          if (Array.isArray(simData.data)) {
            const map: Record<string, any> = {};
            simData.data.forEach((s: any) => {
              map[s.planTier] = s;
            });
            setSimulations(map);
          }
        }

        if (subRes.ok) {
          const subData = await subRes.json();
          if (subData.data) {
            setCurrentSub({
              planTier: subData.data.planTier,
              planName: subData.data.planName,
              status: subData.data.status,
              interval: subData.data.interval,
              workspaceId: subData.data.workspaceId,
              workspaceName: subData.data.workspaceName,
            });
          }
        }
      } catch (err) {
        console.error("Erro ao carregar planos:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleSelectPlan = async (tier: string) => {
    if (!currentSub?.workspaceId) {
      // Redirecionar para login caso não autenticado
      router.push("/login?redirect=/pricing");
      return;
    }

    if (tier === currentSub.planTier) {
      return;
    }

    setCheckoutLoading(tier);
    setMessage(null);

    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: currentSub.workspaceId,
          planTier: tier,
          interval,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro ao iniciar contratação.");
      }

      if (data.direct) {
        setMessage({
          type: "success",
          text: `Plano alterado para ${tier} com sucesso.`,
        });
        setCurrentSub((prev) => (prev ? { ...prev, planTier: tier } : null));
      } else if (data.checkoutUrl) {
        // Redirecionar para gateway externo ou sandbox
        window.location.href = data.checkoutUrl;
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Falha na operação comercial." });
    } finally {
      setCheckoutLoading(null);
    }
  };

  const formatPrice = (cents: number) => {
    const val = cents / 100;
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  return (
    <div className="min-h-dvh bg-[#07090e] text-white">
      {/* Background gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
      </div>

      <div className="relative w-full px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <span>🎬</span> Planos Comerciais Transparentes
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
            Potencialize suas produções cinematográficas com IA
          </h1>
          <p className="text-base sm:text-lg text-white/60">
            Escolha o plano ideal para você ou sua produtora. Crie bíblias visuais,
            cenas, parâmetros e roteiros cinematográficos com fidelidade incomparável.
          </p>

          {/* Monthly / Yearly Toggle */}
          <div className="pt-6 flex items-center justify-center gap-3">
            <span
              className={`text-sm cursor-pointer transition ${
                interval === "MONTHLY" ? "text-white font-semibold" : "text-white/40"
              }`}
              onClick={() => setInterval("MONTHLY")}
            >
              Cobrança Mensal
            </span>

            <button
              type="button"
              onClick={() => setInterval(interval === "MONTHLY" ? "YEARLY" : "MONTHLY")}
              className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                interval === "YEARLY" ? "bg-primary" : "bg-white/20"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-black shadow-lg ring-0 transition duration-200 ease-in-out ${
                  interval === "YEARLY" ? "translate-x-7" : "translate-x-0"
                }`}
              />
            </button>

            <span
              className={`text-sm cursor-pointer flex items-center gap-1.5 transition ${
                interval === "YEARLY" ? "text-white font-semibold" : "text-white/40"
              }`}
              onClick={() => setInterval("YEARLY")}
            >
              Cobrança Anual
              <span className="rounded-full bg-primary/20 border border-primary/40 px-2 py-0.5 text-[10px] font-bold text-primary">
                17% OFF (2 meses grátis)
              </span>
            </span>
          </div>
        </div>

        {/* Feedback message */}
        {message && (
          <div
            className={`mt-8 mx-auto max-w-xl rounded-xl p-4 text-center text-sm font-medium ${
              message.type === "success"
                ? "bg-primary/20 border border-primary/40 text-primary"
                : "bg-red-950/60 border border-red-500/40 text-red-300"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Cards Grid */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-8 items-stretch">
          {loading ? (
            <div className="col-span-3 text-center py-20 text-white/40">
              Carregando catálogo de planos comerciais...
            </div>
          ) : (
            plans.map((plan) => {
              const isCurrent = currentSub?.planTier === plan.tier;
              const isPopular = plan.isHighlighted || plan.tier === "PRO";
              const badgeText = plan.badge || (isPopular ? "Mais Escolhido" : null);
              const price =
                interval === "YEARLY"
                  ? formatPrice(plan.priceYearly / 12)
                  : formatPrice(plan.priceMonthly);

              return (
                <div
                  key={plan.tier}
                  className={`relative flex flex-col justify-between rounded-2xl border p-8 transition duration-200 ${
                    isPopular
                      ? "border-primary/60 bg-gradient-to-b from-primary/15 via-white/[0.03] to-transparent shadow-xl shadow-primary/10 ring-1 ring-primary/30"
                      : "border-white/10 bg-white/[0.02] hover:border-white/20"
                  }`}
                >
                  {badgeText && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3.5 py-1 text-xs font-bold text-on-primary uppercase tracking-wider shadow-md shadow-primary/30">
                      {badgeText}
                    </div>
                  )}

                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold tracking-tight text-white">{plan.name}</h3>
                      {isCurrent && (
                        <span className="rounded-md bg-primary/20 border border-primary/40 px-2.5 py-0.5 text-xs font-semibold text-primary">
                          Seu Plano Atual
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-white/60 min-h-[40px]">{plan.description}</p>

                    {/* Price */}
                    <div className="mt-6 flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold tracking-tight text-white">
                        {plan.priceMonthly === 0 ? "Grátis" : price}
                      </span>
                      {plan.priceMonthly > 0 && (
                        <span className="text-sm font-medium text-white/50">/mês</span>
                      )}
                    </div>
                    {interval === "YEARLY" && plan.priceMonthly > 0 && (
                      <p className="mt-1 text-xs text-primary/80">
                        Cobrado {formatPrice(plan.priceYearly)} anualmente
                      </p>
                    )}

                    {/* Quick highlights */}
                    <div className="mt-6 pt-6 border-t border-white/10 space-y-2 text-xs text-white/80">
                      <div className="flex items-center justify-between">
                        <span className="text-white/50">Projetos Simultâneos:</span>
                        <span className="font-semibold text-white">
                          {plan.unlimitedProjects || plan.maxProjects === -1 ? "Ilimitados" : plan.maxProjects}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-white/50">Membros da Equipe:</span>
                        <span className="font-semibold text-white">
                          {plan.unlimitedMembers || plan.maxMembers === -1 ? "Ilimitados" : plan.maxMembers}
                        </span>
                      </div>
                      {(plan.adhesionCredits || 0) > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-sky-300">Créditos de Adesão:</span>
                          <span className="font-bold font-mono text-sky-300">
                            +{plan.adhesionCredits} cr (única vez)
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-white/50">Créditos Mensais:</span>
                        <span className="font-semibold text-white font-mono">
                          +{plan.monthlyCredits} cr/mês
                        </span>
                      </div>
                      {(plan.dailyCredits || 0) > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-primary">Cota Diária de Créditos:</span>
                          <span className="font-semibold text-primary font-mono">
                            +{plan.dailyCredits} cr/dia
                            <span className="text-[10px] text-white/40 block text-right font-normal">
                              {plan.dailyCreditsAccumulative ? "acumulativo" : "expira às 23:59"}
                            </span>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Botão e Gaveta: O que você pode criar com este plano? */}
                    {simulations[plan.tier]?.services && (
                      <div className="mt-4 pt-3 border-t border-white/10">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedCapacityTier(
                              expandedCapacityTier === plan.tier ? null : plan.tier
                            )
                          }
                          className="w-full text-left flex items-center justify-between text-xs font-semibold text-amber-300 hover:text-amber-200 transition p-2 rounded-lg bg-amber-500/10 border border-amber-500/20"
                        >
                          <span className="flex items-center gap-1.5">
                            <span>🎬</span>
                            <span>O que posso criar com este plano?</span>
                          </span>
                          <span className="text-xs">
                            {expandedCapacityTier === plan.tier ? "▲" : "▼"}
                          </span>
                        </button>

                        {expandedCapacityTier === plan.tier && (
                          <div className="mt-2.5 p-3 rounded-xl bg-black/40 border border-white/10 space-y-2 text-[11px]">
                            <div className="text-white/50 text-[10px] pb-1 border-b border-white/5">
                              Capacidade estimada com base nos custos reais vigentes:
                            </div>
                            <div className="space-y-1.5">
                              {simulations[plan.tier].services.map((svc: any) => (
                                <div
                                  key={svc.operationCode}
                                  className="flex items-center justify-between py-1 border-b border-white/5 last:border-b-0"
                                >
                                  <span className="text-white/80">{svc.operationName}</span>
                                  <span className="font-mono font-bold text-amber-300">
                                    {svc.isFree
                                      ? "Ilimitado"
                                      : `${svc.totalMonthlyEstimatedUses} gerações/mês`}
                                  </span>
                                </div>
                              ))}
                            </div>
                            <div className="text-[9px] text-white/40 pt-1">
                              * Estimativa considerando ciclo de 30 dias com cotas utilizadas.
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Features list */}
                    <ul className="mt-6 space-y-3 text-sm text-white/70">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <svg
                            className="h-4 w-4 shrink-0 text-primary mt-0.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="2.5"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M4.5 12.75l6 6 9-13.5"
                            />
                          </svg>
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* CTA Button */}
                  <div className="mt-8 pt-6 border-t border-white/10">
                    {isCurrent ? (
                      <Link
                        href="/workspace/billing"
                        className="block w-full rounded-xl border border-white/20 bg-white/5 py-3 text-center text-sm font-semibold text-white transition hover:bg-white/10"
                      >
                        Gerenciar Assinatura
                      </Link>
                    ) : (
                      <button
                        onClick={() => handleSelectPlan(plan.tier)}
                        disabled={checkoutLoading !== null}
                        className={`w-full rounded-xl py-3 text-sm font-semibold transition ${
                          isPopular
                            ? "bg-primary text-on-primary hover:opacity-90 shadow-lg shadow-primary/20"
                            : "bg-white/10 text-white hover:bg-white/20 border border-white/15"
                        } disabled:opacity-50`}
                      >
                        {checkoutLoading === plan.tier
                          ? "Processando..."
                          : plan.priceMonthly === 0
                          ? "Mudar para Free"
                          : `Contratar ${plan.name}`}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Feature Comparison Table */}
        <div className="mt-20 border-t border-white/10 pt-16">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold">Comparativo Detalhado de Recursos</h2>
            <p className="mt-2 text-sm text-white/50">
              Consulte os direitos e limites comerciais de cada categoria antes de assinar.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.01]">
            <table className="w-full text-left text-sm text-white/80 min-w-[560px]">
              <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase text-white/60">
                <tr>
                  <th className="px-6 py-4">Recurso / Limite</th>
                  <th className="px-6 py-4 text-center">Free</th>
                  <th className="px-6 py-4 text-center">Pro</th>
                  <th className="px-6 py-4 text-center text-primary">Team</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <tr>
                  <td className="px-6 py-4 font-medium text-white">Projetos Simultâneos</td>
                  <td className="px-6 py-4 text-center">2 projetos</td>
                  <td className="px-6 py-4 text-center">20 projetos</td>
                  <td className="px-6 py-4 text-center font-bold text-primary">Ilimitados</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium text-white">Membros no Workspace</td>
                  <td className="px-6 py-4 text-center">1 membro</td>
                  <td className="px-6 py-4 text-center">Até 3 membros</td>
                  <td className="px-6 py-4 text-center font-bold text-primary">Até 10 membros</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium text-white">Créditos de Adesão (Boas-vindas)</td>
                  <td className="px-6 py-4 text-center text-white/40">0 cr</td>
                  <td className="px-6 py-4 text-center text-sky-300 font-bold">100 cr</td>
                  <td className="px-6 py-4 text-center font-bold text-sky-400">500 cr</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium text-white">Créditos de IA Mensais de Ciclo</td>
                  <td className="px-6 py-4 text-center">20 créditos</td>
                  <td className="px-6 py-4 text-center">500 créditos</td>
                  <td className="px-6 py-4 text-center font-bold text-primary">2.500 créditos</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium text-white">Cota Diária de Créditos</td>
                  <td className="px-6 py-4 text-center text-white/40">0 cr/dia</td>
                  <td className="px-6 py-4 text-center text-primary">10 cr/dia</td>
                  <td className="px-6 py-4 text-center font-bold text-primary">50 cr/dia</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium text-white">Acúmulo de Cota Diária</td>
                  <td className="px-6 py-4 text-center text-white/40">—</td>
                  <td className="px-6 py-4 text-center text-primary">Acumulativo</td>
                  <td className="px-6 py-4 text-center font-bold text-primary">Acumulativo</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium text-white">Templates Cinematográficos</td>
                  <td className="px-6 py-4 text-center">Básicos</td>
                  <td className="px-6 py-4 text-center">Completos</td>
                  <td className="px-6 py-4 text-center font-bold text-primary">Completos + Customizados</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium text-white">Bíblia Visual Avançada</td>
                  <td className="px-6 py-4 text-center text-white/30">—</td>
                  <td className="px-6 py-4 text-center text-primary">✓</td>
                  <td className="px-6 py-4 text-center text-primary">✓</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium text-white">Exportação Multi-formato (JSON, CSV, PDF)</td>
                  <td className="px-6 py-4 text-center text-white/30">Apenas JSON</td>
                  <td className="px-6 py-4 text-center text-primary">✓</td>
                  <td className="px-6 py-4 text-center text-primary">✓</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium text-white">Trilha de Auditoria & RBAC</td>
                  <td className="px-6 py-4 text-center text-white/30">—</td>
                  <td className="px-6 py-4 text-center text-white/30">—</td>
                  <td className="px-6 py-4 text-center text-primary">✓</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Security & Guarantee Footer */}
        <div className="mt-16 rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-8 text-center sm:flex sm:items-center sm:justify-between sm:text-left">
          <div>
            <h3 className="font-bold text-white">Pagamentos Seguros & Sem Surpresas</h3>
            <p className="mt-1 text-xs text-white/50">
              Cobrança criptografada com HMAC SHA-256 via Stripe e gateways homologados. Cancele quando quiser diretamente no painel.
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center justify-center gap-4 text-xs text-white/40 font-mono">
            <span>🔒 SSL 256-BIT</span>
            <span>•</span>
            <span>💳 CARTÃO / PIX / BOLETO</span>
          </div>
        </div>
      </div>
    </div>
  );
}
