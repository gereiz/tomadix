"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
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

const CINEMA_PRESETS = [
  {
    title: "Curta Cyberpunk 2099",
    genre: "Cyberpunk",
    description: "Megalópole chuvosa, hologramas gigantes, iluminação volumétrica néon noir ciano e magenta com lentes anamórficas.",
    aspectRatio: "16:9",
    targetPlatform: "Google Flow",
    durationSeconds: "60",
    colorGrade: "Teal and Orange Saturado",
    pacing: "Dinâmico / Ação Rápida",
  },
  {
    title: "Cinema Noir VHS Anos 90",
    genre: "Suspense / Thriller",
    description: "Estética vintage granulada, fita analógica, aberrações cromáticas sutis e iluminação chiaroscuro de alto contraste.",
    aspectRatio: "2.39:1",
    targetPlatform: "Midjourney v6",
    durationSeconds: "30",
    colorGrade: "Preto e Branco / Tons Terrosos Desbotados",
    pacing: "Lento / Contemplativo",
  },
  {
    title: "Alta Moda Editorial Futurista",
    genre: "Comercial / Publicidade",
    description: "Retrato clean de passarela com iluminação difusa suave 5600K, close-ups de texturas e transições orgânicas.",
    aspectRatio: "9:16",
    targetPlatform: "Flux Pro",
    durationSeconds: "15",
    colorGrade: "Daylight 5600K Imaculado",
    pacing: "Rítmico / High Fashion",
  },
  {
    title: "Odisseia Sci-Fi Planetária",
    genre: "Ficção Científica",
    description: "Exploração de superfície alienígena desértica, luz crepuscular de duas luas e atmosfera com névoa densa.",
    aspectRatio: "2.39:1",
    targetPlatform: "Runway Gen-3",
    durationSeconds: "90",
    colorGrade: "Monocromático Âmbar e Ciano Frio",
    pacing: "Épico / Gravitacional",
  },
];

function getGenreVisual(genre: string | null) {
  const g = (genre || "").toLowerCase();
  if (g.includes("cyber") || g.includes("anime") || g.includes("sci-fi") || g.includes("ficção")) {
    return {
      gradient: "from-emerald-950/70 via-slate-900 to-[#0b0f13]",
      border: "border-primary/30",
      accent: "text-primary",
      badge: "bg-[var(--brand-badge-bg,var(--color-primary))] text-[var(--brand-badge-text,#ffffff)] font-bold shadow-sm",
      glowColor: "rgba(78, 222, 163, 0.25)",
      bgPattern: "radial-gradient(circle at 80% 20%, rgba(78, 222, 163, 0.15) 0%, transparent 60%)",
    };
  }
  if (g.includes("noir") || g.includes("suspense") || g.includes("terror") || g.includes("drama")) {
    return {
      gradient: "from-amber-950/70 via-slate-900 to-[#0b0f13]",
      border: "border-amber-400/30",
      accent: "text-amber-400",
      badge: "bg-amber-500/80 text-[var(--brand-badge-text,#ffffff)] font-bold shadow-sm",
      glowColor: "rgba(245, 158, 11, 0.25)",
      bgPattern: "radial-gradient(circle at 20% 80%, rgba(245, 158, 11, 0.15) 0%, transparent 60%)",
    };
  }
  if (g.includes("comercial") || g.includes("moda") || g.includes("publicidade") || g.includes("videoclipe")) {
    return {
      gradient: "from-purple-950/70 via-slate-900 to-[#0b0f13]",
      border: "border-purple-400/30",
      accent: "text-purple-400",
      badge: "bg-purple-600/80 text-[var(--brand-badge-text,#ffffff)] font-bold shadow-sm",
      glowColor: "rgba(192, 132, 252, 0.25)",
      bgPattern: "radial-gradient(circle at 50% 30%, rgba(192, 132, 252, 0.15) 0%, transparent 60%)",
    };
  }
  return {
    gradient: "from-slate-900 via-slate-950 to-[#0b0f13]",
    border: "border-outline-variant/30",
    accent: "text-secondary",
    badge: "bg-[var(--brand-badge-bg,var(--color-primary))] text-[var(--brand-badge-text,#ffffff)] font-bold shadow-sm",
    glowColor: "rgba(149, 211, 186, 0.2)",
    bgPattern: "radial-gradient(circle at 50% 50%, rgba(149, 211, 186, 0.1) 0%, transparent 60%)",
  };
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros e ordenação
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "archived" | "all">("active");
  const [sortOrder, setSortOrder] = useState<string>("updatedAt_desc");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // Input ref para atalho ⌘K
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Estados de modais
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPresetsModalOpen, setIsPresetsModalOpen] = useState(false);
  const [starredProjectIds, setStarredProjectIds] = useState<Set<string>>(new Set());
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

  // Parâmetros do Estúdio e Seleção para o Projeto
  const [studioParams, setStudioParams] = useState<any[]>([]);
  const [selectedParamKeys, setSelectedParamKeys] = useState<Set<string>>(new Set());
  const [paramSearch, setParamSearch] = useState("");
  const [paramScopeFilter, setParamScopeFilter] = useState<string>("ALL");

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
    fetch("/api/parameters?enabled=true")
      .then((res) => res.json())
      .then((json) => {
        const rawList: any[] = json.data || [];
        const seenKeys = new Set<string>();
        const list = rawList.filter((p) => {
          if (!p?.key || seenKeys.has(p.key)) return false;
          seenKeys.add(p.key);
          return true;
        });
        setStudioParams(list);
        // Preselecionar todos por padrão
        setSelectedParamKeys(new Set(list.map((p) => p.key)));
      })
      .catch((err) => console.error("Erro ao carregar parâmetros do estúdio:", err));
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

  // Carregar projetos favoritados do localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("tomadix_starred_projects");
      if (saved) {
        setStarredProjectIds(new Set(JSON.parse(saved)));
      }
    } catch {}
  }, []);

  // Alternar favorito do projeto
  const toggleStarProject = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setStarredProjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      try {
        localStorage.setItem("tomadix_starred_projects", JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  // Atalhos de teclado: ⌘K para focar busca e N para criar projeto
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || "").toLowerCase();
      const isInput = activeTag === "input" || activeTag === "textarea" || activeTag === "select";

      // ⌘K ou Ctrl+K -> Focar campo de busca
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      // N -> Novo projeto (quando não estiver digitando em campo de formulário)
      if (e.key.toLowerCase() === "n" && !isInput && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        if (usageSummary && !usageSummary.canCreateProject) {
          setPlanLimitModal({
            isOpen: true,
            title: "Limite de Projetos Atingido",
            message: `Seu estúdio utilizou todos os ${usageSummary.projectsCount} de ${usageSummary.maxProjects} projetos do ${usageSummary.planName}.`,
            planName: usageSummary.planName,
            currentUsage: usageSummary.projectsCount,
            maxLimit: usageSummary.maxProjects,
          });
          return;
        }
        resetForm();
        setIsCreateModalOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [usageSummary]);

  // Aplicar Template de Preset Rápido
  const handleApplyPreset = (preset: (typeof CINEMA_PRESETS)[0]) => {
    setFormData({
      title: preset.title,
      description: preset.description,
      genre: preset.genre,
      language: "pt-BR",
      durationSeconds: preset.durationSeconds,
      aspectRatio: preset.aspectRatio,
      targetPlatform: preset.targetPlatform,
      colorGrade: preset.colorGrade,
      pacing: preset.pacing,
    });
    setIsPresetsModalOpen(false);
    setIsCreateModalOpen(true);
  };

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
    setSelectedParamKeys(new Set(studioParams.map((p) => p.key)));
    setParamSearch("");
    setParamScopeFilter("ALL");
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

    const savedKeys = (project.configuration as any)?.parameterSettings?.enabledParameterKeys;
    if (Array.isArray(savedKeys)) {
      setSelectedParamKeys(new Set(savedKeys));
    } else {
      setSelectedParamKeys(new Set(studioParams.map((p) => p.key)));
    }
    setParamSearch("");
    setParamScopeFilter("ALL");
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
          parameterSettings: {
            enabledParameterKeys: Array.from(selectedParamKeys),
          },
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

        showToast("Projeto e parâmetros atualizados com sucesso!");
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
    <div className="min-h-screen bg-surface font-body-md text-on-surface antialiased selection:bg-primary selection:text-on-primary relative overflow-hidden">
      {/* Luz ambiente de fundo */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[780px] h-[360px] bg-gradient-to-b from-primary/10 via-tertiary-container/5 to-transparent blur-3xl opacity-70" />
      <div className="pointer-events-none absolute top-28 right-12 w-72 h-72 bg-secondary-container/15 rounded-full blur-2xl" />

      <main className="relative w-full px-4 sm:px-6 lg:px-8 pt-8 pb-20 flex flex-col gap-8">
        {/* CABEÇALHO DA PÁGINA (HERO COM BADGES E AÇÕES) */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="flex flex-col gap-2 max-w-3xl">
            <div className="flex items-center flex-wrap gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high/80 border border-outline-variant/30 backdrop-blur-md shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span className="font-label-caps text-xs text-primary tracking-widest uppercase font-bold">
                  Pré-Produção Audiovisual
                </span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-surface-container-highest/60 font-label-code text-xs text-on-surface-variant border border-outline-variant/20">
                {projects.length} {projects.length === 1 ? "projeto ativo" : "projetos ativos"}
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 font-label-code text-xs text-secondary-fixed-dim bg-secondary-container/40 border border-secondary/30 px-2 py-0.5 rounded-full">
                <span className="material-symbols-outlined text-[14px]">bolt</span> Engine v2.4
              </span>
            </div>

            <h1 className="font-display-hero text-3xl sm:text-4xl lg:text-5xl font-bold text-on-surface tracking-tight mt-1">
              Projetos Cinematográficos
            </h1>
            <p className="font-body-lg text-sm sm:text-base text-on-surface-variant max-w-2xl">
              Gerencie contêineres de universo, consistência visual, personagens, cenas e prompts cinematográficos com IA generativa de alta fidelidade.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start lg:self-auto flex-wrap">
            <button
              onClick={() => setIsPresetsModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-surface-container-high/70 hover:bg-surface-container-highest border border-outline-variant/30 text-on-surface font-body-sm text-sm transition-all flex items-center gap-2 shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px] text-secondary">tune</span>
              <span>Presets Rápidos</span>
            </button>

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
              className="group relative px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-fixed text-on-primary font-headline-sm font-semibold transition-all duration-200 flex items-center gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/35"
            >
              <span className="material-symbols-outlined text-[20px] transition-transform group-hover:rotate-90 duration-300">add</span>
              <span>Novo Projeto</span>
              <span className="ml-1 px-1.5 py-0.5 rounded bg-on-primary/15 font-label-code text-[11px] text-on-primary">N</span>
            </button>
          </div>
        </div>

        {/* BANNER DE LIMITE DE PROJETOS ATINGIDO */}
        {usageSummary && usageSummary.maxProjects !== -1 && usageSummary.projectsCount >= usageSummary.maxProjects && (
          <div className="overflow-hidden rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-amber-950/25 to-surface-container-lowest p-5 shadow-xl shadow-amber-500/5 backdrop-blur-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-500/40 bg-amber-500/20 text-amber-400 shadow-inner">
                  <span className="material-symbols-outlined text-[24px]">warning</span>
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-amber-400/40 bg-amber-400/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                      {usageSummary.planName} • Limite Atingido
                    </span>
                    <span className="text-xs text-on-surface-variant">
                      {usageSummary.projectsCount} de {usageSummary.maxProjects} projetos em uso (100%)
                    </span>
                  </div>
                  <h3 className="mt-1 text-sm sm:text-base font-bold text-on-surface">
                    Limite de projetos atingido ({usageSummary.projectsCount}/{usageSummary.maxProjects})
                  </h3>
                  <p className="mt-0.5 text-xs text-on-surface-variant max-w-2xl leading-relaxed">
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
                      message: `Seu estúdio utilizou todos os ${usageSummary.projectsCount} de ${usageSummary.maxProjects} projetos do ${usageSummary.planName}.`,
                      planName: usageSummary.planName,
                      currentUsage: usageSummary.projectsCount,
                      maxLimit: usageSummary.maxProjects,
                    })
                  }
                  className="rounded-xl border border-outline-variant/30 px-3.5 py-2 text-xs font-medium text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition"
                >
                  Ver Benefícios
                </button>
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-300 px-4 py-2 text-xs font-bold text-black transition hover:opacity-90 shadow-lg shadow-amber-400/20 whitespace-nowrap"
                >
                  <span>Fazer Upgrade Agora</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* BARRA DE FILTROS, BUSCA E ATALHOS ⌘K */}
        <div className="p-2.5 sm:p-3 rounded-2xl bg-surface-container-low/70 border border-outline-variant/30 backdrop-blur-xl shadow-md flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Campo de Busca com Atalho ⌘K */}
          <div className="relative flex-1 group">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant group-focus-within:text-primary transition-colors">
              search
            </span>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Buscar por nome, tag, estilo ou sinopse..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-16 py-2 rounded-xl bg-surface-container-lowest/80 border border-outline-variant/30 text-on-surface placeholder:text-outline font-body-sm text-xs sm:text-sm focus:outline-none focus:border-primary transition-all"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
              <kbd className="px-1.5 py-0.5 rounded bg-surface-container-highest/70 font-label-code text-[11px] text-on-surface-variant border border-outline-variant/20">
                ⌘K
              </kbd>
            </div>
          </div>

          <div className="flex items-center flex-wrap sm:flex-nowrap gap-2 sm:gap-3">
            {/* Abas de Estado */}
            <div className="flex items-center p-1 rounded-xl bg-surface-container-lowest/70 border border-outline-variant/20" role="tablist">
              <button
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === "all"
                    ? "bg-surface-container-high text-primary shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Todos <span className="ml-1 opacity-70 font-label-code text-[10px]">{projects.length}</span>
              </button>
              <button
                onClick={() => setStatusFilter("active")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === "active"
                    ? "bg-surface-container-high text-primary shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Ativos{" "}
                <span className="ml-1 opacity-70 font-label-code text-[10px]">
                  {projects.filter((p) => !p.isArchived).length}
                </span>
              </button>
              <button
                onClick={() => setStatusFilter("archived")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === "archived"
                    ? "bg-surface-container-high text-amber-300 shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Arquivados{" "}
                <span className="ml-1 opacity-70 font-label-code text-[10px]">
                  {projects.filter((p) => p.isArchived).length}
                </span>
              </button>
            </div>

            <div className="h-5 w-[1px] bg-outline-variant/30 hidden sm:block" />

            {/* Ordenação */}
            <div className="relative">
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="px-3 py-2 rounded-xl bg-surface-container-lowest/70 border border-outline-variant/20 text-on-surface font-body-sm text-xs focus:outline-none focus:border-primary transition-all cursor-pointer"
              >
                <option value="updatedAt_desc">Mais recentes</option>
                <option value="updatedAt_asc">Mais antigos</option>
                <option value="title_asc">Alfabético (A-Z)</option>
                <option value="title_desc">Alfabético (Z-A)</option>
                <option value="createdAt_desc">Data de criação</option>
              </select>
            </div>

            {/* Alternância de Visualização */}
            <div className="flex items-center p-1 rounded-xl bg-surface-container-lowest/70 border border-outline-variant/20">
              <button
                onClick={() => setViewMode("cards")}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === "cards"
                    ? "bg-surface-container-high text-primary shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
                title="Visualização em Grade 16:9"
              >
                <span className="material-symbols-outlined text-[18px]">grid_view</span>
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === "table"
                    ? "bg-surface-container-high text-primary shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
                title="Visualização em Tabela Detalhada"
              >
                <span className="material-symbols-outlined text-[18px]">view_agenda</span>
              </button>
            </div>
          </div>
        </div>

        {/* CONTEÚDO PRINCIPAL (LOADING, ERRO, ESTADO VAZIO OU PROJETOS) */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-2xl bg-surface-container/40 border border-outline-variant/20 overflow-hidden flex flex-col justify-between"
              >
                <div className="aspect-[16/9] w-full bg-surface-container-lowest" />
                <div className="p-5 flex flex-col gap-3">
                  <div className="h-5 w-3/4 bg-surface-container-high rounded" />
                  <div className="h-3 w-full bg-surface-container-low rounded" />
                  <div className="h-10 w-full bg-surface-container-low rounded-xl mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-950/20 p-8 text-center">
            <span className="material-symbols-outlined text-red-400 text-4xl mb-2">error</span>
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={fetchProjects}
              className="mt-4 rounded-xl border border-outline-variant/30 px-4 py-2 text-xs text-on-surface hover:bg-surface-container transition"
            >
              Tentar novamente
            </button>
          </div>
        ) : projects.length === 0 ? (
          /* Estado Vazio */
          <div className="rounded-3xl border border-dashed border-outline-variant/30 bg-surface-container/20 p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-3xl">movie</span>
            </div>
            <h3 className="mt-5 text-xl font-bold text-on-surface">
              {search || statusFilter !== "active"
                ? "Nenhum projeto encontrado com estes filtros"
                : "Seu estúdio ainda não possui projetos"}
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-on-surface-variant">
              {search || statusFilter !== "active"
                ? "Tente ajustar o termo de busca ou redefinir os filtros de estado."
                : "Crie o seu primeiro projeto cinematográfico ou selecione um preset para estruturar personagens, consistência de iluminação, cenas e gerar prompts prontos para IA."}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              {search || statusFilter !== "active" ? (
                <button
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("active");
                  }}
                  className="rounded-xl border border-outline-variant/30 px-5 py-2.5 text-xs text-on-surface hover:bg-surface-container transition"
                >
                  Limpar filtros
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsPresetsModalOpen(true)}
                    className="rounded-xl border border-outline-variant/40 px-5 py-2.5 text-xs text-on-surface hover:bg-surface-container transition flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[16px] text-secondary">tune</span>
                    <span>Usar Preset</span>
                  </button>
                  <button
                    onClick={() => {
                      resetForm();
                      setIsCreateModalOpen(true);
                    }}
                    className="rounded-xl bg-primary px-6 py-2.5 font-semibold text-on-primary transition hover:bg-primary-fixed shadow-md shadow-primary/20"
                  >
                    Criar Primeiro Projeto
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : viewMode === "cards" ? (
          /* GRID DE CARDS CINEMATOGRÁFICOS 16:9 (REDESIGN COMPLETO) */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {projects.map((project) => {
              const visual = getGenreVisual(project.genre);
              const isStarred = starredProjectIds.has(project.id);

              return (
                <article
                  key={project.id}
                  className={`project-card group relative flex flex-col justify-between rounded-2xl bg-surface-container/60 hover:bg-surface-container/90 border transition-all duration-300 shadow-md hover:shadow-2xl hover:-translate-y-1 overflow-hidden ${
                    project.isArchived
                      ? "border-amber-500/30 opacity-75"
                      : "border-outline-variant/30 hover:border-primary/50"
                  }`}
                >
                  {/* Topo Widescreen 16:9 */}
                  <div
                    className={`relative w-full aspect-[16/9] overflow-hidden bg-gradient-to-br ${visual.gradient}`}
                    style={{ backgroundImage: visual.bgPattern }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-surface-container via-surface-container/20 to-transparent" />

                    {/* Tags do Topo */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded-md backdrop-blur-md font-label-caps text-[10px] font-bold tracking-wide uppercase shadow-sm ${visual.badge}`}>
                          {project.genre || "Cinema Geral"}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-surface-container-lowest/80 backdrop-blur-md font-label-code text-[10px] text-on-surface-variant">
                          {project.configuration?.aspectRatio || "16:9"}
                        </span>
                      </div>

                      <span className="px-2 py-0.5 rounded-md bg-surface-container-lowest/85 backdrop-blur-md font-label-code text-[10px] text-primary flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        {project.configuration?.targetPlatform || "Google Flow"}
                      </span>
                    </div>

                    {/* Duração Estimada Inferior */}
                    <div className="absolute bottom-3 right-3 pointer-events-none">
                      <span className="px-2 py-0.5 rounded-full bg-surface-container-lowest/90 font-label-code text-[11px] text-on-surface flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px] text-tertiary">timer</span>
                        {project.durationSeconds ? `${project.durationSeconds}s` : "30s est."}
                      </span>
                    </div>
                  </div>

                  {/* Corpo do Card */}
                  <div className="p-5 flex flex-col flex-1 justify-between gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <Link href={`/projects/${project.id}`} className="group-hover:text-primary transition-colors flex-1">
                          <h2 className="font-headline-md text-base sm:text-lg font-bold text-on-surface line-clamp-1">
                            {project.title}
                          </h2>
                        </Link>

                        {/* Botão de Estrela (Favorito) */}
                        <button
                          onClick={(e) => toggleStarProject(project.id, e)}
                          className="p-1 rounded text-on-surface-variant hover:text-primary transition-colors"
                          title={isStarred ? "Remover dos favoritos" : "Marcar como favorito"}
                        >
                          <span
                            className="material-symbols-outlined text-[18px]"
                            style={{
                              fontVariationSettings: isStarred ? "'FILL' 1" : "'FILL' 0",
                              color: isStarred ? "#4edea3" : undefined,
                            }}
                          >
                            star
                          </span>
                        </button>
                      </div>

                      <p className="font-body-sm text-xs text-on-surface-variant line-clamp-2 min-h-[32px]">
                        {project.description || "Nenhuma descrição fornecida para este projeto cinematográfico."}
                      </p>
                    </div>

                    {/* Box com os 4 Contadores de Módulos */}
                    <div className="grid grid-cols-4 gap-1 p-2 rounded-xl bg-surface-container-lowest/80 border border-outline-variant/20 text-center font-label-code text-xs">
                      <div className="flex flex-col py-1">
                        <span className="text-on-surface font-semibold text-sm">{project._count.characters}</span>
                        <span className="text-on-surface-variant text-[9px] uppercase">Persona</span>
                      </div>
                      <div className="flex flex-col py-1">
                        <span className="text-on-surface font-semibold text-sm">{project._count.environments}</span>
                        <span className="text-on-surface-variant text-[9px] uppercase">Ambiente</span>
                      </div>
                      <div className="flex flex-col py-1">
                        <span className="text-on-surface font-semibold text-sm">{project._count.scenes}</span>
                        <span className="text-on-surface-variant text-[9px] uppercase">Cena</span>
                      </div>
                      <div className="flex flex-col py-1">
                        <span className="text-primary font-bold text-sm">{project._count.parameterValues}</span>
                        <span className="text-on-surface-variant text-[9px] uppercase">Parâmetros</span>
                      </div>
                    </div>

                    {/* Rodapé do Card com Ações */}
                    <div className="flex flex-col gap-3 pt-1 border-t border-outline-variant/20">
                      <div className="flex items-center justify-between font-label-code text-[11px] text-on-surface-variant/70">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]">schedule</span>
                          {formatDate(project.updatedAt)}
                        </span>
                        <span className={project.isArchived ? "text-amber-400" : "text-primary"}>
                          {project.isArchived ? "Arquivado" : "Pronto para render"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <Link
                          href={`/projects/${project.id}`}
                          className="flex-1 py-2 px-3 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-on-primary font-headline-sm text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                        >
                          <span>Abrir Módulos</span>
                          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                        </Link>

                        <div className="flex items-center gap-1">
                          {/* Editar */}
                          <button
                            onClick={() => handleOpenEdit(project)}
                            title="Editar configurações"
                            className="p-2 rounded-xl bg-surface-container-high/60 hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>

                          {/* Duplicar */}
                          <button
                            onClick={() => handleDuplicate(project)}
                            disabled={duplicatingId === project.id}
                            title="Duplicar projeto"
                            className="p-2 rounded-xl bg-surface-container-high/60 hover:bg-surface-container-high text-on-surface-variant hover:text-primary transition-colors disabled:opacity-50"
                          >
                            {duplicatingId === project.id ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                            ) : (
                              <span className="material-symbols-outlined text-[16px]">content_copy</span>
                            )}
                          </button>

                          {/* Arquivar / Restaurar */}
                          <button
                            onClick={() => handleToggleArchive(project)}
                            title={project.isArchived ? "Restaurar projeto" : "Arquivar projeto"}
                            className="p-2 rounded-xl bg-surface-container-high/60 hover:bg-surface-container-high text-on-surface-variant hover:text-amber-400 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              {project.isArchived ? "unarchive" : "archive"}
                            </span>
                          </button>

                          {/* Transferir */}
                          <button
                            onClick={() => setProjectToTransfer(project)}
                            title="Transferir para outro Workspace"
                            className="p-2 rounded-xl bg-surface-container-high/60 hover:bg-surface-container-high text-on-surface-variant hover:text-secondary transition-colors"
                          >
                            <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
                          </button>

                          {/* Excluir */}
                          <button
                            onClick={() => setProjectToDelete(project)}
                            title="Excluir projeto"
                            className="p-2 rounded-xl bg-surface-container-high/60 hover:bg-surface-container-high text-on-surface-variant hover:text-error transition-colors"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          /* TABELA DETALHADA CINEMATOGRÁFICA */
          <div className="overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-low/70 backdrop-blur-xl shadow-md">
            <table className="w-full text-left text-sm text-on-surface">
              <thead className="border-b border-outline-variant/30 bg-surface-container-lowest/80 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                <tr>
                  <th className="px-6 py-4">Projeto</th>
                  <th className="px-4 py-4">Gênero</th>
                  <th className="px-4 py-4">Formato / IA</th>
                  <th className="px-4 py-4">Módulos</th>
                  <th className="px-4 py-4">Última Atualização</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20 font-body-sm text-xs">
                {projects.map((project) => (
                  <tr key={project.id} className="hover:bg-surface-container/60 transition">
                    <td className="px-6 py-4">
                      <Link href={`/projects/${project.id}`} className="font-semibold text-on-surface hover:text-primary flex items-center gap-2">
                        <span>{project.title}</span>
                        {project.isArchived && (
                          <span className="rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 text-[10px]">
                            Arquivado
                          </span>
                        )}
                      </Link>
                      <p className="text-xs text-on-surface-variant line-clamp-1 mt-0.5">{project.description}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className="px-2 py-0.5 rounded bg-surface-container-high border border-outline-variant/20 text-[11px]">
                        {project.genre || "Geral"}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-mono text-[11px] text-on-surface-variant">
                      {project.configuration?.aspectRatio || "16:9"} · {project.configuration?.targetPlatform || "Google Flow"}
                    </td>
                    <td className="px-4 py-4 font-label-code text-[11px]">
                      {project._count.characters}P · {project._count.environments}A · {project._count.scenes}C · {project._count.parameterValues}V
                    </td>
                    <td className="px-4 py-4 text-on-surface-variant text-[11px]">{formatDate(project.updatedAt)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/projects/${project.id}`}
                          className="rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-on-primary px-3 py-1 font-semibold text-xs transition"
                        >
                          Abrir
                        </Link>
                        <button
                          onClick={() => handleOpenEdit(project)}
                          className="p-1 rounded text-on-surface-variant hover:text-on-surface"
                          title="Editar"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                        <button
                          onClick={() => handleDuplicate(project)}
                          className="p-1 rounded text-on-surface-variant hover:text-primary"
                          title="Duplicar"
                        >
                          <span className="material-symbols-outlined text-[16px]">content_copy</span>
                        </button>
                        <button
                          onClick={() => handleToggleArchive(project)}
                          className="p-1 rounded text-on-surface-variant hover:text-amber-400"
                          title={project.isArchived ? "Restaurar" : "Arquivar"}
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            {project.isArchived ? "unarchive" : "archive"}
                          </span>
                        </button>
                        <button
                          onClick={() => setProjectToTransfer(project)}
                          className="p-1 rounded text-on-surface-variant hover:text-secondary"
                          title="Transferir Workspace"
                        >
                          <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
                        </button>
                        <button
                          onClick={() => setProjectToDelete(project)}
                          className="p-1 rounded text-on-surface-variant hover:text-error"
                          title="Excluir"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
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

      {/* MODAL DE PRESETS RÁPIDOS CINEMATOGRÁFICOS */}
      {isPresetsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-outline-variant/40 bg-surface-container-low p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-4">
              <div>
                <span className="text-xs uppercase tracking-wider text-primary font-label-code font-semibold">
                  Templates Pré-Configurados
                </span>
                <h2 className="mt-1 text-2xl font-bold font-headline-md text-on-surface">
                  Presets Rápidos de Produção
                </h2>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Escolha uma predefinição para preencher instantaneamente a direção de arte e parâmetros técnicos.
                </p>
              </div>
              <button
                onClick={() => setIsPresetsModalOpen(false)}
                className="rounded-xl p-2 text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {CINEMA_PRESETS.map((preset) => {
                const visual = getGenreVisual(preset.genre);
                return (
                  <div
                    key={preset.title}
                    onClick={() => handleApplyPreset(preset)}
                    className="p-5 rounded-2xl bg-surface-container/70 border border-outline-variant/30 hover:border-primary/50 hover:bg-surface-container transition-all cursor-pointer group shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase font-label-caps ${visual.badge}`}>
                          {preset.genre}
                        </span>
                        <span className="font-label-code text-[11px] text-on-surface-variant">
                          {preset.aspectRatio} • {preset.targetPlatform}
                        </span>
                      </div>
                      <h4 className="font-bold text-base text-on-surface group-hover:text-primary transition-colors">
                        {preset.title}
                      </h4>
                      <p className="mt-2 text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
                        {preset.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-outline-variant/20 flex items-center justify-between text-xs">
                      <span className="text-on-surface-variant/70 font-mono">{preset.durationSeconds}s • {preset.pacing}</span>
                      <span className="text-primary font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        Usar Preset →
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Criação / Edição de Projeto */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-[#12161f] p-6 shadow-2xl md:p-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-xs uppercase tracking-[0.2em] text-primary">
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
                  Nome do Projeto <span className="text-primary">*</span>
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
                <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-primary mb-3">
                  Configurações Técnicas de Destino
                </h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs text-white/60">Plataforma-Alvo de Geração</label>
                    <select
                      value={formData.targetPlatform}
                      onChange={(e) => setFormData({ ...formData, targetPlatform: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white focus:border-primary focus:outline-none"
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
                      className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white focus:border-primary focus:outline-none"
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
                      className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-white/60">Ritmo / Pacing</label>
                    <input
                      type="text"
                      placeholder="Ex: Contemplativo, Rápido com cortes secos..."
                      value={formData.pacing}
                      onChange={(e) => setFormData({ ...formData, pacing: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Parâmetros Cinematográficos Permitidos no Projeto */}
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                      <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-primary">
                        Parâmetros Permitidos no Projeto
                      </h4>
                      <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        {selectedParamKeys.size} de {studioParams.length} selecionados
                      </span>
                    </div>
                    <p className="text-[11px] text-white/50 mt-1">
                      Selecione quais parâmetros do estúdio poderão ser utilizados na criação de personagens, ambientes e cenas deste projeto.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setSelectedParamKeys(new Set(studioParams.map((p) => p.key)))}
                      className="rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-primary/20 transition"
                    >
                      Selecionar Todos
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedParamKeys(new Set())}
                      className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/60 hover:bg-white/10 hover:text-white transition"
                    >
                      Limpar
                    </button>
                  </div>
                </div>

                {/* Filtros de Parâmetros (Busca e Escopo) */}
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Buscar por nome ou chave de parâmetro..."
                      value={paramSearch}
                      onChange={(e) => setParamSearch(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-white placeholder-white/30 focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {[
                      { key: "ALL", label: "Todos" },
                      { key: "GLOBAL", label: "Globais" },
                      { key: "CHARACTER", label: "Personagem" },
                      { key: "ENVIRONMENT", label: "Ambiente" },
                      { key: "SCENE", label: "Cena" },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setParamScopeFilter(tab.key)}
                        className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold transition ${
                          paramScopeFilter === tab.key
                            ? "bg-primary text-primary-foreground shadow"
                            : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Grade de Parâmetros com Seleção por Checkbox */}
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {studioParams
                    .filter((param) => {
                      if (paramScopeFilter !== "ALL") {
                        const s = String(param.scope || "GLOBAL").toUpperCase();
                        if (paramScopeFilter === "CHARACTER" && s !== "CHARACTER" && s !== "PERSONAGEM") return false;
                        if (paramScopeFilter === "ENVIRONMENT" && s !== "ENVIRONMENT" && s !== "AMBIENTE") return false;
                        if (paramScopeFilter === "SCENE" && s !== "SCENE" && s !== "CENA") return false;
                        if (paramScopeFilter === "GLOBAL" && s !== "GLOBAL") return false;
                      }
                      if (paramSearch.trim()) {
                        const term = paramSearch.toLowerCase();
                        const matchLabel = String(param.label || "").toLowerCase().includes(term);
                        const matchKey = String(param.key || "").toLowerCase().includes(term);
                        const matchDesc = String(param.description || "").toLowerCase().includes(term);
                        if (!matchLabel && !matchKey && !matchDesc) return false;
                      }
                      return true;
                    })
                    .map((param) => {
                      const isSelected = selectedParamKeys.has(param.key);
                      const scope = String(param.scope || "GLOBAL").toUpperCase();
                      const scopeBadgeClass =
                        scope === "GLOBAL"
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                          : scope === "CHARACTER" || scope === "PERSONAGEM"
                          ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                          : scope === "ENVIRONMENT" || scope === "AMBIENTE"
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                          : scope === "SCENE" || scope === "CENA"
                          ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                          : "bg-slate-500/20 text-slate-300 border-slate-500/30";

                      const scopeLabel =
                        scope === "GLOBAL"
                          ? "Global"
                          : scope === "CHARACTER" || scope === "PERSONAGEM"
                          ? "Personagem"
                          : scope === "ENVIRONMENT" || scope === "AMBIENTE"
                          ? "Ambiente"
                          : scope === "SCENE" || scope === "CENA"
                          ? "Cena"
                          : scope;

                      return (
                        <div
                          key={param.id || param.key}
                          onClick={() => {
                            const next = new Set(selectedParamKeys);
                            if (isSelected) {
                              next.delete(param.key);
                            } else {
                              next.add(param.key);
                            }
                            setSelectedParamKeys(next);
                          }}
                          className={`flex items-start gap-3 rounded-xl border p-2.5 transition cursor-pointer select-none ${
                            isSelected
                              ? "border-primary/40 bg-primary/10 shadow-sm"
                              : "border-white/5 bg-black/40 hover:border-white/20 hover:bg-black/60"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // tratado no onClick do container
                            className="mt-0.5 h-4 w-4 rounded border-white/20 bg-black/60 text-primary accent-emerald-500 focus:ring-0 cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold text-white truncate">
                                {param.label}
                              </span>
                              <span
                                className={`rounded px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider border ${scopeBadgeClass}`}
                              >
                                {scopeLabel}
                              </span>
                              <span className="font-mono text-[10px] text-white/40">
                                {param.key}
                              </span>
                            </div>
                            {param.description && (
                              <p className="text-[10px] text-white/50 mt-0.5 line-clamp-1">
                                {param.description}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}

                  {studioParams.length === 0 && (
                    <p className="text-center text-xs text-white/40 py-3">
                      Nenhum parâmetro cadastrado no estúdio.
                    </p>
                  )}
                </div>
              </div>

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
                  className="rounded-xl bg-primary px-6 py-2.5 text-xs font-semibold text-on-primary transition hover:bg-primary-fixed disabled:opacity-50"
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
