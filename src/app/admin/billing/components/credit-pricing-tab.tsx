"use client";

import { useEffect, useState } from "react";

interface CreditPricingRule {
  id: string;
  operationId: string;
  planTier?: string | null;
  modelTarget?: string | null;
  cost?: number;
  creditCost?: number;
  isFree: boolean;
  version?: number;
  createdAt?: string;
}

interface CreditOperation {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  category: string;
  isActive: boolean;
  defaultCost?: number;
  defaultCreditCost?: number;
  isFree: boolean;
  rules?: CreditPricingRule[];
  pricingRules?: CreditPricingRule[];
}

interface RenewalPolicy {
  id: string;
  name: string;
  description?: string | null;
  planTier?: string | null;
  creditsAmount: number;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY" | "ONCE" | string;
  allowAccumulate?: boolean;
  accumulate?: boolean;
  maxAccumulateBalance?: number | null;
  maxAccumulated?: number | null;
  active?: boolean;
  isActive?: boolean;
  priority?: number;
  timezone?: string;
}

const PLAN_TIERS = ["FREE", "PRO", "TEAM", "ENTERPRISE"];

export function CreditPricingTab() {
  const [operations, setOperations] = useState<CreditOperation[]>([]);
  const [renewalPolicies, setRenewalPolicies] = useState<RenewalPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modais de Operação / Preço
  const [editingOperation, setEditingOperation] = useState<CreditOperation | null>(null);
  const [ruleModalOp, setRuleModalOp] = useState<CreditOperation | null>(null);
  const [rulePlanTier, setRulePlanTier] = useState<string>("PRO");
  const [ruleCost, setRuleCost] = useState<number>(0);
  const [ruleIsFree, setRuleIsFree] = useState<boolean>(false);
  const [savingRule, setSavingRule] = useState<boolean>(false);

  // Nova Operação Modal
  const [showNewOpModal, setShowNewOpModal] = useState(false);
  const [newOpCode, setNewOpCode] = useState("");
  const [newOpName, setNewOpName] = useState("");
  const [newOpCategory, setNewOpCategory] = useState("Geração Cinema");
  const [newOpDefaultCost, setNewOpDefaultCost] = useState(5);
  const [newOpDescription, setNewOpDescription] = useState("");
  const [creatingOp, setCreatingOp] = useState(false);

  // Simulador de Custos
  const [simOpCode, setSimOpCode] = useState<string>("");
  const [simTier, setSimTier] = useState<string>("FREE");
  const [simResult, setSimResult] = useState<any>(null);
  const [simulating, setSimulating] = useState<boolean>(false);

  // Nova Política de Renovação Modal
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [renName, setRenName] = useState("");
  const [renPlanTier, setRenPlanTier] = useState("FREE");
  const [renAmount, setRenAmount] = useState(10);
  const [renFreq, setRenFreq] = useState<"DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY" | "ONCE">("MONTHLY");
  const [renAllowAccumulate, setRenAllowAccumulate] = useState(false);
  const [renMaxAccumulate, setRenMaxAccumulate] = useState<number | undefined>(undefined);
  const [creatingRenewal, setCreatingRenewal] = useState(false);

  // Disparo manual do Job de Renovação
  const [runningJob, setRunningJob] = useState(false);
  const [jobResult, setJobResult] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [opsRes, renRes] = await Promise.all([
        fetch("/api/admin/billing/credit-operations"),
        fetch("/api/admin/billing/credit-renewal"),
      ]);

      if (opsRes.ok) {
        const d = await opsRes.json();
        const rawOps: any[] = d.operations || [];
        const normalizedOps: CreditOperation[] = rawOps.map((op) => {
          const rawRules: any[] = op.pricingRules || op.rules || [];
          const normalizedRules: CreditPricingRule[] = rawRules.map((r: any) => ({
            id: r.id,
            operationId: r.operationId,
            planTier: r.planTier,
            modelTarget: r.modelTarget,
            cost: r.creditCost ?? r.cost ?? 0,
            creditCost: r.creditCost ?? r.cost ?? 0,
            isFree: Boolean(r.isFree),
            version: r.version ?? 1,
            createdAt: r.createdAt,
          }));

          const cost = op.defaultCreditCost ?? op.defaultCost ?? 0;
          return {
            ...op,
            defaultCost: cost,
            defaultCreditCost: cost,
            rules: normalizedRules,
            pricingRules: normalizedRules,
          };
        });

        setOperations(normalizedOps);
        if (normalizedOps.length > 0 && !simOpCode) {
          setSimOpCode(normalizedOps[0].code);
        }
      }
      if (renRes.ok) {
        const d = await renRes.json();
        const rawPolicies: any[] = d.policies || [];
        const normalizedPolicies: RenewalPolicy[] = rawPolicies.map((pol: any) => ({
          ...pol,
          allowAccumulate: pol.accumulate ?? pol.allowAccumulate ?? false,
          accumulate: pol.accumulate ?? pol.allowAccumulate ?? false,
          maxAccumulateBalance: pol.maxAccumulated ?? pol.maxAccumulateBalance,
          maxAccumulated: pol.maxAccumulated ?? pol.maxAccumulateBalance,
          active: pol.isActive ?? pol.active ?? true,
          isActive: pol.isActive ?? pol.active ?? true,
        }));
        setRenewalPolicies(normalizedPolicies);
      }
    } catch (err: any) {
      setNotification({ type: "error", message: err.message || "Erro ao carregar dados" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Simular Custo
  const handleSimulate = async () => {
    if (!simOpCode) return;
    setSimulating(true);
    setSimResult(null);
    try {
      const res = await fetch("/api/admin/billing/credit-operations/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operationCode: simOpCode, planTier: simTier }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const resPayload = data.simulation || data;
      setSimResult({
        ...resPayload,
        cost: resPayload.creditCost ?? resPayload.cost ?? 0,
        appliedRule: resPayload.appliedRule,
        ruleVersion: resPayload.version ?? resPayload.ruleVersion ?? 1,
      });
    } catch (err: any) {
      setNotification({ type: "error", message: "Erro na simulação: " + err.message });
    } finally {
      setSimulating(false);
    }
  };

  // Salvar Regra de Preço Específica
  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleModalOp) return;
    setSavingRule(true);
    try {
      const res = await fetch(`/api/admin/billing/credit-operations/${ruleModalOp.id}/rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planTier: rulePlanTier,
          cost: ruleIsFree ? 0 : Number(ruleCost),
          creditCost: ruleIsFree ? 0 : Number(ruleCost),
          isFree: ruleIsFree,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setNotification({ type: "success", message: "Regra de preço salva com sucesso!" });
      setRuleModalOp(null);
      fetchData();
    } catch (err: any) {
      setNotification({ type: "error", message: err.message });
    } finally {
      setSavingRule(false);
    }
  };

  // Excluir Regra de Preço
  const handleDeleteRule = async (opId: string, ruleId: string) => {
    if (!confirm("Tem certeza que deseja remover esta regra de preço específica?")) return;
    try {
      const res = await fetch(`/api/admin/billing/credit-operations/${opId}/rules?ruleId=${ruleId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setNotification({ type: "success", message: "Regra removida. A operação voltará ao custo padrão para este plano." });
      fetchData();
    } catch (err: any) {
      setNotification({ type: "error", message: err.message });
    }
  };

  // Criar Nova Operação
  const handleCreateOperation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOpCode.trim() || !newOpName.trim()) return;
    setCreatingOp(true);
    try {
      const res = await fetch("/api/admin/billing/credit-operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newOpCode.trim().toUpperCase(),
          name: newOpName.trim(),
          category: newOpCategory.trim(),
          defaultCost: Number(newOpDefaultCost),
          defaultCreditCost: Number(newOpDefaultCost),
          description: newOpDescription.trim(),
          isActive: true,
          isFree: Number(newOpDefaultCost) === 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setNotification({ type: "success", message: "Nova operação cobrável cadastrada com sucesso!" });
      setShowNewOpModal(false);
      setNewOpCode("");
      setNewOpName("");
      fetchData();
    } catch (err: any) {
      setNotification({ type: "error", message: err.message });
    } finally {
      setCreatingOp(false);
    }
  };

  // Criar Política de Renovação
  const handleCreateRenewalPolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renName.trim()) return;
    setCreatingRenewal(true);
    try {
      const res = await fetch("/api/admin/billing/credit-renewal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: renName.trim(),
          planTier: renPlanTier,
          creditsAmount: Number(renAmount),
          frequency: renFreq,
          allowAccumulate: renAllowAccumulate,
          accumulate: renAllowAccumulate,
          maxAccumulateBalance: renMaxAccumulate ? Number(renMaxAccumulate) : undefined,
          maxAccumulated: renMaxAccumulate ? Number(renMaxAccumulate) : undefined,
          active: true,
          isActive: true,
          priority: 10,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setNotification({ type: "success", message: "Política de renovação criada com sucesso!" });
      setShowRenewalModal(false);
      setRenName("");
      fetchData();
    } catch (err: any) {
      setNotification({ type: "error", message: err.message });
    } finally {
      setCreatingRenewal(false);
    }
  };

  // Executar Job de Renovação Manualmente
  const handleRunRenewalJob = async () => {
    if (!confirm("Deseja disparar o ciclo automático de renovação de créditos agora? Todas as concessões elegíveis serão processadas de forma idempotente.")) return;
    setRunningJob(true);
    setJobResult(null);
    try {
      const res = await fetch("/api/admin/billing/credit-renewal/run-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setJobResult(data.result);
      setNotification({ type: "success", message: "Job de renovação executado com sucesso!" });
    } catch (err: any) {
      setNotification({ type: "error", message: err.message });
    } finally {
      setRunningJob(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Alerta de Notificação */}
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs animate-in fade-in ${
            notification.type === "success"
              ? "bg-primary/10 border-primary/30 text-primary"
              : "bg-rose-500/10 border-rose-500/30 text-rose-300"
          }`}
        >
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="text-white/60 hover:text-white">✕</button>
        </div>
      )}

      {/* SEÇÃO 1: CATÁLOGO DE OPERAÇÕES COBRADAS */}
      <div className="rounded-2xl border border-white/10 bg-[#0d111c] overflow-hidden">
        <div className="p-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>🪙</span> Catálogo de Custos em Créditos por Operação
            </h3>
            <p className="text-xs text-white/50 mt-0.5">
              Configuração dinâmica de consumo de IA por operação e por plano (sem necessidade de deploy de código).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNewOpModal(true)}
              className="rounded-xl bg-amber-500/20 border border-amber-500/40 px-3.5 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/30 transition flex items-center gap-1.5"
            >
              <span>+</span> Cadastrar Operação
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-white/40 animate-pulse">Carregando catálogo de operações...</div>
        ) : operations.length === 0 ? (
          <div className="p-8 text-center text-xs text-white/40">Nenhuma operação cobrada cadastrada.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.02] border-b border-white/10 text-white/50">
                <tr>
                  <th className="p-3.5">Código / Operação</th>
                  <th className="p-3.5">Categoria</th>
                  <th className="p-3.5">Custo Padrão</th>
                  <th className="p-3.5">Preços Específicos por Plano</th>
                  <th className="p-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-white/80">
                {operations.map((op) => (
                  <tr key={op.id} className="hover:bg-white/[0.01]">
                    <td className="p-3.5">
                      <div className="font-bold text-white flex items-center gap-2">
                        <span>{op.name}</span>
                        {!op.isActive && (
                          <span className="rounded bg-rose-500/20 text-rose-300 px-1.5 py-0.2 text-[9px] uppercase font-mono">
                            Inativa
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-[11px] text-amber-400/80">{op.code}</div>
                      {op.description && <p className="text-[10px] text-white/40 mt-0.5">{op.description}</p>}
                    </td>

                    <td className="p-3.5">
                      <span className="rounded bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] font-medium text-white/70">
                        {op.category}
                      </span>
                    </td>

                    <td className="p-3.5">
                      <span className="font-mono font-bold text-white bg-white/5 px-2.5 py-1 rounded border border-white/10">
                        {op.isFree ? "Gratuito" : `${op.defaultCreditCost ?? op.defaultCost ?? 0} cr`}
                      </span>
                    </td>

                    <td className="p-3.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {(!op.rules || op.rules.length === 0) && (!op.pricingRules || op.pricingRules.length === 0) ? (
                          <span className="text-[11px] text-white/30 italic">Aplica custo padrão a todos os planos</span>
                        ) : (
                          (op.rules || op.pricingRules || []).map((rule) => (
                            <span
                              key={rule.id}
                              className="rounded-lg bg-indigo-500/10 border border-indigo-500/30 px-2 py-0.5 text-[10px] font-mono text-indigo-300 flex items-center gap-1"
                            >
                              <strong className="text-white">{rule.planTier}:</strong>
                              <span>{rule.isFree ? "Grátis" : `${rule.creditCost ?? rule.cost ?? 0} cr`}</span>
                              <button
                                onClick={() => handleDeleteRule(op.id, rule.id)}
                                className="text-white/40 hover:text-rose-400 font-bold ml-0.5"
                                title="Remover regra personalizada"
                              >
                                ×
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                    </td>

                    <td className="p-3.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => {
                          setRuleModalOp(op);
                          setRulePlanTier("PRO");
                          setRuleCost(op.defaultCreditCost ?? op.defaultCost ?? 0);
                          setRuleIsFree(false);
                        }}
                        className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-[11px] text-indigo-300 hover:bg-indigo-500/20 transition font-medium mr-2"
                      >
                        + Regra por Plano
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SEÇÃO 2: SIMULADOR DE CUSTO EM TEMPO REAL */}
      <div className="rounded-2xl border border-white/10 bg-[#0d111c] p-6 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <span>🔍</span> Simulador de Resolução Hierárquica de Preço
        </h3>
        <p className="text-xs text-white/50">
          Valide a regra exata que o servidor aplicará em tempo de execução para qualquer combinação de Operação e Plano.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="block text-[11px] font-medium text-white/60 mb-1">Operação Cobrada</label>
            <select
              value={simOpCode}
              onChange={(e) => setSimOpCode(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#161b26] px-3 py-2 text-xs text-white font-mono"
            >
              {operations.map((op) => (
                <option key={op.code} value={op.code}>
                  {op.name} ({op.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-white/60 mb-1">Plano do Usuário (Tier)</label>
            <select
              value={simTier}
              onChange={(e) => setSimTier(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#161b26] px-3 py-2 text-xs text-white font-mono"
            >
              {PLAN_TIERS.map((tier) => (
                <option key={tier} value={tier}>
                  {tier}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleSimulate}
              disabled={simulating || !simOpCode}
              className="w-full rounded-xl bg-amber-500/20 border border-amber-500/40 px-4 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/30 transition flex items-center justify-center gap-2"
            >
              {simulating ? "Calculando..." : "Simular Custo Efetivo ➔"}
            </button>
          </div>
        </div>

        {simResult && (
          <div className="mt-4 p-4 rounded-xl border border-primary/30 bg-primary/5 animate-in fade-in flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-primary uppercase tracking-wider">Custo Efetivo Resolvido:</span>
                <span className="text-xl font-bold font-mono text-white">
                  {simResult.isFree ? "0 Créditos (Gratuito)" : `${simResult.cost} Créditos`}
                </span>
              </div>
              <p className="text-[11px] text-white/50 mt-1">
                Origem da Regra: <strong className="text-white/80">{simResult.appliedRule}</strong> (Versão: v{simResult.ruleVersion})
              </p>
            </div>
            <div className="text-[11px] text-white/40 font-mono">
              Validação no servidor: OK (Conforme Seção 7.3)
            </div>
          </div>
        )}
      </div>

      {/* SEÇÃO 3: POLÍTICAS DE RENOVAÇÃO AUTOMÁTICA DE CRÉDITOS */}
      <div className="rounded-2xl border border-white/10 bg-[#0d111c] overflow-hidden">
        <div className="p-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>🔄</span> Sistema Configurável de Renovação de Créditos
            </h3>
            <p className="text-xs text-white/50 mt-0.5">
              Políticas de concessão periódica (diária, mensal, ciclo) executadas de forma idempotente e autônoma.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunRenewalJob}
              disabled={runningJob}
              className="rounded-xl border border-primary/40 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition flex items-center gap-1.5"
            >
              <span>⚡</span> {runningJob ? "Processando..." : "Executar Ciclo de Renovação"}
            </button>

            <button
              onClick={() => setShowRenewalModal(true)}
              className="rounded-xl bg-amber-500/20 border border-amber-500/40 px-3.5 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/30 transition flex items-center gap-1.5"
            >
              <span>+</span> Nova Política
            </button>
          </div>
        </div>

        {jobResult && (
          <div className="p-4 bg-primary/10 border-b border-primary/20 text-xs text-primary flex items-center justify-between">
            <span>
              Ciclo finalizado: <strong>{jobResult.processed}</strong> estúdios analisados,{" "}
              <strong>{jobResult.renewed}</strong> renovados com sucesso e{" "}
              <strong>{jobResult.skipped}</strong> ignorados (já renovados neste ciclo).
            </span>
            <button onClick={() => setJobResult(null)} className="text-primary hover:text-white">✕</button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/[0.02] border-b border-white/10 text-white/50">
              <tr>
                <th className="p-3.5">Nome / Descrição</th>
                <th className="p-3.5">Plano (Tier)</th>
                <th className="p-3.5">Periodicidade</th>
                <th className="p-3.5">Créditos</th>
                <th className="p-3.5">Acúmulo de Saldo</th>
                <th className="p-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-white/80">
              {renewalPolicies.map((pol) => (
                <tr key={pol.id} className="hover:bg-white/[0.01]">
                  <td className="p-3.5">
                    <div className="font-bold text-white">{pol.name}</div>
                    {pol.description && <p className="text-[10px] text-white/40">{pol.description}</p>}
                  </td>

                  <td className="p-3.5">
                    <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                      {pol.planTier}
                    </span>
                  </td>

                  <td className="p-3.5">
                    <span className="font-mono text-white/70">{pol.frequency}</span>
                  </td>

                  <td className="p-3.5 font-bold font-mono text-white">
                    +{pol.creditsAmount} cr
                  </td>

                  <td className="p-3.5">
                    {pol.accumulate || pol.allowAccumulate ? (
                      <span className="text-primary font-semibold">
                        Acumula {(pol.maxAccumulated ?? pol.maxAccumulateBalance) ? `(Máx: ${pol.maxAccumulated ?? pol.maxAccumulateBalance})` : "(Sem teto)"}
                      </span>
                    ) : (
                      <span className="text-white/40 italic">Substitui saldo anterior</span>
                    )}
                  </td>

                  <td className="p-3.5">
                    {(pol.isActive ?? pol.active ?? true) ? (
                      <span className="rounded bg-primary/10 border border-primary/30 px-2 py-0.5 text-[10px] text-primary font-bold">
                        ATIVO
                      </span>
                    ) : (
                      <span className="rounded bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] text-white/40">
                        INATIVO
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: ADICIONAR REGRA POR PLANO */}
      {ruleModalOp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d111c] p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-white">Preço Específico para {ruleModalOp.name}</h3>
            <p className="text-xs text-white/50 mt-1">
              Defina quanto esta operação custará para assinantes de um plano específico.
            </p>

            <form onSubmit={handleAddRule} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block text-white/70 mb-1">Plano Alvo (Tier)</label>
                <select
                  value={rulePlanTier}
                  onChange={(e) => setRulePlanTier(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#161b26] p-2.5 text-white font-mono"
                >
                  {PLAN_TIERS.map((tier) => (
                    <option key={tier} value={tier}>
                      {tier}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2 text-white/80 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ruleIsFree}
                    onChange={(e) => setRuleIsFree(e.target.checked)}
                    className="rounded bg-white/10 border-white/20"
                  />
                  <span>Operação gratuita neste plano</span>
                </label>
              </div>

              {!ruleIsFree && (
                <div>
                  <label className="block text-white/70 mb-1">Custo em Créditos</label>
                  <input
                    type="number"
                    min="0"
                    value={ruleCost}
                    onChange={(e) => setRuleCost(Number(e.target.value))}
                    className="w-full rounded-xl border border-white/10 bg-[#161b26] p-2.5 text-white font-mono"
                    required
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setRuleModalOp(null)}
                  className="rounded-xl border border-white/10 px-4 py-2 font-medium text-white/70 hover:bg-white/5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingRule}
                  className="rounded-xl bg-indigo-500/20 border border-indigo-500/40 px-4 py-2 font-bold text-indigo-300 hover:bg-indigo-500/30"
                >
                  {savingRule ? "Salvando..." : "Salvar Regra"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CADASTRAR NOVA OPERAÇÃO COBRÁVEL */}
      {showNewOpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d111c] p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-white">Cadastrar Nova Operação Cobrada</h3>
            <p className="text-xs text-white/50 mt-1">
              Adicione um novo tipo de geração para ser cobrado no catálogo do Tomadix.
            </p>

            <form onSubmit={handleCreateOperation} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block text-white/70 mb-1">Código Único (ex: GEN_IMAGE_CINEMA)</label>
                <input
                  type="text"
                  value={newOpCode}
                  onChange={(e) => setNewOpCode(e.target.value)}
                  placeholder="EX: GEN_SOUNDTRACK_PROMPT"
                  className="w-full rounded-xl border border-white/10 bg-[#161b26] p-2.5 text-white font-mono uppercase"
                  required
                />
              </div>

              <div>
                <label className="block text-white/70 mb-1">Nome de Exibição</label>
                <input
                  type="text"
                  value={newOpName}
                  onChange={(e) => setNewOpName(e.target.value)}
                  placeholder="ex: Geração de Trilha Sonora"
                  className="w-full rounded-xl border border-white/10 bg-[#161b26] p-2.5 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-white/70 mb-1">Categoria</label>
                <input
                  type="text"
                  value={newOpCategory}
                  onChange={(e) => setNewOpCategory(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#161b26] p-2.5 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-white/70 mb-1">Custo Padrão (Créditos)</label>
                <input
                  type="number"
                  min="0"
                  value={newOpDefaultCost}
                  onChange={(e) => setNewOpDefaultCost(Number(e.target.value))}
                  className="w-full rounded-xl border border-white/10 bg-[#161b26] p-2.5 text-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-white/70 mb-1">Descrição</label>
                <textarea
                  value={newOpDescription}
                  onChange={(e) => setNewOpDescription(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-white/10 bg-[#161b26] p-2.5 text-white resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowNewOpModal(false)}
                  className="rounded-xl border border-white/10 px-4 py-2 font-medium text-white/70 hover:bg-white/5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingOp}
                  className="rounded-xl bg-amber-500/20 border border-amber-500/40 px-4 py-2 font-bold text-amber-300 hover:bg-amber-500/30"
                >
                  {creatingOp ? "Cadastrando..." : "Cadastrar Operação"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NOVA POLÍTICA DE RENOVAÇÃO */}
      {showRenewalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d111c] p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-white">Criar Política de Renovação de Créditos</h3>
            <p className="text-xs text-white/50 mt-1">
              Configure concessões automáticas periódicas por plano.
            </p>

            <form onSubmit={handleCreateRenewalPolicy} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block text-white/70 mb-1">Nome da Política</label>
                <input
                  type="text"
                  value={renName}
                  onChange={(e) => setRenName(e.target.value)}
                  placeholder="ex: Recarga Mensal Plano PRO"
                  className="w-full rounded-xl border border-white/10 bg-[#161b26] p-2.5 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/70 mb-1">Plano (Tier)</label>
                  <select
                    value={renPlanTier}
                    onChange={(e) => setRenPlanTier(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#161b26] p-2.5 text-white font-mono"
                  >
                    {PLAN_TIERS.map((tier) => (
                      <option key={tier} value={tier}>
                        {tier}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-white/70 mb-1">Periodicidade</label>
                  <select
                    value={renFreq}
                    onChange={(e) => setRenFreq(e.target.value as any)}
                    className="w-full rounded-xl border border-white/10 bg-[#161b26] p-2.5 text-white font-mono"
                  >
                    <option value="DAILY">Diária</option>
                    <option value="WEEKLY">Semanal</option>
                    <option value="MONTHLY">Mensal</option>
                    <option value="YEARLY">Anual</option>
                    <option value="ONCE">Única (One-off)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-white/70 mb-1">Créditos a Conceder</label>
                <input
                  type="number"
                  min="1"
                  value={renAmount}
                  onChange={(e) => setRenAmount(Number(e.target.value))}
                  className="w-full rounded-xl border border-white/10 bg-[#161b26] p-2.5 text-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-white/80 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={renAllowAccumulate}
                    onChange={(e) => setRenAllowAccumulate(e.target.checked)}
                    className="rounded bg-white/10 border-white/20"
                  />
                  <span>Permitir acúmulo com saldo anterior (sem resetar)</span>
                </label>
              </div>

              {renAllowAccumulate && (
                <div>
                  <label className="block text-white/70 mb-1">Saldo Máximo Acumulável (opcional)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Sem limite"
                    value={renMaxAccumulate || ""}
                    onChange={(e) => setRenMaxAccumulate(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full rounded-xl border border-white/10 bg-[#161b26] p-2.5 text-white font-mono"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowRenewalModal(false)}
                  className="rounded-xl border border-white/10 px-4 py-2 font-medium text-white/70 hover:bg-white/5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingRenewal}
                  className="rounded-xl bg-amber-500/20 border border-amber-500/40 px-4 py-2 font-bold text-amber-300 hover:bg-amber-500/30"
                >
                  {creatingRenewal ? "Salvando..." : "Criar Política"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
