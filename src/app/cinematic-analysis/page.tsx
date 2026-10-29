"use client";

import { CinematicStudioWorkflow } from "@/components/studio/cinematic-studio-workflow";

export default function CinematicAnalysisPageRoute() {
  return (
    <div className="min-h-screen bg-[#0e1217] text-white selection:bg-emerald-400 selection:text-black">
      {/* Ferramenta Dedicada de Análise Cinematográfica Multimodal */}
      <CinematicStudioWorkflow />
    </div>
  );
}
