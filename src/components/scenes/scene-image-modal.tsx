"use client";

import { DirectEntityImageModal } from "@/components/image-generation/direct-entity-image-modal";
import type { ScenesTabState } from "./use-scenes-tab";

interface SceneImageModalProps {
  s: ScenesTabState;
}

export function SceneImageModal({ s }: SceneImageModalProps) {
  const { projectId, scenes, imageModalOpen, setImageModalOpen, imageModalScene, setImageModalScene, imageModalFrameType, fetchScenes } = s;
  if (!imageModalScene) return null;

  const sceneGrain = imageModalScene.configuration?.filmGrain !== undefined ? Number(imageModalScene.configuration.filmGrain) : 25;
  const grainText = sceneGrain === 0 ? "textura digital impecável e nítida sem ruído" : sceneGrain >= 70 ? "estética vintage com granulação analógica acentuada VHS/16mm" : `textura cinematográfica com granulação orgânica ${sceneGrain}%`;

  return (
    <DirectEntityImageModal
      isOpen={imageModalOpen}
      onClose={() => {
        setImageModalOpen(false);
        setImageModalScene(null);
      }}
      title={
        imageModalFrameType === "SCENE_START"
          ? `Quadro Inicial (Start Frame): ${imageModalScene.title}`
          : `Quadro Final (End Frame): ${imageModalScene.title}`
      }
      subtitle={
        imageModalFrameType === "SCENE_START"
          ? "Geração do keyframe de abertura e estabelecimento da cena"
          : "Geração do keyframe de desfecho / resolução da ação cênica"
      }
      entityType={imageModalFrameType}
      projectId={projectId}
      sceneId={imageModalScene.id}
      currentImageUrl={
        imageModalFrameType === "SCENE_START"
          ? imageModalScene.configuration?.startFrameUrl
          : imageModalScene.configuration?.endFrameUrl
      }
      defaultAspectRatio="16:9"
      initialPrompt={
        imageModalFrameType === "SCENE_START"
          ? `Plano de cinema de abertura (start frame) da cena: "${imageModalScene.title}". Ação inicial: ${
              imageModalScene.configuration?.mainAction || imageModalScene.description || ""
            }. Enquadramento: ${imageModalScene.configuration?.framing || "Plano Médio"}. Iluminação: ${
              imageModalScene.configuration?.lighting || "Natural"
            }. Personagens: ${imageModalScene.characters.map((c) => c.character.name).join(", ") || "Em cena"}. Locação: ${
              imageModalScene.environments.map((e) => e.environment.name).join(", ") || "Locação da cena"
            }. Still cinematográfico nítido, ${grainText}, 8k.`
          : `Plano de cinema de desfecho (end frame) da cena: "${imageModalScene.title}". Resolução da ação: ${
              imageModalScene.configuration?.mainAction || imageModalScene.description || ""
            }. Enquadramento: ${imageModalScene.configuration?.framing || "Plano Médio"}. Iluminação: ${
              imageModalScene.configuration?.lighting || "Natural"
            }. Still cinematográfico final, composição dramática de resolução, ${grainText}, 8k.`
      }
      onImageGenerated={() => {
        fetchScenes();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("tomadix:entities-updated", { detail: { type: "scenes", projectId } }));
        }
      }}
    />
  );
}
