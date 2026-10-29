"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import {
  ProjectParameterSettingsData,
  ProjectCategoryWithParameters,
  ProjectConfigurableParameter,
  ProjectParameterOption,
  ProjectCinematicCategoryKey,
} from "@/modules/projects/project-parameter-config.types";

interface ProjectParameterSettingsProps {
  projectId: string;
}

export function ProjectParameterSettings({ projectId }: ProjectParameterSettingsProps) {
  const [data, setData] = useState<ProjectParameterSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Estados locais editáveis
  const [enabledCategoryIds, setEnabledCategoryIds] = useState<Set<ProjectCinematicCategoryKey>>(new Set());
  const [enabledKeys, setEnabledKeys] = useState<Set<string>>(new Set());
  const [defaultValues, setDefaultValues] = useState<Record<string, unknown>>({});
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});

  // Modal de Referência Visual
  const [selectedVisualRef, setSelectedVisualRef] = useState<{
    paramLabel: string;
    option: ProjectParameterOption;
  } | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/projects/${projectId}/parameter-settings`);
      if (!res.ok) {
        throw new Error("Não foi possível carregar as configurações cinematográficas.");
      }
      const json = await res.json();
      const settingsData: ProjectParameterSettingsData = json.data;
      setData(settingsData);

      // Inicializar estados
      setEnabledCategoryIds(new Set(settingsData.enabledCategories));
      setEnabledKeys(new Set(settingsData.enabledParameterKeys));

      const initialValues: Record<string, unknown> = {};
      const initialOpen: Record<string, boolean> = {};

      settingsData.categories.forEach((cat, index) => {
        // Abrir as 3 primeiras categorias por padrão
        initialOpen[cat.id] = index < 3;
        cat.parameters.forEach((param) => {
          initialValues[param.key] = param.currentProjectValue;
        });
      });

      setDefaultValues(initialValues);
      setOpenCategories(initialOpen);
    } catch (err: any) {
      setError(err.message || "Erro desconhecido ao carregar configurações.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Alternar categoria inteira
  const handleToggleCategory = (cat: ProjectCategoryWithParameters) => {
    const nextCategories = new Set(enabledCategoryIds);
    const nextKeys = new Set(enabledKeys);
    const willEnable = !nextCategories.has(cat.id);

    if (willEnable) {
      nextCategories.add(cat.id);
      cat.parameters.forEach((p) => nextKeys.add(p.key));
    } else {
      nextCategories.delete(cat.id);
      cat.parameters.forEach((p) => nextKeys.delete(p.key));
    }

    setEnabledCategoryIds(nextCategories);
    setEnabledKeys(nextKeys);
  };

  // Alternar parâmetro individual
  const handleToggleParameter = (param: ProjectConfigurableParameter, catId: ProjectCinematicCategoryKey) => {
    const nextKeys = new Set(enabledKeys);
    const nextCategories = new Set(enabledCategoryIds);

    if (nextKeys.has(param.key)) {
      nextKeys.delete(param.key);
    } else {
      nextKeys.add(param.key);
      nextCategories.add(catId); // Garante que a categoria pai também fique ativa
    }

    setEnabledKeys(nextKeys);
    setEnabledCategoryIds(nextCategories);
  };

  // Atualizar valor padrão de parâmetro
  const handleValueChange = (paramKey: string, value: unknown) => {
    setDefaultValues((prev) => ({
      ...prev,
      [paramKey]: value,
    }));
  };

  // Presets rápidos
  const handlePresetAll = () => {
    if (!data) return;
    const allCats = new Set<ProjectCinematicCategoryKey>(data.categories.map((c) => c.id));
    const allKeys = new Set<string>();
    data.categories.forEach((c) => c.parameters.forEach((p) => allKeys.add(p.key)));
    setEnabledCategoryIds(allCats);
    setEnabledKeys(allKeys);
  };

  const handlePresetEssential = () => {
    if (!data) return;
    const essentialCats: ProjectCinematicCategoryKey[] = ["CAMERA", "FRAMING", "LIGHTING", "AESTHETICS", "CONTINUITY"];
    const nextCats = new Set<ProjectCinematicCategoryKey>(essentialCats);
    const nextKeys = new Set<string>();

    data.categories.forEach((c) => {
      if (nextCats.has(c.id)) {
        c.parameters.forEach((p) => nextKeys.add(p.key));
      }
    });

    setEnabledCategoryIds(nextCats);
    setEnabledKeys(nextKeys);
  };

  const handlePresetNone = () => {
    setEnabledCategoryIds(new Set());
    setEnabledKeys(new Set());
  };

  // Salvar no servidor
  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const res = await fetch(`/api/projects/${projectId}/parameter-settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabledCategories: Array.from(enabledCategoryIds),
          enabledParameterKeys: Array.from(enabledKeys),
          defaultValues,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Erro ao salvar parâmetros.");
      }

      setSuccessMessage("Configurações cinematográficas do projeto salvas com sucesso!");
      setTimeout(() => setSuccessMessage(null), 5000);
      await loadSettings();
    } catch (err: any) {
      setError(err.message || "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 py-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-3xl border border-white/5 bg-[#12151E]/60" />
        ))}
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-3xl border border-red-500/30 bg-red-950/20 p-6 text-center text-sm text-red-300">
        <p className="font-semibold">{error}</p>
        <button
          onClick={loadSettings}
          className="mt-4 rounded-xl bg-red-500/20 px-4 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/30 transition"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  const totalParams = data?.totalParameters || 0;
  const activeParamsCount = enabledKeys.size;
  const activePercentage = totalParams > 0 ? Math.round((activeParamsCount / totalParams) * 100) : 0;

  return (
    <div className="space-y-8 pb-16">
      {/* Toast flutuante de sucesso */}
      {successMessage && (
        <div className="fixed top-20 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3 rounded-2xl border border-lime-400/40 bg-[#12151E]/95 p-4 shadow-[0_10px_40px_rgba(163,230,53,0.15)] backdrop-blur-xl">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-lime-400 font-bold text-black text-xs">
              ✓
            </span>
            <p className="text-xs font-bold text-white">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Header com Estatísticas e Presets */}
      <div className="rounded-3xl border border-white/10 bg-[#12151E] p-6 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-lime-400/20 bg-lime-400/10 px-3 py-1 text-[11px] font-semibold text-lime-400">
              <span className="h-2 w-2 rounded-full bg-lime-400 animate-pulse" />
              <span>Configuração Cinematográfica do Projeto</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white">
              Parâmetros e Estética Ativos
            </h2>
            <p className="text-xs text-white/60 max-w-2xl">
              Selecione quais variáveis visuais farão parte do fluxo deste filme. As próximas etapas (Personagens, Ambientes, Cenas e Prompts) herdarão somente os parâmetros habilitados aqui.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handlePresetAll}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/10 transition"
            >
              Ativar Todos
            </button>
            <button
              onClick={handlePresetEssential}
              className="rounded-xl border border-lime-400/30 bg-lime-400/10 px-3 py-1.5 text-xs font-semibold text-lime-400 hover:bg-lime-400/20 transition"
            >
              Modo Cinema Essencial
            </button>
            <button
              onClick={handlePresetNone}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/40 hover:bg-white/10 transition"
            >
              Desativar Todos
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="ml-2 inline-flex items-center gap-2 rounded-xl bg-lime-400 px-5 py-2 text-xs font-bold text-black shadow-[0_0_20px_rgba(163,230,53,0.3)] hover:bg-lime-300 transition disabled:opacity-50"
            >
              {saving ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-black border-t-transparent" />
                  <span>Salvando...</span>
                </>
              ) : (
                <span>Salvar Configuração</span>
              )}
            </button>
          </div>
        </div>

        {/* Barra de Progresso Cinematográfica */}
        <div className="mt-6 pt-6 border-t border-white/5 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-white/60">
              Cobertura ativa: <strong className="text-white">{activeParamsCount}</strong> de {totalParams} parâmetros
            </span>
            <span className="font-mono font-bold text-lime-400">{activePercentage}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-lime-500 to-lime-300 transition-all duration-500 shadow-[0_0_12px_rgba(163,230,53,0.5)]"
              style={{ width: `${activePercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Acordeão das 9 Categorias Cinematográficas */}
      <div className="space-y-4">
        {data?.categories.map((cat) => {
          const isCategoryActive = enabledCategoryIds.has(cat.id);
          const isOpen = openCategories[cat.id] ?? false;
          const categoryActiveCount = cat.parameters.filter((p) => enabledKeys.has(p.key)).length;

          return (
            <div
              key={cat.id}
              className={`rounded-3xl border transition duration-200 ${
                isCategoryActive
                  ? "border-white/10 bg-[#12151E]"
                  : "border-white/5 bg-[#12151E]/40 opacity-70"
              }`}
            >
              {/* Header da Categoria */}
              <div className="flex items-center justify-between p-5 sm:p-6">
                <div
                  className="flex items-center gap-4 cursor-pointer select-none flex-1"
                  onClick={() =>
                    setOpenCategories((prev) => ({ ...prev, [cat.id]: !prev[cat.id] }))
                  }
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-2xl border border-white/5">
                    {cat.icon}
                  </span>
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-bold text-white tracking-tight">{cat.name}</h3>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                          categoryActiveCount > 0
                            ? "bg-lime-400/10 text-lime-400 border-lime-400/20"
                            : "bg-white/5 text-white/40 border-white/10"
                        }`}
                      >
                        {categoryActiveCount} de {cat.parameters.length} ativos
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-white/50 line-clamp-1">{cat.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 ml-4">
                  {/* Master Toggle da Categoria */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleCategory(cat);
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      isCategoryActive ? "bg-lime-400" : "bg-white/20"
                    }`}
                    title={isCategoryActive ? "Desativar categoria inteira" : "Ativar categoria inteira"}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${
                        isCategoryActive ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setOpenCategories((prev) => ({ ...prev, [cat.id]: !prev[cat.id] }))
                    }
                    className="p-2 text-white/40 hover:text-white transition text-xs font-bold"
                  >
                    {isOpen ? "▲" : "▼"}
                  </button>
                </div>
              </div>

              {/* Lista de Parâmetros dentro da Categoria */}
              {isOpen && (
                <div className="border-t border-white/5 p-5 sm:p-6 bg-black/20 rounded-b-3xl space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {cat.parameters.map((param) => {
                      const isParamActive = isCategoryActive && enabledKeys.has(param.key);
                      const currentVal = defaultValues[param.key] ?? param.currentProjectValue ?? "";

                      return (
                        <div
                          key={param.key}
                          className={`rounded-2xl border p-4 transition ${
                            isParamActive
                              ? "border-white/10 bg-[#161B26]"
                              : "border-white/5 bg-black/40 opacity-50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-white">{param.label}</span>
                                <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/5 text-white/40 border border-white/5">
                                  {param.scope}
                                </span>
                              </div>
                              <p className="text-[11px] text-white/50 leading-relaxed">
                                {param.description}
                              </p>
                            </div>

                            {/* Switch individual do parâmetro */}
                            <button
                              type="button"
                              onClick={() => handleToggleParameter(param, cat.id)}
                              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none ${
                                isParamActive ? "bg-lime-400" : "bg-white/20"
                              }`}
                              title={isParamActive ? "Desativar este parâmetro" : "Habilitar este parâmetro"}
                            >
                              <span
                                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-black transition-transform ${
                                  isParamActive ? "translate-x-4" : "translate-x-1"
                                }`}
                              />
                            </button>
                          </div>

                          {/* Seletor do Valor Padrão para o Projeto */}
                          {isParamActive && (
                            <div className="mt-4 pt-3 border-t border-white/5 space-y-2">
                              <div className="flex items-center justify-between">
                                <label className="text-[10px] font-bold text-white/60 uppercase tracking-wider">
                                  Valor Padrão no Projeto
                                </label>
                                {param.type === "SELECT" && param.options.some((o) => o.imageUrl) && (
                                  <span className="text-[10px] text-lime-400 font-medium">
                                    ✓ Referências visuais disponíveis
                                  </span>
                                )}
                              </div>

                              {param.type === "SELECT" && (
                                <div className="space-y-2">
                                  <div className="flex gap-2">
                                    <select
                                      value={String(currentVal)}
                                      onChange={(e) => handleValueChange(param.key, e.target.value)}
                                      className="w-full rounded-xl border border-white/10 bg-[#0B0D12] px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-400 cursor-pointer font-medium"
                                    >
                                      {param.options.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                          {opt.label}
                                        </option>
                                      ))}
                                    </select>

                                    {/* Botão para abrir modal de referência visual */}
                                    {(() => {
                                      const activeOpt = param.options.find((o) => o.value === String(currentVal));
                                      if (activeOpt?.imageUrl) {
                                        return (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setSelectedVisualRef({
                                                paramLabel: param.label,
                                                option: activeOpt,
                                              })
                                            }
                                            className="shrink-0 flex items-center gap-1 rounded-xl border border-lime-400/30 bg-lime-400/10 px-2.5 py-1.5 text-[11px] font-semibold text-lime-300 hover:bg-lime-400/20 transition"
                                            title="Ver exemplo visual de referência"
                                          >
                                            <span>👁️</span>
                                            <span className="hidden sm:inline">Exemplo</span>
                                          </button>
                                        );
                                      }
                                      return null;
                                    })()}
                                  </div>
                                </div>
                              )}

                              {param.type === "RANGE" && (
                                <div className="space-y-1">
                                  <div className="flex justify-between text-[10px] font-mono text-white/50">
                                    <span>0</span>
                                    <span className="font-bold text-lime-400">{Number(currentVal) || 0}</span>
                                    <span>100</span>
                                  </div>
                                  <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={Number(currentVal) || 0}
                                    onChange={(e) => handleValueChange(param.key, Number(e.target.value))}
                                    className="w-full accent-lime-400 cursor-pointer"
                                  />
                                </div>
                              )}

                              {param.type === "TEXT" && (
                                <input
                                  type="text"
                                  value={String(currentVal || "")}
                                  onChange={(e) => handleValueChange(param.key, e.target.value)}
                                  className="w-full rounded-xl border border-white/10 bg-[#0B0D12] px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
                                />
                              )}

                              {param.type === "TEXTAREA" && (
                                <textarea
                                  rows={2}
                                  value={String(currentVal || "")}
                                  onChange={(e) => handleValueChange(param.key, e.target.value)}
                                  className="w-full rounded-xl border border-white/10 bg-[#0B0D12] px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
                                />
                              )}

                              {param.type === "BOOLEAN" && (
                                <button
                                  type="button"
                                  onClick={() => handleValueChange(param.key, !currentVal)}
                                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                                    currentVal
                                      ? "bg-lime-400 text-black shadow-[0_0_12px_rgba(163,230,53,0.3)]"
                                      : "bg-white/5 text-white/50 border border-white/10"
                                  }`}
                                >
                                  {currentVal ? "✓ Ativado por Padrão" : "Desativado por Padrão"}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal de Detalhes da Referência Visual */}
      {selectedVisualRef && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setSelectedVisualRef(null)}
        >
          <div
            className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#12151E] p-6 shadow-2xl relative space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase text-lime-400">
                  {selectedVisualRef.paramLabel}
                </span>
                <h3 className="text-lg font-bold text-white">
                  {selectedVisualRef.option.label}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedVisualRef(null)}
                className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center text-white/60 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            {/* Imagem SVG da Referência Visual */}
            {selectedVisualRef.option.imageUrl && (
              <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                <Image
                  src={selectedVisualRef.option.imageUrl}
                  alt={selectedVisualRef.option.label}
                  fill
                  className="object-contain p-4"
                />
              </div>
            )}

            {/* Explicações Técnicas */}
            <div className="space-y-3 text-xs">
              {selectedVisualRef.option.description && (
                <div>
                  <span className="font-bold text-white/80">Descrição Técnica:</span>
                  <p className="mt-0.5 text-white/60">{selectedVisualRef.option.description}</p>
                </div>
              )}

              {selectedVisualRef.option.whatToLookFor && (
                <div className="rounded-xl border border-lime-400/20 bg-lime-400/5 p-3">
                  <span className="font-bold text-lime-300">O Que Observar:</span>
                  <p className="mt-0.5 text-white/70">{selectedVisualRef.option.whatToLookFor}</p>
                </div>
              )}

              {selectedVisualRef.option.comparisonNotes && (
                <div>
                  <span className="font-bold text-white/80">Comparação com Alternativas:</span>
                  <p className="mt-0.5 text-white/50">{selectedVisualRef.option.comparisonNotes}</p>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedVisualRef(null)}
                className="rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20 transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
