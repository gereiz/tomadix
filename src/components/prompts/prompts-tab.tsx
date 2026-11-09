"use client";

import { Spinner } from "@/components/ui/spinner";
import { DirectImageGenerator } from "@/components/image-generation/direct-image-generator";
import { GeneratedImagesGallery } from "@/components/image-generation/generated-images-gallery";
import dynamic from "next/dynamic";
import { usePromptsTab } from "./use-prompts-tab";
import { PromptModeBar } from "./prompt-mode-bar";
import { PromptGeneratorPanel } from "./prompt-generator-panel";
import { PromptResultViewer } from "./prompt-result-viewer";
import { PromptHistory } from "./prompt-history";
import { RegenerateModal } from "./regenerate-modal";
import { CompareVersionsModal } from "./compare-versions-modal";
import type { PromptsTabProps } from "./types";

// Modal pesado: só carrega ao pedir um vídeo
const DirectVideoModal = dynamic(
  () => import("@/components/video-generation/direct-video-modal").then((m) => m.DirectVideoModal),
  { ssr: false }
);

export type { TemplateInfo, ToolProfileInfo, PromptVersionItem, EntityOption, SceneOption, PromptsTabProps } from "./types";

export function PromptsTab(props: PromptsTabProps) {
  const s = usePromptsTab(props);
  const { projectId, onStatsUpdate, templates, loading, generationMode, setGenerationMode, promptForImageGen, selectedSceneId, selectedCharacterId, selectedEnvironmentId } = s;

  if (loading) {
    return (
      <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.02] p-12 text-center">
        <Spinner block className="h-8 w-8 border-2 border-primary mb-3" />
        <p className="text-sm text-white/60">Carregando catálogo de templates e ferramentas...</p>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-8">
      <PromptModeBar s={s} />

      {/* Modalidade: Galeria de Imagens Geradas */}
      {s.mediaEnabled && generationMode === "GALLERY" && (
        <div className="rounded-3xl border border-white/10 bg-black/40 p-6">
          <GeneratedImagesGallery projectId={projectId} />
        </div>
      )}

      {/* Modalidade: Geração Direta de Imagens com IA */}
      {s.mediaEnabled && generationMode === "IMAGE" && (
        <div className="space-y-6">
          <DirectImageGenerator
            projectId={projectId}
            sceneId={selectedSceneId || undefined}
            characterId={selectedCharacterId || undefined}
            environmentId={selectedEnvironmentId || undefined}
            initialPrompt={promptForImageGen}
            onSwitchToPromptMode={() => setGenerationMode("PROMPT")}
            onImageGenerated={() => {
              if (onStatsUpdate) onStatsUpdate();
            }}
          />

          <div className="rounded-3xl border border-white/10 bg-black/40 p-6">
            <GeneratedImagesGallery projectId={projectId} />
          </div>
        </div>
      )}

      {/* Modalidade: Gerar Prompt com Gemini (Motor de Prompts Original) */}
      {(generationMode === "PROMPT" || !s.mediaEnabled) && (
      <div className="grid gap-5 sm:gap-8 lg:grid-cols-12">
      <PromptGeneratorPanel s={s} />

        {/* Painel Direito: Exibição Ativa e Histórico (7 colunas) */}
        <div className="lg:col-span-7 space-y-6">
      <PromptResultViewer s={s} />

      <PromptHistory s={s} />
        </div>
      </div>
      )}

      {s.notice && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-50 max-w-sm rounded-xl border px-4 py-3 text-xs shadow-lg ${
            s.notice.type === "error"
              ? "border-red-500/30 bg-red-950 text-red-200"
              : "border-emerald-500/30 bg-emerald-950 text-emerald-200"
          }`}
        >
          <div className="flex items-start gap-3">
            <span className="flex-1">{s.notice.text}</span>
            <button type="button" onClick={() => s.setNotice(null)} className="text-white/60 hover:text-white" aria-label="Fechar aviso">
              ×
            </button>
          </div>
        </div>
      )}

      {s.mediaEnabled && s.videoModalOpen && (
        <DirectVideoModal
          isOpen={s.videoModalOpen}
          onClose={() => s.setVideoModalOpen(false)}
          title="Gerar vídeo com IA"
          subtitle="O vídeo fica salvo no projeto e aparece na galeria."
          projectId={projectId}
          sceneId={selectedSceneId || undefined}
          initialPrompt={s.promptForVideoGen}
          onVideoGenerated={() => {
            s.setNotice({ type: "success", text: "Vídeo gerado com sucesso e salvo no projeto." });
            if (onStatsUpdate) onStatsUpdate();
          }}
        />
      )}

      {s.regeneratingVersion && (
        <RegenerateModal s={s} />
      )}

      {s.compareModalOpen && (
        <CompareVersionsModal s={s} />
      )}
    </div>
  );
}
