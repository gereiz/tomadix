"use client";

import { MediaDisabledNotice } from "@/components/admin/media-disabled-notice";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { rankVideoModelQuality, VideoQualityRank } from "@/modules/video-generation/video-quality-ranker";

interface VideoModelItem {
  id: string;
  modelId: string;
  name: string;
  publisher?: string;
  description?: string;
  creditCost: number;
  isDefault: boolean;
  isEnabled: boolean;
  isAvailable: boolean;
  supportedDurations: number[];
  supportedAspectRatios: string[];
  rank?: VideoQualityRank;
}

export default function AdminVideoProvidersPage() {
  const [models, setModels] = useState<VideoModelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [editingCostId, setEditingCostId] = useState<string | null>(null);
  const [editCostVal, setEditCostVal] = useState<number>(25);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Filtros e ordenação
  const [modelSearch, setModelSearch] = useState("");
  const [sortBy, setSortBy] = useState<"quality" | "cost" | "name">("quality");
  const [filterType, setFilterType] = useState<"all" | "available" | "ultra" | "audio" | "ref">("all");

  const fetchModels = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/videos/models");
      const data = await res.json();
      if (res.ok && data.success) {
        setModels(data.models || []);
      } else {
        setMessage({ type: "error", text: data.error || "Falha ao carregar modelos de vídeo." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Erro de conexão." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const handleSync = async () => {
    try {
      setSyncing(true);
      setMessage(null);
      const res = await fetch("/api/admin/videos/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SYNC" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: "success", text: data.message });
        fetchModels();
      } else {
        setMessage({ type: "error", text: data.error || "Falha na sincronização." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Erro de conexão ao sincronizar." });
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleEnabled = async (model: VideoModelItem) => {
    try {
      const res = await fetch("/api/admin/videos/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_MODEL",
          modelId: model.modelId,
          isEnabled: !model.isEnabled,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchModels();
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    }
  };

  const handleSetDefault = async (model: VideoModelItem) => {
    try {
      const res = await fetch("/api/admin/videos/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_MODEL",
          modelId: model.modelId,
          isDefault: true,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchModels();
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    }
  };

  const handleSaveCost = async (modelId: string) => {
    try {
      const res = await fetch("/api/admin/videos/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_MODEL",
          modelId,
          creditCost: Number(editCostVal),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEditingCostId(null);
        fetchModels();
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    }
  };

  // Enriquecimento e filtros dos modelos
  const enrichedModels = useMemo(() => {
    return models.map((m) => {
      const rank = m.rank || rankVideoModelQuality(m.modelId, m.publisher || "", m.name);
      return {
        ...m,
        rank,
      };
    });
  }, [models]);

  const filteredModels = useMemo(() => {
    return enrichedModels
      .filter((m) => {
        // Busca textual
        if (modelSearch.trim()) {
          const q = modelSearch.toLowerCase();
          const matches =
            m.name.toLowerCase().includes(q) ||
            m.modelId.toLowerCase().includes(q) ||
            (m.publisher && m.publisher.toLowerCase().includes(q)) ||
            (m.description && m.description.toLowerCase().includes(q));
          if (!matches) return false;
        }

        // Filtro por tipo
        if (filterType === "available") return m.isAvailable;
        if (filterType === "ultra") return m.rank.tier === "ULTRA";
        if (filterType === "audio") return m.rank.supportsAudio;
        if (filterType === "ref") return m.rank.supportsReferenceImage;
        return true;
      })
      .sort((a, b) => {
        if (a.isDefault) return -1;
        if (b.isDefault) return 1;

        if (sortBy === "quality") {
          return b.rank.score - a.rank.score;
        }
        if (sortBy === "cost") {
          return a.creditCost - b.creditCost;
        }
        return a.name.localeCompare(b.name);
      });
  }, [enrichedModels, modelSearch, filterType, sortBy]);

  const availableCount = enrichedModels.filter((m) => m.isAvailable).length;
  const ultraCount = enrichedModels.filter((m) => m.rank.tier === "ULTRA").length;
  const audioCount = enrichedModels.filter((m) => m.rank.supportsAudio).length;
  const refCount = enrichedModels.filter((m) => m.rank.supportsReferenceImage).length;
  const defaultModel = enrichedModels.find((m) => m.isDefault);

  return (
    <div className="space-y-8 p-6 lg:p-8 max-w-7xl mx-auto">
      <MediaDisabledNotice />
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-400">
            <span>Integrações</span>
            <span>/</span>
            <span>Geração de Vídeos (IA)</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1 flex items-center gap-2.5">
            <span>🎥</span> Provedores & Modelos de Vídeo IA
          </h1>
          <p className="text-sm text-white/60">
            Gerencie o catálogo dinâmico de modelos de vídeo com telemetria de qualidade, custos de pólen e precificação em créditos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleSync}
            disabled={syncing || loading}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10 transition disabled:opacity-50"
          >
            <span className={syncing ? "animate-spin" : ""}>🔄</span>
            {syncing ? "Sincronizando..." : "Sincronizar Modelos"}
          </button>

          <Link
            href="/admin/settings/pollinations"
            className="rounded-xl bg-amber-400/10 border border-amber-400/20 px-4 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-400/20 transition flex items-center gap-1.5"
          >
            <span>🐝</span> Ver Saldo Pollen
          </Link>
        </div>
      </div>

      {message && (
        <div
          className={`flex items-start gap-3 rounded-2xl p-4 border ${
            message.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-red-500/10 border-red-500/30 text-red-300"
          }`}
        >
          <span>{message.type === "success" ? "✓" : "⚠️"}</span>
          <div className="flex-1 text-sm">{message.text}</div>
          <button onClick={() => setMessage(null)} className="text-xs opacity-60 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {/* Cards de Resumo Operacional */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-white/10 bg-[#121620] p-4 space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-white/40">Provedor Ativo</span>
          <div className="text-base font-bold text-white flex items-center gap-1.5">
            <span>🐝</span> Pollinations.ai
          </div>
          <span className="text-[11px] text-emerald-400 font-semibold">● Operacional</span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#121620] p-4 space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-white/40">Modelo Padrão</span>
          <div className="text-sm font-bold text-amber-300 truncate">
            {defaultModel?.name || "Seedance 2.0 Fast"}
          </div>
          <span className="text-[11px] text-white/50">{defaultModel?.creditCost || 25} créditos por vídeo</span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#121620] p-4 space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-white/40">Modelos Sincronizados</span>
          <div className="text-lg font-bold text-white">
            {models.length} modelos
          </div>
          <span className="text-[11px] text-teal-400 font-semibold">{availableCount} online</span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#121620] p-4 space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-white/40">Geração de Vídeo</span>
          <div className="text-sm font-bold text-purple-300">
            Direto via API /video
          </div>
          <span className="text-[11px] text-white/50">Texto ou Imagem como referência</span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-white/50 text-sm">
          Carregando catálogo detalhado de modelos de vídeo...
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-[#121620] overflow-hidden space-y-4 p-5">
          {/* Barra de Filtros, Pesquisa e Ordenação */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/10 pb-4">
            {/* Tabs de Ordenação */}
            <div className="flex items-center gap-1.5 text-xs bg-black/40 p-1 rounded-xl border border-white/5">
              <span className="text-white/40 px-2 text-[10px] font-mono uppercase">Ordenar:</span>
              <button
                type="button"
                onClick={() => setSortBy("quality")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  sortBy === "quality" ? "bg-amber-400 text-black shadow-sm" : "text-white/60 hover:text-white"
                }`}
              >
                👑 Qualidade
              </button>
              <button
                type="button"
                onClick={() => setSortBy("cost")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  sortBy === "cost" ? "bg-amber-400 text-black shadow-sm" : "text-white/60 hover:text-white"
                }`}
              >
                🪙 Custo
              </button>
              <button
                type="button"
                onClick={() => setSortBy("name")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  sortBy === "name" ? "bg-amber-400 text-black shadow-sm" : "text-white/60 hover:text-white"
                }`}
              >
                A-Z
              </button>
            </div>

            {/* Input de Busca */}
            <div className="w-full sm:w-64">
              <input
                type="text"
                placeholder="Filtrar modelos de vídeo..."
                value={modelSearch}
                onChange={(e) => setModelSearch(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder:text-white/30 focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Chips de Categoria */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setFilterType("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filterType === "all"
                  ? "bg-white/20 text-white font-bold border border-white/30"
                  : "bg-white/5 text-white/60 hover:text-white hover:bg-white/10"
              }`}
            >
              Todos ({enrichedModels.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("available")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                filterType === "available"
                  ? "bg-teal-500/25 text-teal-300 font-bold border border-teal-500/40 shadow-sm"
                  : "bg-teal-500/10 text-teal-400/70 hover:text-teal-300 hover:bg-teal-500/20"
              }`}
            >
              <span>⚡ Somente Disponíveis</span>
              <span className="font-mono text-[10px]">({availableCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterType("ultra")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                filterType === "ultra"
                  ? "bg-amber-500/25 text-amber-300 font-bold border border-amber-500/40 shadow-sm"
                  : "bg-amber-500/10 text-amber-400/70 hover:text-amber-300 hover:bg-amber-500/20"
              }`}
            >
              <span>⭐ Ultra Cinema</span>
              <span className="font-mono text-[10px]">({ultraCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterType("audio")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                filterType === "audio"
                  ? "bg-purple-500/25 text-purple-300 font-bold border border-purple-500/40 shadow-sm"
                  : "bg-purple-500/10 text-purple-400/70 hover:text-purple-300 hover:bg-purple-500/20"
              }`}
            >
              <span>🎵 Com Áudio Nativo</span>
              <span className="font-mono text-[10px]">({audioCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterType("ref")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                filterType === "ref"
                  ? "bg-blue-500/25 text-blue-300 font-bold border border-blue-500/40 shadow-sm"
                  : "bg-blue-500/10 text-blue-400/70 hover:text-blue-300 hover:bg-blue-500/20"
              }`}
            >
              <span>🖼️ Suporta Imagem (Ref)</span>
              <span className="font-mono text-[10px]">({refCount})</span>
            </button>
          </div>

          {/* Tabela de Modelos de Vídeo Detalhada (Estilo Image Providers) */}
          {filteredModels.length === 0 ? (
            <div className="p-12 text-center text-xs text-white/40">
              Nenhum modelo de vídeo encontrado para o filtro selecionado.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-left text-xs min-w-[770px]">
                <thead className="bg-[#0e121b] border-b border-white/10 text-[10px] font-mono text-white/40 uppercase">
                  <tr>
                    <th className="py-3 px-4 min-w-[220px]">Modelo</th>
                    <th className="py-3 px-4 min-w-[200px]">Ranking de Qualidade</th>
                    <th className="py-3 px-4 min-w-[190px]">Custo Pollen (Provedor)</th>
                    <th className="py-3 px-4 min-w-[110px]">Publisher</th>
                    <th className="py-3 px-4 text-center min-w-[110px]">Custo (cr)</th>
                    <th className="py-3 px-4 text-center min-w-[120px]">Padrão</th>
                    <th className="py-3 px-4 text-right min-w-[90px]">Ativo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredModels.map((item) => (
                    <tr
                      key={item.id}
                      className={`transition ${
                        !item.isAvailable
                          ? "opacity-60 bg-red-500/[0.03] hover:opacity-80"
                          : "hover:bg-white/[0.02]"
                      }`}
                    >
                      {/* Coluna 1: MODELO */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-white flex items-center gap-1.5 text-sm">
                            {item.name}
                            {!item.isAvailable && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 font-mono font-bold">
                                INDISPONÍVEL
                              </span>
                            )}
                          </span>
                          <span className="text-[10px] font-mono text-white/40">{item.modelId}</span>
                          {item.description && (
                            <span className="text-[10px] text-white/50 line-clamp-1 mt-0.5 max-w-sm">
                              {item.description}
                            </span>
                          )}
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[9px] text-white/40 font-mono">
                              Durações: {Array.isArray(item.supportedDurations) ? item.supportedDurations.join("s, ") + "s" : "4s, 5s, 8s"}
                            </span>
                            <span className="text-[9px] text-white/20">•</span>
                            <span className="text-[9px] text-white/40 font-mono">
                              {Array.isArray(item.supportedAspectRatios) ? item.supportedAspectRatios.join(", ") : "16:9, 9:16"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Coluna 2: RANKING DE QUALIDADE */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-0.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] border w-fit ${item.rank.badgeColor}`}>
                            <span>{item.rank.stars}</span>
                            <span>{item.rank.tierLabel}</span>
                            <span className="opacity-70 font-mono">({item.rank.score})</span>
                          </span>
                          <span className="text-[9px] text-white/45 line-clamp-2 max-w-xs leading-relaxed mt-0.5">
                            {item.rank.rationale}
                          </span>
                        </div>
                      </td>

                      {/* Coluna 3: CUSTO POLLEN (PROVEDOR) */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold border bg-amber-400/10 text-amber-300 border-amber-400/30">
                            <span>🪙</span>
                            <span>({item.rank.formattedRate})</span>
                          </span>
                          <span className="text-[10px] text-white/50 font-mono">
                            {item.rank.sampleCost5s}
                          </span>

                          <div className="flex flex-wrap items-center gap-1 mt-0.5">
                            {item.rank.supportsReferenceImage && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] bg-blue-500/15 text-blue-300 border border-blue-500/30 font-medium">
                                🖼️ Ref Image
                              </span>
                            )}
                            {item.rank.supportsAudio && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] bg-purple-500/15 text-purple-300 border border-purple-500/30 font-medium">
                                🎵 Áudio
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Coluna 4: PUBLISHER */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-white/90 text-xs">
                          {item.publisher || "Pollinations"}
                        </span>
                      </td>

                      {/* Coluna 5: CUSTO (CR) EDITÁVEL */}
                      <td className="py-3.5 px-4 text-center">
                        {editingCostId === item.modelId ? (
                          <div className="inline-flex items-center gap-1">
                            <input
                              type="number"
                              min={1}
                              value={editCostVal}
                              onChange={(e) => setEditCostVal(Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-14 rounded-lg bg-black/60 border border-amber-400 px-1.5 py-1 text-center font-mono text-xs text-white"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveCost(item.modelId)}
                              className="rounded-lg bg-emerald-500 p-1 text-xs text-black font-bold hover:bg-emerald-400"
                              title="Salvar"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => setEditingCostId(null)}
                              className="rounded-lg bg-white/10 p-1 text-xs text-white hover:bg-white/20"
                              title="Cancelar"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingCostId(item.modelId);
                              setEditCostVal(item.creditCost);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-mono font-bold text-amber-300 hover:bg-amber-500/20 transition"
                            title="Clique para editar o custo em créditos"
                          >
                            <span>🪙</span>
                            <span>{item.creditCost} cr</span>
                            <span className="text-[10px] opacity-60">✏️</span>
                          </button>
                        )}
                      </td>

                      {/* Coluna 6: PADRÃO */}
                      <td className="py-3.5 px-4 text-center">
                        {item.isDefault ? (
                          <span className="inline-flex items-center gap-1 rounded-xl bg-amber-400 px-3 py-1 text-[11px] font-bold text-black shadow-md shadow-amber-400/20">
                            ★ PADRÃO
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSetDefault(item)}
                            className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/70 hover:bg-white/10 hover:text-white transition"
                          >
                            Tornar Padrão
                          </button>
                        )}
                      </td>

                      {/* Coluna 7: ATIVO */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleToggleEnabled(item)}
                          className={`rounded-lg px-2.5 py-1 font-mono text-[10px] font-bold uppercase transition ${
                            item.isEnabled
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30"
                              : "bg-white/5 text-white/40 border border-white/10 hover:bg-white/10"
                          }`}
                        >
                          {item.isEnabled ? "ATIVO" : "INATIVO"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
