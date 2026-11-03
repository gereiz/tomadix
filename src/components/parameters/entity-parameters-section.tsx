"use client";

import { useState, useEffect, useCallback } from "react";
import { VisualParameterSelector } from "@/components/visual-library/visual-parameter-selector";

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
  isAdmin?: boolean;
  excludeKeys?: string[];
}

// Cache leve em memória de sessão de usuário no cliente
let cachedUserPromise: Promise<{ isAdmin: boolean }> | null = null;
function getUserAdminStatusCached(): Promise<{ isAdmin: boolean }> {
  if (!cachedUserPromise) {
    cachedUserPromise = fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.authenticated && data?.user) {
          const u = data.user;
          const isPlatform = Boolean(
            u.isPlatformAdmin || u.platformRole === "ADMIN" || u.platformRole === "SUPER_ADMIN"
          );
          const isWpAdmin = Boolean(
            u.memberships?.some((m: any) => m.role === "OWNER" || m.role === "ADMIN")
          );
          return { isAdmin: isPlatform || isWpAdmin };
        }
        return { isAdmin: false };
      })
      .catch(() => ({ isAdmin: false }));
  }
  return cachedUserPromise;
}

// Cache de parâmetros de formulário por contexto
const clientEntityParamsCache = new Map<string, { details: ResolvedParamItem[]; timestamp: number }>();

export function EntityParametersSection({
  projectId,
  targetType,
  targetId,
  values,
  onChange,
  onParametersLoaded,
  title = "Parâmetros Cinematográficos Dinâmicos",
  description = "Variáveis e atributos cinematográficos (globais e deste escopo) aplicados na geração de prompts.",
  isAdmin: propIsAdmin,
  excludeKeys = [],
}: EntityParametersSectionProps) {
  const [paramsList, setParamsList] = useState<ResolvedParamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(propIsAdmin ?? false);

  useEffect(() => {
    if (propIsAdmin !== undefined) {
      setIsAdmin(propIsAdmin);
      return;
    }
    getUserAdminStatusCached().then((status) => {
      setIsAdmin(status.isAdmin);
    });
  }, [propIsAdmin]);

  const fetchParameters = useCallback(async () => {
    if (!projectId) return;
    const cacheKey = `${projectId}:${targetType}:${targetId || ""}`;
    const cached = clientEntityParamsCache.get(cacheKey);

    // Se temos dados em cache recentes (menos de 60s), inicializamos instantaneamente sem bloquear a UI
    if (cached && Date.now() - cached.timestamp < 60000) {
      setParamsList(cached.details);
      setLoading(false);
      if (onParametersLoaded) {
        onParametersLoaded(cached.details);
      }
      for (const item of cached.details) {
        if (values[item.definitionId] === undefined && item.value !== undefined && item.value !== null) {
          onChange(item.definitionId, item.value);
        }
      }
      return;
    }

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

      clientEntityParamsCache.set(cacheKey, { details, timestamp: Date.now() });
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

  const filteredParams = excludeKeys && excludeKeys.length > 0
    ? paramsList.filter((p) => !excludeKeys.includes(p.key) && !excludeKeys.includes(p.definitionId))
    : paramsList;

  if (error || filteredParams.length === 0) {
    // Se não há parâmetros ativos ou restantes para este escopo, não polui o formulário
    return null;
  }

  return (
    <div className="rounded-2xl border border-primary/20 bg-[#12151E] p-4 space-y-4">
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
              {title}
            </h4>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary border border-primary/20">
              {filteredParams.length} {filteredParams.length === 1 ? "parâmetro ativo" : "parâmetros ativos"}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-white/50">{description}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {filteredParams.map((param) => {
          const currentValue = values[param.definitionId] !== undefined ? values[param.definitionId] : (param.value ?? "");
          const isExplicitHere = values[param.definitionId] !== undefined && values[param.definitionId] !== "";

          return (
            <div
              key={param.definitionId}
              className={`rounded-xl border border-white/10 bg-black/40 p-3.5 space-y-2 hover:border-primary/30 transition ${
                param.type === "SELECT" ? "sm:col-span-2" : ""
              }`}
            >
              {/* Header do Campo: Label, Escopo, Origem */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                    {param.label}
                    {param.required && <span className="text-primary font-bold">*</span>}
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
                      className={`rounded px-1.5 py-0.5 text-[9px] font-medium border ${
                        isExplicitHere
                          ? "bg-indigo-400/20 text-indigo-300 border-indigo-400/30"
                          : param.source === "INHERITED"
                          ? "bg-primary/10 text-primary border-primary/20"
                          : "bg-white/5 text-white/40 border-white/10"
                      }`}
                    >
                      {isExplicitHere
                        ? "Sobrescrito neste elemento"
                        : param.source === "INHERITED"
                        ? "Herdado do Projeto"
                        : "Padrão"}
                    </span>
                  )}

                  {/* Botão para restaurar valor herdado do projeto */}
                  {targetType !== "PROJECT" && isExplicitHere && (
                    <button
                      type="button"
                      onClick={() => onChange(param.definitionId, "")}
                      className="rounded px-1.5 py-0.5 text-[9px] font-medium text-white/50 hover:text-primary hover:bg-white/5 transition"
                      title="Voltar a herdar o valor padrão do projeto"
                    >
                      ↺ Restaurar Padrão
                    </button>
                  )}
                </div>
              </div>

              {param.description && (
                <p className="text-[10px] text-white/50 leading-relaxed">{param.description}</p>
              )}

              {/* Renderização do Campo de Entrada */}
              {param.type === "SELECT" && (
                <VisualParameterSelector
                  label={param.label}
                  description={param.description}
                  value={String(currentValue ?? "")}
                  options={param.options || []}
                  required={param.required}
                  paramDefinitionId={param.definitionId}
                  isAdmin={isAdmin}
                  hideHeader={true}
                  onChange={(val) => onChange(param.definitionId, val)}
                />
              )}

                {param.type === "TEXT" && (
                  <input
                    type="text"
                    value={currentValue ?? ""}
                    onChange={(e) => onChange(param.definitionId, e.target.value)}
                    placeholder={`Digite ${param.label.toLowerCase()}...`}
                    className="w-full rounded-xl border border-white/15 bg-black/80 px-3 py-2 text-xs text-white placeholder-white/30 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                )}

                {param.type === "TEXTAREA" && (
                  <textarea
                    rows={2}
                    value={currentValue ?? ""}
                    onChange={(e) => onChange(param.definitionId, e.target.value)}
                    placeholder={`Descreva ${param.label.toLowerCase()}...`}
                    className="w-full rounded-xl border border-white/15 bg-black/80 px-3 py-2 text-xs text-white placeholder-white/30 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
                    className="w-full rounded-xl border border-white/15 bg-black/80 px-3 py-2 text-xs text-white font-mono placeholder-white/30 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                )}

                {param.type === "RANGE" && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-mono text-white/60">
                      <span>Mín: {param.validationRules?.min ?? 0}</span>
                      <span className="font-bold text-primary">
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
                      className="w-full accent-primary cursor-pointer"
                    />
                  </div>
                )}

                {param.type === "BOOLEAN" && (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => onChange(param.definitionId, !currentValue)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        currentValue ? "bg-primary" : "bg-white/20"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${
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
                      className="w-32 rounded-xl border border-white/15 bg-black/80 px-3 py-2 text-xs text-white font-mono placeholder-white/30 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <span className="text-xs text-white/60">segundos</span>
                  </div>
                )}

                {param.type === "DATE" && (
                  <input
                    type="date"
                    value={currentValue ?? ""}
                    onChange={(e) => onChange(param.definitionId, e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-black/80 px-3 py-2 text-xs text-white focus:border-primary focus:outline-none"
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
                              ? "bg-primary text-on-primary font-semibold shadow-md shadow-primary/20"
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
          );
        })}
      </div>
    </div>
  );
}
