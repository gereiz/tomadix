"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface PollinationsOverview {
  balance: {
    balance: number;
    pollen: number;
    paidPollen?: number;
    rewardsPollen?: number;
    currency?: string;
    hasSufficientBalance: boolean;
  };
  quests: Array<{
    id: string;
    title: string;
    description: string;
    status: "AVAILABLE" | "IN_PROGRESS" | "COMPLETED" | "CLAIMED";
    rewardPollen: number;
    actionUrl?: string;
    category?: string;
    progressPercent?: number;
  }>;
  usage: any;
  lastUpdated: string;
  isCached: boolean;
  apiKeyMasked: string;
  warning?: {
    code: string;
    message: string;
    fixUrl?: string;
  };
}

export default function AdminPollinationsCentralPage() {
  const [data, setData] = useState<PollinationsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estado para modal de alteração de chave
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [savingKey, setSavingKey] = useState(false);
  const [keyNotice, setKeyNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchOverview = async (forceRefresh = false) => {
    try {
      if (forceRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const url = `/api/admin/pollinations/account${forceRefresh ? "?refresh=true" : ""}`;
      const res = await fetch(url);
      const json = await res.json();

      if (res.ok && json.success) {
        setData(json);
      } else {
        setError(json.error || "Falha ao carregar informações da conta Pollinations.");
      }
    } catch (err: any) {
      setError(err.message || "Erro de rede ao comunicar com o servidor.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim()) return;

    try {
      setSavingKey(true);
      setKeyNotice(null);

      const res = await fetch("/api/admin/pollinations/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: newKey.trim() }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setKeyNotice({ type: "success", text: json.message });
        setData(json);
        setTimeout(() => {
          setIsEditingKey(false);
          setKeyNotice(null);
          setNewKey("");
        }, 1500);
      } else {
        setKeyNotice({ type: "error", text: json.error || "Falha ao salvar chave." });
      }
    } catch (err: any) {
      setKeyNotice({ type: "error", text: err.message || "Erro ao conectar com servidor." });
    } finally {
      setSavingKey(false);
    }
  };

  return (
    <div className="space-y-8 p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400">
            <span>Integrações</span>
            <span>/</span>
            <span>Pollinations.ai</span>
            <span>/</span>
            <span>Central de Gestão</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1 flex items-center gap-2.5">
            <span>🐝</span> Central de Gestão Pollinations
          </h1>
          <p className="text-sm text-white/60">
            Monitore seu saldo de Pollen, acompanhe quests com recompensas, verifique custos e administre as contas de geração de imagem e vídeo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => fetchOverview(true)}
            disabled={refreshing || loading}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10 transition disabled:opacity-50"
          >
            <span className={refreshing ? "animate-spin" : ""}>🔄</span>
            {refreshing ? "Atualizando..." : "Atualizar Agora"}
          </button>

          <Link
            href="/admin/settings/image-providers"
            className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-black shadow-lg shadow-primary/20 hover:bg-primary/90 transition"
          >
            ⚙️ Gerenciar Modelos & Chave
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300 flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button onClick={() => fetchOverview(true)} className="underline text-xs">
            Tentar novamente
          </button>
        </div>
      )}

      {/* Alerta de Permissão ou Chave */}
      {data?.warning && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚠️</span>
                <h3 className="text-sm font-bold text-amber-300">
                  {data.warning.code === "PERMISSION_REQUIRED"
                    ? "Permissão 'account:usage' Necessária na Pollinations"
                    : "Atenção com a Credencial Pollinations"}
                </h3>
              </div>
              <p className="text-xs text-amber-200/80 leading-relaxed max-w-2xl">
                {data.warning.message}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {data.warning.fixUrl && (
                <a
                  href={data.warning.fixUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-black hover:bg-amber-400 transition shadow-lg shadow-amber-500/20"
                >
                  <span>🔑</span> Conceder Permissão em 1 Clique ↗
                </a>
              )}
              <button
                type="button"
                onClick={() => {
                  setIsEditingKey(true);
                  setKeyNotice(null);
                  setNewKey("");
                }}
                className="rounded-xl border border-amber-500/30 bg-black/40 px-3.5 py-2 text-xs font-semibold text-amber-200 hover:bg-black/60 transition"
              >
                Trocar Chave de API
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24 text-white/50 text-sm">
          Consultando API oficial da Pollinations.ai...
        </div>
      ) : data ? (
        <div className="space-y-8">
          {/* Grid de Cards de Topo: Saldo Pollen */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Card 1: Saldo Total */}
            <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-[#131722] to-[#121620] p-6 space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                  Saldo de Pollen
                </span>
                <span className="h-7 w-7 rounded-lg bg-amber-400/20 text-amber-300 flex items-center justify-center text-sm font-bold">
                  🐝
                </span>
              </div>
              <div className="text-3xl font-extrabold text-white tracking-tight">
                {data.balance.pollen.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                <span className="text-sm font-normal text-amber-400/80 ml-1.5">pollen</span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold ${
                    data.warning?.code === "PERMISSION_REQUIRED"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : data.balance.hasSufficientBalance
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-red-500/20 text-red-300 border border-red-500/30"
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {data.warning?.code === "PERMISSION_REQUIRED"
                    ? "Requer Permissão 'account:usage'"
                    : data.balance.hasSufficientBalance
                    ? "Saldo Operacional Ativo"
                    : "Saldo Baixo / Crítico"}
                </span>
              </div>
              {data.warning?.code === "PERMISSION_REQUIRED" && (
                <p className="text-[10px] text-amber-300/70">
                  O saldo oficial em tempo real será sincronizado após a permissão da chave.
                </p>
              )}
            </div>

            {/* Card 2: Saldo Pago vs Recompensas */}
            <div className="rounded-2xl border border-white/10 bg-[#121620] p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-white/50">
                  Composição do Saldo
                </span>
                <span className="text-sm">🪙</span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="rounded-xl bg-white/5 p-3 border border-white/5">
                  <div className="text-[10px] text-white/40 uppercase">Pollen Pago</div>
                  <div className="text-lg font-bold text-white mt-0.5">
                    {(data.balance.paidPollen ?? data.balance.pollen).toFixed(2)}
                  </div>
                </div>
                <div className="rounded-xl bg-white/5 p-3 border border-white/5">
                  <div className="text-[10px] text-white/40 uppercase">Quests / Bônus</div>
                  <div className="text-lg font-bold text-emerald-400 mt-0.5">
                    +{(data.balance.rewardsPollen ?? 0).toFixed(2)}
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-white/40">
                O saldo pago é recarregado via cartão/crypto; bônus são obtidos ao completar quests oficiais.
              </p>
            </div>

            {/* Card 3: Status da Chave e Links Rápidos */}
            <div className="rounded-2xl border border-white/10 bg-[#121620] p-6 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-white/50">
                    Credencial em Uso
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingKey(true);
                      setKeyNotice(null);
                      setNewKey("");
                    }}
                    className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 underline"
                  >
                    ✏️ Alterar
                  </button>
                </div>
                <div className="mt-2 font-mono text-xs text-white/80 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/10 truncate">
                  {data.apiKeyMasked}
                </div>
                <div className="mt-2 text-[10px] text-white/40">
                  Atualizado em {new Date(data.lastUpdated).toLocaleTimeString("pt-BR")}
                  {data.isCached && " (em cache de 5 min)"}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                <a
                  href="https://pollinations.ai"
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 text-center rounded-lg bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-white/70 hover:bg-white/10 hover:text-white transition"
                >
                  🌐 Site Oficial
                </a>
                <a
                  href="https://discord.gg/pollinations"
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 text-center rounded-lg bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-white/70 hover:bg-white/10 hover:text-white transition"
                >
                  💬 Discord
                </a>
              </div>
            </div>
          </div>

          {/* Quests e Recompensas (Quests Board) */}
          <div className="rounded-2xl border border-white/10 bg-[#121620] p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-4 gap-2">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>🎯</span> Quests & Recompensas Pollinations
                </h2>
                <p className="text-xs text-white/50">
                  Tarefas ativas da plataforma Pollinations que concedem créditos gratuitos de Pollen.
                </p>
              </div>

              <a
                href="https://enter.pollinations.ai"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-amber-400 hover:text-amber-300 font-medium"
              >
                Ver todas no portal Pollinations →
              </a>
            </div>

            {data.quests.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-xs text-white/40 space-y-2">
                <p>Nenhuma quest ativa retornada pela API no momento.</p>
                <p className="text-[11px] text-white/30">
                  Fique atento a novidades na comunidade ou participe das discussões no Discord da Pollinations para novas campanhas.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.quests.map((quest) => (
                  <div
                    key={quest.id}
                    className="flex flex-col justify-between rounded-xl border border-white/5 bg-white/[0.02] p-4 hover:border-white/10 hover:bg-white/[0.04] transition space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-white/40">
                          {quest.category || "Quest"}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">
                            +{quest.rewardPollen} Pollen
                          </span>
                          <span
                            className={`text-[9px] font-semibold px-2 py-0.5 rounded uppercase ${
                              quest.status === "CLAIMED" || quest.status === "COMPLETED"
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : quest.status === "IN_PROGRESS"
                                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                            }`}
                          >
                            {quest.status === "CLAIMED"
                              ? "Concluída"
                              : quest.status === "IN_PROGRESS"
                              ? "Em Progresso"
                              : "Disponível"}
                          </span>
                        </div>
                      </div>

                      <h3 className="text-sm font-semibold text-white mt-1.5">{quest.title}</h3>
                      <p className="text-xs text-white/60 mt-1 leading-relaxed">{quest.description}</p>
                    </div>

                    <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                      {typeof quest.progressPercent === "number" && (
                        <div className="flex items-center gap-2 text-[10px] text-white/40">
                          <span>Progresso:</span>
                          <div className="w-20 bg-white/10 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-emerald-400 h-full rounded-full"
                              style={{ width: `${Math.min(100, quest.progressPercent)}%` }}
                            />
                          </div>
                          <span>{quest.progressPercent}%</span>
                        </div>
                      )}

                      <a
                        href={quest.actionUrl || "https://pollinations.ai"}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-auto inline-flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition"
                      >
                        Acessar Quest ↗
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Modal: Atualizar Chave da Pollinations */}
      {isEditingKey && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => !savingKey && setIsEditingKey(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#121620] p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔑</span>
                <h3 className="text-sm font-bold text-white">Configurar Chave da Pollinations</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingKey(false)}
                className="rounded p-1 text-xs text-white/40 hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-white/60 leading-relaxed">
              Cole abaixo sua API Key gerada no portal da Pollinations (<code className="text-amber-400">sk_...</code>). A chave será salva simultaneamente para os módulos de <strong>Imagens</strong> e <strong>Vídeos</strong>.
            </p>

            <form onSubmit={handleSaveKey} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-white/70 uppercase tracking-wider mb-1.5">
                  Nova API Key (Pollinations)
                </label>
                <input
                  type="password"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="sk_..."
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:border-amber-400 focus:outline-none"
                />
              </div>

              {keyNotice && (
                <div
                  className={`rounded-xl p-3 text-xs font-semibold ${
                    keyNotice.type === "success"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-red-500/20 text-red-300 border border-red-500/30"
                  }`}
                >
                  {keyNotice.text}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsEditingKey(false)}
                  disabled={savingKey}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-white/60 hover:bg-white/5 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingKey || !newKey.trim()}
                  className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-black hover:bg-amber-400 transition shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  {savingKey ? "Salvando..." : "Salvar Chave"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

