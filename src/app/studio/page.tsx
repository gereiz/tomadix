"use client";

import dynamic from "next/dynamic";

const CinematicStudioWorkflow = dynamic(
  () => import("@/components/studio/cinematic-studio-workflow").then((m) => m.CinematicStudioWorkflow),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[85vh] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="font-label-code text-xs text-white/50 tracking-wider uppercase">
            Iniciando Estúdio de IA & Visão Computacional...
          </span>
        </div>
      </div>
    ),
  }
);

export default function StudioPage() {
  return (
    <div className="min-h-screen bg-[#0e1217] text-white selection:bg-primary selection:text-on-primary">
      {/* Fluxo Exclusivo de Trabalho da Análise Cinematográfica Multimodal (Gemini API 4 Modos) */}
      <CinematicStudioWorkflow />
    </div>
  );
}
