"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { QuickCreationBar } from "@/components/studio/quick-creation-bar";
import { SpaceBoardCanvas } from "./helpers";
import { useProjectDetailTab } from "./use-project-detail";
import { ProjectTopBar } from "./project-top-bar";
import { ProjectHeader } from "./project-header";
import { ProjectOverviewTab } from "./project-overview-tab";
import { VisualBibleModal } from "./visual-bible-modal";
import { EditProjectModal } from "./edit-project-modal";

// Abas pesadas carregadas sob demanda (só montam depois de visitadas)
const SpaceShareModal = dynamic(() => import("@/components/spaces/space-share-modal").then((m) => m.SpaceShareModal), { ssr: false });
const CharactersTab = dynamic(() => import("@/components/characters/characters-tab").then((m) => m.CharactersTab), { ssr: false });
const EnvironmentsTab = dynamic(() => import("@/components/environments/environments-tab").then((m) => m.EnvironmentsTab), { ssr: false });
const ScenesTab = dynamic(() => import("@/components/scenes/scenes-tab").then((m) => m.ScenesTab), { ssr: false });
const PromptsTab = dynamic(() => import("@/components/prompts/prompts-tab").then((m) => m.PromptsTab), { ssr: false });
const ProjectParameterSettings = dynamic(() => import("@/components/parameters/project-parameter-settings").then((m) => m.ProjectParameterSettings), { ssr: false });

export type { SceneCharacterLink, SceneEnvironmentLink, SceneItem, CharacterItem, EnvironmentItem, ProjectDetail, TabType } from "./types";

export default function ProjectDetail(props: { params: Promise<{ id: string }> }) {
  const s = useProjectDetailTab(props);
  const [promptSceneId, setPromptSceneId] = useState<string | undefined>(undefined);
  const { project, loading, error, activeTab, setActiveTab, visitedTabs, refreshKey, isShareModalOpen, setIsShareModalOpen, isAdmin, loadProject, handleQuickItemCreated } = s;

  if (loading) {
    return (
      <div className="min-h-dvh bg-[#0b0d12] text-white">
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
      <div className="min-h-dvh bg-[#0b0d12] text-white">
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
    <div className="min-h-dvh bg-[#0b0d12] text-white">
      <main className={`w-full px-4 sm:px-6 lg:px-8 ${activeTab === "board" ? "pt-3 pb-6" : "pt-6 pb-28"}`}>
      <ProjectTopBar s={s} />

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

      <ProjectHeader s={s} />

      <ProjectOverviewTab s={s} />

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
              onOpenPromptEngine={(sceneId) => {
                setPromptSceneId(sceneId);
                setActiveTab("prompts");
              }}
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
            <PromptsTab key={`prompt-${refreshKey}`} projectId={project.id} initialSceneId={promptSceneId} onStatsUpdate={() => loadProject(true)} />
          </div>
        )}

      <VisualBibleModal s={s} />

      <EditProjectModal s={s} />

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
