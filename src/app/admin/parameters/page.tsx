"use client";

import { Spinner } from "@/components/ui/spinner";
import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  AdminParameterListItem,
  AdminParameterMetrics,
} from "@/modules/admin/admin-parameters.service";
import {
  ProjectCinematicCategoryKey,
  ProjectCinematicCategory,
} from "@/modules/projects/project-parameter-config.types";

const CINEMATIC_CATEGORIES_METADATA: Array<{
  id: ProjectCinematicCategoryKey;
  name: string;
  icon: string;
  color: string;
}> = [
  { id: "CAMERA", name: "Câmera & Sensor", icon: "🎥", color: "from-blue-500/20 to-cyan-500/20 text-cyan-400 border-cyan-500/30" },
  { id: "LENS", name: "Lentes & Óptica", icon: "🔍", color: "from-indigo-500/20 to-blue-500/20 text-indigo-400 border-indigo-500/30" },
  { id: "FRAMING", name: "Enquadramento", icon: "📐", color: "from-primary/20 to-secondary/20 text-primary border-primary/30" },
  { id: "MOVEMENT", name: "Movimento", icon: "🎬", color: "from-amber-500/20 to-yellow-500/20 text-amber-400 border-amber-500/30" },
  { id: "LIGHTING", name: "Iluminação", icon: "💡", color: "from-yellow-500/20 to-amber-500/20 text-yellow-300 border-yellow-500/30" },
  { id: "AESTHETICS", name: "Estética & Cor", icon: "🎨", color: "from-purple-500/20 to-pink-500/20 text-purple-400 border-purple-500/30" },
  { id: "ART_ATMOSPHERE", name: "Arte & Atmosfera", icon: "🏙️", color: "from-rose-500/20 to-pink-500/20 text-rose-400 border-rose-500/30" },
  { id: "AUDIO", name: "Áudio & Som", icon: "🎧", color: "from-secondary/20 to-primary/20 text-secondary border-secondary/30" },
  { id: "CONTINUITY", name: "Continuidade", icon: "🛡️", color: "from-accent/20 to-primary/20 text-accent border-accent/30" },
];

const SCOPE_OPTIONS = [
  { id: "ALL", label: "Todos os Escopos" },
  { id: "GLOBAL", label: "Global (Projeto)" },
  { id: "CHARACTER", label: "Personagem" },
  { id: "ENVIRONMENT", label: "Ambiente" },
  { id: "SCENE", label: "Cena / Take" },
  { id: "OUTPUT", label: "Saída Técnica" },
];

const TYPE_OPTIONS = [
  { id: "ALL", label: "Todos os Tipos" },
  { id: "SELECT", label: "Seleção Única" },
  { id: "MULTISELECT", label: "Múltipla Seleção" },
  { id: "TEXT", label: "Texto Simples" },
  { id: "TEXTAREA", label: "Texto Longo" },
  { id: "RANGE", label: "Intervalo / Slider" },
  { id: "NUMBER", label: "Numérico" },
  { id: "BOOLEAN", label: "Booleano" },
];

export default function AdminParametersPage() {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [parameters, setParameters] = useState<AdminParameterListItem[]>([]);
  const [metrics, setMetrics] = useState<AdminParameterMetrics | null>(null);
  const [categories, setCategories] = useState<ProjectCinematicCategory[]>([]);

  // Filtros
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedScope, setSelectedScope] = useState<string>("ALL");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [selectedOrigin, setSelectedOrigin] = useState<"all" | "system" | "custom">("all");
  const [selectedStatus, setSelectedStatus] = useState<"all" | "active" | "inactive">("all");

  // Modais
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingParam, setEditingParam] = useState<AdminParameterListItem | null>(null);
  const [deletingParam, setDeletingParam] = useState<AdminParameterListItem | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  }, []);

  // Form State
  const [formKey, setFormKey] = useState("");
  const [formLabel, setFormLabel] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState<ProjectCinematicCategoryKey>("CAMERA");
  const [formType, setFormType] = useState("SELECT");
  const [formPrimaryScope, setFormPrimaryScope] = useState("GLOBAL");
  const [formScopes, setFormScopes] = useState<string[]>(["GLOBAL"]);
  const [formRequired, setFormRequired] = useState(false);
  const [formDefaultValue, setFormDefaultValue] = useState("");
  const [formPromptTarget, setFormPromptTarget] = useState("visual_bible");
  const [formPromptInstruction, setFormPromptInstruction] = useState("");
  const [formOptions, setFormOptions] = useState<
    Array<{
      value: string;
      label: string;
      description?: string;
      imageUrl?: string;
      whatToLookFor?: string;
    }>
  >([]);

  // Carregar dados
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/parameters");
      if (!res.ok) {
        throw new Error("Falha ao carregar catálogo de parâmetros administrativos.");
      }
      const data = await res.json();
      setParameters(data.parameters || []);
      setMetrics(data.metrics || null);
      setCategories(data.categories || []);
    } catch (err: any) {
      showToast(err?.message || "Erro de conexão.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Sincronizar padrões mestre
  const handleSyncDefaults = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/admin/parameters/sync-defaults", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao sincronizar parâmetros.");
      }
      showToast(data.message || "Parâmetros cinematográficos sincronizados!", "success");
      await loadData();
    } catch (err: any) {
      showToast(err?.message || "Erro na sincronização.", "error");
    } finally {
      setSyncing(false);
    }
  };

  // Toggle rápido
  const handleToggle = async (id: string, currentEnabled: boolean) => {
    try {
      const res = await fetch(`/api/admin/parameters/${id}/toggle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !currentEnabled }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Falha ao alternar estado.");
      }

      setParameters((prev) =>
        prev.map((p) => (p.id === id ? { ...p, enabled: data.enabled } : p))
      );
      showToast(data.message || "Estado atualizado.", "success");
      // Atualiza métricas em segundo plano
      fetch("/api/admin/parameters")
        .then((r) => r.json())
        .then((d) => setMetrics(d.metrics))
        .catch(() => {});
    } catch (err: any) {
      showToast(err?.message || "Erro ao alternar.", "error");
    }
  };

  // Abrir Modal para Criar
  const openCreateModal = () => {
    setEditingParam(null);
    setFormKey("");
    setFormLabel("");
    setFormDescription("");
    setFormCategory("CAMERA");
    setFormType("SELECT");
    setFormPrimaryScope("GLOBAL");
    setFormScopes(["GLOBAL"]);
    setFormRequired(false);
    setFormDefaultValue("");
    setFormPromptTarget("visual_bible");
    setFormPromptInstruction("");
    setFormOptions([
      { value: "opcao_1", label: "Opção Padrão 1", description: "" },
      { value: "opcao_2", label: "Opção Padrão 2", description: "" },
    ]);
    setIsFormOpen(true);
  };

  // Abrir Modal para Editar
  const openEditModal = (param: AdminParameterListItem) => {
    setEditingParam(param);
    setFormKey(param.key);
    setFormLabel(param.label);
    setFormDescription(param.description || "");
    setFormCategory(param.category);
    setFormType(param.type);
    setFormPrimaryScope(param.scope);
    setFormScopes(param.scopes || [param.scope]);
    setFormRequired(param.required);
    setFormDefaultValue(
      typeof param.defaultValue === "object"
        ? JSON.stringify(param.defaultValue)
        : String(param.defaultValue ?? "")
    );
    const pm = (param.promptMapping as any) || {};
    setFormPromptTarget(pm.target || "visual_bible");
    setFormPromptInstruction(pm.instruction || "");
    setFormOptions(
      (param.options || []).map((o) => ({
        value: o.value,
        label: o.label,
        description: o.description || "",
        imageUrl: o.imageUrl || "",
        whatToLookFor: o.whatToLookFor || "",
      }))
    );
    setIsFormOpen(true);
  };

  // Salvar Parâmetro (Create ou Update)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formLabel.trim()) {
      showToast("Informe o rótulo de exibição do parâmetro.", "error");
      return;
    }

    if (!editingParam && !formKey.trim()) {
      showToast("Informe a chave do parâmetro (snake_case).", "error");
      return;
    }

    // Se for select/multiselect, validar opções
    if (["SELECT", "MULTISELECT"].includes(formType) && formOptions.length === 0) {
      showToast("Adicione pelo menos uma opção para parâmetros de seleção.", "error");
      return;
    }

    const payload: any = {
      label: formLabel.trim(),
      description: formDescription.trim() || null,
      type: formType,
      category: formCategory,
      scope: formPrimaryScope,
      scopes: formScopes,
      required: formRequired,
      defaultValue: formDefaultValue.trim() ? formDefaultValue.trim() : null,
      promptMapping: {
        target: formPromptTarget.trim() || "visual_bible",
        instruction: formPromptInstruction.trim() || undefined,
        category: formCategory,
      },
      options: ["SELECT", "MULTISELECT"].includes(formType) ? formOptions : null,
    };

    if (!editingParam) {
      payload.key = formKey.trim().toLowerCase();
    }

    try {
      const url = editingParam
        ? `/api/admin/parameters/${editingParam.id}`
        : "/api/admin/parameters";
      const method = editingParam ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Falha ao salvar parâmetro.");
      }

      showToast(data.message || "Parâmetro salvo com sucesso!", "success");
      setIsFormOpen(false);
      await loadData();
    } catch (err: any) {
      showToast(err?.message || "Erro ao salvar.", "error");
    }
  };

  // Excluir Parâmetro
  const handleDeleteConfirm = async () => {
    if (!deletingParam) return;
    try {
      const res = await fetch(`/api/admin/parameters/${deletingParam.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao excluir parâmetro.");
      }

      showToast(data.message || "Parâmetro excluído com sucesso.", "success");
      setDeletingParam(null);
      await loadData();
    } catch (err: any) {
      showToast(err?.message || "Erro na exclusão.", "error");
    }
  };

  // Filtragem local
  const filteredParameters = useMemo(() => {
    return parameters.filter((p) => {
      // Busca
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchLabel = p.label.toLowerCase().includes(q);
        const matchKey = p.key.toLowerCase().includes(q);
        const matchDesc = (p.description || "").toLowerCase().includes(q);
        if (!matchLabel && !matchKey && !matchDesc) return false;
      }

      // Categoria
      if (selectedCategory !== "ALL" && p.category !== selectedCategory) {
        return false;
      }

      // Escopo
      if (selectedScope !== "ALL") {
        const hasScope =
          p.scope === selectedScope ||
          (Array.isArray(p.scopes) && p.scopes.includes(selectedScope));
        if (!hasScope) return false;
      }

      // Tipo
      if (selectedType !== "ALL" && p.type !== selectedType) {
        return false;
      }

      // Origem
      if (selectedOrigin === "system" && !p.isSystem) return false;
      if (selectedOrigin === "custom" && p.isSystem) return false;

      // Status
      if (selectedStatus === "active" && !p.enabled) return false;
      if (selectedStatus === "inactive" && p.enabled) return false;

      return true;
    });
  }, [
    parameters,
    search,
    selectedCategory,
    selectedScope,
    selectedType,
    selectedOrigin,
    selectedStatus,
  ]);

  return (
    <div className="space-y-8 pb-20">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl border transition-all animate-in fade-in slide-in-from-bottom-4 ${
            toast.type === "success"
              ? "bg-primary/10 border-primary/40 text-primary shadow-primary/40"
              : "bg-[#291014]/90 border-rose-500/40 text-rose-300 shadow-rose-950/40"
          }`}
        >
          <span className="text-lg">{toast.type === "success" ? "✓" : "⚠"}</span>
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Header Principal com Breadcrumbs e Ações */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-primary mb-1 tracking-wider uppercase">
            <span>Console Administrativo</span>
            <span>/</span>
            <span className="text-white/60">Governança Cinematográfica</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <span>⚙️</span> Catálogo de Parâmetros Cinematográficos
          </h1>
          <p className="text-sm text-white/50 mt-1 max-w-2xl">
            Governança centralizada das 9 categorias cinematográficas mestre, extensibilidade
            global de novos parâmetros e garantia de não-regressão para projetos existentes.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <button
            onClick={handleSyncDefaults}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-white/80 hover:text-white text-xs font-medium transition-all cursor-pointer disabled:opacity-50"
            title="Repara e sincroniza os 21 parâmetros canônicos das 9 categorias"
          >
            <span className={syncing ? "animate-spin" : ""}>🔄</span>
            <span>{syncing ? "Sincronizando..." : "Sincronizar Padrões Mestre"}</span>
          </button>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:opacity-90 text-on-primary font-semibold text-xs tracking-wide shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <span>+</span>
            <span>Novo Parâmetro Global</span>
          </button>
        </div>
      </div>

      {/* Top Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
          <div className="p-4 rounded-2xl bg-[#0e121b] border border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 text-white/10 group-hover:text-primary/20 transition-colors">
              <span className="text-3xl font-mono">01</span>
            </div>
            <p className="text-xs font-medium text-white/50 uppercase tracking-wider">
              Total de Parâmetros
            </p>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                {metrics.totalParameters}
              </span>
              <span className="text-xs text-primary font-mono">
                {metrics.activeParameters} ativos
              </span>
            </div>
            <p className="text-[11px] text-white/40 mt-1">
              {metrics.systemParameters} nativos • {metrics.customParameters} custom
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#0e121b] border border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 text-white/10 group-hover:text-cyan-500/20 transition-colors">
              <span className="text-3xl font-mono">02</span>
            </div>
            <p className="text-xs font-medium text-white/50 uppercase tracking-wider">
              Categorias Mestre
            </p>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl md:text-3xl font-bold text-cyan-400 tracking-tight">
                9 / 9
              </span>
              <span className="text-xs text-white/50 font-mono">100%</span>
            </div>
            <p className="text-[11px] text-white/40 mt-1">
              Câmera, Lentes, Luz, Som, etc.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#0e121b] border border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 text-white/10 group-hover:text-purple-500/20 transition-colors">
              <span className="text-3xl font-mono">03</span>
            </div>
            <p className="text-xs font-medium text-white/50 uppercase tracking-wider">
              Cobertura Visual
            </p>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl md:text-3xl font-bold text-purple-400 tracking-tight">
                {metrics.visualCoveragePercent}%
              </span>
              <span className="text-xs text-white/50 font-mono">
                {metrics.visualCoverageCount} itens
              </span>
            </div>
            <p className="text-[11px] text-white/40 mt-1">
              Com referências óticas reais
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#0e121b] border border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 text-white/10 group-hover:text-amber-500/20 transition-colors">
              <span className="text-3xl font-mono">04</span>
            </div>
            <p className="text-xs font-medium text-white/50 uppercase tracking-wider">
              Usos em Projetos
            </p>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl md:text-3xl font-bold text-amber-400 tracking-tight">
                {metrics.totalValuesInProjects}
              </span>
              <span className="text-xs text-white/50 font-mono">valores</span>
            </div>
            <p className="text-[11px] text-white/40 mt-1">
              Snapshots protegidos
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#0e121b] border border-white/5 relative overflow-hidden group col-span-2 md:col-span-1">
            <div className="absolute top-0 right-0 p-3 text-white/10 group-hover:text-primary/20 transition-colors">
              <span className="text-3xl font-mono">05</span>
            </div>
            <p className="text-xs font-medium text-white/50 uppercase tracking-wider">
              Estabilidade
            </p>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl md:text-3xl font-bold text-primary tracking-tight">
                100%
              </span>
              <span className="text-xs text-primary font-mono">Seguro</span>
            </div>
            <p className="text-[11px] text-white/40 mt-1">
              Exclusão destrutiva bloqueada
            </p>
          </div>
        </div>
      )}

      {/* Seletor Rápido de Categorias Cinematográficas (9 Categorias Mestre) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-mono text-white/50 uppercase tracking-wider">
            Navegar pelas 9 Categorias Cinematográficas:
          </label>
          <span className="text-xs text-white/40 font-mono">
            Mostrando {filteredParameters.length} de {parameters.length} parâmetros
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-10 gap-2">
          <button
            onClick={() => setSelectedCategory("ALL")}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
              selectedCategory === "ALL"
                ? "bg-primary/10 border-primary text-primary shadow-md shadow-primary/10"
                : "bg-[#0b0e17] border-white/5 text-white/60 hover:border-white/20 hover:text-white"
            }`}
          >
            <span className="text-base mb-1">🌐</span>
            <div>
              <p className="text-xs font-semibold leading-tight">Todas</p>
              <span className="text-[10px] text-white/40 font-mono">
                {parameters.length}
              </span>
            </div>
          </button>

          {CINEMATIC_CATEGORIES_METADATA.map((cat) => {
            const count = parameters.filter((p) => p.category === cat.id).length;
            const isSelected = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? `bg-gradient-to-br ${cat.color} border-current shadow-lg`
                    : "bg-[#0b0e17] border-white/5 text-white/60 hover:border-white/20 hover:text-white"
                }`}
              >
                <span className="text-base mb-1">{cat.icon}</span>
                <div>
                  <p className="text-xs font-semibold leading-tight line-clamp-1">
                    {cat.name}
                  </p>
                  <span className="text-[10px] text-white/40 font-mono">{count}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Barra de Filtros Complementares */}
      <div className="p-4 rounded-2xl bg-[#0b0e17] border border-white/5 flex flex-wrap items-center gap-3">
        {/* Campo de Busca */}
        <div className="flex-1 min-w-[240px] relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 text-sm">
            🔍
          </span>
          <input
            type="text"
            placeholder="Buscar por rótulo, chave (ex: formato_sensor) ou descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#121622] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-primary/50 transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filtro de Escopo */}
        <select
          value={selectedScope}
          onChange={(e) => setSelectedScope(e.target.value)}
          className="bg-[#121622] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary/50 cursor-pointer"
        >
          {SCOPE_OPTIONS.map((s) => (
            <option key={s.id} value={s.id} className="bg-[#121622]">
              {s.label}
            </option>
          ))}
        </select>

        {/* Filtro de Tipo */}
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="bg-[#121622] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary/50 cursor-pointer"
        >
          {TYPE_OPTIONS.map((t) => (
            <option key={t.id} value={t.id} className="bg-[#121622]">
              {t.label}
            </option>
          ))}
        </select>

        {/* Filtro de Origem */}
        <select
          value={selectedOrigin}
          onChange={(e) => setSelectedOrigin(e.target.value as any)}
          className="bg-[#121622] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary/50 cursor-pointer"
        >
          <option value="all" className="bg-[#121622]">
            Todas as Origens
          </option>
          <option value="system" className="bg-[#121622]">
            Nativos do Sistema
          </option>
          <option value="custom" className="bg-[#121622]">
            Customizados
          </option>
        </select>

        {/* Filtro de Status */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value as any)}
          className="bg-[#121622] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary/50 cursor-pointer"
        >
          <option value="all" className="bg-[#121622]">
            Todos os Status
          </option>
          <option value="active" className="bg-[#121622]">
            Apenas Ativos
          </option>
          <option value="inactive" className="bg-[#121622]">
            Apenas Inativos
          </option>
        </select>

        {(search ||
          selectedCategory !== "ALL" ||
          selectedScope !== "ALL" ||
          selectedType !== "ALL" ||
          selectedOrigin !== "all" ||
          selectedStatus !== "all") && (
          <button
            onClick={() => {
              setSearch("");
              setSelectedCategory("ALL");
              setSelectedScope("ALL");
              setSelectedType("ALL");
              setSelectedOrigin("all");
              setSelectedStatus("all");
            }}
            className="text-xs text-primary hover:underline px-2 py-1"
          >
            Limpar Filtros
          </button>
        )}
      </div>

      {/* Lista / Grid de Parâmetros */}
      {loading ? (
        <div className="p-16 rounded-2xl bg-[#0b0e17] border border-white/5 flex flex-col items-center justify-center gap-3">
          <Spinner block className="h-8 w-8 border-2 border-primary" />
          <p className="text-xs text-white/50 font-mono tracking-wider uppercase">
            Carregando catálogo cinematográfico...
          </p>
        </div>
      ) : filteredParameters.length === 0 ? (
        <div className="p-16 rounded-2xl bg-[#0b0e17] border border-white/5 flex flex-col items-center justify-center text-center gap-3">
          <span className="text-4xl">🎬</span>
          <h3 className="text-base font-semibold text-white">
            Nenhum parâmetro encontrado
          </h3>
          <p className="text-xs text-white/50 max-w-sm">
            Tente ajustar os filtros ou crie um novo parâmetro customizado para esta categoria.
          </p>
          <button
            onClick={openCreateModal}
            className="mt-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-semibold cursor-pointer hover:opacity-90"
          >
            + Criar Novo Parâmetro
          </button>
        </div>
      ) : (
        <div className="rounded-2xl bg-[#0b0e17] border border-white/5 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02] text-[11px] font-mono text-white/40 uppercase tracking-wider">
                  <th className="py-3 px-4">Parâmetro & Chave</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4">Tipo & Escopos</th>
                  <th className="py-3 px-4">Opções & Visual</th>
                  <th className="py-3 px-4 text-center">Usos</th>
                  <th className="py-3 px-4 text-center">Ativação</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {filteredParameters.map((param) => {
                  const catMeta = CINEMATIC_CATEGORIES_METADATA.find(
                    (c) => c.id === param.category
                  );
                  const optCount = (param.options || []).length;

                  return (
                    <tr
                      key={param.id}
                      className="hover:bg-white/[0.02] transition-colors group"
                    >
                      {/* Parâmetro & Chave */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white tracking-wide">
                            {param.label}
                          </span>
                          {param.isSystem ? (
                            <span
                              className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              title="Parâmetro nativo do estúdio (protegido contra exclusão)"
                            >
                              Nativo
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              Custom
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="text-[11px] text-primary/90 font-mono bg-primary/10 px-1.5 py-0.5 rounded">
                            {param.key}
                          </code>
                          {param.required && (
                            <span className="text-[10px] text-rose-400 font-mono">
                              *obrigatório
                            </span>
                          )}
                        </div>
                        {param.description && (
                          <p className="text-[11px] text-white/40 mt-1 line-clamp-1">
                            {param.description}
                          </p>
                        )}
                      </td>

                      {/* Categoria Cinematográfica */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium bg-gradient-to-r ${
                            catMeta?.color || "from-white/5 to-white/10 text-white/70 border-white/10"
                          }`}
                        >
                          <span>{catMeta?.icon || "🎬"}</span>
                          <span>{param.categoryName}</span>
                        </span>
                      </td>

                      {/* Tipo & Escopos */}
                      <td className="py-3.5 px-4">
                        <div className="text-[11px] font-mono text-white/80">
                          {param.type}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(param.scopes || [param.scope]).map((s) => (
                            <span
                              key={s}
                              className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-white/5 text-white/50 border border-white/5"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Opções & Referências Visuais */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          {optCount > 0 ? (
                            <span className="text-[11px] text-white/70 font-mono">
                              {optCount} opções
                            </span>
                          ) : (
                            <span className="text-[11px] text-white/30 font-mono">
                              Campo livre
                            </span>
                          )}
                          {param.hasVisualRef && (
                            <span
                              className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-500/10 text-purple-300 border border-purple-500/20 flex items-center gap-1"
                              title="Possui referências visuais e diretrizes óticas vinculadas"
                            >
                              <span>🖼️</span> Visual
                            </span>
                          )}
                        </div>
                        {param.promptMapping?.target && (
                          <p className="text-[10px] text-white/40 mt-0.5 font-mono">
                            → {param.promptMapping.target}
                          </p>
                        )}
                      </td>

                      {/* Usos em Projetos */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`font-mono text-xs font-semibold px-2 py-0.5 rounded-full ${
                            param.usageCount > 0
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "text-white/30"
                          }`}
                          title={`${param.usageCount} instâncias salvas em projetos`}
                        >
                          {param.usageCount}
                        </span>
                      </td>

                      {/* Ativação Global Switch */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggle(param.id, param.enabled)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            param.enabled ? "bg-primary" : "bg-white/10"
                          }`}
                          title={
                            param.enabled
                              ? "Parâmetro ativo no catálogo"
                              : "Parâmetro desativado (oculto de novos projetos)"
                          }
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-black shadow-lg ring-0 transition duration-200 ease-in-out ${
                              param.enabled ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(param)}
                            className="p-1.5 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.08] text-white/70 hover:text-white transition-all cursor-pointer"
                            title="Editar Parâmetro"
                          >
                            ✏️
                          </button>

                          {param.isSystem ? (
                            <button
                              disabled
                              className="p-1.5 rounded-lg border border-transparent text-white/20 cursor-not-allowed"
                              title="Parâmetros nativos do sistema são protegidos contra exclusão"
                            >
                              🔒
                            </button>
                          ) : (
                            <button
                              onClick={() => setDeletingParam(param)}
                              className="p-1.5 rounded-lg border border-rose-500/10 bg-rose-500/5 hover:bg-rose-500/20 text-rose-400 transition-all cursor-pointer"
                              title="Excluir Parâmetro"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Criação / Edição de Parâmetro */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-in fade-in">
          <div className="bg-[#0e121a] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            <div className="p-6 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#0e121a]/95 z-10">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>{editingParam ? "✏️" : "✨"}</span>
                  <span>
                    {editingParam
                      ? `Editar Parâmetro: ${editingParam.label}`
                      : "Novo Parâmetro Cinematográfico Global"}
                  </span>
                </h3>
                <p className="text-xs text-white/50 mt-0.5">
                  Extensibilidade segura para todas as tomadas e projetos do estúdio.
                </p>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-white/40 hover:text-white text-lg font-mono p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-6 space-y-6 flex-1">
              {/* Chave snake_case e Rótulo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-white/60 mb-1">
                    Chave Técnica (snake_case) *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingParam)}
                    placeholder="ex: anamorphic_streak_flare"
                    value={formKey}
                    onChange={(e) => setFormKey(e.target.value)}
                    className="w-full bg-[#141824] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder-white/30 focus:outline-none focus:border-primary/50 disabled:opacity-50"
                  />
                  <p className="text-[10px] text-white/40 mt-1">
                    Identificador imutável no compilador de prompts.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-mono text-white/60 mb-1">
                    Rótulo de Exibição (Label) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Flare Anamórfico Horizontal"
                    value={formLabel}
                    onChange={(e) => setFormLabel(e.target.value)}
                    className="w-full bg-[#141824] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-primary/50"
                  />
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-xs font-mono text-white/60 mb-1">
                  Descrição Cinematográfica / Orientação de Uso
                </label>
                <textarea
                  rows={2}
                  placeholder="Orienta a equipe sobre a função dramática deste parâmetro..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-[#141824] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-primary/50"
                />
              </div>

              {/* Categoria Cinematográfica e Tipo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-white/60 mb-1">
                    Categoria Cinematográfica Mestre *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) =>
                      setFormCategory(e.target.value as ProjectCinematicCategoryKey)
                    }
                    className="w-full bg-[#141824] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary/50 cursor-pointer"
                  >
                    {CINEMATIC_CATEGORIES_METADATA.map((c) => (
                      <option key={c.id} value={c.id} className="bg-[#141824]">
                        {c.icon} {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-white/60 mb-1">
                    Tipo de Dado *
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full bg-[#141824] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary/50 cursor-pointer"
                  >
                    <option value="SELECT">Seleção Única (Dropdown / Radio)</option>
                    <option value="MULTISELECT">Múltipla Seleção</option>
                    <option value="TEXT">Texto Curto</option>
                    <option value="TEXTAREA">Texto Longo / Descritivo</option>
                    <option value="RANGE">Intervalo Numérico (Slider 0-100)</option>
                    <option value="NUMBER">Número</option>
                    <option value="BOOLEAN">Booleano (Toggle Sim/Não)</option>
                  </select>
                </div>
              </div>

              {/* Escopos de Aplicação */}
              <div>
                <label className="block text-xs font-mono text-white/60 mb-2">
                  Escopos Aplicáveis (Onde este parâmetro pode ser definido):
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: "GLOBAL", label: "Projeto Global" },
                    { id: "CHARACTER", label: "Personagens" },
                    { id: "ENVIRONMENT", label: "Ambientes" },
                    { id: "SCENE", label: "Cenas / Takes" },
                    { id: "OUTPUT", label: "Saída Técnica" },
                  ].map((s) => {
                    const isChecked = formScopes.includes(s.id);
                    return (
                      <label
                        key={s.id}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-medium cursor-pointer transition-all flex items-center gap-2 ${
                          isChecked
                            ? "bg-primary/15 border-primary text-primary"
                            : "bg-[#141824] border-white/10 text-white/50 hover:text-white"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormScopes([...formScopes, s.id]);
                            } else {
                              const next = formScopes.filter((x) => x !== s.id);
                              setFormScopes(next.length > 0 ? next : ["GLOBAL"]);
                            }
                          }}
                          className="sr-only"
                        />
                        <span>{isChecked ? "✓" : "○"}</span>
                        <span>{s.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Opções do Parâmetro (se SELECT ou MULTISELECT) */}
              {["SELECT", "MULTISELECT"].includes(formType) && (
                <div className="space-y-3 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <span>🎨</span> Opções Cinematográficas & Referências Visuais
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setFormOptions([
                          ...formOptions,
                          {
                            value: `opcao_${formOptions.length + 1}`,
                            label: `Nova Opção ${formOptions.length + 1}`,
                            description: "",
                          },
                        ])
                      }
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-primary text-xs font-medium cursor-pointer"
                    >
                      + Adicionar Opção
                    </button>
                  </div>

                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                    {formOptions.map((opt, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-[#141824] border border-white/5 space-y-2 relative"
                      >
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Valor técnico (ex: anamorfico_65mm)"
                            value={opt.value}
                            onChange={(e) => {
                              const next = [...formOptions];
                              next[idx].value = e.target.value;
                              setFormOptions(next);
                            }}
                            className="bg-[#0b0e17] border border-white/10 rounded px-2.5 py-1.5 text-xs text-white font-mono"
                          />
                          <input
                            type="text"
                            placeholder="Rótulo legível (ex: Anamórfico 65mm)"
                            value={opt.label}
                            onChange={(e) => {
                              const next = [...formOptions];
                              next[idx].label = e.target.value;
                              setFormOptions(next);
                            }}
                            className="bg-[#0b0e17] border border-white/10 rounded px-2.5 py-1.5 text-xs text-white"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="URL da Imagem / Referência Ótica (opcional)"
                            value={opt.imageUrl || ""}
                            onChange={(e) => {
                              const next = [...formOptions];
                              next[idx].imageUrl = e.target.value;
                              setFormOptions(next);
                            }}
                            className="bg-[#0b0e17] border border-white/10 rounded px-2.5 py-1.5 text-[11px] text-white/80"
                          />
                          <input
                            type="text"
                            placeholder="O que observar visualmente (whatToLookFor)"
                            value={opt.whatToLookFor || ""}
                            onChange={(e) => {
                              const next = [...formOptions];
                              next[idx].whatToLookFor = e.target.value;
                              setFormOptions(next);
                            }}
                            className="bg-[#0b0e17] border border-white/10 rounded px-2.5 py-1.5 text-[11px] text-white/80"
                          />
                        </div>

                        {formOptions.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setFormOptions(formOptions.filter((_, i) => i !== idx))
                            }
                            className="text-rose-400 hover:text-rose-300 text-xs font-mono absolute top-2 right-2"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mapeamento de Prompt de IA */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <div>
                  <label className="block text-xs font-mono text-white/60 mb-1">
                    Seção Alvo no Prompt
                  </label>
                  <input
                    type="text"
                    placeholder="ex: camera, lighting, visual_bible"
                    value={formPromptTarget}
                    onChange={(e) => setFormPromptTarget(e.target.value)}
                    className="w-full bg-[#141824] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-white/60 mb-1">
                    Instrução de Composição para a IA
                  </label>
                  <input
                    type="text"
                    placeholder="ex: Especificar ótica e flares no enquadramento."
                    value={formPromptInstruction}
                    onChange={(e) => setFormPromptInstruction(e.target.value)}
                    className="w-full bg-[#141824] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              {/* Configurações Adicionais */}
              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-xs text-white/70 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formRequired}
                    onChange={(e) => setFormRequired(e.target.checked)}
                    className="rounded border-white/20 text-primary focus:ring-0"
                  />
                  <span>Parâmetro obrigatório nos formulários</span>
                </label>
              </div>

              {/* Botões do Formulário */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 text-white/70 hover:text-white text-xs font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-primary hover:opacity-90 text-on-primary text-xs font-semibold shadow-lg shadow-primary/20 cursor-pointer transition-transform active:scale-95"
                >
                  {editingParam ? "Salvar Alterações" : "Criar Parâmetro Global"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Exclusão Segura */}
      {deletingParam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-in fade-in">
          <div className="bg-[#121622] border border-rose-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400 mb-3">
              <span className="text-2xl">⚠️</span>
              <h3 className="text-base font-bold text-white">Exclusão de Parâmetro</h3>
            </div>
            <p className="text-xs text-white/70 leading-relaxed">
              Você tem certeza de que deseja excluir permanentemente o parâmetro{" "}
              <strong className="text-white">{deletingParam.label}</strong> (
              <code className="text-primary font-mono">{deletingParam.key}</code>)?
            </p>

            {deletingParam.usageCount > 0 && (
              <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] leading-tight">
                <strong>Atenção:</strong> Este parâmetro está vinculado a{" "}
                {deletingParam.usageCount} projeto(s). A exclusão será bloqueada pelo
                sistema para não corromper o histórico cinematográfico. Desative-o em vez
                disso.
              </div>
            )}

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setDeletingParam(null)}
                className="px-4 py-2 rounded-xl border border-white/10 text-white/70 text-xs font-medium cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-semibold cursor-pointer shadow-lg shadow-rose-500/20"
              >
                Sim, Excluir Parâmetro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
