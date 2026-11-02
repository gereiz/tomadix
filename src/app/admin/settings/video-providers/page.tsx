"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

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
}

export default function AdminVideoProvidersPage() {
  const [models, setModels] = useState<VideoModelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [editingCostId, setEditingCostId] = useState<string | null>(null);
  const [editCostVal, setEditCostVal] = useState<number>(25);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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

  return (
    <div className="space-y-8 p-6 lg:p-8 max-w-6xl mx-auto">
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
            Gerencie o catálogo dinâmico de modelos de vídeo da Pollinations.ai (Google Veo, ByteDance Seedance, Alibaba Wan, Kling, Grok).
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
            className="rounded-xl bg-amber-400/10 border border-amber-400/20 px-4 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-400/20 transition"
          >
            🐝 Ver Saldo Pollen
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

      {loading ? (
        <div className="flex items-center justify-center py-24 text-white/50 text-sm">
          Carregando catálogo de modelos de vídeo...
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-[#121620] overflow-hidden">
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">
              Modelos de Vídeo Disponíveis ({models.length})
            </h2>
            <span className="text-xs text-white/40">
              Provedor Oficial: Pollinations.ai (Endpoints /video e /video/models)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 bg-white/[0.02] text-white/50 font-medium">
                <tr>
                  <th className="px-5 py-3.5">Modelo</th>
                  <th className="px-5 py-3.5">Publicador</th>
                  <th className="px-5 py-3.5">Durações</th>
                  <th className="px-5 py-3.5">Proporções</th>
                  <th className="px-5 py-3.5">Custo (Créditos)</th>
                  <th className="px-5 py-3.5 text-center">Padrão</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {models.map((model) => (
                  <tr key={model.id} className="hover:bg-white/[0.02] transition">
                    <td className="px-5 py-3.5 font-medium text-white">
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm">{model.name}</span>
                        <span className="font-mono text-[10px] text-white/40">{model.modelId}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-white/70">{model.publisher || "—"}</td>
                    <td className="px-5 py-3.5 font-mono text-white/60">
                      {(model.supportedDurations || [5]).map((d) => `${d}s`).join(", ")}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-white/60">
                      {(model.supportedAspectRatios || ["16:9"]).join(", ")}
                    </td>
                    <td className="px-5 py-3.5">
                      {editingCostId === model.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            value={editCostVal}
                            onChange={(e) => setEditCostVal(Number(e.target.value))}
                            className="w-16 rounded border border-white/20 bg-white/10 px-2 py-0.5 text-xs text-white"
                          />
                          <button
                            onClick={() => handleSaveCost(model.modelId)}
                            className="rounded bg-primary px-2 py-0.5 text-[10px] font-bold text-black"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => setEditingCostId(null)}
                            className="rounded bg-white/10 px-2 py-0.5 text-[10px] text-white/60"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingCostId(model.id);
                            setEditCostVal(model.creditCost);
                          }}
                          className="flex items-center gap-1 font-semibold text-amber-400 hover:underline"
                        >
                          🪙 {model.creditCost} cr <span className="text-[10px] text-white/30">✎</span>
                        </button>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {model.isDefault ? (
                        <span className="rounded bg-primary/20 border border-primary/30 px-2 py-0.5 text-[10px] font-bold text-primary">
                          Padrão
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSetDefault(model)}
                          className="text-[10px] text-white/30 hover:text-white transition underline"
                        >
                          Definir
                        </button>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        onClick={() => handleToggleEnabled(model)}
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition ${
                          model.isEnabled
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30"
                            : "bg-white/10 text-white/40 border border-white/10 hover:bg-white/20"
                        }`}
                      >
                        {model.isEnabled ? "Ativo" : "Inativo"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
