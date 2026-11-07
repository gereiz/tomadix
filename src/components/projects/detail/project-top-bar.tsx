"use client";

import Link from "next/link";
import type { TabType } from "./types";
import type { ProjectDetailTabState } from "./use-project-detail";

interface ProjectTopBarProps {
  s: ProjectDetailTabState;
}

export function ProjectTopBar({ s }: ProjectTopBarProps) {
  const { project, activeTab, setActiveTab, setIsShareModalOpen, isAdmin } = s;
  if (!project) return null;

  return (
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
  );
}
