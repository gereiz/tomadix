"use client";

import Link from "next/link";
import { StudioGallery } from "@/components/studio/studio-gallery";

export default function WorkspacePage() {
  return (
    <div className="min-h-screen bg-surface text-on-surface selection:bg-primary selection:text-on-primary">
      {/* 1. Header do Workspace & Sub-Navegação */}
      <div className="border-b border-outline-variant/20 bg-surface-container-lowest/60 sticky top-0 z-30">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20 text-primary border border-primary/30 text-sm">
                🗂️
              </span>
              <h1 className="text-xl sm:text-2xl font-bold font-headline-lg tracking-tight text-on-surface">
                Workspaces — Acervo & Produções
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold font-label-code text-primary uppercase">
                Acervo Central
              </span>
            </div>
            <p className="text-xs sm:text-sm text-on-surface-variant font-body-sm">
              Explore e gerencie o catálogo unificado de produções, personagens, cenários, cenas decupadas e prompts de IA.
            </p>
          </div>

          {/* Sub-Navegação das Áreas do Workspace */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-container-low border border-outline-variant/30 text-xs self-start md:self-auto">
            <Link
              href="/workspace"
              className="px-3 py-1.5 rounded-lg bg-surface-container-high text-primary font-semibold shadow-sm flex items-center gap-1.5 transition"
            >
              <span>🗂️</span>
              <span>Acervo</span>
            </Link>
            <Link
              href="/workspace/members"
              className="px-3 py-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition flex items-center gap-1.5"
            >
              <span>👥</span>
              <span>Equipe</span>
            </Link>
            <Link
              href="/workspace/billing"
              className="px-3 py-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition flex items-center gap-1.5"
            >
              <span>💳</span>
              <span>Assinatura</span>
            </Link>
            <Link
              href="/studio"
              className="px-3 py-1.5 rounded-lg text-primary hover:bg-primary/10 border border-primary/20 font-medium transition flex items-center gap-1.5"
              title="Ir para a ferramenta de Análise Cinematográfica"
            >
              <span>🎞️</span>
              <span>Análise Cinematográfica ↗</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Conteúdo Principal: Acervo & Galeria Unificada */}
      <main className="w-full px-4 sm:px-6 lg:px-8 pt-6 pb-12">
        <StudioGallery />
      </main>
    </div>
  );
}
