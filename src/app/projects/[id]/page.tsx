"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CharactersTab } from "@/components/characters/characters-tab";
import { EnvironmentsTab } from "@/components/environments/environments-tab";
import { ScenesTab } from "@/components/scenes/scenes-tab";
import { PromptsTab } from "@/components/prompts/prompts-tab";
import { ProjectParameterSettings } from "@/components/parameters/project-parameter-settings";
import { QuickCreationBar } from "@/components/studio/quick-creation-bar";

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

type TabType = "overview" | "characters" | "environments" | "scenes" | "parameters" | "prompts";

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [visitedTabs, setVisitedTabs] = useState<Record<string, boolean>>({ overview: true });
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Modal de Bíblia Visual com IA (GEN_VISUAL_BIBLE)
  const [vbModalOpen, setVbModalOpen] = useState(false);
  const [vbReference, setVbReference] = useState("");
  const [vbDirectives, setVbDirectives] = useState("");
  const [vbLoading, setVbLoading] = useState(false);
  const [vbError, setVbError] = useState<string | null>(null);

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
      <main className="w-full px-4 sm:px-6 lg:px-8 pt-8 pb-28">
        {/* Navegação Breadcrumb & Voltar */}
        <div className="flex items-center gap-2 text-xs text-white/50">
          <Link href="/projects" className="hover:text-emerald-400 transition">
            Projetos
          </Link>
          <span>/</span>
          <span className="text-white/80 font-medium truncate max-w-xs">{project.title}</span>
        </div>

        {/* Header Principal do Projeto */}
        <div className="mt-4 flex flex-col justify-between gap-6 md:flex-row md:items-start border-b border-white/10 pb-8">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="rounded-lg bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-300 border border-emerald-400/20">
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
                <span className="rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-400 border border-emerald-500/20">
                  Ativo em Produção
                </span>
              )}
            </div>

            <h1 className="text-3xl font-bold tracking-tight md:text-5xl text-white">
              {project.title}
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/65">
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
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
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

        {/* Abas de Navegação entre Módulos Internos */}
        <div className="mt-6 flex overflow-x-auto border-b border-white/10 pb-px gap-2">
          {[
            { id: "overview", label: "Visão Geral", count: null },
            { id: "characters", label: "Personagens", count: project._count.characters },
            { id: "environments", label: "Ambientes", count: project._count.environments },
            { id: "scenes", label: "Cenas", count: project._count.scenes },
            { id: "parameters", label: "Parâmetros Dinâmicos", count: project._count.parameterValues },
            { id: "prompts", label: "Motor de Prompts", count: project._count.generations },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition whitespace-nowrap ${
                  isActive
                    ? "border-emerald-400 text-emerald-300"
                    : "border-transparent text-white/50 hover:border-white/20 hover:text-white"
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== null && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] ${
                      isActive ? "bg-emerald-400/20 text-emerald-300" : "bg-white/10 text-white/50"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Conteúdo da Aba: Visão Geral */}
        <div className={activeTab === "overview" ? "block" : "hidden"}>
          <div className="mt-8 space-y-8">
            {/* Grid de Estatísticas Rápidas */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div
                onClick={() => setActiveTab("characters")}
                className="cursor-pointer rounded-2xl border border-white/10 bg-white/[0.02] p-5 hover:border-emerald-400/30 transition"
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
                className="cursor-pointer rounded-2xl border border-white/10 bg-white/[0.02] p-5 hover:border-emerald-400/30 transition"
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
                className="cursor-pointer rounded-2xl border border-white/10 bg-white/[0.02] p-5 hover:border-emerald-400/30 transition"
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
                className="cursor-pointer rounded-2xl border border-white/10 bg-white/[0.02] p-5 hover:border-emerald-400/30 transition"
              >
                <div className="flex items-center justify-between text-white/50 text-xs">
                  <span>PROMPTS GERADOS</span>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <p className="mt-3 text-3xl font-bold text-emerald-400">{project._count.generations}</p>
                <p className="mt-1 text-xs text-white/40">Versões estruturadas em JSON</p>
              </div>
            </div>

            {/* Ficha Técnica Cinematográfica */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
              <h3 className="text-base font-bold text-white">Especificações Cinematográficas da Produção</h3>
              <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Plataforma-Alvo</span>
                  <p className="mt-1.5 text-sm font-semibold text-emerald-300">
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
            <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span className="text-primary">✨</span> Bíblia Visual & Direção de Arte Estética
                  </h3>
                  <p className="mt-1 text-xs text-white/50">
                    Guia mestre de fotografia, paleta cromática, enquadramento e textura cinematográfica.
                  </p>
                </div>
                <button
                  onClick={() => setVbModalOpen(true)}
                  className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition shadow-sm self-start md:self-auto"
                >
                  <span>✨</span>
                  {project.visualBible ? "Atualizar com IA" : "Gerar Bíblia Visual com IA"}
                </button>
              </div>

              {project.visualBible ? (
                <div className="mt-6 space-y-6">
                  {/* Conceito de Direção de Arte */}
                  <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">Conceito de Direção de Arte</span>
                    <p className="mt-2 text-xs text-white/80 leading-relaxed">
                      {project.visualBible.artDirectionConcept}
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    {/* Paleta de Cores */}
                    <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Paleta Cromática</span>
                      <div className="mt-3 space-y-1.5 text-xs">
                        <div className="text-white/80"><span className="text-white/40">Dominante:</span> {project.visualBible.colorPalette?.dominant}</div>
                        <div className="text-white/80"><span className="text-white/40">Secundária:</span> {project.visualBible.colorPalette?.secondary}</div>
                        <div className="text-white/80"><span className="text-white/40">Destaque:</span> {project.visualBible.colorPalette?.accent}</div>
                        <p className="mt-2 text-[11px] text-white/50">{project.visualBible.colorPalette?.gradingNotes}</p>
                      </div>
                    </div>

                    {/* Cinematografia & Lentes */}
                    <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Câmeras & Lentes</span>
                      <div className="mt-3 space-y-1.5 text-xs text-white/80">
                        <div><span className="text-white/40">Lentes:</span> {project.visualBible.cinematography?.recommendedLenses}</div>
                        <div><span className="text-white/40">Movimento:</span> {project.visualBible.cinematography?.cameraMovementStyle}</div>
                        <div><span className="text-white/40">Textura:</span> {project.visualBible.cinematography?.grainAndTexture}</div>
                      </div>
                    </div>

                    {/* Filosofia de Iluminação */}
                    <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Iluminação & Contraste</span>
                      <div className="mt-3 space-y-1.5 text-xs text-white/80">
                        <div><span className="text-white/40">Ratio:</span> {project.visualBible.lightingPhilosophy?.contrastRatio}</div>
                        <div><span className="text-white/40">Luz Principal:</span> {project.visualBible.lightingPhilosophy?.keyLightStyle}</div>
                        <div><span className="text-white/40">Sombras:</span> {project.visualBible.lightingPhilosophy?.shadowTreatment}</div>
                      </div>
                    </div>
                  </div>

                  {/* Diretrizes Visuais */}
                  {project.visualBible.visualDirectives?.length > 0 && (
                    <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Diretrizes Estéticas Oficiais</span>
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
                    Nenhuma Bíblia Visual compilada para este projeto ainda. Gere agora com a IA para direcionar o estilo cinematográfico de todas as gerações.
                  </p>
                </div>
              )}
            </div>
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

        {visitedTabs["parameters"] && (
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
                  <span className="text-primary font-bold">🪙 GEN_VISUAL_BIBLE</span> • Tabela de créditos
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
                    className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-lg hover:opacity-90 disabled:opacity-50 transition"
                  >
                    {vbLoading ? "Compilando Bíblia..." : "Compilar com IA"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Barra de Criação Rápida no contexto deste projeto (sem opção de criar projetos) */}
      <QuickCreationBar
        currentProjectId={project.id}
        currentProjectTitle={project.title}
        onItemCreated={handleQuickItemCreated}
      />
    </div>
  );
}



