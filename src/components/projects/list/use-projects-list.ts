"use client";

import { cachedFetch } from "@/lib/client-fetch-cache";
import { useEffect, useState, useCallback, useRef } from "react";
import type { SpaceVisibilityType } from "@/components/spaces/space-share-modal";
import type { UsageSummary, Project } from "./types";
import { CINEMA_PRESETS } from "./helpers";

export function useProjectsListTab() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros e ordenação
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "archived" | "all">("active");
  const [boardFilter, setBoardFilter] = useState<"all" | "mine" | "shared">("all");
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
  const [projectToShare, setProjectToShare] = useState<Project | null>(null);
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
    visibility: "TEAM" as SpaceVisibilityType,
    aspectRatio: "16:9",
    targetPlatform: "Google Flow",
    colorGrade: "",
    pacing: "",
    filmGrain: 25,
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
      const res = await cachedFetch("/api/billing/subscription", 5_000);
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

  // Carregar projetos (Spaces)
  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      params.append("status", statusFilter);
      if (boardFilter !== "all") params.append("boardFilter", boardFilter);
      params.append("sort", sortOrder);

      const res = await fetch(`/api/projects?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Não foi possível carregar os Spaces.");
      }
      const data = await res.json();
      setProjects(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido.");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, boardFilter, sortOrder]);

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
      visibility: "TEAM",
      aspectRatio: preset.aspectRatio,
      targetPlatform: preset.targetPlatform,
      colorGrade: preset.colorGrade,
      pacing: preset.pacing,
      filmGrain: (preset as any).filmGrain ?? 25,
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
      visibility: "TEAM",
      aspectRatio: "16:9",
      targetPlatform: "Google Flow",
      colorGrade: "",
      pacing: "",
      filmGrain: 25,
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
      visibility: project.visibility || "TEAM",
      aspectRatio: project.configuration?.aspectRatio || "16:9",
      targetPlatform: project.configuration?.targetPlatform || "Google Flow",
      colorGrade: project.configuration?.colorGrade || "",
      pacing: project.configuration?.pacing || "",
      filmGrain: project.configuration?.filmGrain !== undefined ? Number(project.configuration.filmGrain) : 25,
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
        visibility: formData.visibility,
        configuration: {
          aspectRatio: formData.aspectRatio,
          targetPlatform: formData.targetPlatform,
          colorGrade: formData.colorGrade.trim() || undefined,
          pacing: formData.pacing.trim() || undefined,
          filmGrain: Number(formData.filmGrain) ?? 25,
          parameterSettings: {
            enabledParameterKeys: Array.from(selectedParamKeys),
            values: {
              nivel_granulacao_pelicula: Number(formData.filmGrain) ?? 25,
            },
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


  return {
    projects,
    setIsCreateModalOpen,
    setIsPresetsModalOpen,
    usageSummary,
    setPlanLimitModal,
    resetForm,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    boardFilter,
    setBoardFilter,
    sortOrder,
    setSortOrder,
    viewMode,
    setViewMode,
    searchInputRef,
    loading,
    error,
    starredProjectIds,
    setProjectToDelete,
    setProjectToTransfer,
    setProjectToShare,
    duplicatingId,
    fetchProjects,
    toggleStarProject,
    handleOpenEdit,
    handleDuplicate,
    handleToggleArchive,
    formatDate,
    handleApplyPreset,
    editingProject,
    formSubmitError,
    setFormSubmitError,
    formData,
    setFormData,
    formErrors,
    submitting,
    studioParams,
    selectedParamKeys,
    setSelectedParamKeys,
    paramSearch,
    setParamSearch,
    paramScopeFilter,
    setParamScopeFilter,
    handleSubmitForm,
    projectToDelete,
    handleConfirmDelete,
    projectToTransfer,
    projectToShare,
    planLimitModal,
    toastMessage,
    setToastMessage,
    showToast,
    loadUsage,
    isPresetsModalOpen,
    isCreateModalOpen,
  };
}

export type ProjectsListTabState = ReturnType<typeof useProjectsListTab>;
