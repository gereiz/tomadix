"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navigation/navbar";
import { TransferProjectModal } from "@/components/projects/transfer-project-modal";
import { ToastNotification } from "@/components/ui/toast";
import { PlanLimitModal } from "@/components/ui/plan-limit-modal";

interface UsageSummary {
  workspaceId: string;
  workspaceName: string;
  planTier: "FREE" | "PRO" | "TEAM" | "ENTERPRISE";
  planName: string;
  projectsCount: number;
  maxProjects: number;
  membersCount: number;
  maxMembers: number;
  creditsBalance: number;
  canCreateProject: boolean;
  canAddMember: boolean;
}

interface ProjectCounts {
  characters: number;
  environments: number;
  scenes: number;
  parameterValues: number;
  generations: number;
}

interface ProjectConfig {
  aspectRatio?: string;
  targetPlatform?: string;
  colorGrade?: string;
  pacing?: string;
  soundDesign?: string;
  customNotes?: string;
}

interface Project {
  id: string;
  workspaceId: string;
  userId: string;
  title: string;
  description: string;
  genre: string | null;
  language: string;
  durationSeconds: number | null;
  configuration: ProjectConfig;
  isArchived: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count: ProjectCounts;
}

const GENRE_OPTIONS = [
  "Ficção Científica",
  "Cyberpunk",
  "Suspense / Thriller",
  "Drama",
  "Fantasia",
  "Ação / Aventura",
  "Documentário",
  "Terror / Horror",
  "Comercial / Publicidade",
  "Videoclipe",
  "Experimental",
];

const PLATFORM_OPTIONS = [
  "Google Flow",
  "Nano Banana",
  "Midjourney v6",
  "Runway Gen-3",
  "OpenAI Sora",
  "Kling AI",
  "Luma Dream Machine",
  "Outra Plataforma",
];

const ASPECT_RATIO_OPTIONS = ["16:9", "9:16", "2.39:1", "4:3", "1:1"];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros e ordenação
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "archived" | "all">("active");
  const [sortOrder, setSortOrder] = useState<string>("updatedAt_desc");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // Estados de modais
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [projectToTransfer, setProjectToTransfer] = useState<Project | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  // Informações de Uso e Limites do Workspace
  const [usageSummary, setUsageSummary] = useState<UsageSummary | null>(null);
  const [planLimitModal, setPlanLimitModal] = useState<{
    isOpen: boolean;
    title?: string;
    message?: string;
    planName?: string;
    currentUsage?: number;
    maxLimit?: number;
  }>({ isOpen: false });

  // Notificações Toast
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: "success" | "error" | "warning" | "info";
    code?: string;
  } | null>(null);

  const showToast = useCallback(
    (text: string, type: "success" | "error" | "warning" | "info" = "success", code?: string) => {
      setToastMessage({ text, type, code });
      setTimeout(() => setToastMessage(null), 5000);
    },
    []
  );

  // Erro inline dentro do modal de formulário
  const [formSubmitError, setFormSubmitError] = useState<{
    message: string;
    code?: string;
  } | null>(null);

  // Formulário de Criação/Edição
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    genre: "Ficção Científica",
    language: "pt-BR",
    durationSeconds: "",
    aspectRatio: "16:9",
    targetPlatform: "Google Flow",
    colorGrade: "",
    pacing: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Parâmetros Globais Dinâmicos
  const [globalParams, setGlobalParams] = useState<any[]>([]);
  const [paramValues, setParamValues] = useState<Record<string, any>>({});

  // Carregar limites e uso da assinatura
  const loadUsage = useCallback(async () => {
    try {
      const res = await fetch("/api/billing/subscription");
      if (res.ok) {
        const json = await res.json();
        setUsageSummary(json.data);
      }
    } catch (err) {
      console.error("Erro ao carregar dados da assinatura:", err);
    }
  }, []);

  useEffect(() => {
    loadUsage();
  }, [loadUsage]);

  useEffect(() => {
    fetch("/api/parameters?scope=GLOBAL&enabled=true")
      .then((res) => res.json())
      .then((json) => {
        const list = json.data || [];
        setGlobalParams(list);
        const defaults: Record<string, any> = {};
        for (const p of list) {
          if (p.defaultValue !== undefined && p.defaultValue !== null) {
            defaults[p.id] = p.defaultValue;
          }
        }
        setParamValues(defaults);
      })
      .catch((err) => console.error("Erro ao carregar parâmetros globais:", err));
  }, []);

  // Carregar projetos
  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      params.append("status", statusFilter);
      params.append("sort", sortOrder);

      const res = await fetch(`/api/projects?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Não foi possível carregar os projetos.");
      }
      const data = await res.json();
      setProjects(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido.");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, sortOrder]);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchProjects();
    }, 200);
    return () => clearTimeout(handler);
  }, [fetchProjects]);

  // Resetar formulário
  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      genre: "Ficção Científica",
      language: "pt-BR",
      durationSeconds: "",
      aspectRatio: "16:9",
      targetPlatform: "Google Flow",
      colorGrade: "",
      pacing: "",
    });
    setFormErrors({});
    setFormSubmitError(null);
    setEditingProject(null);
    const defaults: Record<string, any> = {};
    for (const p of globalParams) {
      if (p.defaultValue !== undefined && p.defaultValue !== null) {
        defaults[p.id] = p.defaultValue;
      }
    }
    setParamValues(defaults);
  };

  // Abrir modal de edição
  const handleOpenEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      title: project.title,
      description: project.description || "",
      genre: project.genre || "Ficção Científica",
      language: project.language || "pt-BR",
      durationSeconds: project.durationSeconds ? String(project.durationSeconds) : "",
      aspectRatio: project.configuration?.aspectRatio || "16:9",
      targetPlatform: project.configuration?.targetPlatform || "Google Flow",
      colorGrade: project.configuration?.colorGrade || "",
      pacing: project.configuration?.pacing || "",
    });
    setFormErrors({});
    setFormSubmitError(null);
    setIsCreateModalOpen(true);
  };

  // Submeter formulário (Criar ou Editar)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitError(null);
    const errors: Record<string, string> = {};

    if (!formData.title.trim()) {
      errors.title = "O nome do projeto é obrigatório.";
    }

    if (formData.durationSeconds && isNaN(Number(formData.durationSeconds))) {
      errors.durationSeconds = "Duração deve ser um número inteiro em segundos.";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        genre: formData.genre,
        language: formData.language,
        durationSeconds: formData.durationSeconds ? Number(formData.durationSeconds) : null,
        configuration: {
          aspectRatio: formData.aspectRatio,
          targetPlatform: formData.targetPlatform,
          colorGrade: formData.colorGrade.trim() || undefined,
          pacing: formData.pacing.trim() || undefined,
        },
      };

      if (editingProject) {
        // Atualizar
        const res = await fetch(`/api/projects/${editingProject.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const errMsg = errData.error || "Erro ao atualizar o projeto.";
          setFormSubmitError({ message: errMsg, code: errData.code });
          showToast(errMsg, "error", errData.code);
          return;
        }

        showToast("Projeto atualizado com sucesso!");
      } else {
        // Criar
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const errMsg = errData.error || "Erro ao criar o projeto.";
          const errCode = errData.code;
          setFormSubmitError({ message: errMsg, code: errCode });
          showToast(errMsg, "error", errCode);

          if (errCode === "PROJECT_LIMIT_REACHED" || errMsg.includes("Limite de projetos")) {
            setPlanLimitModal({
              isOpen: true,
              title: "Limite de Projetos Atingido",
              message: errMsg,
              planName: usageSummary?.planName || "Plano Gratuito",
              currentUsage: usageSummary?.projectsCount || projects.length,
              maxLimit: usageSummary?.maxProjects || 2,
            });
          }
          return;
        }

        const createdProject = (await res.json()).data;
        if (createdProject?.id && Object.keys(paramValues).length > 0) {
          await fetch(`/api/projects/${createdProject.id}/parameters`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              projectId: createdProject.id,
              values: Object.entries(paramValues)
                .filter(([_, val]) => val !== undefined && val !== null && val !== "")
                .map(([defId, val]) => ({
                  parameterDefinitionId: defId,
                  targetType: "PROJECT",
                  value: val,
                })),
            }),
          });
        }

        showToast("Novo projeto criado com sucesso!");
      }

      setIsCreateModalOpen(false);
      resetForm();
      fetchProjects();
      loadUsage();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Erro ao salvar projeto.";
      setFormSubmitError({ message: errMsg });
      showToast(errMsg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Duplicar Projeto
  const handleDuplicate = async (project: Project) => {
    try {
      setDuplicatingId(project.id);
      const res = await fetch(`/api/projects/${project.id}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const errMsg = errData.error || "Erro ao duplicar o projeto.";
        const errCode = errData.code;
        showToast(errMsg, "error", errCode);

        if (errCode === "PROJECT_LIMIT_REACHED" || errMsg.includes("Limite de projetos")) {
          setPlanLimitModal({
            isOpen: true,
            title: "Limite de Projetos Atingido",
            message: errMsg,
            planName: usageSummary?.planName || "Plano Gratuito",
            currentUsage: usageSummary?.projectsCount || projects.length,
            maxLimit: usageSummary?.maxProjects || 2,
          });
        }
        return;
      }

      showToast(`Projeto "${project.title}" duplicado com sucesso!`);
      fetchProjects();
      loadUsage();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erro ao duplicar.", "error");
    } finally {
      setDuplicatingId(null);
    }
  };

  // Arquivar / Restaurar
  const handleToggleArchive = async (project: Project) => {
    try {
      const endpoint = project.isArchived
        ? `/api/projects/${project.id}/restore`
        : `/api/projects/${project.id}/archive`;

      const res = await fetch(endpoint, { method: "POST" });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Erro ao alterar estado do projeto.");
      }

      showToast(
        project.isArchived
          ? `Projeto "${project.title}" restaurado com sucesso!`
          : `Projeto "${project.title}" arquivado!`
      );
      fetchProjects();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erro ao processar.", "error");
    }
  };

  // Excluir Projeto
  const handleConfirmDelete = async () => {
    if (!projectToDelete) return;
    try {
      const res = await fetch(`/api/projects/${projectToDelete.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Erro ao excluir projeto.");
      }

      showToast(`Projeto "${projectToDelete.title}" excluído com sucesso.`);
      setProjectToDelete(null);
      fetchProjects();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erro ao excluir.", "error");
    }
  };

  // Formatação de data
  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateString));
  };

  return (
    <div className="min-h-screen bg-[#0b0d12] text-white">
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 py-10">
        {/* Cabeçalho da Página */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
                Pré-Produção Audiovisual
              </span>
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-white/60">
                {projects.length} {projects.length === 1 ? "projeto" : "projetos"}
              </span>
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
              Projetos Cinematográficos
            </h1>
            <p className="mt-1 text-sm text-white/50">
              Gerencie contêineres de universo, consistência visual, personagens, cenas e prompts.
            </p>
          </div>

          <button
            onClick={() => {
              if (usageSummary && !usageSummary.canCreateProject) {
                setPlanLimitModal({
                  isOpen: true,
                  title: "Limite de Projetos Atingido",
                  message: `Seu estúdio utilizou todos os ${usageSummary.projectsCount} de ${usageSummary.maxProjects} projetos do ${usageSummary.planName}. Faça upgrade para continuar criando novos projetos sem limites.`,
                  planName: usageSummary.planName,
                  currentUsage: usageSummary.projectsCount,
                  maxLimit: usageSummary.maxProjects,
                });
                return;
              }
              resetForm();
              setIsCreateModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 py-2.5 font-semibold text-black transition hover:bg-emerald-300 active:scale-[0.98]"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Novo Projeto
          </button>
        </div>

        {/* Banner de Limite de Projetos Atingido */}
        {usageSummary && usageSummary.maxProjects !== -1 && usageSummary.projectsCount >= usageSummary.maxProjects && (
          <div className="mt-8 overflow-hidden rounded-3xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-amber-950/25 to-black/60 p-5 shadow-xl shadow-amber-500/5 backdrop-blur-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-500/40 bg-amber-500/20 text-amber-400 shadow-inner">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-amber-400/40 bg-amber-400/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                      {usageSummary.planName} • Limite Atingido
                    </span>
                    <span className="text-xs text-white/60">
                      {usageSummary.projectsCount} de {usageSummary.maxProjects} projetos em uso (100%)
                    </span>
                  </div>
                  <h3 className="mt-1 text-sm sm:text-base font-bold text-white">
                    Limite de projetos atingido ({usageSummary.projectsCount}/{usageSummary.maxProjects})
                  </h3>
                  <p className="mt-0.5 text-xs text-white/70 max-w-2xl leading-relaxed">
                    Você não pode criar ou duplicar projetos neste workspace até fazer o upgrade para o Plano PRO ou TEAM.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    setPlanLimitModal({
                      isOpen: true,
                      title: "Limite de Projetos Atingido",
                      message: `Seu estúdio utilizou todos os ${usageSummary.projectsCount} de ${usageSummary.maxProjects} projetos do ${usageSummary.planName}. Faça upgrade para continuar criando novos projetos sem limites.`,
                      planName: usageSummary.planName,
                      currentUsage: usageSummary.projectsCount,
                      maxLimit: usageSummary.maxProjects,
                    })
                  }
                  className="rounded-xl border border-white/15 px-3.5 py-2 text-xs font-medium text-white/80 hover:bg-white/10 hover:text-white transition"
                >
                  Ver Benefícios
                </button>
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-300 px-4 py-2 text-xs font-bold text-black transition hover:opacity-90 shadow-lg shadow-amber-400/20 whitespace-nowrap"
                >
                  <span>Fazer Upgrade Agora</span>
                  <span>→</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Barra de Filtros, Busca e Ações */}
        <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            {/* Input de Pesquisa */}
            <div className="relative flex-1">
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
                placeholder="Pesquisar por nome ou descrição..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/40 py-2 pl-10 pr-4 text-sm text-white placeholder-white/30 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/40 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filtro por Estado */}
            <div className="flex rounded-xl border border-white/10 bg-black/40 p-1">
              <button
                onClick={() => setStatusFilter("active")}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  statusFilter === "active"
                    ? "bg-emerald-400/20 text-emerald-300"
                    : "text-white/60 hover:text-white"
                }`}
              >
                Ativos
              </button>
              <button
                onClick={() => setStatusFilter("archived")}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  statusFilter === "archived"
                    ? "bg-amber-400/20 text-amber-300"
                    : "text-white/60 hover:text-white"
                }`}
              >
                Arquivados
              </button>
              <button
                onClick={() => setStatusFilter("all")}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  statusFilter === "all"
                    ? "bg-white/20 text-white"
                    : "text-white/60 hover:text-white"
                }`}
              >
                Todos
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Ordenação */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40">Ordenar:</span>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white/80 focus:border-emerald-400 focus:outline-none"
              >
                <option value="updatedAt_desc">Mais recentes</option>
                <option value="updatedAt_asc">Mais antigos</option>
                <option value="title_asc">Título (A-Z)</option>
                <option value="title_desc">Título (Z-A)</option>
                <option value="createdAt_desc">Data de criação</option>
              </select>
            </div>

            {/* Alternância de Visualização */}
            <div className="flex rounded-xl border border-white/10 bg-black/40 p-1">
              <button
                onClick={() => setViewMode("cards")}
                title="Visualização em Cards"
                className={`rounded-lg p-1.5 transition ${
                  viewMode === "cards" ? "bg-white/15 text-white" : "text-white/40 hover:text-white"
                }`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode("table")}
                title="Visualização em Tabela"
                className={`rounded-lg p-1.5 transition ${
                  viewMode === "table" ? "bg-white/15 text-white" : "text-white/40 hover:text-white"
                }`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Conteúdo Principal: Lista ou Estados */}
        {loading ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-white/5 bg-white/[0.02] p-6">
                <div className="h-4 w-24 rounded bg-white/10" />
                <div className="mt-4 h-6 w-3/4 rounded bg-white/10" />
                <div className="mt-2 h-4 w-full rounded bg-white/5" />
                <div className="mt-6 flex gap-2">
                  <div className="h-5 w-16 rounded bg-white/10" />
                  <div className="h-5 w-20 rounded bg-white/10" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="mt-12 rounded-2xl border border-red-500/20 bg-red-950/20 p-8 text-center">
            <p className="text-red-400">{error}</p>
            <button
              onClick={fetchProjects}
              className="mt-4 rounded-xl border border-white/15 px-4 py-2 text-xs text-white/80 hover:bg-white/5"
            >
              Tentar novamente
            </button>
          </div>
        ) : projects.length === 0 ? (
          /* Estado Vazio */
          <div className="mt-12 rounded-3xl border border-dashed border-white/15 bg-white/[0.015] p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-400">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
              </svg>
            </div>
            <h3 className="mt-5 text-xl font-semibold">
              {search || statusFilter !== "active"
                ? "Nenhum projeto encontrado com estes filtros"
                : "Seu estúdio ainda não possui projetos"}
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-white/50">
              {search || statusFilter !== "active"
                ? "Tente ajustar o termo de busca ou redefinir os filtros de estado."
                : "Crie o seu primeiro projeto cinematográfico para estruturar personagens, consistência de iluminação, cenas e gerar prompts prontos para IA."}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              {search || statusFilter !== "active" ? (
                <button
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("active");
                  }}
                  className="rounded-xl border border-white/15 px-5 py-2.5 text-xs text-white/80 hover:bg-white/5"
                >
                  Limpar filtros
                </button>
              ) : (
                <button
                  onClick={() => {
                    resetForm();
                    setIsCreateModalOpen(true);
                  }}
                  className="rounded-xl bg-emerald-400 px-6 py-2.5 font-semibold text-black transition hover:bg-emerald-300"
                >
                  Criar Primeiro Projeto
                </button>
              )}
            </div>
          </div>
        ) : viewMode === "cards" ? (
          /* Grid de Cards */
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <div
                key={project.id}
                className={`group relative flex flex-col justify-between rounded-2xl border transition-all duration-200 ${
                  project.isArchived
                    ? "border-amber-500/20 bg-amber-950/[0.04] opacity-80"
                    : "border-white/10 bg-white/[0.025] hover:border-emerald-400/40 hover:bg-white/[0.04]"
                } p-5 shadow-lg shadow-black/20`}
              >
                <div>
                  {/* Topo do Card: Gênero, Status e Menu de Ações */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg bg-emerald-400/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300 border border-emerald-400/20">
                        {project.genre || "Geral"}
                      </span>
                      {project.isArchived && (
                        <span className="rounded-lg bg-amber-400/10 px-2.5 py-1 text-[11px] font-medium text-amber-300 border border-amber-400/20">
                          Arquivado
                        </span>
                      )}
                    </div>

                    <span className="text-[11px] font-mono text-white/40">
                      {project.configuration?.aspectRatio || "16:9"} · {project.configuration?.targetPlatform || "Google Flow"}
                    </span>
                  </div>

                  {/* Título e Descrição */}
                  <Link href={`/projects/${project.id}`} className="mt-4 block group-hover:text-emerald-300 transition">
                    <h3 className="text-lg font-semibold tracking-tight text-white line-clamp-1">
                      {project.title}
                    </h3>
                  </Link>

                  <p className="mt-2 text-xs leading-5 text-white/55 line-clamp-2 min-h-[40px]">
                    {project.description || "Nenhuma descrição fornecida para este projeto cinematográfico."}
                  </p>

                  {/* Contadores dos Módulos Internos */}
                  <div className="mt-5 grid grid-cols-4 gap-1.5 rounded-xl border border-white/5 bg-black/30 p-2 text-center text-[10px]">
                    <div>
                      <span className="block font-semibold text-white">{project._count.characters}</span>
                      <span className="text-white/40">Personagens</span>
                    </div>
                    <div>
                      <span className="block font-semibold text-white">{project._count.environments}</span>
                      <span className="text-white/40">Ambientes</span>
                    </div>
                    <div>
                      <span className="block font-semibold text-white">{project._count.scenes}</span>
                      <span className="text-white/40">Cenas</span>
                    </div>
                    <div>
                      <span className="block font-semibold text-white">{project._count.parameterValues}</span>
                      <span className="text-white/40">Parâmetros</span>
                    </div>
                  </div>
                </div>

                {/* Rodapé do Card: Datas e Ações */}
                <div className="mt-6 border-t border-white/10 pt-4">
                  <div className="flex items-center justify-between text-[11px] text-white/40 mb-3">
                    <span>Atualizado: {formatDate(project.updatedAt)}</span>
                    {project.durationSeconds && (
                      <span className="font-mono text-white/60">{project.durationSeconds}s</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`/projects/${project.id}`}
                      className="flex-1 rounded-xl bg-white/10 py-1.5 text-center text-xs font-medium text-white transition hover:bg-emerald-400 hover:text-black"
                    >
                      Abrir Módulos
                    </Link>

                    <div className="flex items-center gap-1">
                      {/* Editar */}
                      <button
                        onClick={() => handleOpenEdit(project)}
                        title="Editar Informações"
                        className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white transition"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>

                      {/* Duplicar */}
                      <button
                        onClick={() => handleDuplicate(project)}
                        disabled={duplicatingId === project.id}
                        title="Duplicar Projeto e Elementos"
                        className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-emerald-400 transition disabled:opacity-50"
                      >
                        {duplicatingId === project.id ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                        ) : (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                      </button>

                      {/* Arquivar / Restaurar */}
                      <button
                        onClick={() => handleToggleArchive(project)}
                        title={project.isArchived ? "Restaurar Projeto" : "Arquivar Projeto"}
                        className={`rounded-lg p-1.5 transition ${
                          project.isArchived
                            ? "text-amber-400 hover:bg-amber-400/20"
                            : "text-white/50 hover:bg-white/10 hover:text-amber-300"
                        }`}
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                      </button>

                      {/* Transferir Workspace */}
                      <button
                        onClick={() => setProjectToTransfer(project)}
                        title="Transferir para outro Workspace"
                        className="rounded-lg p-1.5 text-white/50 hover:bg-emerald-500/20 hover:text-emerald-300 transition"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                      </button>

                      {/* Excluir */}
                      <button
                        onClick={() => setProjectToDelete(project)}
                        title="Excluir Projeto"
                        className="rounded-lg p-1.5 text-white/50 hover:bg-red-500/20 hover:text-red-400 transition"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Tabela Detalhada */
          <div className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
            <table className="w-full text-left text-sm text-white/80">
              <thead className="border-b border-white/10 bg-black/40 text-[11px] font-semibold uppercase tracking-wider text-white/40">
                <tr>
                  <th className="px-6 py-4">Projeto</th>
                  <th className="px-4 py-4">Gênero</th>
                  <th className="px-4 py-4">Formato / IA</th>
                  <th className="px-4 py-4">Módulos</th>
                  <th className="px-4 py-4">Última Atualização</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {projects.map((project) => (
                  <tr key={project.id} className="hover:bg-white/[0.02] transition">
                    <td className="px-6 py-4">
                      <Link href={`/projects/${project.id}`} className="font-medium text-white hover:text-emerald-300">
                        {project.title}
                      </Link>
                      {project.isArchived && (
                        <span className="ml-2 rounded-md bg-amber-400/10 px-2 py-0.5 text-[10px] text-amber-300 border border-amber-400/20">
                          Arquivado
                        </span>
                      )}
                      <p className="text-xs text-white/40 line-clamp-1 mt-0.5">{project.description}</p>
                    </td>
                    <td className="px-4 py-4 text-xs">{project.genre || "—"}</td>
                    <td className="px-4 py-4 text-xs font-mono text-white/60">
                      {project.configuration?.aspectRatio || "16:9"} · {project.configuration?.targetPlatform || "Google Flow"}
                    </td>
                    <td className="px-4 py-4 text-xs text-white/50">
                      {project._count.characters} P · {project._count.environments} A · {project._count.scenes} C
                    </td>
                    <td className="px-4 py-4 text-xs text-white/40">{formatDate(project.updatedAt)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/projects/${project.id}`}
                          className="rounded-lg bg-white/10 px-3 py-1 text-xs text-white hover:bg-emerald-400 hover:text-black transition"
                        >
                          Abrir
                        </Link>
                        <button
                          onClick={() => handleOpenEdit(project)}
                          className="rounded-lg p-1.5 text-white/40 hover:text-white"
                          title="Editar"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDuplicate(project)}
                          className="rounded-lg p-1.5 text-white/40 hover:text-emerald-400"
                          title="Duplicar"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleToggleArchive(project)}
                          className="rounded-lg p-1.5 text-white/40 hover:text-amber-300"
                          title={project.isArchived ? "Restaurar" : "Arquivar"}
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setProjectToTransfer(project)}
                          className="rounded-lg p-1.5 text-white/40 hover:text-emerald-300"
                          title="Transferir para outro Workspace"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setProjectToDelete(project)}
                          className="rounded-lg p-1.5 text-white/40 hover:text-red-400"
                          title="Excluir"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Modal de Criação / Edição de Projeto */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-[#12161f] p-6 shadow-2xl md:p-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-xs uppercase tracking-[0.2em] text-emerald-400">
                  {editingProject ? "Edição de Projeto" : "Nova Produção"}
                </span>
                <h2 className="mt-1 text-2xl font-bold">
                  {editingProject ? "Editar Projeto Cinematográfico" : "Criar Projeto Cinematográfico"}
                </h2>
              </div>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  resetForm();
                }}
                className="rounded-xl p-2 text-white/40 hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Alerta Visual de Erro / Limite Inline */}
            {formSubmitError && (
              <div
                className={`mt-5 rounded-2xl border p-4 transition-all ${
                  formSubmitError.code === "PROJECT_LIMIT_REACHED" ||
                  formSubmitError.message.includes("Limite de projetos")
                    ? "border-amber-500/40 bg-amber-950/40 text-amber-200"
                    : "border-red-500/40 bg-red-950/40 text-red-200"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1 text-xs">
                    <h4 className="font-bold text-sm">
                      {formSubmitError.code === "PROJECT_LIMIT_REACHED" ||
                      formSubmitError.message.includes("Limite de projetos")
                        ? "Limite de Projetos Atingido"
                        : "Não foi possível salvar o projeto"}
                    </h4>
                    <p className="mt-1 leading-relaxed opacity-95">
                      {formSubmitError.message}
                    </p>
                    {(formSubmitError.code === "PROJECT_LIMIT_REACHED" ||
                      formSubmitError.message.includes("Limite de projetos")) && (
                      <div className="mt-3 flex items-center gap-2">
                        <Link
                          href="/pricing"
                          className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-3.5 py-1.5 text-xs font-bold text-black transition hover:bg-amber-300 shadow-md shadow-amber-400/20"
                        >
                          <span>Fazer Upgrade de Plano</span>
                          <span>→</span>
                        </Link>
                        <Link
                          href="/workspace/billing"
                          className="text-xs text-amber-300 underline underline-offset-4 hover:text-white transition"
                        >
                          Ver Detalhes da Assinatura
                        </Link>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormSubmitError(null)}
                    className="rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white transition"
                    title="Fechar aviso"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmitForm} className="mt-6 space-y-5">
              {/* Nome */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-white/70">
                  Nome do Projeto <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: O Brasil em VHS, Neo-Sertão 2099..."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className={`mt-2 w-full rounded-xl border bg-black/40 px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 ${
                    formErrors.title
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                      : "border-white/10 focus:border-emerald-400 focus:ring-emerald-400"
                  }`}
                />
                {formErrors.title && <p className="mt-1.5 text-xs text-red-400">{formErrors.title}</p>}
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-white/70">
                  Descrição e Visão Criativa
                </label>
                <textarea
                  rows={3}
                  placeholder="Resumo do universo, proposta estética, tom narrativo e objetivos audiovisuais..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white placeholder-white/30 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                />
              </div>

              {/* Grid: Gênero, Idioma, Duração */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-white/70">
                    Gênero / Estilo
                  </label>
                  <select
                    value={formData.genre}
                    onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white focus:border-emerald-400 focus:outline-none"
                  >
                    {GENRE_OPTIONS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-white/70">
                    Idioma Principal
                  </label>
                  <input
                    type="text"
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white focus:border-emerald-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-white/70">
                    Duração Alvo (segundos)
                  </label>
                  <input
                    type="number"
                    placeholder="Ex: 30, 60, 120"
                    value={formData.durationSeconds}
                    onChange={(e) => setFormData({ ...formData, durationSeconds: e.target.value })}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white focus:border-emerald-400 focus:outline-none"
                  />
                  {formErrors.durationSeconds && (
                    <p className="mt-1.5 text-xs text-red-400">{formErrors.durationSeconds}</p>
                  )}
                </div>
              </div>

              {/* Seção de Configurações Técnicas Cinematográficas */}
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-400 mb-3">
                  Configurações Técnicas de Destino
                </h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs text-white/60">Plataforma-Alvo de Geração</label>
                    <select
                      value={formData.targetPlatform}
                      onChange={(e) => setFormData({ ...formData, targetPlatform: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white focus:border-emerald-400 focus:outline-none"
                    >
                      {PLATFORM_OPTIONS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-white/60">Proporção de Tela (Aspect Ratio)</label>
                    <select
                      value={formData.aspectRatio}
                      onChange={(e) => setFormData({ ...formData, aspectRatio: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white focus:border-emerald-400 focus:outline-none"
                    >
                      {ASPECT_RATIO_OPTIONS.map((ar) => (
                        <option key={ar} value={ar}>
                          {ar} {ar === "16:9" ? "(Padrão Cinema / Vídeo)" : ar === "9:16" ? "(Vertical / Reels)" : ar === "2.39:1" ? "(Anamórfico)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-white/60">Color Grading / Look Visual</label>
                    <input
                      type="text"
                      placeholder="Ex: Kodachrome 64, Bleach Bypass, Teal & Orange..."
                      value={formData.colorGrade}
                      onChange={(e) => setFormData({ ...formData, colorGrade: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white focus:border-emerald-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-white/60">Ritmo / Pacing</label>
                    <input
                      type="text"
                      placeholder="Ex: Contemplativo, Rápido com cortes secos..."
                      value={formData.pacing}
                      onChange={(e) => setFormData({ ...formData, pacing: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white focus:border-emerald-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Parâmetros Cinematográficos Globais */}
              {globalParams.length > 0 && (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/10 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-400">
                      Parâmetros Cinematográficos Globais
                    </h4>
                    <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                      {globalParams.length}
                    </span>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {globalParams.map((param) => (
                      <div key={param.id} className="space-y-1">
                        <label className="block text-xs text-white/80 font-medium">
                          {param.label}
                          {param.required && <span className="text-emerald-400 ml-1 font-bold">*</span>}
                        </label>
                        {param.description && (
                          <p className="text-[10px] text-white/50">{param.description}</p>
                        )}
                        {param.type === "SELECT" ? (
                          <select
                            value={paramValues[param.id] ?? (param.defaultValue ?? "")}
                            onChange={(e) =>
                              setParamValues({ ...paramValues, [param.id]: e.target.value })
                            }
                            className="mt-1 w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs text-white focus:border-emerald-400 focus:outline-none cursor-pointer"
                          >
                            <option value="">Selecione uma opção...</option>
                            {(param.options || []).map((opt: any) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={paramValues[param.id] ?? (param.defaultValue ?? "")}
                            onChange={(e) =>
                              setParamValues({ ...paramValues, [param.id]: e.target.value })
                            }
                            className="mt-1 w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs text-white focus:border-emerald-400 focus:outline-none"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Botões do Formulário */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    resetForm();
                  }}
                  className="rounded-xl border border-white/15 px-4 py-2.5 text-xs font-medium text-white/70 hover:bg-white/5 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-emerald-400 px-6 py-2.5 text-xs font-semibold text-black transition hover:bg-emerald-300 disabled:opacity-50"
                >
                  {submitting
                    ? "Salvando..."
                    : editingProject
                    ? "Salvar Alterações"
                    : "Criar Projeto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação Explícita de Exclusão */}
      {projectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-red-500/30 bg-[#141215] p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white">Excluir Projeto</h3>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-white/70">
              Você tem certeza de que deseja excluir permanentemente o projeto{" "}
              <strong className="text-white font-semibold">&quot;{projectToDelete.title}&quot;</strong>?
            </p>

            <div className="mt-3 rounded-xl border border-red-500/20 bg-red-950/20 p-3 text-xs text-red-300/80">
              Esta ação removerá todos os personagens, ambientes, cenas e versões de prompts vinculados a este projeto. Essa operação não pode ser desfeita.
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setProjectToDelete(null)}
                className="rounded-xl border border-white/15 px-4 py-2 text-xs font-medium text-white/70 hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="rounded-xl bg-red-600 px-5 py-2 text-xs font-semibold text-white transition hover:bg-red-500 active:scale-[0.98]"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Transferência de Projeto entre Workspaces */}
      {projectToTransfer && (
        <TransferProjectModal
          projectId={projectToTransfer.id}
          projectTitle={projectToTransfer.title}
          currentWorkspaceId={projectToTransfer.workspaceId}
          isOpen={Boolean(projectToTransfer)}
          onClose={() => setProjectToTransfer(null)}
          onSuccess={() => {
            showToast("Projeto transferido com sucesso para o novo workspace!");
            fetchProjects();
            loadUsage();
          }}
        />
      )}

      {/* Modal Visual de Limite de Assinatura */}
      <PlanLimitModal
        isOpen={planLimitModal.isOpen}
        onClose={() => setPlanLimitModal({ isOpen: false })}
        title={planLimitModal.title}
        message={planLimitModal.message}
        planName={planLimitModal.planName || usageSummary?.planName || "Plano Gratuito"}
        currentUsage={planLimitModal.currentUsage ?? usageSummary?.projectsCount ?? projects.length}
        maxLimit={planLimitModal.maxLimit ?? usageSummary?.maxProjects ?? 2}
        limitType="projects"
      />

      {/* Toast Notification Flutuante */}
      <ToastNotification
        message={toastMessage}
        onClose={() => setToastMessage(null)}
      />
    </div>
  );
}
