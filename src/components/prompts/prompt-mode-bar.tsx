"use client";

import type { PromptsTabState } from "./use-prompts-tab";

interface PromptModeBarProps {
  s: PromptsTabState;
}

export function PromptModeBar({ s }: PromptModeBarProps) {
  const { generationMode, setGenerationMode } = s;


  return (
    <div className="flex flex-wrap items-center justify-between gap-4 p-2.5 rounded-2xl bg-white/[0.03] border border-white/10 shadow-lg shadow-black/20">
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/5">
        <button
          type="button"
          onClick={() => setGenerationMode("PROMPT")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
            generationMode === "PROMPT"
              ? "bg-primary text-black shadow-md shadow-primary/20"
              : "text-white/60 hover:text-white hover:bg-white/5"
          }`}
        >
          <span>✨</span>
          <span>Gerar Prompt (Gemini)</span>
        </button>
    
        <button
          type="button"
          onClick={() => setGenerationMode("IMAGE")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
            generationMode === "IMAGE"
              ? "bg-amber-400 text-black shadow-md shadow-amber-500/20"
              : "text-white/60 hover:text-white hover:bg-white/5"
          }`}
        >
          <span>🖼️</span>
          <span>Gerar Imagem (IA Direta)</span>
        </button>
      </div>
    
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setGenerationMode("GALLERY")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition ${
            generationMode === "GALLERY"
              ? "bg-white/15 text-white border-white/30"
              : "bg-white/5 text-white/60 border-white/10 hover:text-white hover:bg-white/10"
          }`}
        >
          <span>📸</span>
          <span>Galeria de Imagens</span>
        </button>
      </div>
    </div>
  );
}
