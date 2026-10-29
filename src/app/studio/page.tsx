"use client";

import { CinematicStudioWorkflow } from "@/components/studio/cinematic-studio-workflow";

export default function StudioPage() {
  return (
    <div className="min-h-screen bg-[#0e1217] text-white selection:bg-emerald-400 selection:text-black">
      {/* Fluxo Exclusivo de Trabalho da Análise Cinematográfica Multimodal (Gemini API 4 Modos) */}
      <CinematicStudioWorkflow />
    </div>
  );
}
