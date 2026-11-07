"use client";

import type { ProjectDetailTabState } from "./use-project-detail";

interface ProjectHeaderProps {
  s: ProjectDetailTabState;
}

export function ProjectHeader({ s }: ProjectHeaderProps) {
  const { project, activeTab, actionLoading, handleDuplicate, handleToggleArchive } = s;
  if (!project) return null;

  return (
    <>
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
    </>
  );
}
