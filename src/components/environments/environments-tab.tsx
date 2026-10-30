"use client";

import { useState, useEffect, useCallback } from "react";
import { EntityParametersSection } from "@/components/parameters/entity-parameters-section";

export interface EnvironmentItem {
  id: string;
  projectId: string;
  name: string;
  description: string;
  attributes: {
    locationContext?: string;
    architecture?: string;
    propsAndElements?: string;
    lighting?: string;
    colorPalette?: string;
    weatherAndAtmosphere?: string;
    historicalEra?: string;
    visualStyle?: string;
    basePrompt?: string;
  };
  isArchived: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    sceneLinks: number;
  };
}

interface EnvironmentsTabProps {
  projectId: string;
  onStatsUpdate?: () => void;
}

export function EnvironmentsTab({ projectId, onStatsUpdate }: EnvironmentsTabProps) {
  const [environments, setEnvironments] = useState<EnvironmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "archived">("active");

  // Modal de Criação / Edição
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEnvironment, setEditingEnvironment] = useState<EnvironmentItem | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    locationContext: "",
    architecture: "",
    propsAndElements: "",
    lighting: "",
    colorPalette: "",
    weatherAndAtmosphere: "",
    historicalEra: "",
    visualStyle: "",
    basePrompt: "",
  });

  // Dynamic Parameters State
  const [paramValues, setParamValues] = useState<Record<string, any>>({});

  // Modal de Visualização de Prompt JSON
  const [promptModalOpen, setPromptModalOpen] = useState(false);
  const [promptData, setPromptData] = useState<any>(null);
  const [promptLoading, setPromptLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Modal de Confirmação de Exclusão
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [environmentToDelete, setEnvironmentToDelete] = useState<EnvironmentItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Modal de Geração com IA (GEN_ENVIRONMENT)
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLocationType, setAiLocationType] = useState<"INTERIOR" | "EXTERIOR" | "HYBRID" | "STUDIO">("INTERIOR");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleOpenAiModal = () => {
    setAiPrompt("");
    setAiLocationType("INTERIOR");
    setAiError(null);
    setAiModalOpen(true);
  };

  const handleSubmitAiGenerate = async () => {
    if (!aiPrompt.trim()) {
      setAiError("Por favor informe a descrição ou conceito do ambiente.");
      return;
    }
    try {
      setAiLoading(true);
      setAiError(null);
      const res = await fetch(`/api/projects/${projectId}/environments/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: aiPrompt,
          locationType: aiLocationType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao conceber ambiente com IA.");

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("tomadix:credits-updated", { detail: { newBalance: data.newBalance } }));
        window.dispatchEvent(new CustomEvent("tomadix:entities-updated", { detail: { type: "environments", projectId } }));
      }
      setAiModalOpen(false);
      await fetchEnvironments();
      onStatsUpdate?.();
    } catch (err: any) {
      setAiError(err.message || "Erro ao gerar ambiente com IA.");
    } finally {
      setAiLoading(false);
    }
  };

  // Carregar ambientes da API
  const fetchEnvironments = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/projects/${projectId}/environments?${params.toString()}`);
      if (!res.ok) throw new Error("Erro ao carregar a biblioteca de ambientes.");
      const json = await res.json();
      setEnvironments(json.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [projectId, statusFilter, search]);

  useEffect(() => {
    fetchEnvironments();
  }, [fetchEnvironments]);

  // Abertura do Modal de Criação
  const handleOpenCreate = () => {
    setEditingEnvironment(null);
    setParamValues({});
    setFormData({
      name: "",
      description: "",
      locationContext: "",
      architecture: "",
      propsAndElements: "",
      lighting: "",
      colorPalette: "",
      weatherAndAtmosphere: "",
      historicalEra: "",
      visualStyle: "",
      basePrompt: "",
    });
    setFormError(null);
    setModalOpen(true);
  };

  // Abertura do Modal de Edição
  const handleOpenEdit = (env: EnvironmentItem) => {
    setEditingEnvironment(env);
    setParamValues({});
    const attrs = env.attributes || {};
    setFormData({
      name: env.name || "",
      description: env.description || "",
      locationContext: attrs.locationContext || "",
      architecture: attrs.architecture || "",
      propsAndElements: attrs.propsAndElements || "",
      lighting: attrs.lighting || "",
      colorPalette: attrs.colorPalette || "",
      weatherAndAtmosphere: attrs.weatherAndAtmosphere || "",
      historicalEra: attrs.historicalEra || "",
      visualStyle: attrs.visualStyle || "",
      basePrompt: attrs.basePrompt || "",
    });
    setFormError(null);
    setModalOpen(true);
  };

  // Salvar Ambiente (Create ou Update)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError("O nome do ambiente é obrigatório.");
      return;
    }

    try {
      setFormLoading(true);
      setFormError(null);

      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        attributes: {
          locationContext: formData.locationContext.trim(),
          architecture: formData.architecture.trim(),
          propsAndElements: formData.propsAndElements.trim(),
          lighting: formData.lighting.trim(),
          colorPalette: formData.colorPalette.trim(),
          weatherAndAtmosphere: formData.weatherAndAtmosphere.trim(),
          historicalEra: formData.historicalEra.trim(),
          visualStyle: formData.visualStyle.trim(),
          basePrompt: formData.basePrompt.trim(),
        },
      };

      const endpoint = editingEnvironment
        ? `/api/projects/${projectId}/environments/${editingEnvironment.id}`
        : `/api/projects/${projectId}/environments`;
      const method = editingEnvironment ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorJson = await res.json();
        throw new Error(errorJson.error || "Falha ao salvar dados do ambiente.");
      }

      const responseJson = await res.json();
      const savedEnvId = editingEnvironment?.id || responseJson.data?.id;

      // Salva os valores dos parâmetros dinâmicos se preenchidos
      if (savedEnvId && Object.keys(paramValues).length > 0) {
        const paramPayload = {
          values: Object.entries(paramValues)
            .filter(([_, val]) => val !== undefined && val !== null && val !== "")
            .map(([defId, val]) => ({
              parameterDefinitionId: defId,
              targetType: "ENVIRONMENT" as const,
              targetId: savedEnvId,
              value: val,
            })),
        };

        if (paramPayload.values.length > 0) {
          await fetch(`/api/projects/${projectId}/parameters`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(paramPayload),
          });
        }
      }

      setModalOpen(false);
      fetchEnvironments();
      if (onStatsUpdate) onStatsUpdate();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro desconhecido.");
    } finally {
      setFormLoading(false);
    }
  };

  // Duplicar Ambiente
  const handleDuplicate = async (env: EnvironmentItem) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/environments/${env.id}/duplicate`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Erro ao duplicar o ambiente.");
      fetchEnvironments();
      if (onStatsUpdate) onStatsUpdate();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao duplicar.");
    }
  };

  // Alternar Arquivar / Restaurar
  const handleToggleArchive = async (env: EnvironmentItem) => {
    try {
      const action = env.isArchived ? "restore" : "archive";
      const res = await fetch(`/api/projects/${projectId}/environments/${env.id}/${action}`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(`Erro ao ${action === "restore" ? "restaurar" : "arquivar"} o ambiente.`);
      fetchEnvironments();
      if (onStatsUpdate) onStatsUpdate();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao alterar estado.");
    }
  };

  // Excluir Ambiente
  const handleConfirmDelete = async () => {
    if (!environmentToDelete) return;
    try {
      setDeleteLoading(true);
      const res = await fetch(`/api/projects/${projectId}/environments/${environmentToDelete.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao excluir o ambiente.");
      }
      setDeleteModalOpen(false);
      if (environmentToDelete) setEnvironmentToDelete(null);
      fetchEnvironments();

      if (onStatsUpdate) onStatsUpdate();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao excluir.");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Abrir Visualização de Prompt JSON Estruturado
  const handleViewPrompt = async (env: EnvironmentItem) => {
    try {
      setPromptLoading(true);
      setPromptModalOpen(true);
      setCopySuccess(false);
      const res = await fetch(`/api/projects/${projectId}/environments/${env.id}/prompt`);
      if (!res.ok) throw new Error("Erro ao compilar prompt do ambiente.");
      const json = await res.json();
      setPromptData(json.data);
    } catch (err) {
      setPromptData({ error: err instanceof Error ? err.message : "Falha na compilação." });
    } finally {
      setPromptLoading(false);
    }
  };

  const handleCopyPromptJson = () => {
    if (!promptData) return;
    navigator.clipboard.writeText(JSON.stringify(promptData, null, 2));
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  return (
    <div className="mt-8 space-y-6">
      {/* Barra Superior: Busca, Filtros e Botão Novo */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          {/* Campo de Busca */}
          <div className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-white/40">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar ambientes, arquitetura ou iluminação..."
              className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-2 text-xs text-white placeholder-white/40 focus:border-emerald-500 focus:outline-none transition"
            />
          </div>

          {/* Filtro de Estado */}
          <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/10">
            {(["active", "archived", "all"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  statusFilter === filter
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold"
                    : "text-white/60 hover:text-white"
                }`}
              >
                {filter === "active" && "Ativos"}
                {filter === "archived" && "Arquivados"}
                {filter === "all" && "Todos"}
              </button>
            ))}
          </div>
        </div>

        {/* Botões de Criação */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenAiModal}
            className="flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-xs font-semibold text-primary hover:bg-primary/20 transition shadow-sm"
            title="Conceber ambiente cênico cinematográfico com IA (GEN_ENVIRONMENT)"
          >
            <span>✨</span>
            Gerar com IA
          </button>

          <button
            onClick={handleOpenCreate}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-lg hover:opacity-90 transition"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Novo Ambiente
          </button>
        </div>
      </div>

      {/* Grid de Cards de Ambientes */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-56 animate-pulse rounded-2xl bg-white/5 border border-white/10" />
          ))}
        </div>
      ) : environments.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.01] p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-4">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-white">Nenhum ambiente encontrado</h3>
          <p className="mt-1 text-xs text-white/50 max-w-sm mx-auto">
            {search.trim() || statusFilter !== "active"
              ? "Tente ajustar seus filtros de busca para encontrar ambientes cadastrados."
              : "Defina locações, arquitetura e iluminação base para manter coerência espacial em todas as tomadas."}
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20 transition"
          >
            + Criar Primeiro Ambiente
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {environments.map((env) => {
            const attrs = env.attributes || {};
            const sceneCount = env._count?.sceneLinks || 0;

            return (
              <div
                key={env.id}
                className={`flex flex-col justify-between rounded-2xl border bg-black/40 p-5 transition hover:border-emerald-500/40 ${
                  env.isArchived ? "border-amber-500/20 opacity-70" : "border-white/10"
                }`}
              >
                <div>
                  {/* Cabeçalho do Card */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-white">{env.name}</h4>
                        {env.isArchived && (
                          <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-300 border border-amber-500/20">
                            Arquivado
                          </span>
                        )}
                      </div>
                      {attrs.locationContext && (
                        <p className="text-[11px] font-mono text-emerald-400 mt-0.5">
                          📍 {attrs.locationContext}
                        </p>
                      )}
                    </div>

                    <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-mono text-white/50 border border-white/10 shrink-0">
                      {sceneCount} {sceneCount === 1 ? "cena" : "cenas"}
                    </span>
                  </div>

                  {/* Descrição */}
                  <p className="mt-2.5 text-xs text-white/60 line-clamp-2">
                    {env.description || "Nenhuma descrição fornecida para este ambiente."}
                  </p>

                  {/* Badges de Atributos Arquiteturais & Iluminação */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {attrs.architecture && (
                      <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300 border border-emerald-500/20 truncate max-w-[200px]">
                        🏛️ {attrs.architecture}
                      </span>
                    )}
                    {attrs.lighting && (
                      <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300 border border-amber-500/20 truncate max-w-[200px]">
                        💡 {attrs.lighting}
                      </span>
                    )}
                    {attrs.colorPalette && (
                      <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] text-blue-300 border border-blue-500/20 truncate max-w-[200px]">
                        🎨 {attrs.colorPalette}
                      </span>
                    )}
                    {attrs.weatherAndAtmosphere && (
                      <span className="rounded-md bg-teal-500/10 px-2 py-0.5 text-[10px] text-teal-300 border border-teal-500/20 truncate max-w-[200px]">
                        🌫️ {attrs.weatherAndAtmosphere}
                      </span>
                    )}
                    {attrs.historicalEra && (
                      <span className="rounded-md bg-purple-500/10 px-2 py-0.5 text-[10px] text-purple-300 border border-purple-500/20 truncate max-w-[200px]">
                        ⏳ {attrs.historicalEra}
                      </span>
                    )}
                  </div>
                </div>

                {/* Barra de Ações Inferior */}
                <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between gap-1">
                  {/* Botão Ver Prompt JSON */}
                  <button
                    onClick={() => handleViewPrompt(env)}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20 transition"
                    title="Visualizar e exportar prompt base estruturado em JSON"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    Prompt JSON
                  </button>

                  <div className="flex items-center gap-1">
                    {/* Botão Editar */}
                    <button
                      onClick={() => handleOpenEdit(env)}
                      className="rounded-lg p-1.5 text-white/60 hover:text-white hover:bg-white/10 transition"
                      title="Editar ambiente"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>

                    {/* Botão Duplicar */}
                    <button
                      onClick={() => handleDuplicate(env)}
                      className="rounded-lg p-1.5 text-white/60 hover:text-white hover:bg-white/10 transition"
                      title="Duplicar ambiente"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>

                    {/* Botão Arquivar / Restaurar */}
                    <button
                      onClick={() => handleToggleArchive(env)}
                      className="rounded-lg p-1.5 text-white/60 hover:text-amber-300 hover:bg-amber-500/10 transition"
                      title={env.isArchived ? "Restaurar ambiente" : "Arquivar ambiente"}
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                    </button>

                    {/* Botão Excluir */}
                    <button
                      onClick={() => {
                        setEnvironmentToDelete(env);
                        setDeleteModalOpen(true);
                      }}
                      className="rounded-lg p-1.5 text-white/60 hover:text-red-400 hover:bg-red-500/10 transition"
                      title="Excluir permanentemente"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Criar / Editar Ambiente */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-[#0f1218] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">
                  {editingEnvironment ? "Editar Ambiente" : "Novo Ambiente Cinematográfico"}
                </h3>
                <p className="text-xs text-white/50">
                  Configure arquitetura, iluminação e atmosfera para manter consistência de cenário.
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-xl p-1.5 text-white/50 hover:bg-white/10 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mt-4 rounded-xl border border-red-500/20 bg-red-950/30 p-3 text-xs text-red-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmitForm} className="mt-5 space-y-4">
              {/* Nome e Contexto */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1">
                    Nome do Ambiente <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Sala de Controle Subterrânea, Bosque Nebuloso..."
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/40 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1">Localização ou Contexto</label>
                  <input
                    type="text"
                    value={formData.locationContext}
                    onChange={(e) => setFormData({ ...formData, locationContext: e.target.value })}
                    placeholder="Ex: Berlim Oriental, Setor 4, Planeta desértico..."
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/40 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1">Descrição do Cenário</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Visão panorâmica, dimensões espaciais, sensação dramática do local..."
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/40 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Seção 1: Arquitetura e Objetos */}
              <div className="rounded-2xl border border-white/5 bg-black/20 p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Arquitetura & Elementos de Cenário
                </h4>

                <div>
                  <label className="block text-[11px] font-medium text-white/70 mb-1">
                    Arquitetura e Estrutura Física
                  </label>
                  <input
                    type="text"
                    value={formData.architecture}
                    onChange={(e) => setFormData({ ...formData, architecture: e.target.value })}
                    placeholder="Ex: Concreto aparente brutalista, tetos altos com vigas de aço expostas"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-white/70 mb-1">
                    Elementos de Cenário / Props Recorrentes
                  </label>
                  <input
                    type="text"
                    value={formData.propsAndElements}
                    onChange={(e) => setFormData({ ...formData, propsAndElements: e.target.value })}
                    placeholder="Ex: Terminais analógicos piscando, cabos suspensos, mesas metálicas"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Seção 2: Paleta de Cores & Atmosfera Cinematográfica */}
              <div className="rounded-2xl border border-white/5 bg-black/20 p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Paleta de Cores & Atmosfera Cinematográfica
                </h4>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="block text-[11px] font-medium text-white/70 mb-1">Paleta de Cores</label>
                    <input
                      type="text"
                      value={formData.colorPalette}
                      onChange={(e) => setFormData({ ...formData, colorPalette: e.target.value })}
                      placeholder="Ex: Tons frios ciano, sombras carvão, toques âmbar"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-white/70 mb-1">Clima e Atmosfera</label>
                    <input
                      type="text"
                      value={formData.weatherAndAtmosphere}
                      onChange={(e) => setFormData({ ...formData, weatherAndAtmosphere: e.target.value })}
                      placeholder="Ex: Névoa densa, umidade no chão"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-white/70 mb-1">Época Histórica</label>
                    <input
                      type="text"
                      value={formData.historicalEra}
                      onChange={(e) => setFormData({ ...formData, historicalEra: e.target.value })}
                      placeholder="Ex: Anos 80 alternativo, Futuro distante"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Seção Dinâmica: Parâmetros Cinematográficos */}
              <EntityParametersSection
                projectId={projectId}
                targetType="ENVIRONMENT"
                targetId={editingEnvironment?.id}
                values={paramValues}
                onChange={(defId, val) =>
                  setParamValues((prev) => ({ ...prev, [defId]: val }))
                }
              />

              {/* Seção 3: Prompt Base */}
              <div className="rounded-2xl border border-white/5 bg-black/20 p-4 space-y-2">
                <label className="block text-[11px] font-medium text-white/70">
                  Prompt-Base do Ambiente (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={formData.basePrompt}
                  onChange={(e) => setFormData({ ...formData, basePrompt: e.target.value })}
                  placeholder="Trecho literal de prompt para compor o cenário em IA..."
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-emerald-500 focus:outline-none font-mono"
                />
              </div>

              {/* Botões do Rodapé */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-medium text-white/70 hover:bg-white/10 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 disabled:opacity-50 transition"
                >
                  {formLoading && (
                    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  )}
                  {editingEnvironment ? "Salvar Alterações" : "Criar Ambiente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Visualizar Prompt JSON Estruturado */}
      {promptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl rounded-3xl border border-white/10 bg-[#0f1218] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-emerald-500/10 px-2 py-1 text-xs font-mono text-emerald-400 border border-emerald-500/20">
                  JSON v1.0
                </span>
                <h3 className="text-base font-bold text-white">Prompt-Base Estruturado do Ambiente</h3>
              </div>
              <button
                onClick={() => setPromptModalOpen(false)}
                className="rounded-xl p-1.5 text-white/50 hover:bg-white/10 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            <div className="mt-4">
              {promptLoading ? (
                <div className="flex items-center justify-center py-12">
                  <svg className="h-6 w-6 animate-spin text-emerald-400" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative rounded-2xl border border-white/10 bg-black/60 p-4 font-mono text-xs text-emerald-300 max-h-96 overflow-y-auto">
                    <pre>{JSON.stringify(promptData, null, 2)}</pre>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-white/50">
                      Compatível com Google Flow, Nano Banana e geradores cinematográficos.
                    </span>
                    <button
                      onClick={handleCopyPromptJson}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition"
                    >
                      {copySuccess ? (
                        <>
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Copiado com Sucesso!
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                          </svg>
                          Copiar JSON (1-Clique)
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Geração de Ambiente com IA (GEN_ENVIRONMENT) */}
      {aiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-[#0f1218] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span className="text-primary">✨</span> Gerar Ambiente / Locação com IA
                </h3>
                <p className="mt-1 text-xs text-white/50">
                  Concepção cenográfica de iluminação dramática, adereços e atmosfera visual.
                </p>
              </div>
              <button
                onClick={() => setAiModalOpen(false)}
                className="rounded-xl p-1.5 text-white/50 hover:bg-white/10 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/70 mb-1.5">
                  Conceito do Ambiente / Locação *
                </label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Ex: Laboratório clandestino de inteligência artificial em um hangar abandonado, iluminação fria volumétrica, cabos pendurados e chuva no telhado de zinco..."
                  rows={3}
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white placeholder-white/30 focus:border-primary focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/70 mb-1.5">
                  Tipo de Locação
                </label>
                <select
                  value={aiLocationType}
                  onChange={(e) => setAiLocationType(e.target.value as any)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white focus:border-primary focus:outline-none"
                >
                  <option value="INTERIOR" className="bg-[#0f1218]">Interior (INT.)</option>
                  <option value="EXTERIOR" className="bg-[#0f1218]">Exterior (EXT.)</option>
                  <option value="HYBRID" className="bg-[#0f1218]">Híbrido (INT./EXT.)</option>
                  <option value="STUDIO" className="bg-[#0f1218]">Estúdio / Fundo Controlado</option>
                </select>
              </div>

              {aiError && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                  {aiError}
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
              <span className="text-xs text-white/50 flex items-center gap-1.5">
                <span className="text-primary font-bold">🪙 GEN_ENVIRONMENT</span> • Tabela de créditos
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAiModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-medium text-white/70 hover:bg-white/10 transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSubmitAiGenerate}
                  disabled={aiLoading}
                  className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-lg hover:opacity-90 disabled:opacity-50 transition"
                >
                  {aiLoading ? "Concebendo Ambiente..." : "Gerar Ambiente"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {deleteModalOpen && environmentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-3xl border border-red-500/20 bg-[#0f1218] p-6 shadow-2xl">
            <h3 className="text-base font-bold text-red-300">Excluir Ambiente?</h3>
            <p className="mt-2 text-xs text-white/70">
              Tem certeza que deseja excluir permanentemente o ambiente{" "}
              <strong className="text-white">&quot;{environmentToDelete.name}&quot;</strong>?

            </p>
            {(environmentToDelete._count?.sceneLinks || 0) > 0 && (
              <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-950/20 p-2.5 text-xs text-amber-300">
                Atenção: Este ambiente está associado a {environmentToDelete._count?.sceneLinks} cena(s). A exclusão removerá esses vínculos.
              </div>
            )}
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="rounded-xl px-4 py-2 text-xs font-medium text-white/70 hover:bg-white/10 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50 transition"
              >
                {deleteLoading ? "Excluindo..." : "Sim, Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
