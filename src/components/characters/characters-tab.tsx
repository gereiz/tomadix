"use client";

import { useCallback, useState } from "react";
import { DirectEntityImageModal } from "@/components/image-generation/direct-entity-image-modal";
import { ImageLightboxModal } from "@/components/image-generation/image-lightbox-modal";
import { DeleteEntityModal } from "@/components/entities/delete-entity-modal";
import { EntityToolbar } from "@/components/entities/entity-toolbar";
import { PromptJsonModal } from "@/components/entities/prompt-json-modal";
import type { EntityLabels, LightboxImage } from "@/components/entities/types";
import { useEntityAi } from "@/components/entities/use-entity-ai";
import { useEntityForm } from "@/components/entities/use-entity-form";
import { useEntityLibrary } from "@/components/entities/use-entity-library";
import { CharacterAiModal } from "./character-ai-modal";
import { CharacterFormModal } from "./character-form-modal";
import { CharacterGrid } from "./character-grid";
import {
  EMPTY_CHARACTER_FORM,
  characterToForm,
  type CharacterItem,
  type CharacterAiFields,
  type CharacterFormData,
} from "./types";

export type { CharacterItem } from "./types";

const LABELS: EntityLabels = {
  singular: "personagem",
  singularCap: "Personagem",
  withArticle: "o personagem",
  ofThe: "do personagem",
};

const INITIAL_AI_FIELDS: CharacterAiFields = {"archetype":"","role":""};

const buildAiBody = (prompt: string, fields: CharacterAiFields) => ({ prompt, archetype: fields.archetype, role: fields.role });

interface CharactersTabProps {
  projectId: string;
  onStatsUpdate?: () => void;
}

export function CharactersTab({ projectId, onStatsUpdate }: CharactersTabProps) {
  const library = useEntityLibrary<CharacterItem>({ projectId, resource: "characters", labels: LABELS, onStatsUpdate });

  const form = useEntityForm<CharacterItem, CharacterFormData>({
    projectId,
    resource: "characters",
    targetType: "CHARACTER",
    labels: LABELS,
    emptyForm: EMPTY_CHARACTER_FORM,
    toForm: characterToForm,
    onSaved: library.afterChange,
  });

  const onGenerated = useCallback(async () => {
    await library.refetch();
    onStatsUpdate?.();
  }, [library, onStatsUpdate]);

  const ai = useEntityAi<CharacterAiFields>({
    projectId,
    resource: "characters",
    labels: LABELS,
    initialFields: INITIAL_AI_FIELDS,
    emptyPromptMessage: "Por favor informe a descrição ou briefing do personagem.",
    buildBody: buildAiBody,
    onGenerated,
  });

  const [imageTarget, setImageTarget] = useState<CharacterItem | null>(null);
  const [lightboxImage, setLightboxImage] = useState<LightboxImage | null>(null);

  return (
    <div className="mt-8 space-y-6">
      <EntityToolbar
        search={library.search}
        onSearchChange={library.setSearch}
        searchPlaceholder="Buscar por nome ou características..."
        statusFilter={library.statusFilter}
        onStatusFilterChange={library.setStatusFilter}
        onGenerateWithAi={ai.openModal}
        aiTitle="Conceber personagem cinematográfico tridimensional com IA (GEN_CHARACTER)"
        onCreate={form.openCreate}
        createLabel="Novo Personagem"
      />

      <CharacterGrid
        characters={library.items}
        loading={library.loading}
        search={library.search}
        statusFilter={library.statusFilter}
        handleOpenCreate={form.openCreate}
        handleOpenEdit={form.openEdit}
        handleOpenImageGen={setImageTarget}
        handleDuplicate={library.duplicate}
        handleToggleArchive={library.toggleArchive}
        handleViewPrompt={library.viewPrompt}
        onRequestDelete={library.requestDelete}
        setLightboxImage={setLightboxImage}
      />

      {form.open && <CharacterFormModal projectId={projectId} form={form} />}

      {library.promptOpen && (
        <PromptJsonModal
          title="Prompt-Base Estruturado do Personagem"
          promptData={library.promptData}
          loading={library.promptLoading}
          copySuccess={library.copySuccess}
          onCopy={library.copyPromptJson}
          onClose={library.closePrompt}
        />
      )}

      {ai.open && <CharacterAiModal ai={ai} />}

      {library.deleteTarget && (
        <DeleteEntityModal
          entityLabelCap="Personagem"
          entityWithArticle="o personagem"
          entityDemonstrative="este personagem"
          name={library.deleteTarget.name}
          sceneLinkCount={library.deleteTarget._count?.sceneLinks || 0}
          loading={library.deleteLoading}
          onCancel={library.cancelDelete}
          onConfirm={library.confirmDelete}
        />
      )}

      {imageTarget && (
        <DirectEntityImageModal
          isOpen
          onClose={() => setImageTarget(null)}
          title={`Gerar Imagem: ${imageTarget.name}`}
          subtitle="Geração direta com IA e vinculação instantânea à ficha do personagem"
          entityType="CHARACTER"
          projectId={projectId}
          characterId={imageTarget.id}
          currentImageUrl={imageTarget.attributes?.imageUrl}
          defaultAspectRatio="1:1"
          initialPrompt={`Retrato cinematográfico fotorrealista de ${imageTarget.name}, ${imageTarget.description || ""}. ${
            imageTarget.attributes?.hairAndFace ? `Rosto e traços: ${imageTarget.attributes.hairAndFace}. ` : ""
          }${
            imageTarget.attributes?.costumeAndAccessories ? `Figurino: ${imageTarget.attributes.costumeAndAccessories}. ` : ""
          }${
            imageTarget.attributes?.visualIdentity ? `Identidade visual: ${imageTarget.attributes.visualIdentity}. ` : ""
          }Iluminação de cinema com profundidade de campo rasa, textura de pele fotorrealista, 8k.`}
          onImageGenerated={() => {
            library.refetch();
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("tomadix:entities-updated", { detail: { type: "characters", projectId } }));
            }
          }}
        />
      )}

      <ImageLightboxModal
        isOpen={Boolean(lightboxImage)}
        onClose={() => setLightboxImage(null)}
        imageUrl={lightboxImage?.url || null}
        title={lightboxImage?.title || "Visualização da Imagem"}
        subtitle={lightboxImage?.subtitle}
        prompt={lightboxImage?.prompt}
      />
    </div>
  );
}
