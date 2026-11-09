"use client";

import { Icon } from "@/components/ui/icon";
import { useMediaGeneration } from "@/components/providers/feature-flags-provider";
import type { ProjectsListTabState } from "./use-projects-list";

interface ProjectsHeaderProps {
  s: ProjectsListTabState;
}

export function ProjectsHeader({ s }: ProjectsHeaderProps) {
  const { projects, setIsCreateModalOpen, setIsPresetsModalOpen, usageSummary, setPlanLimitModal, resetForm } = s;
  const mediaEnabled = useMediaGeneration();


  return (
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
      <div className="flex flex-col gap-2 max-w-3xl">
        <div className="flex items-center flex-wrap gap-2.5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high/80 border border-outline-variant/30 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="font-label-caps text-xs text-primary tracking-widest uppercase font-bold">
              Boards Colaborativos • IA Generativa
            </span>
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-surface-container-highest/60 font-label-code text-xs text-on-surface-variant border border-outline-variant/20">
            {projects.length} {projects.length === 1 ? "space ativo" : "spaces ativos"}
          </span>
        </div>
    
        <h1 className="font-display-hero text-3xl sm:text-4xl lg:text-5xl font-bold text-on-surface tracking-tight mt-1">
          Spaces
        </h1>
        <p className="font-body-lg text-sm sm:text-base text-on-surface-variant max-w-2xl">
          Crie fluxos de trabalho generativos baseados em nós e dê vida às suas ideias. Arraste {mediaEnabled ? "imagens, " : ""}prompts, personagens e cenas em boards colaborativos com sua equipe.
        </p>
      </div>
    
      <div className="flex items-center gap-3 self-start lg:self-auto flex-wrap">
        <button
          onClick={() => setIsPresetsModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-surface-container-high/70 hover:bg-surface-container-highest border border-outline-variant/30 text-on-surface font-body-sm text-sm transition-all flex items-center gap-2 shadow-sm"
        >
          <Icon name="tune" className="text-[18px] text-secondary" />
          <span>Modelos & Presets</span>
        </button>
    
        <button
          onClick={() => {
            if (usageSummary && !usageSummary.canCreateProject) {
              setPlanLimitModal({
                isOpen: true,
                title: "Limite de Spaces Atingido",
                message: `Seu estúdio utilizou todos os ${usageSummary.projectsCount} de ${usageSummary.maxProjects} spaces do ${usageSummary.planName}. Faça upgrade para continuar criando novos spaces sem limites.`,
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
          <Icon name="add" className="text-[20px] transition-transform group-hover:rotate-90 duration-300" />
          <span>Novo quadro</span>
          <span className="ml-1 px-1.5 py-0.5 rounded bg-on-primary/15 font-label-code text-[11px] text-on-primary">N</span>
        </button>
      </div>
    </div>
  );
}
