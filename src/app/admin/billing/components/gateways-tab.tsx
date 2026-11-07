"use client";

import { useState, useEffect } from "react";

interface GatewayConfig {
  id: string;
  name: string;
  identifier: string;
  provider: "STRIPE" | "MERCADOPAGO" | "SANDBOX";
  environment: "SANDBOX" | "PRODUCTION";
  status: "ACTIVE" | "INACTIVE" | "CONFIG_PENDING" | "ERROR";
  connectionStatus: "CONNECTED" | "DISCONNECTED" | "UNTESTED" | "FAILED";
  supportedCurrencies: string[];
  supportedCountries: string[];
  paymentMethods: string[];
  lastTestedAt: string | null;
  lastError: string | null;
  isCheckoutDefault: boolean;
  priorityOrder: number;
  selectionRules: any;
  maskedCredentials: Record<string, string>;
  hasConfiguredCredentials: boolean;
  activeSubscriptionsCount: number;
  mappingsCount: number;
  webhookEventsCount: number;
  mappings: any[];
}

interface PriceMapping {
  id: string;
  gatewayConfigId: string;
  planTier: string;
  environment: string;
  externalProductId: string | null;
  externalPriceIdMonthly: string | null;
  externalPriceIdYearly: string | null;
  currency: string;
  syncStatus: string;
  lastSyncedAt: string | null;
  gatewayConfig?: {
    id: string;
    name: string;
    provider: string;
    environment: string;
  };
  plan?: {
    name: string;
    tier: string;
  };
}

export function GatewaysTab({ onNotify }: { onNotify: (type: "success" | "error", message: string) => void }) {
  const [gateways, setGateways] = useState<GatewayConfig[]>([]);
  const [mappings, setMappings] = useState<PriceMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [environmentFilter, setEnvironmentFilter] = useState<"ALL" | "SANDBOX" | "PRODUCTION">("ALL");

  // Modais
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResultModal, setTestResultModal] = useState<any | null>(null);
  const [editCredsModal, setEditCredsModal] = useState<GatewayConfig | null>(null);
  const [editCredsForm, setEditCredsForm] = useState<Record<string, string>>({});
  const [savingCreds, setSavingCreds] = useState(false);

  const [toggleConfirmModal, setToggleConfirmModal] = useState<{
    gateway: GatewayConfig;
    newStatus: "ACTIVE" | "INACTIVE";
  } | null>(null);
  const [toggling, setToggling] = useState(false);

  const [mappingModal, setMappingModal] = useState<{
    gatewayConfigId: string;
    planTier: string;
    environment: "SANDBOX" | "PRODUCTION";
    externalProductId: string;
    externalPriceIdMonthly: string;
    externalPriceIdYearly: string;
    currency: string;
  } | null>(null);
  const [savingMapping, setSavingMapping] = useState(false);
  const [fetchingExternal, setFetchingExternal] = useState(false);
  const [externalCatalog, setExternalCatalog] = useState<any[]>([]);

  // Carregar dados
  const loadGateways = async () => {
    setLoading(true);
    try {
      const [gRes, mRes] = await Promise.all([
        fetch("/api/admin/billing/gateways"),
        fetch("/api/admin/billing/gateways/mappings"),
      ]);

      if (gRes.ok) {
        const d = await gRes.json();
        setGateways(d.gateways || []);
      }
      if (mRes.ok) {
        const d = await mRes.json();
        setMappings(d.mappings || []);
      }
    } catch (err: any) {
      onNotify("error", "Erro ao carregar configurações de gateways: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGateways();
  }, []);

  // Filtrar gateways
  const filteredGateways = gateways.filter((gw) => {
    if (environmentFilter === "ALL") return true;
    return gw.environment === environmentFilter;
  });

  // Testar conexão
  const handleTestConnection = async (gateway: GatewayConfig) => {
    setTestingId(gateway.id);
    try {
      const res = await fetch(`/api/admin/billing/gateways/${gateway.id}/test`, {
        method: "POST",
      });
      const data = await res.json();
      setTestResultModal({
        gatewayName: gateway.name,
        provider: gateway.provider,
        environment: gateway.environment,
        success: data.success,
        result: data.result || { message: data.error },
      });
      loadGateways();
    } catch (err: any) {
      onNotify("error", "Falha de rede ao testar conexão: " + err.message);
    } finally {
      setTestingId(null);
    }
  };

  // Abrir modal de credenciais
  const handleOpenCredsModal = (gw: GatewayConfig) => {
    setEditCredsModal(gw);
    setEditCredsForm({ ...gw.maskedCredentials });
  };

  // Salvar credenciais
  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCredsModal) return;
    setSavingCreds(true);
    try {
      const res = await fetch("/api/admin/billing/gateways", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: editCredsModal.identifier,
          name: editCredsModal.name,
          provider: editCredsModal.provider,
          environment: editCredsModal.environment,
          credentials: editCredsForm,
          status: editCredsModal.status === "CONFIG_PENDING" ? "ACTIVE" : editCredsModal.status,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      onNotify("success", "Credenciais criptografadas e salvas com sucesso!");
      setEditCredsModal(null);
      loadGateways();
    } catch (err: any) {
      onNotify("error", err.message);
    } finally {
      setSavingCreds(false);
    }
  };

  // Confirmar alternância de status
  const handleToggleStatus = async () => {
    if (!toggleConfirmModal) return;
    setToggling(true);
    try {
      const res = await fetch(
        `/api/admin/billing/gateways/${toggleConfirmModal.gateway.id}/toggle`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: toggleConfirmModal.newStatus }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.warning) {
        onNotify("success", `Status alterado. ${data.warning}`);
      } else {
        onNotify("success", `Gateway ${toggleConfirmModal.newStatus === "ACTIVE" ? "ativado" : "desativado"} com sucesso.`);
      }

      setToggleConfirmModal(null);
      loadGateways();
    } catch (err: any) {
      onNotify("error", err.message);
    } finally {
      setToggling(false);
    }
  };

  // Definir como padrão
  const handleSetDefault = async (gw: GatewayConfig) => {
    try {
      const res = await fetch("/api/admin/billing/gateways", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: gw.identifier,
          name: gw.name,
          provider: gw.provider,
          environment: gw.environment,
          isCheckoutDefault: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      onNotify("success", `${gw.name} definido como gateway padrão para ${gw.environment}.`);
      loadGateways();
    } catch (err: any) {
      onNotify("error", err.message);
    }
  };

  // Buscar produtos externos para importação
  const handleFetchExternalCatalog = async (gatewayConfigId: string) => {
    setFetchingExternal(true);
    try {
      const res = await fetch(`/api/admin/billing/gateways/${gatewayConfigId}/external-prices`);
      const data = await res.json();
      if (res.ok) {
        setExternalCatalog(data.products || []);
      } else {
        onNotify("error", data.error || "Não foi possível consultar catálogo externo.");
      }
    } catch (err: any) {
      onNotify("error", err.message);
    } finally {
      setFetchingExternal(false);
    }
  };

  // Salvar mapeamento de preço
  const handleSaveMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mappingModal) return;
    setSavingMapping(true);
    try {
      const res = await fetch("/api/admin/billing/gateways/mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mappingModal),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      onNotify("success", "Associação entre plano e IDs externos salva com sucesso!");
      setMappingModal(null);
      loadGateways();
    } catch (err: any) {
      onNotify("error", err.message);
    } finally {
      setSavingMapping(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Cabeçalho de Controle e Filtros de Ambiente */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>🌐</span> Provedores de Pagamento & Gateways
          </h2>
          <p className="text-xs text-white/50">
            Administração desacoplada de provedores, credenciais criptografadas, testes de conectividade sem cobrança e isolamento total entre Sandbox e Produção.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
          <button
            onClick={() => setEnvironmentFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              environmentFilter === "ALL"
                ? "bg-amber-400 text-black shadow-sm"
                : "text-white/60 hover:text-white"
            }`}
          >
            Todos ({gateways.length})
          </button>
          <button
            onClick={() => setEnvironmentFilter("SANDBOX")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
              environmentFilter === "SANDBOX"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                : "text-white/60 hover:text-white"
            }`}
          >
            <span>🧪</span> Sandbox ({gateways.filter((g) => g.environment === "SANDBOX").length})
          </button>
          <button
            onClick={() => setEnvironmentFilter("PRODUCTION")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
              environmentFilter === "PRODUCTION"
                ? "bg-primary/20 text-primary border border-primary/40"
                : "text-white/60 hover:text-white"
            }`}
          >
            <span>🚀</span> Produção ({gateways.filter((g) => g.environment === "PRODUCTION").length})
          </button>
        </div>
      </div>

      {/* Lista de Gateways Cadastrados */}
      {loading ? (
        <div className="text-xs text-white/50 text-center py-8">Carregando configurações de gateways...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredGateways.map((gw) => {
          const isStripe = gw.provider === "STRIPE";
          const isMercadoPago = gw.provider === "MERCADOPAGO";

          return (
            <div
              key={gw.id}
              className={`rounded-2xl border p-6 flex flex-col justify-between transition ${
                gw.status === "ACTIVE"
                  ? "border-white/15 bg-[#0d111c] shadow-lg shadow-black/20"
                  : "border-white/5 bg-[#0a0d16] opacity-80"
              }`}
            >
              <div>
                {/* Header do Card */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-lg shadow-md ${
                        isStripe
                          ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white"
                          : isMercadoPago
                          ? "bg-gradient-to-br from-cyan-400 to-blue-600 text-black font-extrabold"
                          : "bg-gradient-to-br from-amber-400 to-orange-500 text-black font-mono"
                      }`}
                    >
                      {isStripe ? "S" : isMercadoPago ? "MP" : "SB"}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        {gw.name}
                        {gw.isCheckoutDefault && (
                          <span className="text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/40 px-2 py-0.5 rounded-full font-mono">
                            Padrão
                          </span>
                        )}
                      </h3>
                      <p className="text-[11px] font-mono text-white/40">{gw.identifier}</p>
                    </div>
                  </div>

                  {/* Badges de Ambiente e Status */}
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                        gw.environment === "PRODUCTION"
                          ? "bg-primary/20 text-primary border border-primary/40"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      }`}
                    >
                      {gw.environment}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                        gw.status === "ACTIVE"
                          ? "bg-primary/10 text-primary"
                          : gw.status === "CONFIG_PENDING"
                          ? "bg-amber-500/10 text-amber-400"
                          : "bg-rose-500/10 text-rose-400"
                      }`}
                    >
                      {gw.status === "ACTIVE"
                        ? "Ativo"
                        : gw.status === "CONFIG_PENDING"
                        ? "Pendente"
                        : "Inativo"}
                    </span>
                  </div>
                </div>

                {/* Status de Conexão */}
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 mb-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-white/50">Estado de Conexão:</span>
                    <span
                      className={`font-semibold flex items-center gap-1.5 ${
                        gw.connectionStatus === "CONNECTED"
                          ? "text-primary"
                          : gw.connectionStatus === "FAILED"
                          ? "text-rose-400"
                          : gw.connectionStatus === "UNTESTED"
                          ? "text-amber-400"
                          : "text-white/40"
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-current"></span>
                      {gw.connectionStatus === "CONNECTED"
                        ? "Conectado e Operacional"
                        : gw.connectionStatus === "FAILED"
                        ? "Falha no Teste"
                        : gw.connectionStatus === "UNTESTED"
                        ? "Não Testado"
                        : "Desconectado"}
                    </span>
                  </div>

                  {gw.lastTestedAt && (
                    <div className="flex items-center justify-between text-[11px] text-white/40">
                      <span>Última Verificação:</span>
                      <span className="font-mono">
                        {new Date(gw.lastTestedAt).toLocaleString("pt-BR")}
                      </span>
                    </div>
                  )}

                  {gw.lastError && (
                    <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-2 text-[11px] text-rose-300 font-mono break-words">
                      {gw.lastError}
                    </div>
                  )}
                </div>

                {/* Métricas e Capacidades */}
                <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                  <div className="rounded-xl bg-white/5 p-2.5">
                    <span className="text-white/40 block text-[10px] uppercase font-bold">
                      Assinaturas Ativas
                    </span>
                    <span className="text-sm font-bold font-mono text-white">
                      {gw.activeSubscriptionsCount}
                    </span>
                  </div>
                  <div className="rounded-xl bg-white/5 p-2.5">
                    <span className="text-white/40 block text-[10px] uppercase font-bold">
                      Preços Mapeados
                    </span>
                    <span className="text-sm font-bold font-mono text-white">
                      {gw.mappingsCount} plano(s)
                    </span>
                  </div>
                </div>

                {/* Capacidades & Moedas */}
                <div className="space-y-1 text-[11px] text-white/50 mb-4">
                  <div className="flex items-center justify-between">
                    <span>Moedas suportadas:</span>
                    <span className="font-mono text-white/70">
                      {(gw.supportedCurrencies || []).join(", ") || "BRL"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Métodos de Pagamento:</span>
                    <span className="font-mono text-white/70">
                      {(gw.paymentMethods || []).join(", ")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Barra de Ações Operacionais */}
              <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTestConnection(gw)}
                    disabled={testingId === gw.id}
                    className="rounded-xl bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <span>⚡</span>
                    {testingId === gw.id ? "Testando..." : "Testar Conexão"}
                  </button>

                  <button
                    onClick={() => handleOpenCredsModal(gw)}
                    className="rounded-xl bg-amber-400/10 border border-amber-400/30 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-400/20 transition flex items-center gap-1.5"
                  >
                    <span>🔑</span> Credenciais
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {!gw.isCheckoutDefault && gw.status === "ACTIVE" && (
                    <button
                      onClick={() => handleSetDefault(gw)}
                      className="rounded-xl bg-sky-500/10 border border-sky-500/30 px-2.5 py-1.5 text-[11px] font-semibold text-sky-300 hover:bg-sky-500/20 transition"
                      title="Tornar gateway preferencial para novos checkouts no ambiente"
                    >
                      Tornar Padrão
                    </button>
                  )}

                  <button
                    onClick={() =>
                      setToggleConfirmModal({
                        gateway: gw,
                        newStatus: gw.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
                      })
                    }
                    className={`rounded-xl px-2.5 py-1.5 text-[11px] font-semibold transition ${
                      gw.status === "ACTIVE"
                        ? "bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
                        : "bg-primary/10 text-primary hover:bg-primary/20"
                    }`}
                  >
                    {gw.status === "ACTIVE" ? "Desativar" : "Ativar"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* SEÇÃO DE MAPEAMENTO ENTRE PLANOS E PREÇOS EXTERNOS */}
      <div className="rounded-2xl border border-white/10 bg-[#0d111c] p-6 space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>🏷️</span> Associação entre Planos Internos e Catálogo Externo
            </h3>
            <p className="text-xs text-white/50">
              Mapeie os tiers comerciais do Tomadix aos Product IDs e Price IDs do Stripe ou Mercado Pago para evitar cobranças divergentes.
            </p>
          </div>

          <button
            onClick={() => {
              const defaultGw = gateways[0];
              setMappingModal({
                gatewayConfigId: defaultGw?.id || "",
                planTier: "PRO",
                environment: "SANDBOX",
                externalProductId: "",
                externalPriceIdMonthly: "",
                externalPriceIdYearly: "",
                currency: "BRL",
              });
            }}
            className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-black hover:bg-amber-300 transition flex items-center gap-1.5"
          >
            <span>➕</span> Nova Associação
          </button>
        </div>

        {/* Tabela de Mapeamentos */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 text-white/50 uppercase font-mono text-[10px]">
              <tr>
                <th className="p-3">Plano Interno</th>
                <th className="p-3">Gateway</th>
                <th className="p-3">Ambiente</th>
                <th className="p-3">Product ID Externo</th>
                <th className="p-3">Price ID Mensal</th>
                <th className="p-3">Price ID Anual</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {mappings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-white/40 font-sans">
                    Nenhum mapeamento explícito cadastrado. O sistema usará os identificadores padrão ou modo inline dinâmico.
                  </td>
                </tr>
              ) : (
                mappings.map((m) => (
                  <tr key={m.id} className="hover:bg-white/[0.02] transition">
                    <td className="p-3 font-sans font-bold text-white">
                      {m.plan?.name || m.planTier}
                      <span className="block text-[10px] font-mono text-white/40">{m.planTier}</span>
                    </td>
                    <td className="p-3 text-white/80 font-sans">
                      {m.gatewayConfig?.name || "Gateway"}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          m.environment === "PRODUCTION"
                            ? "bg-primary/20 text-primary"
                            : "bg-amber-500/20 text-amber-300"
                        }`}
                      >
                        {m.environment}
                      </span>
                    </td>
                    <td className="p-3 text-white/60 text-[11px]">
                      {m.externalProductId || "—"}
                    </td>
                    <td className="p-3 text-primary text-[11px]">
                      {m.externalPriceIdMonthly || "—"}
                    </td>
                    <td className="p-3 text-cyan-300 text-[11px]">
                      {m.externalPriceIdYearly || "—"}
                    </td>
                    <td className="p-3">
                      <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded font-bold">
                        {m.syncStatus}
                      </span>
                    </td>
                    <td className="p-3 text-right font-sans">
                      <button
                        onClick={() =>
                          setMappingModal({
                            gatewayConfigId: m.gatewayConfigId,
                            planTier: m.planTier,
                            environment: m.environment as any,
                            externalProductId: m.externalProductId || "",
                            externalPriceIdMonthly: m.externalPriceIdMonthly || "",
                            externalPriceIdYearly: m.externalPriceIdYearly || "",
                            currency: m.currency,
                          })
                        }
                        className="text-amber-400 hover:text-amber-300 font-semibold"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: TESTE DE CONEXÃO REALIZADO */}
      {testResultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="max-w-md w-full rounded-2xl border border-white/10 bg-[#0d111c] p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                  testResultModal.success ? "bg-primary/20 text-primary" : "bg-rose-500/20 text-rose-300"
                }`}
              >
                {testResultModal.success ? "✓" : "✕"}
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Resultado do Teste de Conexão</h3>
                <p className="text-xs text-white/50">{testResultModal.gatewayName} ({testResultModal.environment})</p>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-white/50">Status:</span>
                <span className={`font-bold ${testResultModal.success ? "text-primary" : "text-rose-400"}`}>
                  {testResultModal.success ? "Conexão Bem-Sucedida" : "Falha na Conexão"}
                </span>
              </div>
              {testResultModal.result.latencyMs !== undefined && (
                <div className="flex justify-between">
                  <span className="text-white/50">Latência da API:</span>
                  <span className="font-mono text-white">{testResultModal.result.latencyMs}ms</span>
                </div>
              )}
              <div className="pt-2 border-t border-white/10 text-white/80">
                <span className="text-white/40 block text-[10px] uppercase font-bold mb-1">Resposta do Provedor:</span>
                <p className="font-mono text-[11px] bg-black/30 p-2 rounded-lg text-white/80 break-words">
                  {testResultModal.result.message}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setTestResultModal(null)}
                className="rounded-xl bg-white/10 px-5 py-2 text-xs font-bold text-white hover:bg-white/20"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: GESTÃO SEGURA DE CREDENCIAIS */}
      {editCredsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="max-w-lg w-full rounded-2xl border border-white/10 bg-[#0d111c] p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>🔑</span> Credenciais Seguras — {editCredsModal.name}
                </h3>
                <p className="text-[11px] text-white/50">Ambiente: {editCredsModal.environment}</p>
              </div>
              <span className="text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded">
                AES-256-GCM
              </span>
            </div>

            <div className="rounded-xl bg-sky-500/10 border border-sky-500/20 p-3 text-[11px] text-sky-200">
              🛡️ <strong>Segurança Absoluta:</strong> Os segredos são criptografados com chave mestre externa e nunca são devolvidos em texto puro à interface. Valores mascarados (••••••••) preservam o segredo original se não forem alterados.
            </div>

            <form onSubmit={handleSaveCredentials} className="space-y-4 text-xs">
              {editCredsModal.provider === "STRIPE" && (
                <>
                  <div>
                    <label className="text-white/60 block mb-1 font-semibold">
                      Chave Secreta da API (Secret Key)
                    </label>
                    <input
                      type="text"
                      placeholder="sk_test_... ou sk_live_..."
                      value={editCredsForm.apiKey || ""}
                      onChange={(e) => setEditCredsForm({ ...editCredsForm, apiKey: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-white font-mono text-xs focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-white/60 block mb-1 font-semibold">
                      Chave Pública (Publishable Key)
                    </label>
                    <input
                      type="text"
                      placeholder="pk_test_... ou pk_live_..."
                      value={editCredsForm.publishableKey || ""}
                      onChange={(e) => setEditCredsForm({ ...editCredsForm, publishableKey: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-white font-mono text-xs focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-white/60 block mb-1 font-semibold">
                      Segredo do Webhook (Signing Secret)
                    </label>
                    <input
                      type="text"
                      placeholder="whsec_..."
                      value={editCredsForm.webhookSecret || ""}
                      onChange={(e) => setEditCredsForm({ ...editCredsForm, webhookSecret: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-white font-mono text-xs focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                </>
              )}

              {editCredsModal.provider === "MERCADOPAGO" && (
                <>
                  <div>
                    <label className="text-white/60 block mb-1 font-semibold">
                      Access Token do Mercado Pago
                    </label>
                    <input
                      type="text"
                      placeholder="TEST-... ou APP_USR-..."
                      value={editCredsForm.accessToken || ""}
                      onChange={(e) => setEditCredsForm({ ...editCredsForm, accessToken: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-white font-mono text-xs focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-white/60 block mb-1 font-semibold">
                      Chave Pública (Public Key)
                    </label>
                    <input
                      type="text"
                      placeholder="TEST-... ou APP_USR-..."
                      value={editCredsForm.publicKey || ""}
                      onChange={(e) => setEditCredsForm({ ...editCredsForm, publicKey: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-white font-mono text-xs focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-white/60 block mb-1 font-semibold">
                      Segredo do Webhook (HMAC Secret)
                    </label>
                    <input
                      type="text"
                      placeholder="Segredo para verificação de x-signature"
                      value={editCredsForm.webhookSecret || ""}
                      onChange={(e) => setEditCredsForm({ ...editCredsForm, webhookSecret: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-white font-mono text-xs focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                </>
              )}

              {editCredsModal.provider === "SANDBOX" && (
                <div>
                  <label className="text-white/60 block mb-1 font-semibold">
                    Segredo de Assinatura do Webhook Sandbox
                  </label>
                  <input
                    type="text"
                    placeholder="sandbox_secret_..."
                    value={editCredsForm.webhookSecret || ""}
                    onChange={(e) => setEditCredsForm({ ...editCredsForm, webhookSecret: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-white font-mono text-xs focus:border-amber-400 focus:outline-none"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditCredsModal(null)}
                  className="rounded-xl bg-white/10 px-4 py-2 font-semibold text-white/70 hover:bg-white/20"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingCreds}
                  className="rounded-xl bg-amber-400 px-5 py-2 font-bold text-black hover:bg-amber-300 disabled:opacity-50"
                >
                  {savingCreds ? "Criptografando & Salvando..." : "Criptografar e Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CONFIRMAÇÃO DE ALTERNÂNCIA DE STATUS COM AVISO DE ASSINATURAS */}
      {toggleConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="max-w-md w-full rounded-2xl border border-white/10 bg-[#0d111c] p-6 space-y-4">
            <h3 className="text-base font-bold text-white">
              {toggleConfirmModal.newStatus === "ACTIVE"
                ? "Ativar Gateway de Pagamento?"
                : "Desativar Gateway de Pagamento?"}
            </h3>

            <p className="text-xs text-white/70">
              Você está alterando o status do gateway{" "}
              <strong className="text-white">{toggleConfirmModal.gateway.name}</strong> para{" "}
              <strong className="text-amber-300">{toggleConfirmModal.newStatus}</strong>.
            </p>

            {toggleConfirmModal.newStatus === "INACTIVE" &&
              toggleConfirmModal.gateway.activeSubscriptionsCount > 0 && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                  ⚠️ <strong>Aviso Importante:</strong> Existem{" "}
                  <strong>{toggleConfirmModal.gateway.activeSubscriptionsCount}</strong> assinaturas
                  ativas registradas através deste gateway. A desativação irá apenas bloquear novos checkouts; as assinaturas existentes continuarão válidas e ativas.
                </div>
              )}

            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setToggleConfirmModal(null)}
                className="rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/20"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleToggleStatus}
                disabled={toggling}
                className={`rounded-xl px-5 py-2 text-xs font-bold text-white disabled:opacity-50 ${
                  toggleConfirmModal.newStatus === "ACTIVE"
                    ? "bg-primary hover:opacity-90"
                    : "bg-rose-500 hover:bg-rose-600"
                }`}
              >
                {toggling ? "Processando..." : "Confirmar Alteração"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: MAPEAMENTO DE PLANO COM CATÁLOGO EXTERNO */}
      {mappingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="max-w-lg w-full rounded-2xl border border-white/10 bg-[#0d111c] p-6 space-y-4">
            <h3 className="text-base font-bold text-white">
              Associação de Plano com Catálogo Externo
            </h3>

            <form onSubmit={handleSaveMapping} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-white/60 block mb-1">Gateway</label>
                  <select
                    value={mappingModal.gatewayConfigId}
                    onChange={(e) => setMappingModal({ ...mappingModal, gatewayConfigId: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-white"
                  >
                    {gateways.map((g) => (
                      <option key={g.id} value={g.id} className="bg-[#0b0e17]">
                        {g.name} ({g.environment})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-white/60 block mb-1">Ambiente</label>
                  <select
                    value={mappingModal.environment}
                    onChange={(e) => setMappingModal({ ...mappingModal, environment: e.target.value as any })}
                    className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-white"
                  >
                    <option value="SANDBOX" className="bg-[#0b0e17]">🧪 Sandbox</option>
                    <option value="PRODUCTION" className="bg-[#0b0e17]">🚀 Produção</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-white/60 block mb-1">Plano Interno</label>
                <select
                  value={mappingModal.planTier}
                  onChange={(e) => setMappingModal({ ...mappingModal, planTier: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-white"
                >
                  <option value="PRO" className="bg-[#0b0e17]">PRO (Criador Profissional)</option>
                  <option value="TEAM" className="bg-[#0b0e17]">TEAM (Equipe & Produtora)</option>
                  <option value="ENTERPRISE" className="bg-[#0b0e17]">ENTERPRISE (Estúdio & Custom)</option>
                </select>
              </div>

              {/* Botão de Importação Dinâmica de Produtos */}
              <div className="flex items-center justify-between border-t border-b border-white/10 py-2.5">
                <span className="text-white/60">Importar direto do Provedor:</span>
                <button
                  type="button"
                  onClick={() => handleFetchExternalCatalog(mappingModal.gatewayConfigId)}
                  disabled={fetchingExternal}
                  className="rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/40 px-3 py-1 text-[11px] font-semibold hover:bg-sky-500/30 transition disabled:opacity-50"
                >
                  {fetchingExternal ? "Consultando API..." : "🔍 Consultar Produtos Remotos"}
                </button>
              </div>

              {externalCatalog.length > 0 && (
                <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2 max-h-40 overflow-y-auto">
                  <span className="text-[10px] text-white/40 uppercase font-bold block">
                    Produtos Encontrados no Provedor:
                  </span>
                  {externalCatalog.map((prod) => (
                    <div
                      key={prod.id}
                      onClick={() => {
                        const monthlyPrice = prod.prices?.find((p: any) => p.interval === "month")?.id || "";
                        const yearlyPrice = prod.prices?.find((p: any) => p.interval === "year")?.id || "";
                        setMappingModal({
                          ...mappingModal,
                          externalProductId: prod.id,
                          externalPriceIdMonthly: monthlyPrice,
                          externalPriceIdYearly: yearlyPrice,
                        });
                      }}
                      className="cursor-pointer rounded-lg bg-white/5 p-2 hover:bg-white/10 transition text-[11px]"
                    >
                      <div className="font-bold text-white flex justify-between">
                        <span>{prod.name}</span>
                        <span className="font-mono text-amber-300">{prod.id}</span>
                      </div>
                      <div className="text-[10px] text-white/50">
                        {prod.prices?.length || 0} preço(s) disponível(is)
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className="text-white/60 block mb-1">External Product ID</label>
                <input
                  type="text"
                  placeholder="prod_... ou item_..."
                  value={mappingModal.externalProductId}
                  onChange={(e) => setMappingModal({ ...mappingModal, externalProductId: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-white font-mono text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-white/60 block mb-1">Price ID Mensal</label>
                  <input
                    type="text"
                    placeholder="price_monthly_..."
                    value={mappingModal.externalPriceIdMonthly}
                    onChange={(e) => setMappingModal({ ...mappingModal, externalPriceIdMonthly: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-white font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="text-white/60 block mb-1">Price ID Anual</label>
                  <input
                    type="text"
                    placeholder="price_yearly_..."
                    value={mappingModal.externalPriceIdYearly}
                    onChange={(e) => setMappingModal({ ...mappingModal, externalPriceIdYearly: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-white font-mono text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setMappingModal(null)}
                  className="rounded-xl bg-white/10 px-4 py-2 font-semibold text-white/70 hover:bg-white/20"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingMapping}
                  className="rounded-xl bg-amber-400 px-5 py-2 font-bold text-black hover:bg-amber-300 disabled:opacity-50"
                >
                  {savingMapping ? "Salvando..." : "Salvar Associação"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
