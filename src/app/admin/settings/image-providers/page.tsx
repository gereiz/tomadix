"use client";

import { MediaDisabledNotice } from "@/components/admin/media-disabled-notice";
import { Spinner } from "@/components/ui/spinner";
import { useEffect, useState } from "react";
import Link from "next/link";
import { rankModelQuality } from "@/modules/image-generation/model-quality-ranker";

interface ImageProviderState {
  id: string;
  providerId: string;
  name: string;
  maskedKey: string;
  hasApiKey: boolean;
  baseUrl: string;
  isActive: boolean;
  defaultModel: string | null;
  connectionStatus: "CONNECTED" | "UNCONFIGURED" | "INVALID_KEY" | "INSUFFICIENT_BALANCE" | "ERROR" | "UNREACHABLE";
  lastTestedAt: string | null;
  lastTestMessage: string | null;
  lastUsedAt: string | null;
  requestsCount: number;
  successCount: number;
  failuresCount: number;
  createdAt: string;
  updatedAt: string;
  modelsCount: number;
  activeModelsCount: number;
}

interface ImageModelItem {
  id: string;
  modelId: string;
  name: string;
  publisher: string | null;
  description: string | null;
  capabilities: string[];
  supportedSizes: string[];
  supportsReferenceImage: boolean;
  supportsImageEditing: boolean;
  pricingInfo?: any;
  isAvailable: boolean;
  isEnabled: boolean;
  isDefault: boolean;
  defaultCreditCost: number | null;
  displayOrder: number;
  lastSyncedAt: string;
}

interface AccountMetrics {
  keyInfo?: {
    id: string;
    name: string;
    type: string;
    valid: boolean;
    pollenBudget: number | null;
    questPollenOnly: boolean;
  };
  profile?: {
    githubUsername: string | null;
    image: string | null;
    name: string | null;
    email: string | null;
  };
  balance?: {
    balance: number;
    accountBalance?: {
      total: number;
      tier: number;
      paid: number;
    };
  };
  balanceError?: string | null;
  summary?: {
    totalRequests: number;
    totalCostUsd: number;
    avgResponseTimeMs: number;
    modelDistribution: Record<string, { count: number; costUsd: number }>;
  };
  recentUsage?: Array<{
    timestamp: string;
    model: string;
    type: string;
    costUsd: number;
    responseTimeMs: number;
  }>;
  fetchedAt?: string;
}

export default function ImageProvidersAdminPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [loadingAccount, setLoadingAccount] = useState(false);
  const [provider, setProvider] = useState<ImageProviderState | null>(null);
  const [models, setModels] = useState<ImageModelItem[]>([]);
  const [accountMetrics, setAccountMetrics] = useState<AccountMetrics | null>(null);
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Campos de edição do formulário
  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [defaultModel, setDefaultModel] = useState("flux");
  const [defaultCreditCost, setDefaultCreditCost] = useState<number>(10);

  // Filtro e Ordenação de modelos por qualidade e precificação da Pollinations
  const [modelSearch, setModelSearch] = useState("");
  const [sortBy, setSortBy] = useState<"quality" | "cost" | "name">("quality");
  const [pricingFilter, setPricingFilter] = useState<"all" | "available" | "free" | "paid" | "ref">("all");
  const [batchLoading, setBatchLoading] = useState(false);
  const [cleaningRetention, setCleaningRetention] = useState(false);

  const handleCleanupRetention = async () => {
    if (!confirm("Deseja executar a limpeza de imagens expiradas de acordo com as políticas de retenção de cada plano agora?")) {
      return;
    }
    try {
      setCleaningRetention(true);
      setNotification(null);
      const res = await fetch("/api/admin/image-providers/cleanup-retention", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNotification({
          type: "success",
          text: data.message || "Limpeza de retenção concluída com sucesso!",
        });
      } else {
        setNotification({ type: "error", text: data.error || "Erro ao executar limpeza de retenção." });
      }
    } catch {
      setNotification({ type: "error", text: "Falha de rede ao acionar limpeza de retenção." });
    } finally {
      setCleaningRetention(false);
    }
  };

  const handleBatchAction = async (action: "ENABLE_ALL" | "DISABLE_ALL" | "DISABLE_PAID" | "ENABLE_FREE") => {
    try {
      setBatchLoading(true);
      setNotification(null);
      const res = await fetch("/api/admin/image-providers/pollinations/models/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNotification({ type: "success", text: data.message });
        setModels(data.models || []);
      } else {
        setNotification({ type: "error", text: data.error || "Erro ao processar ação em lote." });
      }
    } catch {
      setNotification({ type: "error", text: "Falha de rede ao executar ação em lote." });
    } finally {
      setBatchLoading(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/image-providers");
      const data = await res.json();

      if (res.ok && data.success) {
        setProvider(data.provider);
        setName(data.provider.name);
        setBaseUrl(data.provider.baseUrl);
        setIsActive(data.provider.isActive);
        setDefaultModel(data.provider.defaultModel || "flux");
        setDefaultCreditCost(data.provider.defaultCreditCost !== undefined ? Number(data.provider.defaultCreditCost) : 10);
        setModels(data.models || []);
      } else {
        setNotification({ type: "error", text: data.error || "Erro ao carregar dados do provedor." });
      }
    } catch (err: any) {
      setNotification({ type: "error", text: "Falha de rede ao conectar com a API administrativa." });
    } finally {
      setLoading(false);
    }
  };

  const loadAccountMetrics = async () => {
    try {
      setLoadingAccount(true);
      const res = await fetch("/api/admin/image-providers/pollinations/account");
      const data = await res.json();
      if (res.ok && data.success) {
        setAccountMetrics(data);
      }
    } catch (err) {
      console.warn("Falha ao carregar métricas de conta da Pollinations:", err);
    } finally {
      setLoadingAccount(false);
    }
  };

  useEffect(() => {
    loadData();
    loadAccountMetrics();
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setNotification(null);

      const payload: any = {
        providerId: "pollinations",
        name,
        baseUrl,
        isActive,
        defaultModel,
        defaultCreditCost: Number(defaultCreditCost),
      };

      if (apiKey.trim().length > 0) {
        payload.apiKey = apiKey.trim();
      }

      const res = await fetch("/api/admin/image-providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setNotification({ type: "success", text: data.message || "Configurações salvas com sucesso!" });
        setApiKey(""); // Limpar campo de entrada de chave
        await loadData();
      } else {
        setNotification({ type: "error", text: data.error || "Erro ao salvar provedor." });
      }
    } catch (err: any) {
      setNotification({ type: "error", text: "Erro ao enviar alterações." });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      setNotification(null);

      const res = await fetch("/api/admin/image-providers/pollinations/test", {
        method: "POST",
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setNotification({ type: "success", text: `Teste de conexão concluído: ${data.message}` });
      } else {
        setNotification({ type: "error", text: `Falha no teste: ${data.message || data.error}` });
      }
      await loadData();
    } catch (err: any) {
      setNotification({ type: "error", text: "Falha ao executar teste de conexão." });
    } finally {
      setTesting(false);
    }
  };

  const handleSyncModels = async () => {
    try {
      setSyncing(true);
      setNotification(null);

      const res = await fetch("/api/admin/image-providers/pollinations/sync-models", {
        method: "POST",
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setNotification({ type: "success", text: data.message });
        setModels(data.models || []);
        await loadData();
      } else {
        setNotification({ type: "error", text: data.error || "Falha ao sincronizar modelos." });
      }
    } catch (err: any) {
      setNotification({ type: "error", text: "Erro ao comunicar com a sincronização de modelos." });
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleModel = async (modelId: string, currentEnabled: boolean) => {
    try {
      const res = await fetch(`/api/admin/image-providers/pollinations/models/${encodeURIComponent(modelId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEnabled: !currentEnabled }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setModels((prev) =>
          prev.map((m) => (m.modelId === modelId ? { ...m, isEnabled: !currentEnabled } : m))
        );
      } else {
        setNotification({ type: "error", text: data.error || "Erro ao atualizar modelo." });
      }
    } catch (err: any) {
      setNotification({ type: "error", text: "Erro ao alterar estado do modelo." });
    }
  };

  const handleSetDefaultModel = async (modelId: string) => {
    try {
      setDefaultModel(modelId);
      setModels((prev) =>
        prev.map((m) => ({
          ...m,
          isDefault: m.modelId === modelId,
        }))
      );

      const res = await fetch(`/api/admin/image-providers/pollinations/models/${encodeURIComponent(modelId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNotification({ type: "success", text: `Modelo padrão alterado para "${modelId}".` });
      } else {
        setNotification({ type: "error", text: data.error || "Erro ao definir modelo padrão." });
        await loadData();
      }
    } catch (err: any) {
      setNotification({ type: "error", text: "Erro ao definir modelo padrão." });
      await loadData();
    }
  };

  const handleUpdateModelCost = async (modelId: string, newCost: string) => {
    const costValue = newCost.trim() === "" ? null : parseInt(newCost, 10);
    if (costValue !== null && (isNaN(costValue) || costValue < 0)) return;

    try {
      const res = await fetch(`/api/admin/image-providers/pollinations/models/${encodeURIComponent(modelId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultCreditCost: costValue }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setModels((prev) =>
          prev.map((m) => (m.modelId === modelId ? { ...m, defaultCreditCost: costValue } : m))
        );
      }
    } catch (err) {
      console.error("Erro ao atualizar custo do modelo:", err);
    }
  };

  const isModelPaid = (m: ImageModelItem) => {
    const pricing = (m.pricingInfo as any) || {};
    const tokens = parseFloat(pricing.completionImageTokens || pricing.promptImageTokens || "0");
    if (tokens > 0) return true;
    if (pricing.paidOnly === true || pricing.costType === "PAID") return true;
    if (pricing.costPollen && !pricing.costPollen.toLowerCase().includes("gratuito") && !pricing.costPollen.toLowerCase().includes("0 pollen")) {
      return true;
    }
    const lowerId = m.modelId.toLowerCase();
    if (
      lowerId.includes("flux.2") ||
      lowerId.includes("flux-2") ||
      lowerId.includes("flux.3") ||
      lowerId.includes("flux-3") ||
      lowerId.includes("flux.1.1") ||
      lowerId.includes("flux-1.1") ||
      lowerId.includes("seedream-5.0-pro") ||
      lowerId.includes("qwen-image-2.1-pro") ||
      lowerId.includes("recraft-v4.1-flash") ||
      lowerId.includes("mai-image-2.6") ||
      (lowerId.includes("max") && !lowerId.includes("schnell")) ||
      (lowerId.includes("flex") && !lowerId.includes("schnell")) ||
      (lowerId.includes("pro") && !lowerId.includes("schnell"))
    ) {
      return true;
    }
    return false;
  };

  const availableCount = models.filter((m) => m.isAvailable).length;
  const freeCount = models.filter((m) => !isModelPaid(m)).length;
  const paidCount = models.filter((m) => isModelPaid(m)).length;
  const refCount = models.filter((m) => m.supportsReferenceImage).length;

  const rankedModels = models
    .filter((m) => {
      const matchesSearch =
        m.name.toLowerCase().includes(modelSearch.toLowerCase()) ||
        m.modelId.toLowerCase().includes(modelSearch.toLowerCase()) ||
        (m.publisher && m.publisher.toLowerCase().includes(modelSearch.toLowerCase()));
      if (!matchesSearch) return false;

      if (pricingFilter === "available") return m.isAvailable;
      if (pricingFilter === "free") return !isModelPaid(m);
      if (pricingFilter === "paid") return isModelPaid(m);
      if (pricingFilter === "ref") return m.supportsReferenceImage;
      return true;
    })
    .map((m) => ({
      ...m,
      rank: rankModelQuality(m.modelId, m.publisher || "", m.name),
    }))
    .sort((a, b) => {
      if (sortBy === "quality") {
        return b.rank.score - a.rank.score;
      }
      if (sortBy === "cost") {
        const costA = a.defaultCreditCost ?? 10;
        const costB = b.defaultCreditCost ?? 10;
        return costA - costB;
      }
      return a.name.localeCompare(b.name);
    });

  return (
    <div className="space-y-6">
      <MediaDisabledNotice kind="image" />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-amber-400 mb-1">
            <Link href="/admin" className="hover:underline text-white/50">Admin</Link>
            <span>/</span>
            <Link href="/admin/settings" className="hover:underline text-white/50">Configurações</Link>
            <span>/</span>
            <span>APIs de Imagem</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <span>🖼️</span> Integrações de APIs de Imagem
          </h1>
          <p className="text-xs text-white/60 mt-1">
            Gerenciamento de provedores de IA, credenciais seguras, catálogo dinâmico de modelos e regras comerciais.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing || !provider?.hasApiKey}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 transition disabled:opacity-40"
          >
            {testing ? (
              <Spinner className="h-3.5 w-3.5 border-2 border-emerald-300" />
            ) : (
              <span>⚡</span>
            )}
            Testar Conexão
          </button>

          <button
            type="button"
            onClick={handleCleanupRetention}
            disabled={cleaningRetention}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-red-500/15 border border-red-500/30 text-red-300 hover:bg-red-500/25 transition disabled:opacity-40"
            title="Exclui imagens expiradas de acordo com as políticas de retenção de cada plano para liberar espaço em disco"
          >
            {cleaningRetention ? (
              <Spinner className="h-3.5 w-3.5 border-2 border-red-300" />
            ) : (
              <span>🧹</span>
            )}
            Limpar Imagens Expiradas
          </button>

          <button
            type="button"
            onClick={handleSyncModels}
            disabled={syncing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-400/15 border border-amber-400/30 text-amber-300 hover:bg-amber-400/25 transition disabled:opacity-40"
          >
            {syncing ? (
              <Spinner className="h-3.5 w-3.5 border-2 border-amber-300" />
            ) : (
              <span>🔄</span>
            )}
            Sincronizar Modelos
          </button>
        </div>
      </div>

      {/* Notificação */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between animate-fade-in ${
            notification.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-red-500/10 border-red-500/30 text-red-300"
          }`}
        >
          <span>{notification.text}</span>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-xs opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-white/50 font-mono text-xs">
          <Spinner className="h-6 w-6 border-2 border-amber-400 mb-3" />
          <p>Carregando configurações dos provedores de imagem...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card de Configuração do Provedor Pollinations */}
          <div className="lg:col-span-1 space-y-5">
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black font-bold text-sm">
                    P
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-white">Pollinations.ai</h3>
                    <p className="text-[10px] text-white/50">Provedor Principal V1</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      provider?.connectionStatus === "CONNECTED"
                        ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
                        : provider?.connectionStatus === "UNCONFIGURED"
                        ? "bg-amber-400"
                        : "bg-red-400"
                    }`}
                  />
                  <span className="text-[10px] font-mono font-medium text-white/70">
                    {provider?.connectionStatus === "CONNECTED"
                      ? "CONECTADO"
                      : provider?.connectionStatus === "UNCONFIGURED"
                      ? "PENDENTE"
                      : "ERRO"}
                  </span>
                </div>
              </div>

              {/* Informações Operacionais Rápidas */}
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-white/60 bg-black/30 p-3 rounded-xl border border-white/5">
                <div>
                  <span className="text-white/40 block text-[9px] uppercase">Status</span>
                  <span className={provider?.isActive ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                    {provider?.isActive ? "ATIVO" : "INATIVO"}
                  </span>
                </div>
                <div>
                  <span className="text-white/40 block text-[9px] uppercase">Gerações OK</span>
                  <span className="text-white font-bold">{provider?.successCount ?? 0}</span>
                </div>
                <div>
                  <span className="text-white/40 block text-[9px] uppercase">Último Teste</span>
                  <span className="text-white/80">
                    {provider?.lastTestedAt
                      ? new Date(provider.lastTestedAt).toLocaleDateString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                      : "Nunca"}
                  </span>
                </div>
                <div>
                  <span className="text-white/40 block text-[9px] uppercase">Último Uso</span>
                  <span className="text-white/80">
                    {provider?.lastUsedAt
                      ? new Date(provider.lastUsedAt).toLocaleDateString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                      : "Nunca"}
                  </span>
                </div>
              </div>

              {provider?.lastTestMessage && (
                <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-[10px] text-white/70 font-mono">
                  <span className="text-white/40 block text-[9px] uppercase font-bold">Diagnóstico</span>
                  {provider.lastTestMessage}
                </div>
              )}

              {/* Formulário de Configurações */}
              <form onSubmit={handleSaveConfig} className="space-y-4 pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-white/80">Nome de Exibição</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-white/80">URL Base da API</label>
                  <input
                    type="url"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white focus:border-amber-400 focus:outline-none"
                  />
                  <p className="text-[10px] text-white/40">Padrão oficial: https://gen.pollinations.ai</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-white/80">API Key Secreta</label>
                    <span className="text-[10px] font-mono text-amber-300">
                      Atual: {provider?.maskedKey || "(nenhuma)"}
                    </span>
                  </div>
                  <input
                    type="password"
                    placeholder="sk_... (deixe em branco para manter a atual)"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white placeholder:text-white/30 focus:border-amber-400 focus:outline-none"
                  />
                  <p className="text-[10px] text-white/40">
                    Armazenada exclusivamente no backend seguro. Nunca exposta no frontend.
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-white/80">Modelo Padrão da Plataforma</label>
                    {defaultModel && (
                      <span className="text-[10px] font-mono text-amber-400 font-semibold">
                        {models.find((m) => m.modelId === defaultModel)?.name || defaultModel}
                      </span>
                    )}
                  </div>
                  <select
                    value={defaultModel}
                    onChange={async (e) => {
                      const newId = e.target.value;
                      setDefaultModel(newId);
                      await handleSetDefaultModel(newId);
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white focus:border-amber-400 focus:outline-none"
                  >
                    {models
                      .filter((m) => m.isEnabled)
                      .map((m) => (
                        <option key={m.modelId} value={m.modelId} className="bg-neutral-900 text-white">
                          {m.publisher ? `[${m.publisher}] ` : ""}{m.name} ({m.modelId})
                        </option>
                      ))}
                  </select>
                  <p className="text-[10px] text-white/40">
                    Ao selecionar, o modelo torna-se imediatamente o padrão da plataforma.
                  </p>
                </div>

                {/* Custo Padrão em Créditos da Operação de Imagem */}
                <div className="space-y-1.5 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                      <span>🪙</span> Custo Padrão por Imagem (Créditos)
                    </label>
                    <Link
                      href="/admin/credits"
                      className="text-[10px] font-semibold text-amber-400 hover:underline flex items-center gap-1"
                      title="Ver e gerenciar regras de precificação por plano na Tabela de Créditos"
                    >
                      <span>Tabela de Créditos</span>
                      <span>↗</span>
                    </Link>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={defaultCreditCost}
                      onChange={(e) => setDefaultCreditCost(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-2 pl-8 rounded-xl bg-black/50 border border-amber-500/30 text-xs text-white font-mono font-bold focus:border-amber-400 focus:outline-none"
                    />
                    <span className="absolute left-2.5 top-2.5 text-xs text-amber-400">🪙</span>
                  </div>
                  <p className="text-[10px] text-white/50 leading-relaxed">
                    Custo padrão debitado por imagem gerada no Tomadix. Sincroniza automaticamente com a operação global <code className="text-amber-300 font-mono">GEN_IMAGE_DIRECT</code> na Tabela de Créditos.
                  </p>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-white">Provedor Habilitado</span>
                    <span className="text-[10px] text-white/50">Permite gerações com este provedor</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="h-4 w-4 rounded accent-amber-400 cursor-pointer"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-2.5 rounded-xl text-xs font-bold bg-amber-400 text-black hover:bg-amber-300 transition shadow-md shadow-amber-500/10 disabled:opacity-50"
                >
                  {saving ? "Salvando Alterações..." : "Salvar Configurações"}
                </button>
              </form>
            </div>
          </div>

          {/* Tabela de Modelos de Imagem Ranqueados */}
          <div className="lg:col-span-2 space-y-4">
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4">
              <div className="flex flex-col gap-3 border-b border-white/10 pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>✨</span> Catálogo Dinâmico de Modelos
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 font-mono text-white/70">
                        {rankedModels.length} de {models.length} modelos
                      </span>
                    </h3>
                    <p className="text-[11px] text-white/50">
                      Modelos oficiais ranqueados por qualidade, custo de Pollen (Gratuito vs Pago) e controle comercial.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Seletor de ordenação */}
                    <div className="flex items-center bg-black/40 rounded-lg p-0.5 border border-white/10 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setSortBy("quality")}
                        className={`px-2.5 py-1 rounded-md font-semibold transition ${
                          sortBy === "quality"
                            ? "bg-amber-400 text-black shadow-sm"
                            : "text-white/60 hover:text-white"
                        }`}
                        title="Ordenar por Índice de Qualidade e Fidelidade Cinematográfica"
                      >
                        👑 Qualidade
                      </button>
                      <button
                        type="button"
                        onClick={() => setSortBy("cost")}
                        className={`px-2.5 py-1 rounded-md font-semibold transition ${
                          sortBy === "cost"
                            ? "bg-amber-400 text-black shadow-sm"
                            : "text-white/60 hover:text-white"
                        }`}
                        title="Ordenar pelo Custo em Créditos"
                      >
                        🪙 Custo
                      </button>
                      <button
                        type="button"
                        onClick={() => setSortBy("name")}
                        className={`px-2.5 py-1 rounded-md font-semibold transition ${
                          sortBy === "name"
                            ? "bg-amber-400 text-black shadow-sm"
                            : "text-white/60 hover:text-white"
                        }`}
                        title="Ordenar Alfabeticamente"
                      >
                        A-Z
                      </button>
                    </div>

                    <div className="w-full sm:w-48">
                      <input
                        type="text"
                        placeholder="Filtrar modelos..."
                        value={modelSearch}
                        onChange={(e) => setModelSearch(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-white placeholder:text-white/30 focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Filtros de Precificação / Tipo da API (Gratuitos vs Pagos Pollen) e Ações Rápidas em Lote */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/5">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setPricingFilter("all")}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                        pricingFilter === "all"
                          ? "bg-white/20 text-white font-bold border border-white/30"
                          : "bg-white/5 text-white/60 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      Todos ({models.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPricingFilter("available")}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition flex items-center gap-1.5 ${
                        pricingFilter === "available"
                          ? "bg-teal-500/25 text-teal-300 font-bold border border-teal-500/40 shadow-sm"
                          : "bg-teal-500/10 text-teal-400/70 hover:text-teal-300 hover:bg-teal-500/20"
                      }`}
                      title="Exibir somente os modelos online e disponíveis para geração na API da Pollinations"
                    >
                      <span>⚡ Somente Disponíveis</span>
                      <span className="font-mono text-[10px]">({availableCount})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPricingFilter("free")}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition flex items-center gap-1.5 ${
                        pricingFilter === "free"
                          ? "bg-emerald-500/25 text-emerald-300 font-bold border border-emerald-500/40 shadow-sm"
                          : "bg-emerald-500/10 text-emerald-400/70 hover:text-emerald-300 hover:bg-emerald-500/20"
                      }`}
                      title="Exibir modelos que rodam sem custo de Pollen (Gratuitos)"
                    >
                      <span>🟢 Gratuitos (Pollen Free)</span>
                      <span className="font-mono text-[10px]">({freeCount})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPricingFilter("paid")}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition flex items-center gap-1.5 ${
                        pricingFilter === "paid"
                          ? "bg-amber-500/25 text-amber-300 font-bold border border-amber-500/40 shadow-sm"
                          : "bg-amber-500/10 text-amber-400/70 hover:text-amber-300 hover:bg-amber-500/20"
                      }`}
                      title="Exibir modelos que consomem saldo de Pollen pago na Pollinations"
                    >
                      <span>🟡 Pagos (Pollen Requerido)</span>
                      <span className="font-mono text-[10px]">({paidCount})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPricingFilter("ref")}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition flex items-center gap-1.5 ${
                        pricingFilter === "ref"
                          ? "bg-blue-500/25 text-blue-300 font-bold border border-blue-500/40 shadow-sm"
                          : "bg-blue-500/10 text-blue-400/70 hover:text-blue-300 hover:bg-blue-500/20"
                      }`}
                      title="Exibir modelos com suporte a imagens de referência ou edição"
                    >
                      <span>🖼️ Suporta Imagem de Referência</span>
                      <span className="font-mono text-[10px]">({refCount})</span>
                    </button>
                  </div>

                  {/* Ações em Lote para o Administrador */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={batchLoading}
                      onClick={() => handleBatchAction("DISABLE_PAID")}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition disabled:opacity-40"
                      title="Desativa todos os modelos pagos da Pollinations para evitar consumo de pollen"
                    >
                      🚫 Desativar Todos os Pagos
                    </button>
                    <button
                      type="button"
                      disabled={batchLoading}
                      onClick={() => handleBatchAction("ENABLE_FREE")}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition disabled:opacity-40"
                      title="Ativa todos os modelos gratuitos (Pollen Free)"
                    >
                      ✅ Ativar Todos os Gratuitos
                    </button>
                  </div>
                </div>
              </div>

              {rankedModels.length === 0 ? (
                <div className="p-5 sm:p-8 text-center text-xs text-white/40">
                  Nenhum modelo de imagem corresponde ao filtro.
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[620px] overflow-y-auto rounded-xl border border-white/10 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                  <table className="w-full text-left text-xs min-w-[770px]">
                    <thead className="sticky top-0 bg-[#0e121b] z-20 shadow-md border-b border-white/10">
                      <tr className="text-[10px] font-mono text-white/40 uppercase">
                        <th className="py-2.5 px-3">Modelo</th>
                        <th className="py-2.5 px-3">Ranking de Qualidade</th>
                        <th className="py-2.5 px-3">Custo Pollen (Provedor)</th>
                        <th className="py-2.5 px-3">Publisher</th>
                        <th className="py-2.5 px-3 text-center min-w-[80px]">Custo (cr)</th>
                        <th className="py-2.5 px-3 text-center min-w-[120px]">Padrão</th>
                        <th className="py-2.5 px-3 text-right">Ativo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {rankedModels.map((item) => (
                        <tr
                          key={item.id}
                          className={`transition ${
                            !item.isAvailable
                              ? "opacity-60 bg-red-500/[0.03] hover:opacity-80"
                              : "hover:bg-white/[0.02]"
                          }`}
                        >
                          <td className="py-3 px-3">
                            <div className="flex flex-col">
                              <span className="font-semibold text-white flex items-center gap-1.5">
                                {item.name}
                                {!item.isAvailable && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-500/20 text-red-300 font-mono font-bold">
                                    INDISPONÍVEL
                                  </span>
                                )}
                              </span>
                              <span className="text-[10px] font-mono text-white/40">{item.modelId}</span>
                              {item.description && (
                                <span className="text-[10px] text-white/50 line-clamp-1 mt-0.5">
                                  {item.description}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <div className="flex flex-col gap-0.5">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] border w-fit ${item.rank.badgeColor}`}>
                                <span>{item.rank.stars}</span>
                                <span>{item.rank.tierLabel}</span>
                                <span className="opacity-70 font-mono">({item.rank.score})</span>
                              </span>
                              <span className="text-[9px] text-white/40 line-clamp-1">
                                {item.rank.rationale}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            {(() => {
                              const isPaid = isModelPaid(item);
                              const pricing = (item.pricingInfo as any) || {};
                              return (
                                <div className="flex flex-col gap-1 items-start">
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${
                                      isPaid
                                        ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                                        : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                                    }`}
                                  >
                                    <span>{isPaid ? "🟡 Pago" : "🟢 Gratuito"}</span>
                                    <span className="opacity-80">
                                      ({pricing.costPollen || (isPaid ? "Pollen pago" : "0 pollen")})
                                    </span>
                                  </span>
                                  {item.supportsReferenceImage && (
                                    <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/25">
                                      <span>🖼️</span>
                                      <span>Ref Image</span>
                                      {pricing.maxReferenceImages && (
                                        <span className="opacity-75">({pricing.maxReferenceImages} máx)</span>
                                      )}
                                    </span>
                                  )}
                                </div>
                              );
                            })()}
                          </td>

                          <td className="py-3 px-3 text-white/70 font-mono text-[11px]">
                            {item.publisher || "Pollinations"}
                          </td>

                          <td className="py-3 px-3 text-center">
                            <input
                              type="number"
                              min="0"
                              placeholder="Auto"
                              defaultValue={item.defaultCreditCost ?? ""}
                              onBlur={(e) => handleUpdateModelCost(item.modelId, e.target.value)}
                              className="w-16 px-2 py-1 rounded-lg bg-black/40 border border-white/10 text-center font-mono text-xs text-amber-300 focus:border-amber-400 focus:outline-none placeholder:text-white/20"
                              title="Custo específico em créditos. Deixe em branco para custo automático (10 cr)."
                            />
                          </td>

                          <td className="py-3 px-3 text-center">
                            {item.isDefault || item.modelId === defaultModel ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-400 text-black shadow-sm shadow-amber-400/20">
                                <span>★</span> PADRÃO
                              </span>
                            ) : (
                              <button
                                type="button"
                                disabled={!item.isAvailable}
                                onClick={() => handleSetDefaultModel(item.modelId)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/15 hover:border-amber-400/40 transition disabled:opacity-30 disabled:cursor-not-allowed"
                                title={item.isAvailable ? "Definir este modelo como o padrão da plataforma" : "Modelo indisponível no provedor upstream"}
                              >
                                Tornar Padrão
                              </button>
                            )}
                          </td>

                          <td className="py-3 px-3 text-right">
                            <button
                              type="button"
                              disabled={!item.isAvailable}
                              onClick={() => {
                                if (!item.isAvailable) {
                                  alert("Este modelo está marcado como indisponível pela Pollinations e não pode ser ativado.");
                                  return;
                                }
                                handleToggleModel(item.modelId, item.isEnabled);
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition ${
                                !item.isAvailable
                                  ? "bg-red-500/10 text-red-400/60 border border-red-500/20 cursor-not-allowed opacity-50"
                                  : item.isEnabled
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30"
                                  : "bg-white/10 text-white/40 border border-white/10 hover:bg-white/20"
                              }`}
                              title={!item.isAvailable ? "Modelo indisponível no upstream da Pollinations" : item.isEnabled ? "Clique para desativar" : "Clique para ativar"}
                            >
                              {!item.isAvailable ? "INDISPONÍVEL" : item.isEnabled ? "ATIVO" : "INATIVO"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SEÇÃO OFICIAL: Consumo e Métricas da Conta Pollinations.ai (GET /account) */}
      <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300 text-lg">
              📊
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Consumo e Saldo da Conta Pollinations.ai
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                  API Oficial /account
                </span>
              </h3>
              <p className="text-xs text-white/50">
                Auditoria de consumo em tempo real, saldo disponível e histórico de requisições da chave.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadAccountMetrics}
            disabled={loadingAccount}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-white hover:bg-white/15 transition disabled:opacity-40"
          >
            {loadingAccount ? (
              <Spinner className="h-3.5 w-3.5 border-2 border-amber-300" />
            ) : (
              <span>🔄</span>
            )}
            Atualizar Consumo
          </button>
        </div>

        {/* Grade de Métricas da Conta */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Saldo de Pollen */}
          <div className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-1.5">
            <span className="text-[10px] font-mono uppercase text-white/40 block">Saldo de Pollen</span>
            <div className="text-xl font-bold font-mono text-amber-400">
              {accountMetrics?.balance?.balance !== undefined
                ? `${accountMetrics.balance.balance} pollen`
                : accountMetrics?.keyInfo?.pollenBudget !== null && accountMetrics?.keyInfo?.pollenBudget !== undefined
                ? `${accountMetrics.keyInfo.pollenBudget} pollen (orçamento)`
                : "Ilimitado / Sem Budget"}
            </div>
            <p className="text-[10px] text-white/50">
              {accountMetrics?.balance?.accountBalance
                ? `Total conta: ${accountMetrics.balance.accountBalance.total} (Tier: ${accountMetrics.balance.accountBalance.tier}, Pago: ${accountMetrics.balance.accountBalance.paid})`
                : "Orçamento da chave ativa"}
            </p>
          </div>

          {/* Card 2: Custo Acumulado em USD */}
          <div className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-1.5">
            <span className="text-[10px] font-mono uppercase text-white/40 block">Consumo Registrado</span>
            <div className="text-xl font-bold font-mono text-emerald-400">
              ${accountMetrics?.summary?.totalCostUsd ?? "0.0000"} USD
            </div>
            <p className="text-[10px] text-white/50">
              {accountMetrics?.summary?.totalRequests ?? 0} requisições faturadas na chave
            </p>
          </div>

          {/* Card 3: Tempo Médio de Resposta */}
          <div className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-1.5">
            <span className="text-[10px] font-mono uppercase text-white/40 block">Latência Média</span>
            <div className="text-xl font-bold font-mono text-white">
              {accountMetrics?.summary?.avgResponseTimeMs
                ? `${(accountMetrics.summary.avgResponseTimeMs / 1000).toFixed(2)}s`
                : "N/A"}
            </div>
            <p className="text-[10px] text-white/50">
              Tempo de resposta médio da Pollinations
            </p>
          </div>

          {/* Card 4: Perfil da Chave */}
          <div className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-1.5">
            <span className="text-[10px] font-mono uppercase text-white/40 block">Credencial Ativa</span>
            <div className="flex items-center gap-2">
              {accountMetrics?.profile?.image && (
                <img loading="lazy" decoding="async"
                  src={accountMetrics.profile.image}
                  alt="Avatar"
                  className="h-6 w-6 rounded-full border border-white/20"
                />
              )}
              <span className="text-xs font-semibold text-white truncate">
                {accountMetrics?.keyInfo?.name || "Chave Pollinations"}
              </span>
            </div>
            <p className="text-[10px] text-white/50 font-mono truncate">
              ID: {accountMetrics?.keyInfo?.id ? `${accountMetrics.keyInfo.id.slice(0, 10)}...` : "Carregando..."}
            </p>
          </div>
        </div>

        {/* Histórico das Últimas Chamadas da Chave */}
        {accountMetrics?.recentUsage && accountMetrics.recentUsage.length > 0 && (
          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider text-white/70">
              Últimas Requisições Faturadas na Pollinations
            </h4>
            <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/40">
              <table className="w-full text-left text-xs font-mono min-w-[560px]">
                <thead>
                  <tr className="border-b border-white/10 text-[10px] text-white/40 uppercase">
                    <th className="py-2 px-3">Data / Hora (UTC)</th>
                    <th className="py-2 px-3">Modelo</th>
                    <th className="py-2 px-3">Tipo</th>
                    <th className="py-2 px-3 text-right">Custo USD</th>
                    <th className="py-2 px-3 text-right">Tempo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-[11px]">
                  {accountMetrics.recentUsage.map((u, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.02]">
                      <td className="py-2 px-3 text-white/70">{u.timestamp}</td>
                      <td className="py-2 px-3 text-amber-300 font-semibold">{u.model}</td>
                      <td className="py-2 px-3 text-white/50">{u.type}</td>
                      <td className="py-2 px-3 text-right text-emerald-400 font-bold">${u.costUsd?.toFixed(4) || "0.0000"}</td>
                      <td className="py-2 px-3 text-right text-white/60">{u.responseTimeMs ? `${(u.responseTimeMs / 1000).toFixed(2)}s` : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

