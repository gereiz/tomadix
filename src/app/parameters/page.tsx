"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ParameterInputPreview } from "@/components/parameters/parameter-input-preview";
import { ParameterType, ParameterScope, ParameterOption } from "@/modules/parameters/parameter.schema";

interface ParameterDef {
  id: string;
  key: string;
  label: string;
  description: string | null;
  type: ParameterType;
  scope: ParameterScope;
  scopes?: string[] | null;
  required: boolean;
  defaultValue: any;
  options: ParameterOption[] | null;
  validationRules: {
    min?: number;
    max?: number;
    isInteger?: boolean;
    minLength?: number;
    maxLength?: number;
    step?: number;
  } | null;
  visibilityRules: {
    dependsOn?: string;
    operator?: string;
    value?: any;
  } | null;
  promptMapping: {
    target?: string;
    instruction?: string;
  } | null;
  order: number;
  enabled: boolean;
  isSystem: boolean;
}

const SCOPE_TABS = [
  { id: "ALL", label: "Todos os Escopos" },
  { id: "GLOBAL", label: "Global (Projeto)" },
  { id: "CHARACTER", label: "Personagens" },
  { id: "ENVIRONMENT", label: "Ambientes" },
  { id: "SCENE", label: "Cenas / Takes" },
  { id: "OUTPUT", label: "Saída do Prompt" },
];

const TYPE_OPTIONS: ParameterType[] = [
  "TEXT",
  "TEXTAREA",
  "NUMBER",
  "BOOLEAN",
  "SELECT",
  "MULTISELECT",
  "RANGE",
  "DURATION",
  "DATE",
  "JSON",
];

export default function ParametersPage() {
  const [parameters, setParameters] = useState<ParameterDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [selectedScope, setSelectedScope] = useState<string>("ALL");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);

  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingParam, setEditingParam] = useState<ParameterDef | null>(null);
  const [paramToDelete, setParamToDelete] = useState<ParameterDef | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Form State
  const [formData, setFormData] = useState<{
    key: string;
    label: string;
    description: string;
    type: ParameterType;
    scope: ParameterScope;
    scopes: string[];
    required: boolean;
    defaultValue: any;
    options: ParameterOption[];
    min: string;
    max: string;
    isInteger: boolean;
    visibilityDependsOn: string;
    visibilityOperator: "equals" | "notEquals" | "truthy" | "falsy";
    visibilityValue: string;
    promptTarget: string;
    promptInstruction: string;
  }>({
    key: "",
    label: "",
    description: "",
    type: "TEXT",
    scope: "GLOBAL",
    scopes: ["GLOBAL"],
    required: false,
    defaultValue: "",
    options: [],
    min: "",
    max: "",
    isInteger: false,
    visibilityDependsOn: "",
    visibilityOperator: "equals",
    visibilityValue: "",
    promptTarget: "visual_bible",
    promptInstruction: "",
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Nova opção temporária
  const [newOptLabel, setNewOptLabel] = useState("");
  const [newOptValue, setNewOptValue] = useState("");

  // Carregar lista de parâmetros
  const loadParameters = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (selectedScope !== "ALL") params.append("scope", selectedScope);
      if (selectedType !== "ALL") params.append("type", selectedType);
      if (search.trim()) params.append("search", search.trim());
      if (statusFilter === "active") params.append("enabled", "true");
      if (statusFilter === "inactive") params.append("enabled", "false");

      const res = await fetch(`/api/parameters?${params.toString()}`);
      if (!res.ok) throw new Error("Não foi possível carregar as definições de parâmetros.");
      const data = await res.json();
      setParameters(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido.");
    } finally {
      setLoading(false);
    }
  }, [selectedScope, selectedType, search, statusFilter]);

  // Verificar papel administrativo do usuário atual
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.authenticated && data?.user?.isPlatformAdmin) {
          setIsPlatformAdmin(true);
        } else {
          setIsPlatformAdmin(false);
        }
      })
      .catch(() => setIsPlatformAdmin(false));
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      loadParameters();
    }, 200);
    return () => clearTimeout(handler);
  }, [loadParameters]);

  const resetForm = () => {
    const defaultScope = (selectedScope !== "ALL" ? selectedScope : "GLOBAL") as ParameterScope;
    setFormData({
      key: "",
      label: "",
      description: "",
      type: "TEXT",
      scope: defaultScope,
      scopes: [defaultScope],
      required: false,
      defaultValue: "",
      options: [],
      min: "",
      max: "",
      isInteger: false,
      visibilityDependsOn: "",
      visibilityOperator: "equals",
      visibilityValue: "",
      promptTarget: "visual_bible",
      promptInstruction: "",
    });
    setFormErrors({});
    setEditingParam(null);
    setNewOptLabel("");
    setNewOptValue("");
  };

  const handleOpenEdit = (p: ParameterDef) => {
    setEditingParam(p);
    const initialScopes = Array.isArray((p as any).scopes) && (p as any).scopes.length > 0
      ? (p as any).scopes
      : [p.scope];

    setFormData({
      key: p.key,
      label: p.label,
      description: p.description || "",
      type: p.type,
      scope: p.scope,
      scopes: initialScopes,
      required: p.required,
      defaultValue: p.defaultValue ?? "",
      options: p.options || [],
      min: p.validationRules?.min !== undefined ? String(p.validationRules.min) : "",
      max: p.validationRules?.max !== undefined ? String(p.validationRules.max) : "",
      isInteger: p.validationRules?.isInteger ?? false,
      visibilityDependsOn: p.visibilityRules?.dependsOn || "",
      visibilityOperator: (p.visibilityRules?.operator as any) || "equals",
      visibilityValue: p.visibilityRules?.value ? String(p.visibilityRules.value) : "",
      promptTarget: p.promptMapping?.target || "visual_bible",
      promptInstruction: p.promptMapping?.instruction || "",
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Submeter Criação / Edição
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPlatformAdmin) {
      showToast("Ação não autorizada. Apenas administradores podem modificar parâmetros.", "error");
      return;
    }
    const errors: Record<string, string> = {};

    if (!formData.key.trim()) {
      errors.key = "A chave do parâmetro é obrigatória.";
    } else if (!/^[a-z][a-z0-9_]*$/.test(formData.key.trim())) {
      errors.key = "Use o padrão snake_case (apenas minúsculas e underscores, iniciando por letra).";
    }

    if (!formData.label.trim()) {
      errors.label = "O nome de exibição é obrigatório.";
    }

    if (formData.scopes.length === 0) {
      errors.scopes = "Selecione ao menos um escopo para o parâmetro.";
    }

    if (["SELECT", "MULTISELECT"].includes(formData.type) && formData.options.length === 0) {
      errors.options = "Adicione pelo menos uma opção para parâmetros de seleção.";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setSubmitting(true);

      const validationRules: any = {};
      if (formData.min !== "") validationRules.min = Number(formData.min);
      if (formData.max !== "") validationRules.max = Number(formData.max);
      if (formData.isInteger) validationRules.isInteger = true;

      const visibilityRules = formData.visibilityDependsOn.trim()
        ? {
            dependsOn: formData.visibilityDependsOn.trim(),
            operator: formData.visibilityOperator,
            value: formData.visibilityValue.trim() || undefined,
          }
        : null;

      const promptMapping = formData.promptInstruction.trim()
        ? {
            target: formData.promptTarget.trim() || "visual_bible",
            instruction: formData.promptInstruction.trim(),
          }
        : null;

      const assignedScopes = formData.scopes.length > 0 ? formData.scopes : [formData.scope];

      const payload = {
        key: formData.key.trim(),
        label: formData.label.trim(),
        description: formData.description.trim() || null,
        type: formData.type,
        scope: assignedScopes[0] as ParameterScope,
        scopes: assignedScopes,
        required: formData.required,
        defaultValue: formData.defaultValue !== "" ? formData.defaultValue : null,
        options: ["SELECT", "MULTISELECT"].includes(formData.type) ? formData.options : null,
        validationRules: Object.keys(validationRules).length > 0 ? validationRules : null,
        visibilityRules,
        promptMapping,
      };

      if (editingParam) {
        const res = await fetch(`/api/parameters/${editingParam.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Erro ao atualizar parâmetro.");
        }

        showToast(`Parâmetro "${formData.label}" atualizado com sucesso!`);
      } else {
        const res = await fetch("/api/parameters", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Erro ao criar parâmetro.");
        }

        showToast(`Novo parâmetro "${formData.label}" criado com sucesso!`);
      }

      setIsModalOpen(false);
      resetForm();
      loadParameters();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erro ao salvar parâmetro.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Alternar Ativação
  const handleToggle = async (p: ParameterDef) => {
    try {
      const res = await fetch(`/api/parameters/${p.id}/toggle`, { method: "POST" });
      if (!res.ok) throw new Error("Erro ao alternar estado do parâmetro.");
      showToast(`Parâmetro "${p.label}" ${p.enabled ? "desativado" : "ativado"}.`);
      loadParameters();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erro ao alterar estado.", "error");
    }
  };

  // Excluir Parâmetro
  const handleConfirmDelete = async () => {
    if (!paramToDelete) return;
    try {
      const res = await fetch(`/api/parameters/${paramToDelete.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir parâmetro.");
      showToast(`Parâmetro "${paramToDelete.label}" excluído.`);
      setParamToDelete(null);
      loadParameters();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erro ao excluir.", "error");
    }
  };

  // Adicionar Opção à Lista
  const handleAddOption = () => {
    if (!newOptLabel.trim()) return;
    const value = newOptValue.trim() || newOptLabel.trim().toLowerCase().replace(/\s+/g, "_");
    setFormData({
      ...formData,
      options: [...formData.options, { label: newOptLabel.trim(), value }],
    });
    setNewOptLabel("");
    setNewOptValue("");
  };

  // Remover Opção
  const handleRemoveOption = (index: number) => {
    const updated = [...formData.options];
    updated.splice(index, 1);
    setFormData({ ...formData, options: updated });
  };

  // Mover Ordem para Cima/Baixo
  const handleMoveOrder = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= parameters.length) return;

    const reordered = [...parameters];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    setParameters(reordered);

    try {
      await fetch("/api/parameters/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: reordered.map((p) => p.id) }),
      });
    } catch {
      loadParameters();
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0d12] text-white">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border px-4 py-3 shadow-2xl backdrop-blur-md transition-all ${
            toast.type === "success"
              ? "border-emerald-500/30 bg-emerald-950/90 text-emerald-200"
              : "border-red-500/30 bg-red-950/90 text-red-200"
          }`}
        >
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      <main className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-10 min-w-0">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
                Arquitetura Modular de Prompts
              </span>
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] sm:text-xs text-white/60">
                {parameters.length} parâmetros
              </span>
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight md:text-4xl text-white">
              Parâmetros Dinâmicos
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-white/50 max-w-2xl leading-relaxed">
              Crie campos e variáveis cinematográficas personalizadas que alimentam o motor de composição de prompts sem alterar código.
            </p>
          </div>

          {isPlatformAdmin ? (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Link
                href="/admin/parameters"
                className="flex items-center justify-center gap-2 rounded-xl border border-lime-500/30 bg-lime-500/10 hover:bg-lime-500/20 px-4 py-2.5 font-semibold text-lime-300 transition text-xs sm:text-sm"
                title="Acessar Governança Global das 9 Categorias Cinematográficas"
              >
                <span>⚙️</span>
                <span>Console Administrativo</span>
              </Link>

              <button
                onClick={() => {
                  resetForm();
                  setIsModalOpen(true);
                }}
                className="flex items-center justify-center gap-2 rounded-xl bg-lime-400 px-5 py-2.5 font-semibold text-black transition hover:bg-lime-300 active:scale-[0.98] text-xs sm:text-sm shadow-lg shadow-lime-400/20 cursor-pointer"
              >
                <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                Novo Parâmetro
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-medium text-white/70 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                <span>Catálogo Geral • Modo Consulta</span>
              </span>
            </div>
          )}
        </div>

        {/* Abas por Escopo */}
        <div className="mt-6 sm:mt-8 flex overflow-x-auto border-b border-white/10 pb-px gap-1 sm:gap-2 no-scrollbar">
          {SCOPE_TABS.map((tab) => {
            const isActive = selectedScope === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedScope(tab.id)}
                className={`border-b-2 px-3 sm:px-4 py-2.5 sm:py-3 text-xs font-semibold transition whitespace-nowrap ${
                  isActive
                    ? "border-emerald-400 text-emerald-300"
                    : "border-transparent text-white/50 hover:border-white/20 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Barra de Filtros e Busca */}
        <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between rounded-2xl border border-white/10 bg-white/[0.02] p-3.5 sm:p-4">
          <div className="relative flex-1 min-w-0">
            <svg
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por nome, chave ou descrição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 py-2 pl-10 pr-4 text-xs text-white placeholder-white/30 focus:border-emerald-400 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-3">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full sm:w-auto rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white/80 focus:border-emerald-400 focus:outline-none"
            >
              <option value="ALL">Todos os Tipos</option>
              {TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  Tipo: {t}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full sm:w-auto rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white/80 focus:border-emerald-400 focus:outline-none"
            >
              <option value="all">Status: Todos</option>
              <option value="active">Apenas Ativos</option>
              <option value="inactive">Apenas Inativos</option>
            </select>
          </div>
        </div>

        {/* Lista de Parâmetros */}
        {loading ? (
          <div className="mt-6 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-white/5" />
            ))}
          </div>
        ) : error ? (
          <div className="mt-8 rounded-2xl border border-red-500/20 bg-red-950/20 p-6 text-center text-xs text-red-300">
            {error}
          </div>
        ) : parameters.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-dashed border-white/15 p-12 text-center">
            <h3 className="text-lg font-semibold text-white">Nenhum parâmetro encontrado</h3>
            <p className="mt-1 text-xs text-white/50 max-w-sm mx-auto">
              Altere os filtros de escopo e tipo para visualizar opções cadastradas.
            </p>
            {isPlatformAdmin && (
              <button
                onClick={() => {
                  resetForm();
                  setIsModalOpen(true);
                }}
                className="mt-5 rounded-xl bg-emerald-400 px-5 py-2 text-xs font-semibold text-black hover:bg-emerald-300 transition"
              >
                Criar Primeiro Parâmetro
              </button>
            )}
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {parameters.map((p, idx) => (
              <div
                key={p.id}
                className={`flex flex-col justify-between gap-3 sm:gap-4 rounded-2xl border p-3.5 sm:p-4 transition md:flex-row md:items-center ${
                  p.enabled
                    ? "border-white/10 bg-white/[0.02] hover:border-emerald-400/30"
                    : "border-white/5 bg-black/20 opacity-60"
                }`}
              >
                <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
                  {/* Ordem e Posição */}
                  {isPlatformAdmin ? (
                    <div className="flex flex-col items-center justify-center gap-1 text-white/30 flex-shrink-0 pt-0.5 sm:pt-0">
                      <button
                        onClick={() => handleMoveOrder(idx, "up")}
                        disabled={idx === 0}
                        className="hover:text-emerald-400 disabled:opacity-20 text-xs"
                        title="Subir Ordem"
                      >
                        ▲
                      </button>
                      <span className="text-[10px] font-mono">{idx + 1}</span>
                      <button
                        onClick={() => handleMoveOrder(idx, "down")}
                        disabled={idx === parameters.length - 1}
                        className="hover:text-emerald-400 disabled:opacity-20 text-xs"
                        title="Descer Ordem"
                      >
                        ▼
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center text-white/40 font-mono text-[11px] px-1.5 flex-shrink-0">
                      #{idx + 1}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className="font-semibold text-white text-xs sm:text-sm">{p.label}</span>
                      <code className="rounded bg-black/50 px-1.5 py-0.5 font-mono text-[10px] sm:text-[11px] text-emerald-400 border border-white/10 break-all">
                        {p.key}
                      </code>
                      <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-mono text-white/60">
                        {p.type}
                      </span>
                      {(() => {
                        const scopesList = Array.isArray(p.scopes) && p.scopes.length > 0 ? p.scopes : [p.scope];
                        const allScopes = ["GLOBAL", "CHARACTER", "ENVIRONMENT", "SCENE", "OUTPUT"];
                        const isAll = scopesList.includes("ALL") || allScopes.every((s) => scopesList.includes(s));
                        if (isAll) {
                          return (
                            <span className="rounded-md bg-emerald-400/10 px-2 py-0.5 text-[9px] sm:text-[10px] text-emerald-300 border border-emerald-400/20 font-medium">
                              🌐 Todos os Escopos
                            </span>
                          );
                        }
                        const labelMap: Record<string, string> = {
                          GLOBAL: "Global",
                          CHARACTER: "Personagens",
                          ENVIRONMENT: "Ambientes",
                          SCENE: "Cenas",
                          OUTPUT: "Saída",
                        };
                        return scopesList.map((sc) => (
                          <span
                            key={sc}
                            className="rounded-md bg-emerald-400/10 px-1.5 py-0.5 text-[9px] sm:text-[10px] text-emerald-300 border border-emerald-400/20"
                          >
                            {labelMap[sc] || sc}
                          </span>
                        ));
                      })()}
                      {p.required && (
                        <span className="rounded-md bg-red-400/10 px-1.5 py-0.5 text-[9px] sm:text-[10px] text-red-300 border border-red-400/20">
                          Obrigatório
                        </span>
                      )}
                      {p.isSystem && (
                        <span className="rounded-md bg-blue-400/10 px-1.5 py-0.5 text-[9px] sm:text-[10px] text-blue-300 border border-blue-400/20">
                          Padrão Sistema
                        </span>
                      )}
                    </div>
                    {p.description && (
                      <p className="mt-1 text-xs text-white/50 leading-relaxed">{p.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center border-t border-white/5 pt-2.5 md:border-0 md:pt-0 w-full md:w-auto justify-end flex-shrink-0">
                  {isPlatformAdmin ? (
                    <>
                      {/* Toggle Ativo/Inativo */}
                      <button
                        onClick={() => handleToggle(p)}
                        className={`rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-medium transition ${
                          p.enabled
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-white/10 text-white/50 hover:bg-white/15"
                        }`}
                      >
                        {p.enabled ? "Ativo" : "Inativo"}
                      </button>

                      {/* Editar */}
                      <button
                        onClick={() => handleOpenEdit(p)}
                        className="rounded-lg p-2 text-white/50 hover:bg-white/10 hover:text-white transition"
                        title="Editar Definição"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>

                      {/* Excluir (apenas não de sistema) */}
                      {!p.isSystem && (
                        <button
                          onClick={() => setParamToDelete(p)}
                          className="rounded-lg p-2 text-white/40 hover:bg-red-500/20 hover:text-red-400 transition"
                          title="Excluir"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </>
                  ) : (
                    <span
                      className={`rounded-lg px-2.5 sm:px-3 py-1 text-xs font-medium ${
                        p.enabled
                          ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                          : "bg-white/5 text-white/40 border border-white/10"
                      }`}
                    >
                      {p.enabled ? "Ativo" : "Inativo"}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal / Painel de Criação e Edição com Live Preview Interativo */}
      {isPlatformAdmin && isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-white/10 bg-[#12161f] p-6 shadow-2xl md:p-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-xs uppercase tracking-[0.2em] text-emerald-400">
                  {editingParam ? "Configuração de Parâmetro" : "Novo Parâmetro Customizado"}
                </span>
                <h2 className="mt-1 text-2xl font-bold">
                  {editingParam ? "Editar Definição de Parâmetro" : "Cadastrar Parâmetro Dinâmico"}
                </h2>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="rounded-xl p-2 text-white/40 hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6">
              <div className="grid gap-8 lg:grid-cols-2">
                {/* Coluna 1: Formulário de Configuração */}
                <div className="space-y-4">
                  {/* Chave (snake_case) */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-white/70">
                      Chave Interna (snake_case) <span className="text-emerald-400">*</span>
                    </label>
                    <input
                      type="text"
                      disabled={!!editingParam}
                      placeholder="Ex: tipo_lente, iluminacao_chave..."
                      value={formData.key}
                      onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                      className={`mt-1.5 w-full rounded-xl border bg-black/40 px-3.5 py-2 font-mono text-xs text-white placeholder-white/30 focus:outline-none ${
                        formErrors.key ? "border-red-500" : "border-white/10 focus:border-emerald-400"
                      } disabled:opacity-50`}
                    />
                    {formErrors.key && <p className="mt-1 text-xs text-red-400">{formErrors.key}</p>}
                  </div>

                  {/* Nome de Exibição */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-white/70">
                      Nome de Exibição (Label) <span className="text-emerald-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Tipo de Lente Fotográfica"
                      value={formData.label}
                      onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                      className={`mt-1.5 w-full rounded-xl border bg-black/40 px-3.5 py-2 text-xs text-white placeholder-white/30 focus:outline-none ${
                        formErrors.label ? "border-red-500" : "border-white/10 focus:border-emerald-400"
                      }`}
                    />
                    {formErrors.label && <p className="mt-1 text-xs text-red-400">{formErrors.label}</p>}
                  </div>

                  {/* Descrição */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-white/70">
                      Descrição / Instruções para o Usuário
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Explique como este parâmetro influencia a estética ou a narrativa..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2 text-xs text-white placeholder-white/30 focus:border-emerald-400 focus:outline-none"
                    />
                  </div>

                  {/* Tipo de Dado */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-white/70">
                      Tipo de Dado
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as ParameterType })}
                      className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white focus:border-emerald-400 focus:outline-none"
                    >
                      {TYPE_OPTIONS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Escopos Aplicáveis (Múltiplos Escopos ou Todos) */}
                  <div className="rounded-2xl border border-white/10 bg-black/30 p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-white/80">
                        Escopos Aplicáveis <span className="text-emerald-400">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const all = ["GLOBAL", "CHARACTER", "ENVIRONMENT", "SCENE", "OUTPUT"];
                          const isAllSelected = all.every((s) => formData.scopes.includes(s));
                          setFormData({
                            ...formData,
                            scopes: isAllSelected ? ["GLOBAL"] : all,
                            scope: isAllSelected ? "GLOBAL" : "GLOBAL",
                          });
                        }}
                        className="text-[11px] font-medium text-emerald-400 hover:text-emerald-300 transition"
                      >
                        {["GLOBAL", "CHARACTER", "ENVIRONMENT", "SCENE", "OUTPUT"].every((s) =>
                          formData.scopes.includes(s)
                        )
                          ? "Desmarcar Todos"
                          : "Marcar Todos"}
                      </button>
                    </div>

                    <p className="text-[11px] text-white/50">
                      Selecione onde este parâmetro ficará disponível para configuração (ex.: múltiplos escopos ou todos).
                    </p>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {[
                        { id: "GLOBAL", label: "Global (Projeto)" },
                        { id: "CHARACTER", label: "Personagens" },
                        { id: "ENVIRONMENT", label: "Ambientes" },
                        { id: "SCENE", label: "Cenas / Takes" },
                        { id: "OUTPUT", label: "Saída do Prompt" },
                      ].map((s) => {
                        const isSelected = formData.scopes.includes(s.id);
                        return (
                          <button
                            type="button"
                            key={s.id}
                            onClick={() => {
                              let updated: string[];
                              if (isSelected) {
                                if (formData.scopes.length > 1) {
                                  updated = formData.scopes.filter((item) => item !== s.id);
                                } else {
                                  updated = formData.scopes;
                                }
                              } else {
                                updated = [...formData.scopes, s.id];
                              }
                              setFormData({
                                ...formData,
                                scopes: updated,
                                scope: updated[0] as ParameterScope,
                              });
                            }}
                            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs transition ${
                              isSelected
                                ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300 font-semibold shadow-sm"
                                : "border-white/10 bg-white/[0.02] text-white/60 hover:border-white/20 hover:text-white"
                            }`}
                          >
                            <span
                              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-md border text-[10px] ${
                                isSelected
                                  ? "border-emerald-400 bg-emerald-400 text-black font-bold"
                                  : "border-white/20 bg-transparent text-transparent"
                              }`}
                            >
                              ✓
                            </span>
                            <span className="truncate">{s.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    {formErrors.scopes && <p className="text-xs text-red-400">{formErrors.scopes}</p>}
                  </div>

                  {/* Obrigatório */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="param-required"
                      checked={formData.required}
                      onChange={(e) => setFormData({ ...formData, required: e.target.checked })}
                      className="h-4 w-4 rounded accent-emerald-400"
                    />
                    <label htmlFor="param-required" className="text-xs text-white/80 cursor-pointer">
                      Parâmetro Obrigatório (bloqueia geração se ausente)
                    </label>
                  </div>

                  {/* Editor de Opções (quando SELECT ou MULTISELECT) */}
                  {["SELECT", "MULTISELECT"].includes(formData.type) && (
                    <div className="rounded-2xl border border-white/10 bg-black/30 p-3.5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase text-emerald-400">
                          Opções Disponíveis ({formData.options.length})
                        </span>
                      </div>

                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {formData.options.map((opt, i) => (
                          <div key={i} className="flex items-center justify-between rounded-lg bg-black/60 px-3 py-1.5 text-xs">
                            <span className="text-white font-medium">{opt.label}</span>
                            <div className="flex items-center gap-2">
                              <code className="text-[10px] text-white/40">{opt.value}</code>
                              <button
                                type="button"
                                onClick={() => handleRemoveOption(i)}
                                className="text-red-400 hover:text-red-300"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          placeholder="Rótulo (ex: Lente 50mm)"
                          value={newOptLabel}
                          onChange={(e) => setNewOptLabel(e.target.value)}
                          className="flex-1 rounded-lg border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-white focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleAddOption}
                          className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-400 hover:text-black transition"
                        >
                          + Adicionar
                        </button>
                      </div>
                      {formErrors.options && (
                        <p className="text-xs text-red-400">{formErrors.options}</p>
                      )}
                    </div>
                  )}

                  {/* Regras de Validação (Mín / Máx para número / range) */}
                  {["NUMBER", "RANGE"].includes(formData.type) && (
                    <div className="grid grid-cols-2 gap-3 rounded-2xl border border-white/10 bg-black/30 p-3.5">
                      <div>
                        <label className="block text-[11px] text-white/60">Valor Mínimo</label>
                        <input
                          type="number"
                          placeholder="0"
                          value={formData.min}
                          onChange={(e) => setFormData({ ...formData, min: e.target.value })}
                          className="mt-1 w-full rounded-lg border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-white/60">Valor Máximo</label>
                        <input
                          type="number"
                          placeholder="100"
                          value={formData.max}
                          onChange={(e) => setFormData({ ...formData, max: e.target.value })}
                          className="mt-1 w-full rounded-lg border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-white focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* Mapeamento de Prompt */}
                  <div className="rounded-2xl border border-white/10 bg-black/30 p-3.5 space-y-2">
                    <span className="text-xs font-semibold uppercase text-emerald-400">
                      Mapeamento para Composição do Prompt
                    </span>
                    <input
                      type="text"
                      placeholder="Instrução para a IA (ex: Aplicar estilo fotográfico à iluminação)"
                      value={formData.promptInstruction}
                      onChange={(e) => setFormData({ ...formData, promptInstruction: e.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Coluna 2: Live Preview Interativo em Tempo Real */}
                <div className="flex flex-col justify-between rounded-3xl border border-emerald-400/20 bg-emerald-950/[0.05] p-6">
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                        Live Preview Interativo
                      </span>
                    </div>

                    <p className="text-xs text-white/60 mb-6">
                      Assim que o usuário utilizar este parâmetro nos formulários da aplicação, este é o campo interativo que será renderizado:
                    </p>

                    {/* Componente de Pré-Visualização Dinâmica */}
                    <ParameterInputPreview
                      type={formData.type}
                      label={formData.label || "Título do Parâmetro"}
                      description={formData.description}
                      required={formData.required}
                      defaultValue={formData.defaultValue}
                      options={formData.options}
                      validationRules={{
                        min: formData.min !== "" ? Number(formData.min) : undefined,
                        max: formData.max !== "" ? Number(formData.max) : undefined,
                        isInteger: formData.isInteger,
                      }}
                    />

                    {/* Resumo da Configuração */}
                    <div className="mt-8 rounded-2xl border border-white/10 bg-black/40 p-4 space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-white/40">Chave:</span>
                        <code className="text-emerald-400">{formData.key || "—"}</code>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/40">Escopo:</span>
                        <span className="text-white font-medium">{formData.scope}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/40">Tipo:</span>
                        <span className="text-white font-medium">{formData.type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/40">Obrigatório:</span>
                        <span className={formData.required ? "text-red-400 font-bold" : "text-white/60"}>
                          {formData.required ? "Sim" : "Não"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex justify-end gap-3 border-t border-white/10 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setIsModalOpen(false);
                        resetForm();
                      }}
                      className="rounded-xl border border-white/15 px-4 py-2 text-xs text-white/70 hover:bg-white/5"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="rounded-xl bg-emerald-400 px-6 py-2 text-xs font-semibold text-black hover:bg-emerald-300 transition disabled:opacity-50"
                    >
                      {submitting ? "Salvando..." : editingParam ? "Salvar Alterações" : "Criar Parâmetro"}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Exclusão */}
      {isPlatformAdmin && paramToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-red-500/30 bg-[#141215] p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Excluir Parâmetro</h3>
            <p className="mt-2 text-xs leading-relaxed text-white/70">
              Tem certeza de que deseja remover a definição do parâmetro{" "}
              <strong className="text-white">&quot;{paramToDelete.label}&quot;</strong> ({paramToDelete.key})?
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setParamToDelete(null)}
                className="rounded-xl border border-white/15 px-4 py-2 text-xs text-white/70 hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="rounded-xl bg-red-600 px-5 py-2 text-xs font-semibold text-white hover:bg-red-500 transition"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
