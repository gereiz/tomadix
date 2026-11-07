"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import type { ProjectsListTabState } from "./use-projects-list";

interface ProjectLimitBannerProps {
  s: ProjectsListTabState;
}

export function ProjectLimitBanner({ s }: ProjectLimitBannerProps) {
  const { usageSummary, setPlanLimitModal } = s;


  return (
    <>
    {usageSummary && usageSummary.maxProjects !== -1 && usageSummary.projectsCount >= usageSummary.maxProjects && (
      <div className="overflow-hidden rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-amber-950/25 to-surface-container-lowest p-5 shadow-xl shadow-amber-500/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-500/40 bg-amber-500/20 text-amber-400 shadow-inner">
              <Icon name="warning" className="text-[24px]" />
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
              <Icon name="arrow_forward" className="text-[14px]" />
            </Link>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
