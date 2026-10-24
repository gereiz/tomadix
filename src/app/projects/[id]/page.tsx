"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navigation/navbar";
import { CharactersTab } from "@/components/characters/characters-tab";
import { EnvironmentsTab } from "@/components/environments/environments-tab";
import { ScenesTab } from "@/components/scenes/scenes-tab";
import { PromptsTab } from "@/components/prompts/prompts-tab";

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

  useEffect(() => {
    setVisitedTabs((prev) => ({ ...prev, [activeTab]: true }));
  }, [activeTab]);

  // Carregar dados do projeto
  const loadProject = useCallback(async () => {
    try {
      setLoading(true);
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
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }, [resolvedParams.id]);

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
        <Navbar />
        <main className="mx-auto max-w-7xl px-6 py-12">
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
        <Navbar />
        <main className="mx-auto max-w-3xl px-6 py-20 text-center">
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
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 py-8">
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
          </div>
        </div>

        {/* Conteúdo das Abas dos Módulos Internos com Cache em Memória */}
        {visitedTabs["characters"] && (
          <div className={activeTab === "characters" ? "block" : "hidden"}>
            <CharactersTab projectId={project.id} onStatsUpdate={loadProject} />
          </div>
        )}

        {visitedTabs["environments"] && (
          <div className={activeTab === "environments" ? "block" : "hidden"}>
            <EnvironmentsTab projectId={project.id} onStatsUpdate={loadProject} />
          </div>
        )}

        {visitedTabs["scenes"] && (
          <div className={activeTab === "scenes" ? "block" : "hidden"}>
            <ScenesTab
              projectId={project.id}
              onStatsUpdate={loadProject}
              onOpenPromptEngine={() => setActiveTab("prompts")}
            />
          </div>
        )}

        {visitedTabs["parameters"] && (
          <div className={activeTab === "parameters" ? "block" : "hidden"}>
            <ProjectParametersTab projectId={project.id} onValuesUpdated={loadProject} />
          </div>
        )}

        {visitedTabs["prompts"] && (
          <div className={activeTab === "prompts" ? "block" : "hidden"}>
            <PromptsTab projectId={project.id} onStatsUpdate={loadProject} />
          </div>
        )}

      </main>
    </div>
  );
}

function ProjectParametersTab({
  projectId,
  onValuesUpdated,
}: {
  projectId: string;
  onValuesUpdated: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [paramsData, setParamsData] = useState<any[]>([]);
  const [definitions, setDefinitions] = useState<Record<string, any>>({});
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [message, setMessage] = useState<string | null>(null);

  const fetchParams = useCallback(async () => {
    try {
      setLoading(true);
      const [resParams, resDefs] = await Promise.all([
        fetch(`/api/projects/${projectId}/parameters?targetType=PROJECT`),
        fetch("/api/parameters"),
      ]);

      if (resParams.ok && resDefs.ok) {
        const dataParams = await resParams.json();
        const dataDefs = await resDefs.json();

        const defMap: Record<string, any> = {};
        for (const d of dataDefs.data || []) {
          defMap[d.id] = d;
        }
        setDefinitions(defMap);

        const details = dataParams.data?.details || [];
        setParamsData(details);

        const initialValues: Record<string, any> = {};
        for (const item of details) {
          if (item.value !== undefined && item.value !== null) {
            initialValues[item.definitionId] = item.value;
          }
        }
        setFormValues(initialValues);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchParams();
  }, [fetchParams]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);

      const payload = {
        values: Object.entries(formValues).map(([defId, val]) => ({
          parameterDefinitionId: defId,
          targetType: "PROJECT",
          value: val,
        })),
      };

      const res = await fetch(`/api/projects/${projectId}/parameters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Erro ao salvar parâmetros.");

      setMessage("Parâmetros do projeto salvos com sucesso!");
      fetchParams();
      onValuesUpdated();
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mt-8 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl bg-white/5" />
        ))}
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-3xl border border-white/10 bg-white/[0.02] p-6">
        <div>
          <h3 className="text-xl font-bold text-white">Parâmetros Ativos no Projeto</h3>
          <p className="mt-1 text-xs text-white/50">
            Configure as variáveis cinematográficas resolvidas automaticamente para o escopo global deste projeto.
          </p>
        </div>
        <Link
          href="/parameters"
          className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-400/20 transition whitespace-nowrap"
        >
          Administrar Definições de Parâmetros →
        </Link>
      </div>

      {message && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/80 p-3 text-xs text-emerald-300">
          ✓ {message}
        </div>
      )}

      {paramsData.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/10 p-12 text-center text-xs text-white/40">
          Nenhum parâmetro de escopo Global disponível no momento.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {paramsData
            .filter((p) => p.scope === "GLOBAL" || p.scope === "OUTPUT")
            .map((p) => {
              const def = definitions[p.definitionId];
              const currentVal = formValues[p.definitionId] ?? "";

              return (
                <div key={p.definitionId} className="rounded-2xl border border-white/10 bg-black/30 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-sm text-white">{p.label}</span>
                      <code className="ml-2 text-[10px] text-white/40 font-mono">{p.key}</code>
                    </div>
                    <span
                      className={`text-[9px] font-mono px-2 py-0.5 rounded border ${
                        p.source === "EXPLICIT"
                          ? "bg-emerald-400/10 text-emerald-300 border-emerald-400/20"
                          : "bg-white/5 text-white/40 border-white/10"
                      }`}
                    >
                      {p.source === "EXPLICIT" ? "Definido no Projeto" : "Padrão do Sistema"}
                    </span>
                  </div>

                  {(p.description || def?.description) && (
                    <p className="text-[11px] text-white/50">{p.description || def?.description}</p>
                  )}

                  {/* Inputs específicos */}
                  {p.type === "SELECT" && (
                    <select
                      value={currentVal}
                      onChange={(e) =>
                        setFormValues({ ...formValues, [p.definitionId]: e.target.value })
                      }
                      className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400 cursor-pointer"
                    >
                      <option value="">Selecione...</option>
                      {((p.options || def?.options || []) as any[]).map((opt: any) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  )}

                  {p.type === "TEXT" && (
                    <input
                      type="text"
                      value={currentVal}
                      onChange={(e) =>
                        setFormValues({ ...formValues, [p.definitionId]: e.target.value })
                      }
                      className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                    />
                  )}

                  {p.type === "TEXTAREA" && (
                    <textarea
                      rows={2}
                      value={currentVal}
                      onChange={(e) =>
                        setFormValues({ ...formValues, [p.definitionId]: e.target.value })
                      }
                      className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                    />
                  )}

                  {p.type === "RANGE" && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-mono text-white/60">
                        <span>0</span>
                        <span className="font-bold text-emerald-400">{currentVal || 0}</span>
                        <span>100</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={currentVal || 0}
                        onChange={(e) =>
                          setFormValues({
                            ...formValues,
                            [p.definitionId]: Number(e.target.value),
                          })
                        }
                        className="w-full accent-emerald-400 cursor-pointer"
                      />
                    </div>
                  )}

                  {p.type === "BOOLEAN" && (
                    <button
                      type="button"
                      onClick={() =>
                        setFormValues({
                          ...formValues,
                          [p.definitionId]: !currentVal,
                        })
                      }
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                        currentVal
                          ? "bg-emerald-500 text-black font-semibold"
                          : "bg-white/10 text-white/60"
                      }`}
                    >
                      {currentVal ? "✓ Ativado" : "Desativado"}
                    </button>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {paramsData.length > 0 && (
        <div className="flex justify-end pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-emerald-400 px-6 py-2.5 text-xs font-semibold text-black hover:bg-emerald-300 transition disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar Parâmetros do Projeto"}
          </button>
        </div>
      )}
    </div>
  );
}

