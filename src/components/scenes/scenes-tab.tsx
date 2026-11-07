"use client";

import { ImageLightboxModal } from "@/components/image-generation/image-lightbox-modal";
import { useScenesTab } from "./use-scenes-tab";
import { ScenesToolbar } from "./scenes-toolbar";
import { ScenesList } from "./scenes-list";
import { SceneFormModal } from "./scene-form-modal";
import { ContinuityModal } from "./continuity-modal";
import { ExpandSceneModal } from "./expand-scene-modal";
import { SceneSequenceModal } from "./scene-sequence-modal";
import { ScriptModal } from "./script-modal";
import { DeleteSceneModal } from "./delete-scene-modal";
import { SceneImageModal } from "./scene-image-modal";
import type { ScenesTabProps } from "./types";

export type { SceneItem, AvailableEntity, ScenesTabProps } from "./types";

export function ScenesTab(props: ScenesTabProps) {
  const s = useScenesTab(props);
  const { lightboxImage, setLightboxImage } = s;

  return (
    <div className="mt-8 space-y-6">
      <ScenesToolbar s={s} />

      <ScenesList s={s} />

      {s.modalOpen && (
        <SceneFormModal s={s} />
      )}

      {s.continuityModalOpen && (
        <ContinuityModal s={s} />
      )}

      {s.expandModalOpen && s.sceneToExpand && (
        <ExpandSceneModal s={s} />
      )}

      {s.sequenceModalOpen && (
        <SceneSequenceModal s={s} />
      )}

      {s.scriptModalOpen && (
        <ScriptModal s={s} />
      )}

      {s.deleteModalOpen && s.sceneToDelete && (
        <DeleteSceneModal s={s} />
      )}
      {s.imageModalScene && (
        <SceneImageModal s={s} />
      )}

      {/* Lightbox Modal para Visualização de Keyframes em Alta Resolução */}
      <ImageLightboxModal
        isOpen={Boolean(lightboxImage)}
        onClose={() => setLightboxImage(null)}
        imageUrl={lightboxImage?.url || null}
        title={lightboxImage?.title || "Keyframe da Cena"}
        subtitle={lightboxImage?.subtitle}
        prompt={lightboxImage?.prompt}
      />
    </div>
  );
}
