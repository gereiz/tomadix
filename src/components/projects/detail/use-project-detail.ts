"use client";

import { cachedFetch } from "@/lib/client-fetch-cache";
import { useEffect, useState, useCallback, use, useRef } from "react";
import { useRouter } from "next/navigation";
import type { ProjectDetail, TabType } from "./types";

export function useProjectDetailTab({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("board");
  const [visitedTabs, setVisitedTabs] = useState<Record<string, boolean>>({ board: true, overview: true });
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  // Projeto sem nada criado e sem ?tab= explícito abre em "Prompts" (primeiro passo), uma única vez
  const initialTabResolved = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const tabParam = sp.get("tab") as TabType | null;
      if (tabParam) {
        setActiveTab(tabParam);
        setVisitedTabs((prev) => ({ ...prev, [tabParam]: true }));
      }
    }
  }, []);

  useEffect(() => {
    cachedFetch("/api/auth/me", 10_000)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.authenticated && data.user) {
          // Apenas administradores da plataforma visualizam a aba técnica de Parâmetros
          const isPlatform = Boolean(data.user.isPlatformAdmin);
          setIsAdmin(isPlatform);
        }
      })
      .catch(() => {});
  }, []);

  // Modal de Bíblia Visual com IA (GEN_VISUAL_BIBLE)
  const [vbModalOpen, setVbModalOpen] = useState(false);
  const [vbReference, setVbReference] = useState("");
  const [vbDirectives, setVbDirectives] = useState("");
  const [vbLoading, setVbLoading] = useState(false);
  const [vbError, setVbError] = useState<string | null>(null);

  // Modal de Edição Rápida do Projeto (para preencher pré-requisitos)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    title: "",
    description: "",
    genre: "",
    aspectRatio: "16:9",
    colorGrade: "",
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const handleOpenEditProject = () => {
    if (!project) return;
    setEditFormData({
      title: project.title || "",
      description: project.description || "",
      genre: project.genre || "Ficção Científica",
      aspectRatio: project.configuration?.aspectRatio || "16:9",
      colorGrade: project.configuration?.colorGrade || "",
    });
    setEditError(null);
    setIsEditModalOpen(true);
  };

  const handleSaveProjectEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;
    try {
      setEditSaving(true);
      setEditError(null);
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editFormData.title.trim(),
          description: editFormData.description.trim(),
          genre: editFormData.genre.trim(),
          configuration: {
            ...(project.configuration || {}),
            aspectRatio: editFormData.aspectRatio,
            colorGrade: editFormData.colorGrade.trim() || undefined,
          },
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Erro ao atualizar dados do projeto.");
      }
      setIsEditModalOpen(false);
      await loadProject(true);
    } catch (err: any) {
      setEditError(err.message || "Erro ao salvar alterações.");
    } finally {
      setEditSaving(false);
    }
  };

  const handleSubmitVisualBible = async () => {
    try {
      setVbLoading(true);
      setVbError(null);
      const res = await fetch(`/api/projects/${resolvedParams.id}/visual-bible/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cinematographerReference: vbReference,
          artDirectives: vbDirectives,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao gerar Bíblia Visual.");

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("tomadix:credits-updated", { detail: { newBalance: data.newBalance } }));
      }
      setVbModalOpen(false);
      await loadProject(true);
    } catch (err: any) {
      setVbError(err.message || "Erro ao gerar Bíblia Visual.");
    } finally {
      setVbLoading(false);
    }
  };

  useEffect(() => {
    setVisitedTabs((prev) => ({ ...prev, [activeTab]: true }));
  }, [activeTab]);

  // Carregar dados do projeto
  const loadProject = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const res = await fetch(`/api/projects/${resolvedParams.id}`);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("Projeto não encontrado ou você não tem permissão para acessá-lo.");
        }
        throw new Error("Erro ao carregar os dados do projeto.");
      }
      const data = await res.json();
      setProject(data.data);
      if (!initialTabResolved.current) {
        initialTabResolved.current = true;
        const hasTabParam = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("tab");
        const counts = data.data?._count;
        const isEmpty =
          counts && counts.characters === 0 && counts.environments === 0 && counts.scenes === 0 && counts.generations === 0;
        if (!hasTabParam && isEmpty) {
          setActiveTab("prompts");
          setVisitedTabs((prev) => ({ ...prev, prompts: true }));
        }
      }
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : "Erro inesperado.");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [resolvedParams.id]);

  const handleQuickItemCreated = useCallback(
    (createdItem?: any) => {
      loadProject(true);
      setRefreshKey((prev) => prev + 1);
      window.dispatchEvent(new CustomEvent("tomadix:entities-updated", { detail: { projectId: resolvedParams.id } }));
      if (createdItem?.type === "CHARACTER") {
        setVisitedTabs((prev) => ({ ...prev, characters: true }));
        setActiveTab("characters");
      } else if (createdItem?.type === "ENVIRONMENT") {
        setVisitedTabs((prev) => ({ ...prev, environments: true }));
        setActiveTab("environments");
      } else if (createdItem?.type === "SCENE") {
        setVisitedTabs((prev) => ({ ...prev, scenes: true }));
        setActiveTab("scenes");
      } else if (createdItem?.type === "PROMPT") {
        setVisitedTabs((prev) => ({ ...prev, prompts: true }));
        setActiveTab("prompts");
      }
    },
    [loadProject, resolvedParams.id]
  );

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  // Duplicar projeto
  const handleDuplicate = async () => {
    if (!project) return;
    try {
      setActionLoading(true);
      const res = await fetch(`/api/projects/${project.id}/duplicate`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Falha ao duplicar o projeto.");
      const data = await res.json();
      router.push(`/projects/${data.data.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao duplicar.");
    } finally {
      setActionLoading(false);
    }
  };

  // Arquivar / Restaurar
  const handleToggleArchive = async () => {
    if (!project) return;
    try {
      setActionLoading(true);
      const endpoint = project.isArchived
        ? `/api/projects/${project.id}/restore`
        : `/api/projects/${project.id}/archive`;
      const res = await fetch(endpoint, { method: "POST" });
      if (!res.ok) throw new Error("Falha ao alterar estado do projeto.");
      loadProject();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao alterar estado.");
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateString));
  };




  return {
    project,
    activeTab,
    setActiveTab,
    setIsShareModalOpen,
    isAdmin,
    actionLoading,
    handleDuplicate,
    handleToggleArchive,
    setVisitedTabs,
    setVbModalOpen,
    handleOpenEditProject,
    formatDate,
    vbModalOpen,
    vbReference,
    setVbReference,
    vbDirectives,
    setVbDirectives,
    vbLoading,
    vbError,
    handleSubmitVisualBible,
    isEditModalOpen,
    setIsEditModalOpen,
    editFormData,
    setEditFormData,
    editSaving,
    editError,
    handleSaveProjectEdit,
    loading,
    error,
    visitedTabs,
    refreshKey,
    isShareModalOpen,
    loadProject,
    handleQuickItemCreated,
  };
}

export type ProjectDetailTabState = ReturnType<typeof useProjectDetailTab>;
