"use client";

import { useEffect, useState } from "react";

interface CategoryMeta {
  label: string;
  description: string;
}

export function ConsumptionOrderTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [version, setVersion] = useState<number>(1);
  const [categories, setCategories] = useState<string[]>([]);
  const [protectedCategories, setProtectedCategories] = useState<string[]>([]);
  const [metadata, setMetadata] = useState<Record<string, CategoryMeta>>({});
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/credit-consumption-order");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setVersion(data.config.version);
      setCategories(data.config.categoryPriorities);
      setProtectedCategories(data.config.protectedCategories || []);
      setMetadata(data.metadata || {});
    } catch (err: any) {
      setNotification({ type: "error", text: "Erro ao carregar ordem de consumo: " + err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const moveItem = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const updated = [...categories];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setCategories(updated);
  };

  const toggleProtected = (cat: string) => {
    if (protectedCategories.includes(cat)) {
      setProtectedCategories(protectedCategories.filter((c) => c !== cat));
    } else {
      setProtectedCategories([...protectedCategories, cat]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setNotification(null);
    try {
      const res = await fetch("/api/admin/credit-consumption-order", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryPriorities: categories,
          protectedCategories,
          description: `Atualização manual de prioridades v${version + 1}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setVersion(data.config.version);
      setNotification({ type: "success", text: "Ordem global de consumo salva com sucesso! (Versão " + data.config.version + ")" });
    } catch (err: any) {
      setNotification({ type: "error", text: "Falha ao salvar: " + err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("Tem certeza que deseja restaurar a ordem padrão oficial recomendada pelo Tomadix?")) return;

    setSaving(true);
    setNotification(null);
    try {
      const res = await fetch("/api/admin/credit-consumption-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setVersion(data.config.version);
      setCategories(data.config.categoryPriorities);
      setProtectedCategories(data.config.protectedCategories || []);
      setNotification({ type: "success", text: "Ordem de consumo restaurada para o padrão oficial v" + data.config.version });
    } catch (err: any) {
      setNotification({ type: "error", text: "Falha ao restaurar padrão: " + err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#0d111c] p-5 sm:p-8 text-center text-xs text-white/50">
        Carregando configurações de ordem de consumo...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner Informativo */}
      <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">⚡</span>
              <h3 className="text-sm font-bold text-white">
                Ordem Global de Consumo de Créditos & Critério FEFO
              </h3>
              <span className="rounded bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-300">
                v{version} Ativa
              </span>
            </div>
            <p className="text-xs text-white/60 mt-1 max-w-2xl leading-relaxed">
              O motor de execução consome os lotes disponíveis seguindo a hierarquia abaixo. Lotes de categorias superiores são consumidos primeiro. Dentro da mesma categoria, prevalece o critério determinístico <strong>FEFO (First Expired, First Out)</strong>: o lote mais próximo da expiração é liquidado antes para benefício e proteção do cliente.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={handleReset}
              disabled={saving}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white transition"
            >
              Restaurar Padrão Oficial
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-black hover:bg-amber-300 transition shadow-lg shadow-amber-500/20"
            >
              {saving ? "Salvando..." : "Salvar Ordem Global"}
            </button>
          </div>
        </div>
      </div>

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

      {/* Lista Reordenável de Categorias */}
      <div className="rounded-2xl border border-white/10 bg-[#0d111c] overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-white">Hierarquia de Prioridades</h4>
            <p className="text-xs text-white/40">Utilize as setas para alterar a precedência no momento do consumo.</p>
          </div>
          <span className="text-xs text-white/50">{categories.length} Categorias Registradas</span>
        </div>

        <div className="divide-y divide-white/5">
          {categories.map((catKey, index) => {
            const meta = metadata[catKey] || { label: catKey, description: "" };
            const isProtected = protectedCategories.includes(catKey);

            return (
              <div
                key={catKey}
                className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${
                  isProtected ? "bg-rose-950/10 border-l-4 border-rose-500" : "hover:bg-white/[0.01]"
                }`}
              >
                <div className="flex items-start sm:items-center gap-3">
                  {/* Badge de Posição */}
                  <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-xl font-mono text-xs font-bold bg-white/5 border border-white/10 text-amber-300">
                    {index + 1}º
                  </span>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{meta.label}</span>
                      <span className="font-mono text-[10px] text-white/40 bg-white/5 px-2 py-0.5 rounded">
                        {catKey}
                      </span>
                      {isProtected && (
                        <span className="rounded bg-rose-500/20 border border-rose-500/40 px-2 py-0.5 text-[10px] font-bold text-rose-300 flex items-center gap-1">
                          🔒 Categoria Protegida (Não Consumível)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/50 mt-0.5">{meta.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {/* Toggle de Proteção */}
                  <button
                    onClick={() => toggleProtected(catKey)}
                    title={isProtected ? "Desproteger categoria" : "Proteger contra deduções automáticas"}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold border transition ${
                      isProtected
                        ? "bg-rose-500/20 border-rose-500/40 text-rose-300 hover:bg-rose-500/30"
                        : "bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    {isProtected ? "Desbloquear" : "Proteger"}
                  </button>

                  {/* Botões de Mover */}
                  <div className="flex items-center gap-1 bg-white/5 rounded-lg border border-white/10 p-1">
                    <button
                      onClick={() => moveItem(index, "up")}
                      disabled={index === 0}
                      className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 text-white/70 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent"
                      title="Mover para cima (maior prioridade)"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => moveItem(index, "down")}
                      disabled={index === categories.length - 1}
                      className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 text-white/70 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent"
                      title="Mover para baixo (menor prioridade)"
                    >
                      ▼
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

