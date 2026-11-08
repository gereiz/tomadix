"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface GeminiKeyItem {
  id: string;
  name: string;
  maskedKey: string;
  isActive: boolean;
  priority: number;
  status: "HEALTHY" | "DEGRADED" | "RATE_LIMITED" | "SUSPENDED" | "INVALID";
  requestsCount: number;
  successCount: number;
  failuresCount: number;
  consecutiveFailures: number;
  successRate: number;
  lastUsedAt: string | null;
  lastSuccessAt: string | null;
  lastFailedAt: string | null;
  cooldownUntil: string | null;
  isCoolingDown: boolean;
  cooldownRemainingSeconds: number;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  allowedModels: string[];
  notes: string | null;
  createdAt: string;
}

interface GeminiSettingsState {
  selectionStrategy: "SEQUENTIAL_PRIORITY" | "BALANCED" | "LEAST_USED";
  maxConsecutiveFailures: number;
  cooldownSeconds: number;
  requestTimeoutMs: number;
  maxAttemptsPerOperation: number;
  envKeyFallbackAllowed: boolean;
}

interface OperationAttempt {
  id: string;
  keyName: string;
  attemptNumber: number;
  success: boolean;
  durationMs: number;
  statusCode?: number;
  errorCode?: string;
  errorMessage?: string;
}

interface OperationLogItem {
  id: string;
  operationId: string;
  feature: string;
  model: string;
  success: boolean;
  usedFallback: boolean;
  attemptsCount: number;
  primaryKeyName: string | null;
  finalKeyName: string | null;
  durationMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  statusCode: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  attempts: OperationAttempt[];
}

export default function GeminiKeysAdminPage() {
  const [loading, setLoading] = useState(true);
  const [keys, setKeys] = useState<GeminiKeyItem[]>([]);
  const [settings, setSettings] = useState<GeminiSettingsState | null>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [logs, setLogs] = useState<OperationLogItem[]>([]);
  const [activeTab, setActiveTab] = useState<"keys" | "settings" | "logs">("keys");

  // Notificações
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modal de Criação / Edição de Chave
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [editingKey, setEditingKey] = useState<GeminiKeyItem | null>(null);
  const [keyFormData, setKeyFormData] = useState({
    name: "",
    apiKey: "",
    priority: 1,
    isActive: true,
    allowedModels: "",
    notes: "",
  });
  const [savingKey, setSavingKey] = useState(false);

  // Modal de Teste Individual
  const [testingKeyId, setTestingKeyId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ keyId: string; success: boolean; message: string; latencyMs: number } | null>(null);

  // Configurações do Circuit Breaker
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsFormData, setSettingsFormData] = useState<GeminiSettingsState>({
    selectionStrategy: "SEQUENTIAL_PRIORITY",
    maxConsecutiveFailures: 3,
    cooldownSeconds: 300,
    requestTimeoutMs: 45000,
    maxAttemptsPerOperation: 3,
    envKeyFallbackAllowed: true,
  });

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [keysRes, logsRes] = await Promise.all([
        fetch("/api/admin/gemini-keys"),
        fetch("/api/admin/gemini-keys/logs?limit=25"),
      ]);

      if (keysRes.ok) {
        const d = await keysRes.json();
        setKeys(d.keys || []);
        if (d.settings) {
          setSettings(d.settings);
          setSettingsFormData(d.settings);
        }
      }

      if (logsRes.ok) {
        const d = await logsRes.json();
        setMetrics(d.metrics || null);
        setLogs(d.logs || []);
      }
    } catch (err: any) {
      setNotification({ type: "error", text: "Erro ao carregar dados do Gemini: " + err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingKey(null);
    setKeyFormData({
      name: `Chave Contingência ${keys.length + 1}`,
      apiKey: "",
      priority: keys.length + 1,
      isActive: true,
      allowedModels: "",
      notes: "",
    });
    setShowKeyModal(true);
  };

  const handleOpenEditModal = (key: GeminiKeyItem) => {
    setEditingKey(key);
    setKeyFormData({
      name: key.name,
      apiKey: "", // Vazio para preservar a existente
      priority: key.priority,
      isActive: key.isActive,
      allowedModels: key.allowedModels?.join(", ") || "",
      notes: key.notes || "",
    });
    setShowKeyModal(true);
  };

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingKey(true);
    setNotification(null);

    const allowedModelsArray = keyFormData.allowedModels
      ? keyFormData.allowedModels.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    try {
      if (editingKey) {
        // Atualizar
        const res = await fetch(`/api/admin/gemini-keys/${editingKey.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: keyFormData.name,
            apiKey: keyFormData.apiKey || undefined,
            priority: Number(keyFormData.priority),
            isActive: keyFormData.isActive,
            allowedModels: allowedModelsArray,
            notes: keyFormData.notes,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setNotification({ type: "success", text: data.message });
      } else {
        // Criar
        const res = await fetch("/api/admin/gemini-keys", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: keyFormData.name,
            apiKey: keyFormData.apiKey,
            priority: Number(keyFormData.priority),
            isActive: keyFormData.isActive,
            allowedModels: allowedModelsArray,
            notes: keyFormData.notes,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setNotification({ type: "success", text: data.message });
      }

      setShowKeyModal(false);
      loadAllData();
    } catch (err: any) {
      setNotification({ type: "error", text: "Erro ao salvar chave: " + err.message });
    } finally {
      setSavingKey(false);
    }
  };

  const handleDeleteKey = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja remover a chave "${name}"?`)) return;

    try {
      const res = await fetch(`/api/admin/gemini-keys/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setNotification({ type: "success", text: data.message });
      loadAllData();
    } catch (err: any) {
      setNotification({ type: "error", text: "Erro ao remover chave: " + err.message });
    }
  };

  const handleToggleKeyActive = async (key: GeminiKeyItem) => {
    try {
      const res = await fetch(`/api/admin/gemini-keys/${key.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !key.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      loadAllData();
    } catch (err: any) {
      setNotification({ type: "error", text: "Falha ao alterar status da chave: " + err.message });
    }
  };

  const handleTestKey = async (id: string) => {
    setTestingKeyId(id);
    setTestResult(null);

    try {
      const res = await fetch(`/api/admin/gemini-keys/${id}/test`, { method: "POST" });
      const data = await res.json();

      setTestResult({
        keyId: id,
        success: data.success,
        message: data.message,
        latencyMs: data.latencyMs,
      });

      loadAllData();
    } catch (err: any) {
      setTestResult({
        keyId: id,
        success: false,
        message: "Erro na chamada de teste: " + err.message,
        latencyMs: 0,
      });
    } finally {
      setTestingKeyId(null);
    }
  };

  const handleMovePriority = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= keys.length) return;

    const reordered = [...keys];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    const orderedIds = reordered.map((k) => k.id);

    try {
      const res = await fetch("/api/admin/gemini-keys/priorities", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setKeys(data.keys || reordered);
      setNotification({ type: "success", text: "Prioridade das chaves atualizada com sucesso!" });
    } catch (err: any) {
      setNotification({ type: "error", text: "Erro ao reordenar: " + err.message });
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setNotification(null);

    try {
      const res = await fetch("/api/admin/gemini-keys/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settingsFormData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSettings(data.settings);
      setNotification({ type: "success", text: "Configurações de failover e Circuit Breaker salvas com sucesso!" });
    } catch (err: any) {
      setNotification({ type: "error", text: "Erro ao salvar configurações: " + err.message });
    } finally {
      setSavingSettings(false);
    }
  };

  const getStatusBadge = (key: GeminiKeyItem) => {
    if (!key.isActive) {
      return (
        <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white/50 border border-white/10">
          DESATIVADA
        </span>
      );
    }

    if (key.isCoolingDown) {
      return (
        <span className="rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 text-[10px] font-bold animate-pulse flex items-center gap-1">
          <span>⏱️</span>
          <span>COOLDOWN ({Math.ceil(key.cooldownRemainingSeconds / 60)}m)</span>
        </span>
      );
    }

    switch (key.status) {
      case "HEALTHY":
        return (
          <span className="rounded bg-primary/20 text-primary border border-primary/40 px-2 py-0.5 text-[10px] font-bold">
            SAUDÁVEL (OPERACIONAL)
          </span>
        );
      case "RATE_LIMITED":
        return (
          <span className="rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 text-[10px] font-bold">
            RATE LIMIT (429)
          </span>
        );
      case "SUSPENDED":
        return (
          <span className="rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 text-[10px] font-bold">
            SUSPENSA (CIRCUIT BREAKER)
          </span>
        );
      case "DEGRADED":
        return (
          <span className="rounded bg-blue-500/20 text-blue-300 border border-blue-500/40 px-2 py-0.5 text-[10px] font-bold">
            DEGRADADA
          </span>
        );
      case "INVALID":
        return (
          <span className="rounded bg-red-950 text-red-400 border border-red-800 px-2 py-0.5 text-[10px] font-bold">
            INVÁLIDA / NÃO AUTORIZADA
          </span>
        );
      default:
        return <span className="rounded bg-white/5 px-2 py-0.5 text-[10px]">{key.status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Notificação Superior */}
      {notification && (
        <div
          className={`p-4 rounded-xl text-xs flex justify-between items-center transition ${
            notification.type === "success"
              ? "bg-primary/40 border border-primary/30 text-primary"
              : "bg-rose-950/40 border border-rose-500/30 text-rose-300"
          }`}
        >
          <span>{notification.text}</span>
          <button onClick={() => setNotification(null)} className="font-bold ml-4 hover:opacity-75">
            ✕
          </button>
        </div>
      )}

      {/* Header Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Gerenciamento de APIs Gemini</span>
            <span className="rounded bg-primary/20 border border-primary/40 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
              Multi-Key & Failover Ativo
            </span>
          </h1>
          <p className="text-xs text-white/50 mt-1">
            Cadastre múltiplas chaves Google Gemini para contingência automática contínua. Se uma chave apresentar erro 429 (quota), 503 ou timeout, o sistema assume a próxima chave sem interrupções nem cobranças duplicadas.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start">
          <button
            onClick={loadAllData}
            disabled={loading}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/10 hover:text-white transition flex items-center gap-1.5"
          >
            <span>🔄</span> {loading ? "Atualizando..." : "Recarregar"}
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="rounded-xl bg-primary px-4 py-1.5 text-xs font-bold text-on-primary hover:opacity-90 transition flex items-center gap-1.5 shadow-md shadow-primary/10"
          >
            <span>➕</span> Cadastrar Nova API Key
          </button>
        </div>
      </div>

      {/* Cards de Métricas Operacionais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-white/10 bg-[#0d111c] p-4">
          <span className="text-[10px] text-white/50 uppercase tracking-wider block">Total de Requisições</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white">
              {metrics?.totalRequests ?? 0}
            </span>
            <span className="text-xs text-primary font-mono">
              ({metrics?.successRate ?? 100}% sucesso)
            </span>
          </div>
          <span className="text-[10px] text-white/40 mt-1 block">
            {metrics?.successfulRequests ?? 0} concluídas com êxito
          </span>
        </div>

        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-[#0d111c] p-4">
          <span className="text-[10px] text-primary uppercase tracking-wider block font-bold flex items-center gap-1">
            <span>🛡️</span> Resiliência por Failover
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-primary">
              {metrics?.fallbackRecoveredRequests ?? 0}
            </span>
            <span className="text-xs text-primary/80">operações salvas</span>
          </div>
          <span className="text-[10px] text-white/50 mt-1 block">
            Salvas automaticamente após falha na 1ª chave
          </span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0d111c] p-4">
          <span className="text-[10px] text-white/50 uppercase tracking-wider block">Chaves Cadastradas</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white">{keys.length}</span>
            <span className="text-xs text-white/60">
              ({keys.filter((k) => k.isActive && !k.isCoolingDown && k.status !== "INVALID").length} disponíveis)
            </span>
          </div>
          <span className="text-[10px] text-white/40 mt-1 block">
            {keys.filter((k) => k.isCoolingDown).length} chave(s) em recuperação temporária
          </span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0d111c] p-4">
          <span className="text-[10px] text-white/50 uppercase tracking-wider block">Latência Média</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white">
              {metrics?.avgDurationMs ?? 0}
              <span className="text-xs font-normal text-white/40 ml-1">ms</span>
            </span>
          </div>
          <span className="text-[10px] text-white/40 mt-1 block">
            Tempo médio de geração e parsing
          </span>
        </div>
      </div>

      {/* Tabs de Navegação */}
      <div className="flex items-center gap-1.5 border-b border-white/10 pb-3 text-xs">
        <button
          onClick={() => setActiveTab("keys")}
          className={`rounded-lg px-3 py-1.5 font-semibold transition flex items-center gap-1.5 ${
            activeTab === "keys"
              ? "bg-primary/20 text-primary border border-primary/40"
              : "text-white/60 hover:text-white hover:bg-white/5"
          }`}
        >
          <span>🔑</span>
          <span>1. Chaves de API ({keys.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("settings")}
          className={`rounded-lg px-3 py-1.5 font-semibold transition flex items-center gap-1.5 ${
            activeTab === "settings"
              ? "bg-primary/20 text-primary border border-primary/40"
              : "text-white/60 hover:text-white hover:bg-white/5"
          }`}
        >
          <span>⚙️</span>
          <span>2. Configurações de Failover & Circuit Breaker</span>
        </button>

        <button
          onClick={() => setActiveTab("logs")}
          className={`rounded-lg px-3 py-1.5 font-semibold transition flex items-center gap-1.5 ${
            activeTab === "logs"
              ? "bg-primary/20 text-primary border border-primary/40"
              : "text-white/60 hover:text-white hover:bg-white/5"
          }`}
        >
          <span>📊</span>
          <span>3. Histórico de Operações & Tentativas ({logs.length})</span>
        </button>
      </div>

      {/* Feedback do Teste Individual de Chave */}
      {testResult && (
        <div
          className={`p-4 rounded-xl text-xs flex justify-between items-center transition ${
            testResult.success
              ? "bg-primary/50 border border-primary/40 text-primary"
              : "bg-rose-950/50 border border-rose-500/40 text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{testResult.success ? "✅" : "❌"}</span>
            <span>{testResult.message}</span>
            {testResult.latencyMs > 0 && (
              <span className="font-mono text-[10px] bg-black/40 px-2 py-0.5 rounded">
                Latência: {testResult.latencyMs}ms
              </span>
            )}
          </div>
          <button onClick={() => setTestResult(null)} className="font-bold ml-4 hover:opacity-75">
            ✕
          </button>
        </div>
      )}

      {/* ABA 1: LISTA DE CHAVES */}
      {activeTab === "keys" && (
        <div className="rounded-2xl border border-white/10 bg-[#0d111c] overflow-hidden">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Chaves Cadastradas e Prioridade de Execução</h3>
              <p className="text-xs text-white/40">
                A chave de prioridade 1 é utilizada preferencialmente. Se falhar por cota ou indisponibilidade, a chave seguinte assume automaticamente.
              </p>
            </div>
            <span className="text-xs text-white/50">{keys.length} chave(s)</span>
          </div>

          {keys.length === 0 ? (
            <div className="p-12 text-center text-xs text-white/40">
              Nenhuma chave cadastrada. Clique em "Cadastrar Nova API Key" acima para iniciar.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.02] border-b border-white/10 text-white/50">
                  <tr>
                    <th className="p-3.5 text-center w-16">Prioridade</th>
                    <th className="p-3.5">Nome / Identificador</th>
                    <th className="p-3.5">Chave Mascarada</th>
                    <th className="p-3.5 text-center">Status Operacional</th>
                    <th className="p-3.5 text-right">Requisições</th>
                    <th className="p-3.5 text-right">Sucessos / Falhas</th>
                    <th className="p-3.5">Última Atividade</th>
                    <th className="p-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-white/80">
                  {keys.map((k, index) => (
                    <tr key={k.id} className="hover:bg-white/[0.01]">
                      {/* Prioridade e botões subir/descer */}
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-lg font-mono text-xs font-bold bg-white/5 border border-white/10 text-primary">
                            {index + 1}º
                          </span>
                          <div className="flex flex-col gap-0.5">
                            <button
                              onClick={() => handleMovePriority(index, "up")}
                              disabled={index === 0}
                              className="text-[10px] text-white/50 hover:text-white disabled:opacity-20"
                              title="Aumentar prioridade"
                            >
                              ▲
                            </button>
                            <button
                              onClick={() => handleMovePriority(index, "down")}
                              disabled={index === keys.length - 1}
                              className="text-[10px] text-white/50 hover:text-white disabled:opacity-20"
                              title="Reduzir prioridade"
                            >
                              ▼
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Nome e Notas */}
                      <td className="p-3.5">
                        <div className="font-bold text-white flex items-center gap-2">
                          <span>{k.name}</span>
                          {index === 0 && (
                            <span className="rounded bg-primary/20 border border-primary/30 px-1.5 py-0.2 text-[9px] font-bold text-primary">
                              PRINCIPAL
                            </span>
                          )}
                        </div>
                        {k.notes && (
                          <div className="text-[10px] text-white/40 mt-0.5 max-w-xs truncate" title={k.notes}>
                            {k.notes}
                          </div>
                        )}
                        {k.allowedModels && k.allowedModels.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {k.allowedModels.map((m) => (
                              <span key={m} className="bg-white/5 text-[9px] font-mono px-1.5 py-0.5 rounded text-white/60">
                                {m}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Chave Mascarada */}
                      <td className="p-3.5 font-mono text-amber-300 text-xs">
                        {k.maskedKey}
                      </td>

                      {/* Status Operacional */}
                      <td className="p-3.5 text-center">
                        {getStatusBadge(k)}
                        {k.lastErrorMessage && k.status !== "HEALTHY" && (
                          <div className="text-[9px] text-rose-400/80 mt-1 max-w-xs truncate" title={k.lastErrorMessage}>
                            {k.lastErrorMessage}
                          </div>
                        )}
                      </td>

                      {/* Requisições */}
                      <td className="p-3.5 text-right font-mono font-bold text-white">
                        {k.requestsCount}
                      </td>

                      {/* Sucessos / Falhas */}
                      <td className="p-3.5 text-right font-mono text-[11px]">
                        <span className="text-primary font-bold">{k.successCount}</span>
                        <span className="text-white/30 mx-1">/</span>
                        <span className={k.failuresCount > 0 ? "text-rose-400 font-bold" : "text-white/40"}>
                          {k.failuresCount}
                        </span>
                        <div className="text-[9px] text-white/40">{k.successRate}% taxa</div>
                      </td>

                      {/* Última Atividade */}
                      <td className="p-3.5 text-[11px] text-white/50">
                        {k.lastUsedAt ? (
                          <div>{new Date(k.lastUsedAt).toLocaleString("pt-BR")}</div>
                        ) : (
                          <div className="text-white/30">Nunca utilizada</div>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleTestKey(k.id)}
                            disabled={testingKeyId === k.id}
                            className="rounded-lg bg-primary/10 border border-primary/20 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/20 transition"
                            title="Testar requisição ao vivo no Gemini"
                          >
                            {testingKeyId === k.id ? "Testando..." : "⚡ Testar"}
                          </button>

                          <button
                            onClick={() => handleToggleKeyActive(k)}
                            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold border transition ${
                              k.isActive
                                ? "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                                : "bg-amber-500/10 border-amber-500/20 text-amber-300 hover:bg-amber-500/20"
                            }`}
                          >
                            {k.isActive ? "Desativar" : "Ativar"}
                          </button>

                          <button
                            onClick={() => handleOpenEditModal(k)}
                            className="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[11px] text-white/70 hover:bg-white/10 hover:text-white transition"
                          >
                            Editar
                          </button>

                          <button
                            onClick={() => handleDeleteKey(k.id, k.name)}
                            className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-2 py-1 text-[11px] text-rose-300 hover:bg-rose-500/20 transition"
                            title="Remover chave"
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ABA 2: CONFIGURAÇÕES DE FAILOVER E CIRCUIT BREAKER */}
      {activeTab === "settings" && (
        <div className="max-w-2xl rounded-2xl border border-white/10 bg-[#0d111c] p-6 space-y-5">
          <div className="border-b border-white/10 pb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>⚙️</span> Parâmetros do Circuit Breaker & Failover
            </h3>
            <p className="text-xs text-white/50 mt-0.5">
              Defina como o motor de contingência seleciona e suspende temporariamente chaves com alta taxa de erro.
            </p>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
            <div>
              <label className="text-white/60 block mb-1">Estratégia de Seleção</label>
              <select
                value={settingsFormData.selectionStrategy}
                onChange={(e) =>
                  setSettingsFormData({
                    ...settingsFormData,
                    selectionStrategy: e.target.value as any,
                  })
                }
                className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-white"
              >
                <option value="SEQUENTIAL_PRIORITY" className="bg-[#0d111c]">
                  Prioridade Sequencial (Padrão: usa a chave principal e somente troca em caso de erro)
                </option>
                <option value="BALANCED" className="bg-[#0d111c]">
                  Distribuição Equilibrada (Round-robin entre chaves de mesma prioridade)
                </option>
                <option value="LEAST_USED" className="bg-[#0d111c]">
                  Menor Utilização (Prioriza chaves com menor volume de requisições acumuladas)
                </option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-white/60 block mb-1">
                  Falhas Consecutivas para Suspensão (Circuit Breaker)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  required
                  value={settingsFormData.maxConsecutiveFailures}
                  onChange={(e) =>
                    setSettingsFormData({
                      ...settingsFormData,
                      maxConsecutiveFailures: parseInt(e.target.value || "3", 10),
                    })
                  }
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-white font-mono"
                />
                <span className="text-[10px] text-white/40 mt-1 block">
                  Após N erros seguidos, a chave entra em cooldown automático.
                </span>
              </div>

              <div>
                <label className="text-white/60 block mb-1">
                  Tempo de Espera em Cooldown (Segundos)
                </label>
                <input
                  type="number"
                  min="30"
                  max="3600"
                  required
                  value={settingsFormData.cooldownSeconds}
                  onChange={(e) =>
                    setSettingsFormData({
                      ...settingsFormData,
                      cooldownSeconds: parseInt(e.target.value || "300", 10),
                    })
                  }
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-white font-mono"
                />
                <span className="text-[10px] text-white/40 mt-1 block">
                  Tempo antes da chave suspensa voltar a receber tentativas ({Math.round(settingsFormData.cooldownSeconds / 60)} min).
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-white/60 block mb-1">Timeout por Requisição (Milissegundos)</label>
                <input
                  type="number"
                  min="5000"
                  max="120000"
                  step="1000"
                  required
                  value={settingsFormData.requestTimeoutMs}
                  onChange={(e) =>
                    setSettingsFormData({
                      ...settingsFormData,
                      requestTimeoutMs: parseInt(e.target.value || "45000", 10),
                    })
                  }
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-white font-mono"
                />
                <span className="text-[10px] text-white/40 mt-1 block">
                  Limite de espera por tentativa ({settingsFormData.requestTimeoutMs / 1000}s).
                </span>
              </div>

              <div>
                <label className="text-white/60 block mb-1">Máximo de Tentativas no Failover</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  required
                  value={settingsFormData.maxAttemptsPerOperation}
                  onChange={(e) =>
                    setSettingsFormData({
                      ...settingsFormData,
                      maxAttemptsPerOperation: parseInt(e.target.value || "3", 10),
                    })
                  }
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-white font-mono"
                />
                <span className="text-[10px] text-white/40 mt-1 block">
                  Quantidade máxima de chaves alternativas tentadas antes de falhar.
                </span>
              </div>
            </div>

            <label className="flex items-center gap-2 p-3 rounded-xl border border-white/5 bg-white/[0.02] cursor-pointer">
              <input
                type="checkbox"
                checked={settingsFormData.envKeyFallbackAllowed}
                onChange={(e) =>
                  setSettingsFormData({
                    ...settingsFormData,
                    envKeyFallbackAllowed: e.target.checked,
                  })
                }
              />
              <span>
                Permitir contingência na variável de ambiente GEMINI_API_KEY se todas as chaves do banco falharem
              </span>
            </label>

            <div className="pt-3 border-t border-white/10 flex justify-end">
              <button
                type="submit"
                disabled={savingSettings}
                className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-on-primary hover:opacity-90 transition"
              >
                {savingSettings ? "Salvando..." : "Salvar Configurações"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ABA 3: HISTÓRICO RECENTE DE OPERAÇÕES */}
      {activeTab === "logs" && (
        <div className="rounded-2xl border border-white/10 bg-[#0d111c] overflow-hidden">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Histórico de Operações do Gemini e Failover</h3>
              <p className="text-xs text-white/40">
                Auditoria em tempo real de chamadas, chave que concluiu com sucesso e tentativas realizadas.
              </p>
            </div>
            <span className="text-xs text-white/50">{logs.length} registros</span>
          </div>

          {logs.length === 0 ? (
            <div className="p-12 text-center text-xs text-white/40">
              Nenhuma operação registrada recentemente.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.02] border-b border-white/10 text-white/50">
                  <tr>
                    <th className="p-3.5">Data/Hora</th>
                    <th className="p-3.5">Funcionalidade</th>
                    <th className="p-3.5">Modelo</th>
                    <th className="p-3.5">Chave Conclusiva</th>
                    <th className="p-3.5 text-center">Tentativas</th>
                    <th className="p-3.5 text-center">Failover?</th>
                    <th className="p-3.5 text-right">Duração</th>
                    <th className="p-3.5 text-center">Resultado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-white/80">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/[0.01]">
                      <td className="p-3.5 font-mono text-[11px] text-white/50">
                        {new Date(log.createdAt).toLocaleString("pt-BR")}
                      </td>

                      <td className="p-3.5 font-bold text-white">
                        {log.feature}
                      </td>

                      <td className="p-3.5 font-mono text-[11px] text-white/70">
                        {log.model}
                      </td>

                      <td className="p-3.5">
                        <span className="font-semibold text-white">
                          {log.finalKeyName || log.primaryKeyName || "—"}
                        </span>
                      </td>

                      <td className="p-3.5 text-center font-mono font-bold text-white">
                        {log.attemptsCount}x
                      </td>

                      <td className="p-3.5 text-center">
                        {log.usedFallback ? (
                          <span className="rounded bg-primary/20 text-primary border border-primary/40 px-2 py-0.5 text-[10px] font-bold">
                            SIM (Resgatado)
                          </span>
                        ) : (
                          <span className="text-white/30 text-[10px] font-mono">Não (Direto)</span>
                        )}
                      </td>

                      <td className="p-3.5 text-right font-mono text-[11px] text-white/70">
                        {log.durationMs}ms
                      </td>

                      <td className="p-3.5 text-center">
                        {log.success ? (
                          <span className="rounded bg-primary/20 text-primary px-2 py-0.5 text-[10px] font-bold">
                            SUCESSO
                          </span>
                        ) : (
                          <span className="rounded bg-rose-500/20 text-rose-300 px-2 py-0.5 text-[10px] font-bold" title={log.errorMessage || ""}>
                            FALHA
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL: CADASTRO / EDIÇÃO DE API KEY */}
      {showKeyModal && (
        <div className="fixed inset-0 overflow-y-auto z-50 flex items-center-safe justify-center bg-black/80 p-3 sm:p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0d111c] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white">
                {editingKey ? `Editar Chave: ${editingKey.name}` : "Cadastrar Nova API Key do Gemini"}
              </h3>
              <button onClick={() => setShowKeyModal(false)} className="text-white/40 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveKey} className="space-y-4 text-xs">
              <div>
                <label className="text-white/60 block mb-1">Nome Identificador *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Gemini Projeto Alpha Prod, Gemini Backup 2"
                  value={keyFormData.name}
                  onChange={(e) => setKeyFormData({ ...keyFormData, name: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-white"
                />
              </div>

              <div>
                <label className="text-white/60 block mb-1">
                  API Key do Google Gemini *
                  {editingKey && (
                    <span className="text-[10px] text-white/40 ml-2 font-normal">
                      (Deixe em branco para manter a chave atual: {editingKey.maskedKey})
                    </span>
                  )}
                </label>
                <input
                  type="password"
                  required={!editingKey}
                  placeholder="AIzaSy..."
                  value={keyFormData.apiKey}
                  onChange={(e) => setKeyFormData({ ...keyFormData, apiKey: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-white font-mono"
                />
                <span className="text-[10px] text-white/40 mt-1 block">
                  A chave é criptografada e armazenada no servidor com segurança, nunca sendo exposta ao frontend.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-white/60 block mb-1">Prioridade Numérica</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={keyFormData.priority}
                    onChange={(e) =>
                      setKeyFormData({
                        ...keyFormData,
                        priority: parseInt(e.target.value || "1", 10),
                      })
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-white font-mono"
                  />
                  <span className="text-[10px] text-white/40 mt-1 block">
                    1 = maior prioridade de uso.
                  </span>
                </div>

                <div>
                  <label className="text-white/60 block mb-1">Status Ativo</label>
                  <select
                    value={keyFormData.isActive ? "true" : "false"}
                    onChange={(e) =>
                      setKeyFormData({
                        ...keyFormData,
                        isActive: e.target.value === "true",
                      })
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-white"
                  >
                    <option value="true" className="bg-[#0d111c]">Ativa para Uso</option>
                    <option value="false" className="bg-[#0d111c]">Desativada</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-white/60 block mb-1">
                  Modelos Permitidos (Opcional, separados por vírgula)
                </label>
                <input
                  type="text"
                  placeholder="Ex: gemini-3.5-flash, gemini-2.5-pro (deixe vazio para todos)"
                  value={keyFormData.allowedModels}
                  onChange={(e) => setKeyFormData({ ...keyFormData, allowedModels: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-white/60 block mb-1">Observações Administrativas (Opcional)</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Chave vinculada ao projeto GCP de produção com quota tier 2..."
                  value={keyFormData.notes}
                  onChange={(e) => setKeyFormData({ ...keyFormData, notes: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="rounded-xl bg-white/10 px-4 py-2 font-semibold text-white/70 hover:bg-white/20"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingKey}
                  className="rounded-xl bg-primary px-5 py-2 font-bold text-on-primary hover:opacity-90 transition"
                >
                  {savingKey ? "Salvando..." : editingKey ? "Salvar Alterações" : "Cadastrar Chave"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

