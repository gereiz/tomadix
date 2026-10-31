"use client";

import { CinematicStudioWorkflow } from "@/components/studio/cinematic-studio-workflow";

export default function CinematicAnalysisPageRoute() {
  return (
    <div className="min-h-screen bg-[#0e1217] text-white selection:bg-primary selection:text-on-primary">
      {/* Ferramenta Dedicada de Análise Cinematográfica Multimodal */}
      <CinematicStudioWorkflow />
    </div>
  );
}
