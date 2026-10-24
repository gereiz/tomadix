"use client";

import { useState, useEffect, useCallback } from "react";

export interface ResolvedParamItem {
  definitionId: string;
  key: string;
  label: string;
  description?: string | null;
  scope: string;
  type: string;
  required?: boolean;
  defaultValue?: unknown;
  options?: Array<{ value: string; label: string }> | null;
  validationRules?: {
    min?: number;
    max?: number;
    isInteger?: boolean;
    minLength?: number;
    maxLength?: number;
    step?: number;
  } | null;
  order?: number;
  value: unknown;
  source: "EXPLICIT" | "INHERITED" | "DEFAULT" | "EMPTY";
}

interface EntityParametersSectionProps {
  projectId: string;
  targetType: "PROJECT" | "CHARACTER" | "ENVIRONMENT" | "SCENE" | "OUTPUT";
  targetId?: string | null;
  values: Record<string, any>;
  onChange: (definitionId: string, value: any) => void;
  onParametersLoaded?: (params: ResolvedParamItem[]) => void;
  title?: string;
  description?: string;
}

export function EntityParametersSection({
  projectId,
  targetType,
  targetId,
  values,
  onChange,
  onParametersLoaded,
  title = "Parâmetros Cinematográficos Dinâmicos",
  description = "Variáveis e atributos cinematográficos (globais e deste escopo) aplicados na geração de prompts.",
}: EntityParametersSectionProps) {
  const [paramsList, setParamsList] = useState<ResolvedParamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchParameters = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      setError(null);
      const url = new URL(`/api/projects/${projectId}/parameters`, window.location.origin);
      url.searchParams.set("targetType", targetType);
      if (targetId) {
        url.searchParams.set("targetId", targetId);
      }

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Erro ao carregar parâmetros dinâmicos.");
      const json = await res.json();
      const details: ResolvedParamItem[] = json.data?.details || [];

      setParamsList(details);
      if (onParametersLoaded) {
        onParametersLoaded(details);
      }

      // Preenche valores iniciais caso ainda não estejam definidos no formulário pai
      for (const item of details) {
        if (values[item.definitionId] === undefined && item.value !== undefined && item.value !== null) {
          onChange(item.definitionId, item.value);
        }
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Erro desconhecido.");
    } finally {
      setLoading(false);
    }
  }, [projectId, targetType, targetId]);

  useEffect(() => {
    fetchParameters();
  }, [fetchParameters]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/5 bg-black/20 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-4 w-48 animate-pulse rounded bg-white/10" />
          <div className="h-4 w-16 animate-pulse rounded bg-white/10" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="h-14 animate-pulse rounded-xl bg-white/5" />
          <div className="h-14 animate-pulse rounded-xl bg-white/5" />
        </div>
      </div>
    );
  }

  if (error || paramsList.length === 0) {
    // Se não há parâmetros ativos para este escopo, não polui o formulário
    return null;
  }

  return (
    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/10 p-4 space-y-4">
      <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              {title}
            </h4>
            <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
              {paramsList.length} {paramsList.length === 1 ? "parâmetro" : "parâmetros"}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-white/50">{description}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {paramsList.map((param) => {
          const currentValue = values[param.definitionId] !== undefined ? values[param.definitionId] : (param.value ?? "");
          const isExplicitHere = values[param.definitionId] !== undefined && values[param.definitionId] !== "";

          return (
            <div
              key={param.definitionId}
              className="rounded-xl border border-white/10 bg-black/40 p-3.5 space-y-2 hover:border-emerald-500/30 transition"
            >
              {/* Header do Campo: Label, Escopo, Origem */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                    {param.label}
                    {param.required && <span className="text-emerald-400 font-bold">*</span>}
                  </label>
                  <code className="text-[10px] text-white/40 font-mono">{param.key}</code>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
                      param.scope === "GLOBAL"
                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                        : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                    }`}
                  >
                    {param.scope === "GLOBAL" ? "Global" : param.scope}
                  </span>

                  {targetType !== "PROJECT" && (
                    <span
                      className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${
                        isExplicitHere
                          ? "bg-emerald-400/20 text-emerald-300 border border-emerald-400/30"
                          : param.source === "INHERITED"
                          ? "bg-white/10 text-white/60"
                          : "bg-white/5 text-white/40"
                      }`}
                    >
                      {isExplicitHere
                        ? "Personalizado"
                        : param.source === "INHERITED"
                        ? "Herdado (Global)"
                        : "Padrão"}
                    </span>
                  )}
                </div>
              </div>

              {param.description && (
                <p className="text-[10px] text-white/50 leading-relaxed">{param.description}</p>
              )}

              {/* Renderização do Campo de Entrada */}
              <div className="pt-1">
                {param.type === "SELECT" && (
                  <select
                    value={currentValue ?? ""}
                    onChange={(e) => onChange(param.definitionId, e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-black/80 px-3 py-2 text-xs text-white focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400 cursor-pointer"
                  >
                    <option value="">
                      {param.required ? "Selecione uma opção obrigatória..." : "Padrão / Não especificado"}
                    </option>
                    {(param.options || []).map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                )}

                {param.type === "TEXT" && (
                  <input
                    type="text"
                    value={currentValue ?? ""}
                    onChange={(e) => onChange(param.definitionId, e.target.value)}
                    placeholder={`Digite ${param.label.toLowerCase()}...`}
                    className="w-full rounded-xl border border-white/15 bg-black/80 px-3 py-2 text-xs text-white placeholder-white/30 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  />
                )}

                {param.type === "TEXTAREA" && (
                  <textarea
                    rows={2}
                    value={currentValue ?? ""}
                    onChange={(e) => onChange(param.definitionId, e.target.value)}
                    placeholder={`Descreva ${param.label.toLowerCase()}...`}
                    className="w-full rounded-xl border border-white/15 bg-black/80 px-3 py-2 text-xs text-white placeholder-white/30 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  />
                )}

                {param.type === "NUMBER" && (
                  <input
                    type="number"
                    step={param.validationRules?.step ?? (param.validationRules?.isInteger ? "1" : "any")}
                    min={param.validationRules?.min}
                    max={param.validationRules?.max}
                    value={currentValue ?? ""}
                    onChange={(e) =>
                      onChange(param.definitionId, e.target.value === "" ? "" : Number(e.target.value))
                    }
                    placeholder="0"
                    className="w-full rounded-xl border border-white/15 bg-black/80 px-3 py-2 text-xs text-white font-mono placeholder-white/30 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  />
                )}

                {param.type === "RANGE" && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-mono text-white/60">
                      <span>Mín: {param.validationRules?.min ?? 0}</span>
                      <span className="font-bold text-emerald-400">
                        {currentValue ?? param.validationRules?.min ?? 0}
                      </span>
                      <span>Máx: {param.validationRules?.max ?? 100}</span>
                    </div>
                    <input
                      type="range"
                      min={param.validationRules?.min ?? 0}
                      max={param.validationRules?.max ?? 100}
                      step={param.validationRules?.step ?? 1}
                      value={currentValue ?? param.validationRules?.min ?? 0}
                      onChange={(e) => onChange(param.definitionId, Number(e.target.value))}
                      className="w-full accent-emerald-400 cursor-pointer"
                    />
                  </div>
                )}

                {param.type === "BOOLEAN" && (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => onChange(param.definitionId, !currentValue)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        currentValue ? "bg-emerald-500" : "bg-white/20"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          currentValue ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                    <span className="text-xs text-white/70">
                      {currentValue ? "Ativado / Sim" : "Desativado / Não"}
                    </span>
                  </div>
                )}

                {param.type === "DURATION" && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={currentValue ?? ""}
                      onChange={(e) =>
                        onChange(param.definitionId, e.target.value === "" ? "" : Number(e.target.value))
                      }
                      placeholder="Ex: 30"
                      className="w-32 rounded-xl border border-white/15 bg-black/80 px-3 py-2 text-xs text-white font-mono placeholder-white/30 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    />
                    <span className="text-xs text-white/60">segundos</span>
                  </div>
                )}

                {param.type === "DATE" && (
                  <input
                    type="date"
                    value={currentValue ?? ""}
                    onChange={(e) => onChange(param.definitionId, e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-black/80 px-3 py-2 text-xs text-white focus:border-emerald-400 focus:outline-none"
                  />
                )}

                {param.type === "MULTISELECT" && (
                  <div className="flex flex-wrap gap-1.5">
                    {(param.options || []).map((opt) => {
                      const selected = Array.isArray(currentValue) && currentValue.includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            const cur = Array.isArray(currentValue) ? [...currentValue] : [];
                            if (selected) {
                              onChange(
                                param.definitionId,
                                cur.filter((item) => item !== opt.value)
                              );
                            } else {
                              onChange(param.definitionId, [...cur, opt.value]);
                            }
                          }}
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
                            selected
                              ? "bg-emerald-400 text-black font-semibold"
                              : "bg-white/10 text-white/70 hover:bg-white/15"
                          }`}
                        >
                          {selected ? "✓ " : "+ "}
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
