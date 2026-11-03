"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { CharactersTab } from "@/components/characters/characters-tab";
import { EnvironmentsTab } from "@/components/environments/environments-tab";
import { ScenesTab } from "@/components/scenes/scenes-tab";
import { PromptsTab } from "@/components/prompts/prompts-tab";
import { ProjectParameterSettings } from "@/components/parameters/project-parameter-settings";
import { QuickCreationBar } from "@/components/studio/quick-creation-bar";
import { SpaceShareModal, SpaceVisibilityType } from "@/components/spaces/space-share-modal";

const SpaceBoardCanvas = dynamic(
  () => import("@/components/spaces/space-board-canvas").then((mod) => mod.SpaceBoardCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[75vh] w-full items-center justify-center rounded-2xl border border-white/10 bg-[#0c0f13]/80">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-xs text-white/50 font-label-code">Carregando Space Board...</span>
        </div>
      </div>
    ),
  }
);

interface SceneCharacterLink {
  character: {
    id: string;
    name: string;
  };
}

interface SceneEnvironmentLink {
  environment: {
    id: string;
    name: string;
  };
}

interface SceneItem {
  id: string;
  title: string;
  order: number;
  durationSeconds: number | null;
  description: string;
  characters: SceneCharacterLink[];
  environments: SceneEnvironmentLink[];
}

interface CharacterItem {
  id: string;
  name: string;
  description: string;
}

interface EnvironmentItem {
  id: string;
  name: string;
  description: string;
}

interface ProjectDetail {
  id: string;
  workspaceId: string;
  title: string;
  description: string;
  genre: string | null;
  language: string;
  durationSeconds: number | null;
  configuration: {
    aspectRatio?: string;
    targetPlatform?: string;
    colorGrade?: string;
    pacing?: string;
    soundDesign?: string;
    customNotes?: string;
  };
  visualBible?: any;
  visibility?: SpaceVisibilityType;
  isArchived: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    characters: number;
    environments: number;
    scenes: number;
    parameterValues: number;
    generations: number;
  };
  characters: CharacterItem[];
  environments: EnvironmentItem[];
  scenes: SceneItem[];
}

type TabType = "board" | "overview" | "characters" | "environments" | "scenes" | "parameters" | "prompts";

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
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
    fetch("/api/auth/me")
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0d12] text-white">
        <main className="w-full px-4 sm:px-6 lg:px-8 py-12">
          <div className="h-6 w-32 animate-pulse rounded bg-white/10" />
          <div className="mt-4 h-10 w-2/3 animate-pulse rounded bg-white/10" />
          <div className="mt-8 grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/5" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-[#0b0d12] text-white">
        <main className="w-full px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="rounded-3xl border border-red-500/20 bg-red-950/20 p-8">
            <h2 className="text-xl font-bold text-red-300">Não foi possível abrir o projeto</h2>
            <p className="mt-2 text-sm text-white/60">{error}</p>
            <Link
              href="/projects"
              className="mt-6 inline-block rounded-xl bg-white/10 px-6 py-2.5 text-xs font-semibold text-white hover:bg-white/20 transition"
            >
              ← Voltar para Todos os Projetos
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0d12] text-white">
      <main className={`w-full px-4 sm:px-6 lg:px-8 ${activeTab === "board" ? "pt-3 pb-6" : "pt-6 pb-28"}`}>
        {/* Barra Superior Compacta do Space (Estilo Magnific Spaces) */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5 text-xs">
            <Link
              href="/projects"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition"
              title="Voltar para todos os Spaces"
            >
              ‹
            </Link>
            <Link href="/projects" className="text-white/50 hover:text-primary transition font-medium">
              Spaces
            </Link>
            <span className="text-white/25">›</span>
            <span className="flex items-center gap-1.5 text-white font-bold truncate max-w-[240px] sm:max-w-md">
              <span>✨</span>
              <span className="truncate">{project.title}</span>
            </span>
            <span className="hidden md:inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/60">
              {project.visibility === "PRIVATE"
                ? "🔒 Privado"
                : project.visibility === "SELECTED"
                ? "🎯 Membros Selecionados"
                : "👥 Equipe"}
            </span>
          </div>

          {/* Seletor de Modo: Ordem exata solicitada (Personagens, Ambientes, Cenas, Prompts, Board Colaborativo, Detalhes + Parâmetros para Admins) */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.03] p-1 gap-1">
              {[
                { id: "characters", label: "👤 Personagens", count: project._count.characters },
                { id: "environments", label: "🏛️ Ambientes", count: project._count.environments },
                { id: "scenes", label: "🎬 Cenas", count: project._count.scenes },
                { id: "prompts", label: "📜 Prompts", count: project._count.generations },
                { id: "board", label: "✨ Board Colaborativo", count: null },
                { id: "overview", label: "📊 Detalhes", count: null },
                ...(isAdmin
                  ? [{ id: "parameters", label: "⚙️ Parâmetros", count: project._count.parameterValues }]
                  : []),
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition whitespace-nowrap ${
                      isActive
                        ? "bg-primary text-on-primary shadow-sm"
                        : "text-white/60 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span>{tab.label}</span>
                    {tab.count !== null && (
                      <span
                        className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                          isActive ? "bg-black/20 text-on-primary" : "bg-white/10 text-white/50"
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-black shadow-md transition hover:opacity-90 whitespace-nowrap"
            >
              <span>🔗</span>
              <span>Compartilhar</span>
            </button>
          </div>
        </div>

        {/* ABA PRINCIPAL: BOARD COLABORATIVO DO SPACE */}
        {activeTab === "board" && (
          <div className="mt-3">
            <SpaceBoardCanvas
              projectId={project.id}
              projectTitle={project.title}
              onSwitchToClassicStudio={() => setActiveTab("scenes")}
              onOpenShareModal={() => setIsShareModalOpen(true)}
            />
          </div>
        )}

        {/* Header Principal do Projeto (Exibido apenas nas abas do Estúdio Clássico) */}
        {activeTab !== "board" && (
        <div className="mt-4 flex flex-col justify-between gap-6 md:flex-row md:items-start border-b border-white/10 pb-6">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary border border-primary/20">
                {project.genre || "Gênero Geral"}
              </span>

              <span className="rounded-lg bg-white/5 px-2.5 py-1 text-xs font-mono text-white/60 border border-white/10">
                {project.configuration?.aspectRatio || "16:9"} · {project.configuration?.targetPlatform || "Google Flow"}
              </span>

              {project.isArchived ? (
                <span className="rounded-lg bg-amber-400/10 px-2.5 py-1 text-xs font-semibold text-amber-300 border border-amber-400/20">
                  Arquivado
                </span>
              ) : (
                <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs text-primary border border-primary/20">
                  Ativo em Produção
                </span>
              )}
            </div>

            <h1 className="text-2xl font-bold tracking-tight md:text-4xl text-white">
              {project.title}
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/65">
              {project.description || "Nenhuma descrição fornecida para este projeto."}
            </p>
          </div>

          {/* Botões de Ação do Header */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDuplicate}
              disabled={actionLoading}
              className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium text-white transition hover:bg-white/10 disabled:opacity-50"
            >
              Duplicar
            </button>

            <button
              onClick={handleToggleArchive}
              disabled={actionLoading}
              className={`rounded-xl border px-4 py-2 text-xs font-medium transition ${
                project.isArchived
                  ? "border-amber-400/30 bg-amber-400/10 text-amber-300 hover:bg-amber-400/20"
                  : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10"
              }`}
            >
              {project.isArchived ? "Restaurar" : "Arquivar"}
            </button>
          </div>
        </div>
        )}

        {/* Conteúdo da Aba: Visão Geral */}
        <div className={activeTab === "overview" ? "block" : "hidden"}>
          <div className="mt-8 space-y-8">
            {/* Grid de Estatísticas Rápidas */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div
                onClick={() => setActiveTab("characters")}
                className="cursor-pointer rounded-2xl border border-white/10 bg-white/[0.02] p-5 hover:border-primary/30 transition"
              >
                <div className="flex items-center justify-between text-white/50 text-xs">
                  <span>PERSONAGENS</span>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <p className="mt-3 text-3xl font-bold text-white">{project._count.characters}</p>
                <p className="mt-1 text-xs text-white/40">Consistência facial e figurinos</p>
              </div>

              <div
                onClick={() => setActiveTab("environments")}
                className="cursor-pointer rounded-2xl border border-white/10 bg-white/[0.02] p-5 hover:border-primary/30 transition"
              >
                <div className="flex items-center justify-between text-white/50 text-xs">
                  <span>AMBIENTES</span>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
                <p className="mt-3 text-3xl font-bold text-white">{project._count.environments}</p>
                <p className="mt-1 text-xs text-white/40">Cenários e iluminação</p>
              </div>

              <div
                onClick={() => setActiveTab("scenes")}
                className="cursor-pointer rounded-2xl border border-white/10 bg-white/[0.02] p-5 hover:border-primary/30 transition"
              >
                <div className="flex items-center justify-between text-white/50 text-xs">
                  <span>CENAS / TAKES</span>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="mt-3 text-3xl font-bold text-white">{project._count.scenes}</p>
                <p className="mt-1 text-xs text-white/40">Sequência cinematográfica</p>
              </div>

              <div
                onClick={() => setActiveTab("prompts")}
                className="cursor-pointer rounded-2xl border border-white/10 bg-white/[0.02] p-5 hover:border-primary/30 transition"
              >
                <div className="flex items-center justify-between text-white/50 text-xs">
                  <span>PROMPTS GERADOS</span>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <p className="mt-3 text-3xl font-bold text-primary">{project._count.generations}</p>
                <p className="mt-1 text-xs text-white/40">Versões estruturadas em JSON</p>
              </div>
            </div>

            {/* Ficha Técnica Cinematográfica */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
              <h3 className="text-base font-bold text-white">Especificações Cinematográficas da Produção</h3>
              <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Plataforma-Alvo</span>
                  <p className="mt-1.5 text-sm font-semibold text-primary">
                    {project.configuration?.targetPlatform || "Google Flow"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Proporção (Aspect Ratio)</span>
                  <p className="mt-1.5 text-sm font-semibold text-white">
                    {project.configuration?.aspectRatio || "16:9"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Color Grading</span>
                  <p className="mt-1.5 text-sm font-semibold text-white">
                    {project.configuration?.colorGrade || "Não especificado"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Ritmo / Pacing</span>
                  <p className="mt-1.5 text-sm font-semibold text-white">
                    {project.configuration?.pacing || "Moderado"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Idioma</span>
                  <p className="mt-1.5 text-sm font-semibold text-white">{project.language}</p>
                </div>

                <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Duração Alvo</span>
                  <p className="mt-1.5 text-sm font-semibold text-white">
                    {project.durationSeconds ? `${project.durationSeconds} segundos` : "Livre"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Criado em</span>
                  <p className="mt-1.5 text-xs text-white/70">{formatDate(project.createdAt)}</p>
                </div>

                <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Última Atualização</span>
                  <p className="mt-1.5 text-xs text-white/70">{formatDate(project.updatedAt)}</p>
                </div>
              </div>
            </div>

            {/* Bíblia Visual & Direção de Arte Estética (GEN_VISUAL_BIBLE) */}
            {(() => {
              const charCount = project._count?.characters ?? project.characters?.length ?? 0;
              const envCount = project._count?.environments ?? project.environments?.length ?? 0;
              const hasValidTitle = Boolean(project.title && project.title.trim().length >= 3);
              const hasValidDesc = Boolean(project.description && project.description.trim().length >= 10);
              const hasValidGenre = Boolean(project.genre && project.genre.trim().length > 0);
              const hasValidChars = charCount >= 1;
              const hasValidEnvs = envCount >= 1;
              const isVbReady = hasValidTitle && hasValidDesc && hasValidGenre && hasValidChars && hasValidEnvs;

              return (
                <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-primary text-base">✨</span>
                        <h3 className="text-base font-bold text-white">
                          Bíblia Visual & Direção de Arte Estética
                        </h3>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                            isVbReady
                              ? "bg-primary/20 text-primary border-primary/30"
                              : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                          }`}
                        >
                          {isVbReady ? "✓ Pronta para Compilação" : "Pré-requisitos Pendentes"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-white/50">
                        Guia mestre de fotografia, paleta cromática, enquadramento e textura cinematográfica.
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        if (!isVbReady) return;
                        setVbModalOpen(true);
                      }}
                      disabled={!isVbReady}
                      className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition shadow-sm self-start md:self-auto ${
                        isVbReady
                          ? "border border-primary/40 bg-primary/20 text-primary hover:bg-primary/30 cursor-pointer"
                          : "border border-white/10 bg-white/5 text-white/40 cursor-not-allowed"
                      }`}
                      title={
                        isVbReady
                          ? "Compilar Bíblia Visual com IA"
                          : "Preencha todos os pré-requisitos essenciais abaixo para liberar a geração"
                      }
                    >
                      <span>{isVbReady ? "✨" : "🔒"}</span>
                      {project.visualBible ? "Atualizar com IA" : "Gerar Bíblia Visual com IA"}
                    </button>
                  </div>

                  {/* Checklist de Pré-requisitos Obrigatórios */}
                  <div
                    className={`mt-5 rounded-2xl border p-4 transition ${
                      isVbReady
                        ? "border-primary/20 bg-primary/5"
                        : "border-amber-500/20 bg-amber-500/5"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3 mb-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            isVbReady ? "bg-primary" : "bg-amber-400 animate-pulse"
                          }`}
                        />
                        <span className="text-xs font-bold uppercase tracking-wider text-white">
                          Checklist de Prontidão da Bíblia Visual
                        </span>
                      </div>
                      <span className="text-[11px] text-white/50">
                        {isVbReady
                          ? "Todos os dados essenciais preenchidos. Pronto para compilação."
                          : "Complete os itens pendentes abaixo para liberar a compilação por IA:"}
                      </span>
                    </div>

                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {/* Requisito 1: Título e Sinopse */}
                      <div
                        className={`flex items-center justify-between rounded-xl border p-2.5 text-xs ${
                          hasValidDesc
                            ? "border-primary/30 bg-primary/10 text-primary"
                            : "border-amber-500/30 bg-amber-500/10 text-amber-200"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{hasValidDesc ? "✓" : "○"}</span>
                          <div>
                            <div className="font-semibold text-white">Premissa Dramática / Sinopse</div>
                            <div className="text-[10px] text-white/60">
                              {hasValidDesc
                                ? `${project.description?.slice(0, 35)}...`
                                : "Mínimo de 10 caracteres"}
                            </div>
                          </div>
                        </div>
                        {!hasValidDesc && (
                          <button
                            type="button"
                            onClick={handleOpenEditProject}
                            className="rounded-lg bg-amber-400/20 px-2 py-1 text-[10px] font-bold text-amber-300 hover:bg-amber-400/30 transition cursor-pointer"
                          >
                            Preencher
                          </button>
                        )}
                      </div>

                      {/* Requisito 2: Gênero Cinematográfico */}
                      <div
                        className={`flex items-center justify-between rounded-xl border p-2.5 text-xs ${
                          hasValidGenre
                            ? "border-primary/30 bg-primary/10 text-primary"
                            : "border-amber-500/30 bg-amber-500/10 text-amber-200"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{hasValidGenre ? "✓" : "○"}</span>
                          <div>
                            <div className="font-semibold text-white">Gênero Cinematográfico</div>
                            <div className="text-[10px] text-white/60">
                              {hasValidGenre ? project.genre : "Não definido"}
                            </div>
                          </div>
                        </div>
                        {!hasValidGenre && (
                          <button
                            type="button"
                            onClick={handleOpenEditProject}
                            className="rounded-lg bg-amber-400/20 px-2 py-1 text-[10px] font-bold text-amber-300 hover:bg-amber-400/30 transition cursor-pointer"
                          >
                            Definir
                          </button>
                        )}
                      </div>

                      {/* Requisito 3: Ao menos 1 Personagem */}
                      <div
                        className={`flex items-center justify-between rounded-xl border p-2.5 text-xs ${
                          hasValidChars
                            ? "border-primary/30 bg-primary/10 text-primary"
                            : "border-amber-500/30 bg-amber-500/10 text-amber-200"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{hasValidChars ? "✓" : "○"}</span>
                          <div>
                            <div className="font-semibold text-white">Personagens Registrados</div>
                            <div className="text-[10px] text-white/60">
                              {hasValidChars ? `${charCount} personagem(ns) ativo(s)` : "Cadastre ao menos 1"}
                            </div>
                          </div>
                        </div>
                        {!hasValidChars && (
                          <button
                            type="button"
                            onClick={() => {
                              setVisitedTabs((prev) => ({ ...prev, characters: true }));
                              setActiveTab("characters");
                            }}
                            className="rounded-lg bg-amber-400/20 px-2 py-1 text-[10px] font-bold text-amber-300 hover:bg-amber-400/30 transition cursor-pointer"
                          >
                            Criar Personagem
                          </button>
                        )}
                      </div>

                      {/* Requisito 4: Ao menos 1 Ambiente */}
                      <div
                        className={`flex items-center justify-between rounded-xl border p-2.5 text-xs ${
                          hasValidEnvs
                            ? "border-primary/30 bg-primary/10 text-primary"
                            : "border-amber-500/30 bg-amber-500/10 text-amber-200"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{hasValidEnvs ? "✓" : "○"}</span>
                          <div>
                            <div className="font-semibold text-white">Locações / Ambientes</div>
                            <div className="text-[10px] text-white/60">
                              {hasValidEnvs ? `${envCount} ambiente(s) ativo(s)` : "Cadastre ao menos 1"}
                            </div>
                          </div>
                        </div>
                        {!hasValidEnvs && (
                          <button
                            type="button"
                            onClick={() => {
                              setVisitedTabs((prev) => ({ ...prev, environments: true }));
                              setActiveTab("environments");
                            }}
                            className="rounded-lg bg-amber-400/20 px-2 py-1 text-[10px] font-bold text-amber-300 hover:bg-amber-400/30 transition cursor-pointer"
                          >
                            Criar Ambiente
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {project.visualBible ? (
                    <div className="mt-6 space-y-6">
                      {/* Conceito de Direção de Arte */}
                      <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                          Conceito de Direção de Arte
                        </span>
                        <p className="mt-2 text-xs text-white/80 leading-relaxed">
                          {project.visualBible.artDirectionConcept}
                        </p>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-3">
                        {/* Paleta de Cores */}
                        <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                            Paleta Cromática
                          </span>
                          <div className="mt-3 space-y-1.5 text-xs">
                            <div className="text-white/80">
                              <span className="text-white/40">Dominante:</span>{" "}
                              {project.visualBible.colorPalette?.dominant}
                            </div>
                            <div className="text-white/80">
                              <span className="text-white/40">Secundária:</span>{" "}
                              {project.visualBible.colorPalette?.secondary}
                            </div>
                            <div className="text-white/80">
                              <span className="text-white/40">Destaque:</span>{" "}
                              {project.visualBible.colorPalette?.accent}
                            </div>
                            <p className="mt-2 text-[11px] text-white/50">
                              {project.visualBible.colorPalette?.gradingNotes}
                            </p>
                          </div>
                        </div>

                        {/* Cinematografia & Lentes */}
                        <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                            Câmeras & Lentes
                          </span>
                          <div className="mt-3 space-y-1.5 text-xs text-white/80">
                            <div>
                              <span className="text-white/40">Lentes:</span>{" "}
                              {project.visualBible.cinematography?.recommendedLenses}
                            </div>
                            <div>
                              <span className="text-white/40">Movimento:</span>{" "}
                              {project.visualBible.cinematography?.cameraMovementStyle}
                            </div>
                            <div>
                              <span className="text-white/40">Textura:</span>{" "}
                              {project.visualBible.cinematography?.grainAndTexture}
                            </div>
                          </div>
                        </div>

                        {/* Filosofia de Iluminação */}
                        <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                            Iluminação & Contraste
                          </span>
                          <div className="mt-3 space-y-1.5 text-xs text-white/80">
                            <div>
                              <span className="text-white/40">Ratio:</span>{" "}
                              {project.visualBible.lightingPhilosophy?.contrastRatio}
                            </div>
                            <div>
                              <span className="text-white/40">Luz Principal:</span>{" "}
                              {project.visualBible.lightingPhilosophy?.keyLightStyle}
                            </div>
                            <div>
                              <span className="text-white/40">Sombras:</span>{" "}
                              {project.visualBible.lightingPhilosophy?.shadowTreatment}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Diretrizes Visuais */}
                      {project.visualBible.visualDirectives?.length > 0 && (
                        <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                            Diretrizes Estéticas Oficiais
                          </span>
                          <ul className="mt-2 space-y-1 text-xs text-white/70 list-disc list-inside">
                            {project.visualBible.visualDirectives.map((d: string, idx: number) => (
                              <li key={idx}>{d}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-white/[0.01] p-8 text-center">
                      <p className="text-xs text-white/50">
                        {isVbReady
                          ? "Todos os pré-requisitos estão atendidos! Clique em 'Gerar Bíblia Visual com IA' para direcionar a estética cinematográfica de toda a produção."
                          : "Preencha a premissa, gênero, ao menos 1 personagem e 1 ambiente para desbloquear a Bíblia Visual."}
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Conteúdo das Abas dos Módulos Internos com Cache em Memória */}
        {visitedTabs["characters"] && (
          <div className={activeTab === "characters" ? "block" : "hidden"}>
            <CharactersTab
              key={`char-${refreshKey}`}
              projectId={project.id}
              onStatsUpdate={() => {
                loadProject(true);
                window.dispatchEvent(new CustomEvent("tomadix:entities-updated", { detail: { projectId: project.id } }));
              }}
            />
          </div>
        )}

        {visitedTabs["environments"] && (
          <div className={activeTab === "environments" ? "block" : "hidden"}>
            <EnvironmentsTab
              key={`env-${refreshKey}`}
              projectId={project.id}
              onStatsUpdate={() => {
                loadProject(true);
                window.dispatchEvent(new CustomEvent("tomadix:entities-updated", { detail: { projectId: project.id } }));
              }}
            />
          </div>
        )}

        {visitedTabs["scenes"] && (
          <div className={activeTab === "scenes" ? "block" : "hidden"}>
            <ScenesTab
              key={`scene-${refreshKey}`}
              projectId={project.id}
              onStatsUpdate={() => {
                loadProject(true);
                window.dispatchEvent(new CustomEvent("tomadix:entities-updated", { detail: { projectId: project.id } }));
              }}
              onOpenPromptEngine={() => setActiveTab("prompts")}
            />
          </div>
        )}

        {visitedTabs["parameters"] && isAdmin && (
          <div className={activeTab === "parameters" ? "block" : "hidden"}>
            <ProjectParameterSettings projectId={project.id} />
          </div>
        )}

        {visitedTabs["prompts"] && (
          <div className={activeTab === "prompts" ? "block" : "hidden"}>
            <PromptsTab key={`prompt-${refreshKey}`} projectId={project.id} onStatsUpdate={() => loadProject(true)} />
          </div>
        )}

        {/* MODAL: Geração de Bíblia Visual com IA (GEN_VISUAL_BIBLE) */}
        {vbModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-[#0f1218] p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span className="text-primary">✨</span> Compilar Bíblia Visual com IA
                  </h3>
                  <p className="mt-1 text-xs text-white/50">
                    Defina diretrizes fotográficas e direção de arte para orientar todas as gerações.
                  </p>
                </div>
                <button
                  onClick={() => setVbModalOpen(false)}
                  className="rounded-xl p-1.5 text-white/50 hover:bg-white/10 hover:text-white transition"
                >
                  ✕
                </button>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1.5">
                    Referência Cinematográfica / Diretor de Fotografia (Opcional)
                  </label>
                  <input
                    type="text"
                    value={vbReference}
                    onChange={(e) => setVbReference(e.target.value)}
                    placeholder="Ex: Roger Deakins (Blade Runner 2049), Gordon Willis, Hoyte van Hoytema..."
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/30 focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1.5">
                    Diretivas Adicionais de Arte (Opcional)
                  </label>
                  <textarea
                    value={vbDirectives}
                    onChange={(e) => setVbDirectives(e.target.value)}
                    placeholder="Ex: Paleta fria de azul e âmbar, luz difusa em névoa, granulação de filme 35mm marcante..."
                    rows={3}
                    className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white placeholder-white/30 focus:border-primary focus:outline-none resize-none"
                  />
                </div>

                {vbError && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                    {vbError}
                  </div>
                )}
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                <span className="text-xs text-white/50 flex items-center gap-1.5">
                  <span className="text-amber-400 font-bold flex items-center gap-1">
                    <span>🪙</span> 10 créditos
                  </span>
                  <span>• Tabela de créditos</span>
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setVbModalOpen(false)}
                    className="rounded-xl px-4 py-2 text-xs font-medium text-white/70 hover:bg-white/10 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitVisualBible}
                    disabled={vbLoading}
                    className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-on-primary shadow-lg hover:opacity-90 disabled:opacity-50 transition"
                  >
                    {vbLoading ? "Compilando Bíblia..." : "Compilar com IA"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Edição Rápida do Projeto (Para preencher pré-requisitos) */}
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#0d111c] p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white">Editar Dados Essenciais do Projeto</h3>
                  <p className="text-xs text-white/50 mt-0.5">
                    Atualize os metadados cinematográficos para enriquecer o contexto e a Bíblia Visual.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveProjectEdit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1">
                    Nome / Título do Projeto *
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.title}
                    onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs text-white focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1">
                    Sinopse / Premissa Dramática * (Mínimo de 10 caracteres)
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={editFormData.description}
                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                    placeholder="Descreva o enredo central, tema dramático, tom narrativo e atmosfera pretendida..."
                    className="w-full rounded-xl border border-white/10 bg-black/60 p-3 text-xs text-white focus:border-primary focus:outline-none resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-white/80 mb-1">
                      Gênero Cinematográfico *
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.genre}
                      onChange={(e) => setEditFormData({ ...editFormData, genre: e.target.value })}
                      placeholder="Ex: Sci-Fi, Cyberpunk, Noir, Drama..."
                      className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs text-white focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white/80 mb-1">
                      Proporção de Tela (Aspect Ratio)
                    </label>
                    <select
                      value={editFormData.aspectRatio}
                      onChange={(e) => setEditFormData({ ...editFormData, aspectRatio: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs text-white focus:border-primary focus:outline-none cursor-pointer"
                    >
                      <option value="16:9">16:9 (Widescreen Padrão)</option>
                      <option value="9:16">9:16 (Vertical / Reels / TikTok)</option>
                      <option value="2.39:1">2.39:1 (Cinemascope Anamórfico)</option>
                      <option value="4:3">4:3 (Academia / Retrô)</option>
                      <option value="1:1">1:1 (Quadrado)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1">
                    Color Grading / Tratamento Cromático (Opcional)
                  </label>
                  <input
                    type="text"
                    value={editFormData.colorGrade}
                    onChange={(e) => setEditFormData({ ...editFormData, colorGrade: e.target.value })}
                    placeholder="Ex: Teal and Orange, Bleach Bypass, Monocromático de alto contraste..."
                    className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs text-white focus:border-primary focus:outline-none"
                  />
                </div>

                {editError && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                    {editError}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="rounded-xl px-4 py-2 text-xs font-medium text-white/60 hover:bg-white/10 hover:text-white transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={editSaving}
                    className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-on-primary hover:opacity-90 disabled:opacity-50 transition cursor-pointer"
                  >
                    {editSaving ? "Salvando..." : "Salvar Alterações"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>

      {/* Modal de Compartilhamento do Space */}
      <SpaceShareModal
        projectId={project.id}
        projectTitle={project.title}
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        onUpdated={() => loadProject(true)}
      />

      {/* Barra de Criação Rápida no contexto deste projeto (exibida nas abas clássicas) */}
      {activeTab !== "board" && (
        <QuickCreationBar
          currentProjectId={project.id}
          currentProjectTitle={project.title}
          onItemCreated={handleQuickItemCreated}
        />
      )}
    </div>
  );
}



