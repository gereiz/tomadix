"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";

interface CreditPricingRule {
  id: string;
  operationId: string;
  planTier?: string | null;
  creditCost?: number;
  cost?: number;
  isFree: boolean;
  priority?: number;
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
  defaultCreditCost?: number;
  defaultCost?: number;
  isFree: boolean;
  pricingRules?: CreditPricingRule[];
  rules?: CreditPricingRule[];
  version?: number;
}

const CATEGORY_TABS = [
  { id: "ALL", label: "Todas as Criações", icon: "🎬" },
  { id: "IMAGES", label: "Geração de Imagens", icon: "🎨" },
  { id: "PROMPTS", label: "Prompts de IA", icon: "✨" },
  { id: "SCENES", label: "Cenas & Roteiro", icon: "🎥" },
  { id: "ENTITIES", label: "Personagens & Ambientes", icon: "👥" },
  { id: "MULTIMODAL", label: "Multimodal & Estúdio", icon: "🎞️" },
  { id: "BATCH", label: "Processamento & Lote", icon: "⚡" },
];

const PLAN_TIERS = ["FREE", "PRO", "TEAM", "ENTERPRISE"];

export default function AdminCreditsConfigPage() {
  const [operations, setOperations] = useState<CreditOperation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Estados de edição inline
  const [editingOp, setEditingOp] = useState<CreditOperation | null>(null);
  const [editCost, setEditCost] = useState<number>(1);
  const [editIsFree, setEditIsFree] = useState<boolean>(false);
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [savingOp, setSavingOp] = useState(false);

  // Modal de regras por plano
  const [ruleModalOp, setRuleModalOp] = useState<CreditOperation | null>(null);
  const [newRuleTier, setNewRuleTier] = useState<string>("PRO");
  const [newRuleCost, setNewRuleCost] = useState<number>(0);
  const [newRuleIsFree, setNewRuleIsFree] = useState<boolean>(false);
  const [savingRule, setSavingRule] = useState<boolean>(false);

  // Modal para criar nova operação customizada
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("PROMPTS");
  const [newDefaultCost, setNewDefaultCost] = useState(2);
  const [newDescription, setNewDescription] = useState("");
  const [creatingOp, setCreatingOp] = useState(false);

  // Simulador de resolução
  const [simOpCode, setSimOpCode] = useState<string>("");
  const [simPlanTier, setSimPlanTier] = useState<string>("FREE");
  const [simResult, setSimResult] = useState<any>(null);
  const [simulating, setSimulating] = useState<boolean>(false);

  const fetchOperations = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/billing/credit-operations");
      if (res.ok) {
        const json = await res.json();
        const list: CreditOperation[] = json.operations || [];
        setOperations(list);
        if (list.length > 0 && !simOpCode) {
          setSimOpCode(list[0].code);
        }
      }
    } catch (err: any) {
      console.error("Erro ao carregar operações de crédito:", err);
      setNotification({ type: "error", message: "Falha ao carregar catálogo de operações." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOperations();
  }, []);

  const showToast = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Filtragem de operações por categoria visual e busca
  const filteredOperations = useMemo(() => {
    return operations.filter((op) => {
      // Filtro de Categoria
      let matchesCategory = true;
      if (activeCategory === "IMAGES") {
        matchesCategory = op.category === "IMAGES" || op.code === "GEN_IMAGE_DIRECT" || op.code.includes("IMAGE");
      } else if (activeCategory === "PROMPTS") {
        matchesCategory = ["PROMPTS", "PREMIUM", "EXPANSIONS"].includes(op.category) && !op.code.includes("SCENE") && op.code !== "GEN_IMAGE_DIRECT";
      } else if (activeCategory === "SCENES") {
        matchesCategory = op.category === "SCENES" || op.code.includes("SCENE") || op.code === "GEN_SCRIPT";
      } else if (activeCategory === "ENTITIES") {
        matchesCategory = ["CHARACTERS", "ENVIRONMENTS"].includes(op.category);
      } else if (activeCategory === "MULTIMODAL") {
        matchesCategory = ["ANALYSIS", "CREATION", "MULTIMODAL", "STUDIO"].includes(op.category) || op.code === "CINEMATIC_ANALYSIS" || op.code === "QUICK_CREATION";
      } else if (activeCategory === "BATCH") {
        matchesCategory = op.category === "BATCH";
      }

      // Filtro de Texto
      let matchesSearch = true;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        matchesSearch =
          op.name.toLowerCase().includes(q) ||
          op.code.toLowerCase().includes(q) ||
          (op.description || "").toLowerCase().includes(q);
      }

      return matchesCategory && matchesSearch;
    });
  }, [operations, activeCategory, searchQuery]);

  // Salvar alteração rápida na operação
  const handleSaveOperation = async (op: CreditOperation) => {
    try {
      setSavingOp(true);
      const res = await fetch("/api/admin/billing/credit-operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: op.code,
          name: op.name,
          category: op.category,
          description: op.description,
          defaultCreditCost: editCost,
          isFree: editIsFree,
          isActive: editIsActive,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao salvar alteração.");

      showToast("success", `Operação ${op.name} atualizada para ${editCost} créditos.`);
      setEditingOp(null);
      await fetchOperations();
    } catch (err: any) {
      showToast("error", err.message || "Erro ao salvar.");
    } finally {
      setSavingOp(false);
    }
  };

  // Abrir modal de edição rápida
  const openEditModal = (op: CreditOperation) => {
    setEditingOp(op);
    setEditCost(op.defaultCreditCost ?? op.defaultCost ?? 1);
    setEditIsFree(Boolean(op.isFree));
    setEditIsActive(Boolean(op.isActive));
  };

  // Criar nova regra específica por plano
  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleModalOp) return;

    try {
      setSavingRule(true);
      const res = await fetch(`/api/admin/billing/credit-operations/${ruleModalOp.id}/rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planTier: newRuleTier,
          creditCost: newRuleIsFree ? 0 : newRuleCost,
          isFree: newRuleIsFree,
          priority: 1,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao criar regra.");

      showToast("success", `Regra do plano ${newRuleTier} configurada com sucesso.`);
      await fetchOperations();

      // Atualizar objeto no modal
      const updatedListRes = await fetch("/api/admin/billing/credit-operations");
      if (updatedListRes.ok) {
        const updatedJson = await updatedListRes.json();
        const found = (updatedJson.operations || []).find((o: any) => o.id === ruleModalOp.id);
        if (found) setRuleModalOp(found);
      }
    } catch (err: any) {
      showToast("error", err.message || "Erro ao criar regra.");
    } finally {
      setSavingRule(false);
    }
  };

  // Excluir regra por plano
  const handleDeleteRule = async (ruleId: string) => {
    if (!ruleModalOp || !confirm("Deseja realmente remover esta regra específica de plano?")) return;

    try {
      const res = await fetch(`/api/admin/billing/credit-operations/${ruleModalOp.id}/rules?ruleId=${ruleId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao excluir regra.");

      showToast("success", "Regra removida. O plano voltará ao custo padrão da operação.");
      await fetchOperations();

      const updatedListRes = await fetch("/api/admin/billing/credit-operations");
      if (updatedListRes.ok) {
        const updatedJson = await updatedListRes.json();
        const found = (updatedJson.operations || []).find((o: any) => o.id === ruleModalOp.id);
        if (found) setRuleModalOp(found);
      }
    } catch (err: any) {
      showToast("error", err.message || "Erro ao remover regra.");
    }
  };

  // Cadastrar nova operação
  const handleCreateNewOperation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim()) return;

    try {
      setCreatingOp(true);
      const res = await fetch("/api/admin/billing/credit-operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newCode.trim().toUpperCase(),
          name: newName.trim(),
          category: newCategory,
          defaultCreditCost: newDefaultCost,
          description: newDescription.trim() || undefined,
          isActive: true,
          isFree: newDefaultCost === 0,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao criar operação.");

      showToast("success", `Nova operação '${newName}' cadastrada.`);
      setShowCreateModal(false);
      setNewCode("");
      setNewName("");
      setNewDescription("");
      setNewDefaultCost(2);
      await fetchOperations();
    } catch (err: any) {
      showToast("error", err.message || "Erro ao cadastrar operação.");
    } finally {
      setCreatingOp(false);
    }
  };

  // Simular resolução em tempo real
  const handleSimulate = async () => {
    if (!simOpCode) return;
    try {
      setSimulating(true);
      const res = await fetch(`/api/admin/billing/credit-operations/simulate?operationCode=${simOpCode}&planTier=${simPlanTier}`);
      if (res.ok) {
        const json = await res.json();
        setSimResult(json.resolution);
      }
    } catch (err) {
      console.error("Erro na simulação:", err);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Notificação Toast */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 rounded-xl px-4 py-3 text-xs font-semibold shadow-2xl transition-all ${
            notification.type === "success"
              ? "bg-primary/20 text-primary border border-primary/40"
              : "bg-red-950/90 text-red-300 border border-red-500/40"
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <span>Custos de Execução em Créditos por Tipo de Criação</span>
              <span className="rounded bg-primary/20 border border-primary/30 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
                Tabela Operacional
              </span>
            </h1>
          </div>
          <p className="text-xs text-white/50 mt-1 max-w-3xl leading-relaxed">
            Configure o custo em créditos de cada tipo de criação do estúdio (prompts, decupagem, análise multimodal,
            personagens, ambientes e geração rápida). As alterações entram em vigor instantaneamente em todo o sistema.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => setShowCreateModal(true)}
            className="rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-on-primary shadow-lg shadow-primary/20 hover:opacity-95 transition flex items-center gap-1.5"
          >
            <span>➕</span> Nova Operação
          </button>
          <button
            onClick={fetchOperations}
            disabled={loading}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 hover:text-white transition"
            title="Recarregar catálogo de operações"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Seletor de Categorias / Abas de Tipos de Criação */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 text-xs">
          {CATEGORY_TABS.map((tab) => {
            const isActive = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCategory(tab.id)}
                className={`whitespace-nowrap flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition ${
                  isActive
                    ? "bg-primary text-on-primary shadow-sm shadow-primary/20"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Campo de Busca Rápida */}
        <div className="w-full sm:w-64">
          <input
            type="text"
            placeholder="Buscar por nome ou código..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/30 focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {/* Grid de Operações / Tipos de Criação */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 rounded-2xl bg-white/5 border border-white/10" />
          ))}
        </div>
      ) : filteredOperations.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#0d111c] p-12 text-center">
          <span className="text-3xl">🔍</span>
          <h3 className="text-sm font-bold text-white mt-2">Nenhuma operação encontrada</h3>
          <p className="text-xs text-white/50 mt-1">Tente ajustar o termo da busca ou selecione outra categoria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOperations.map((op) => {
            const rules = op.pricingRules || op.rules || [];
            const effectiveCost = op.defaultCreditCost ?? op.defaultCost ?? 1;

            return (
              <div
                key={op.id}
                className="relative flex flex-col justify-between rounded-2xl border border-white/10 bg-[#0d111c] p-4 shadow-lg hover:border-white/20 transition group"
              >
                <div>
                  {/* Topo do Card: Categoria, Status e Custo */}
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded-md bg-white/5 border border-white/10 px-2 py-0.5 font-mono text-[9px] font-bold text-white/60 uppercase">
                      {op.category}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {op.isFree ? (
                        <span className="rounded bg-primary/20 border border-primary/40 px-2 py-0.5 text-[10px] font-bold text-primary">
                          GRATUITO
                        </span>
                      ) : (
                        <div className="flex items-center gap-1 rounded-lg bg-primary/10 border border-primary/30 px-2.5 py-0.5">
                          <span className="text-xs font-black text-primary font-mono">{effectiveCost}</span>
                          <span className="text-[10px] text-primary/80 font-medium">créditos</span>
                        </div>
                      )}
                      <span
                        className={`h-2 w-2 rounded-full ${
                          op.isActive ? "bg-primary" : "bg-red-400"
                        }`}
                        title={op.isActive ? "Operação Ativa" : "Operação Inativa"}
                      />
                    </div>
                  </div>

                  {/* Nome e Código Técnico */}
                  <div className="mt-3">
                    <h3 className="text-sm font-bold text-white group-hover:text-primary transition-colors">
                      {op.name}
                    </h3>
                    <div className="font-mono text-[10px] text-white/40 mt-0.5">{op.code}</div>
                  </div>

                  {/* Descrição */}
                  <p className="mt-2 text-xs text-white/60 line-clamp-2 leading-relaxed">
                    {op.description || "Sem descrição operacional cadastrada."}
                  </p>

                  {/* Regras por Plano Cadastradas */}
                  {rules.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-white/5">
                      <span className="text-[10px] font-semibold text-white/40 block mb-1">
                        Regras Específicas por Plano:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {rules.map((r) => (
                          <span
                            key={r.id}
                            className="inline-flex items-center gap-1 rounded bg-white/5 border border-white/10 px-1.5 py-0.5 text-[10px] font-mono text-white/80"
                          >
                            <span className="text-amber-300 font-bold">{r.planTier}:</span>
                            <span>{r.isFree ? "Grátis" : `${r.creditCost ?? r.cost} cr`}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Rodapé do Card com Ações */}
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setRuleModalOp(op)}
                    className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/70 hover:bg-white/10 hover:text-white transition flex items-center gap-1"
                  >
                    <span>🎯</span> Regras por Plano ({rules.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => openEditModal(op)}
                    className="rounded-lg bg-primary/20 border border-primary/30 px-3 py-1 text-[11px] font-bold text-primary hover:bg-primary/30 transition flex items-center gap-1"
                  >
                    <span>✏️</span> Editar Custo
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Painel do Simulador de Cobrança ao Vivo */}
      <div className="rounded-2xl border border-white/10 bg-[#0d111c] p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>⚡ Simulador de Resolução de Custo em Tempo Real</span>
              <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-mono text-white/60">
                Auditoria de Preço
              </span>
            </h3>
            <p className="text-xs text-white/40 mt-0.5">
              Teste instantaneamente quanto será cobrado de um estúdio ao disparar uma operação com base em seu plano.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="text-[11px] font-semibold text-white/60 block mb-1">Tipo de Criação / Operação</label>
            <select
              value={simOpCode}
              onChange={(e) => setSimOpCode(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white focus:border-primary focus:outline-none"
            >
              {operations.map((o) => (
                <option key={o.code} value={o.code} className="bg-[#12151e] text-white">
                  {o.name} ({o.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-white/60 block mb-1">Plano do Workspace</label>
            <select
              value={simPlanTier}
              onChange={(e) => setSimPlanTier(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white focus:border-primary focus:outline-none"
            >
              {PLAN_TIERS.map((tier) => (
                <option key={tier} value={tier} className="bg-[#12151e] text-white">
                  Plano {tier}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleSimulate}
            disabled={simulating || !simOpCode}
            className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-on-primary shadow-md shadow-primary/20 hover:opacity-95 transition flex items-center justify-center gap-1.5"
          >
            {simulating ? "Calculando..." : "Simular Custo Efetivo ↗"}
          </button>
        </div>

        {simResult && (
          <div className="mt-4 rounded-xl border border-primary/30 bg-primary/10 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-[10px] text-white/40 font-mono uppercase block">Resultado Calculado:</span>
              <span className="font-bold text-white text-sm">{simResult.operationName}</span>
              <span className="text-white/60 ml-2">para workspace no Plano {simResult.currentPlanTier}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[10px] text-white/40 block">Regra Aplicada:</span>
                <span className="font-mono text-xs text-amber-300 font-semibold">{simResult.appliedRule}</span>
              </div>
              <div className="rounded-xl bg-primary px-4 py-1.5 text-center shadow-lg shadow-primary/25">
                <span className="text-xs font-bold text-on-primary block">
                  {simResult.creditCost === 0 ? "GRÁTIS" : `${simResult.creditCost} créditos`}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: EDIÇÃO RÁPIDA DE CUSTO */}
      {editingOp && (
        <div className="fixed inset-0 overflow-y-auto z-50 flex items-center-safe justify-center bg-black/80 p-3 sm:p-4">
          <div className="max-w-md w-full rounded-2xl border border-white/10 bg-[#0d1017] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Configurar Custo de Criação</h3>
              <button
                onClick={() => setEditingOp(null)}
                className="text-white/40 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div>
              <h4 className="text-sm font-bold text-primary">{editingOp.name}</h4>
              <p className="text-xs text-white/50 font-mono mt-0.5">{editingOp.code}</p>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-medium text-white/70 mb-1">
                  Custo Padrão em Créditos
                </label>
                <input
                  type="number"
                  min="0"
                  max="1000"
                  value={editCost}
                  onChange={(e) => setEditCost(parseInt(e.target.value, 10) || 0)}
                  disabled={editIsFree}
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-sm text-white font-mono focus:border-primary focus:outline-none disabled:opacity-40"
                />
                <span className="text-[10px] text-white/40 mt-1 block">
                  Custo deduzido no workspace a cada execução deste tipo de criação.
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3">
                <div>
                  <span className="text-xs font-semibold text-white block">Operação Gratuita</span>
                  <span className="text-[10px] text-white/40">Não deduz créditos de nenhum usuário.</span>
                </div>
                <input
                  type="checkbox"
                  checked={editIsFree}
                  onChange={(e) => {
                    setEditIsFree(e.target.checked);
                    if (e.target.checked) setEditCost(0);
                  }}
                  className="h-4 w-4 rounded border-white/20 bg-white/10 text-primary focus:ring-0"
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3">
                <div>
                  <span className="text-xs font-semibold text-white block">Operação Ativa no Sistema</span>
                  <span className="text-[10px] text-white/40">Se desativada, a IA bloqueia sua execução.</span>
                </div>
                <input
                  type="checkbox"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-white/10 text-primary focus:ring-0"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setEditingOp(null)}
                className="rounded-xl px-4 py-2 text-xs text-white/60 hover:text-white transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={savingOp}
                onClick={() => handleSaveOperation(editingOp)}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-on-primary shadow-md shadow-primary/20 hover:opacity-95 transition"
              >
                {savingOp ? "Salvando..." : "Salvar Configuração"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REGRAS ESPECÍFICAS POR PLANO */}
      {ruleModalOp && (
        <div className="fixed inset-0 overflow-y-auto z-50 flex items-center-safe justify-center bg-black/80 p-3 sm:p-4">
          <div className="max-w-lg w-full rounded-2xl border border-white/10 bg-[#0d1017] p-6 space-y-4 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Regras por Plano Contratado</h3>
                <p className="text-xs text-white/50">{ruleModalOp.name} ({ruleModalOp.code})</p>
              </div>
              <button
                onClick={() => setRuleModalOp(null)}
                className="text-white/40 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {/* Lista de regras atuais */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-white/60 block">Regras Ativas:</span>
              {(ruleModalOp.pricingRules || ruleModalOp.rules || []).length === 0 ? (
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-center text-xs text-white/40">
                  Nenhuma regra específica cadastrada. Todos os planos utilizam o custo padrão ({ruleModalOp.defaultCreditCost ?? ruleModalOp.defaultCost ?? 1} créditos).
                </div>
              ) : (
                <div className="space-y-1.5">
                  {(ruleModalOp.pricingRules || ruleModalOp.rules || []).map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3 text-xs"
                    >
                      <div>
                        <span className="font-bold text-amber-300 font-mono">Plano {r.planTier}</span>
                        <span className="text-white/40 text-[10px] ml-2">
                          {r.isFree ? "Isenção total de créditos" : `Custo customizado: ${r.creditCost ?? r.cost} créditos`}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteRule(r.id)}
                        className="rounded-lg bg-red-500/10 border border-red-500/20 px-2 py-1 text-[10px] font-bold text-red-300 hover:bg-red-500/20 transition"
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Adicionar nova regra */}
            <form onSubmit={handleCreateRule} className="pt-3 border-t border-white/10 space-y-3">
              <span className="text-xs font-bold text-white block">Adicionar Desconto ou Gratuidade por Plano:</span>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-white/60 block mb-1">Plano Alvo</label>
                  <select
                    value={newRuleTier}
                    onChange={(e) => setNewRuleTier(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 p-2 text-xs text-white focus:border-primary focus:outline-none"
                  >
                    {PLAN_TIERS.map((tier) => (
                      <option key={tier} value={tier} className="bg-[#12151e] text-white">
                        {tier}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-white/60 block mb-1">Custo para o Plano</label>
                  <input
                    type="number"
                    min="0"
                    disabled={newRuleIsFree}
                    value={newRuleCost}
                    onChange={(e) => setNewRuleCost(parseInt(e.target.value, 10) || 0)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 p-2 text-xs text-white font-mono focus:border-primary focus:outline-none disabled:opacity-40"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="chkFree"
                  checked={newRuleIsFree}
                  onChange={(e) => setNewRuleIsFree(e.target.checked)}
                  className="rounded border-white/20 bg-white/10 text-primary"
                />
                <label htmlFor="chkFree" className="text-xs text-white/70">
                  Tornar 100% gratuito para assinantes deste plano
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="submit"
                  disabled={savingRule}
                  className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-on-primary shadow-md shadow-primary/20 hover:opacity-95 transition"
                >
                  {savingRule ? "Adicionando..." : "Adicionar Regra ao Plano"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CRIAR NOVA OPERAÇÃO */}
      {showCreateModal && (
        <div className="fixed inset-0 overflow-y-auto z-50 flex items-center-safe justify-center bg-black/80 p-3 sm:p-4">
          <div className="max-w-md w-full rounded-2xl border border-white/10 bg-[#0d1017] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Cadastrar Nova Operação</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-white/40 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewOperation} className="space-y-3 pt-1">
              <div>
                <label className="text-xs text-white/70 block mb-1">Código Estável (Único)</label>
                <input
                  type="text"
                  required
                  placeholder="EX: GEN_SOUNDTRACK"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs text-white font-mono focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-white/70 block mb-1">Nome de Exibição</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Geração de Trilha Sonora"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs text-white focus:border-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-white/70 block mb-1">Categoria</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs text-white focus:border-primary focus:outline-none"
                  >
                    <option value="PROMPTS">Prompts de IA</option>
                    <option value="SCENES">Cenas & Roteiro</option>
                    <option value="CHARACTERS">Personagens</option>
                    <option value="ENVIRONMENTS">Ambientes</option>
                    <option value="ANALYSIS">Multimodal & Visão</option>
                    <option value="BATCH">Processamento em Lote</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-white/70 block mb-1">Custo Padrão</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newDefaultCost}
                    onChange={(e) => setNewDefaultCost(parseInt(e.target.value, 10) || 0)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs text-white font-mono focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-white/70 block mb-1">Descrição</label>
                <textarea
                  rows={2}
                  placeholder="Descrição da finalidade cinematográfica desta operação..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs text-white focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl px-4 py-2 text-xs text-white/60 hover:text-white transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingOp}
                  className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-on-primary shadow-md shadow-primary/20 hover:opacity-95 transition"
                >
                  {creatingOp ? "Criando..." : "Salvar Operação"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

