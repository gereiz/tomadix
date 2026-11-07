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
import { EnvironmentAiModal } from "./environment-ai-modal";
import { EnvironmentFormModal } from "./environment-form-modal";
import { EnvironmentGrid } from "./environment-grid";
import {
  EMPTY_ENVIRONMENT_FORM,
  environmentToForm,
  type EnvironmentItem,
  type EnvironmentAiFields,
  type EnvironmentFormData,
} from "./types";

export type { EnvironmentItem } from "./types";

const LABELS: EntityLabels = {
  singular: "ambiente",
  singularCap: "Ambiente",
  withArticle: "o ambiente",
  ofThe: "do ambiente",
};

const INITIAL_AI_FIELDS: EnvironmentAiFields = {"locationType":"INTERIOR"};

const buildAiBody = (prompt: string, fields: EnvironmentAiFields) => ({ prompt, locationType: fields.locationType });

interface EnvironmentsTabProps {
  projectId: string;
  onStatsUpdate?: () => void;
}

export function EnvironmentsTab({ projectId, onStatsUpdate }: EnvironmentsTabProps) {
  const library = useEntityLibrary<EnvironmentItem>({ projectId, resource: "environments", labels: LABELS, onStatsUpdate });

  const form = useEntityForm<EnvironmentItem, EnvironmentFormData>({
    projectId,
    resource: "environments",
    targetType: "ENVIRONMENT",
    labels: LABELS,
    emptyForm: EMPTY_ENVIRONMENT_FORM,
    toForm: environmentToForm,
    onSaved: library.afterChange,
  });

  const onGenerated = useCallback(async () => {
    await library.refetch();
    onStatsUpdate?.();
  }, [library, onStatsUpdate]);

  const ai = useEntityAi<EnvironmentAiFields>({
    projectId,
    resource: "environments",
    labels: LABELS,
    initialFields: INITIAL_AI_FIELDS,
    emptyPromptMessage: "Por favor informe a descrição ou conceito do ambiente.",
    buildBody: buildAiBody,
    onGenerated,
  });

  const [imageTarget, setImageTarget] = useState<EnvironmentItem | null>(null);
  const [lightboxImage, setLightboxImage] = useState<LightboxImage | null>(null);

  return (
    <div className="mt-8 space-y-6">
      <EntityToolbar
        search={library.search}
        onSearchChange={library.setSearch}
        searchPlaceholder="Buscar ambientes, arquitetura ou iluminação..."
        statusFilter={library.statusFilter}
        onStatusFilterChange={library.setStatusFilter}
        onGenerateWithAi={ai.openModal}
        aiTitle="Conceber ambiente cênico cinematográfico com IA (GEN_ENVIRONMENT)"
        onCreate={form.openCreate}
        createLabel="Novo Ambiente"
      />

      <EnvironmentGrid
        environments={library.items}
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

      {form.open && <EnvironmentFormModal projectId={projectId} form={form} />}

      {library.promptOpen && (
        <PromptJsonModal
          title="Prompt-Base Estruturado do Ambiente"
          promptData={library.promptData}
          loading={library.promptLoading}
          copySuccess={library.copySuccess}
          onCopy={library.copyPromptJson}
          onClose={library.closePrompt}
        />
      )}

      {ai.open && <EnvironmentAiModal ai={ai} />}

      {library.deleteTarget && (
        <DeleteEntityModal
          entityLabelCap="Ambiente"
          entityWithArticle="o ambiente"
          entityDemonstrative="este ambiente"
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
          subtitle="Geração direta com IA e vinculação instantânea à locação do projeto"
          entityType="ENVIRONMENT"
          projectId={projectId}
          environmentId={imageTarget.id}
          currentImageUrl={imageTarget.attributes?.imageUrl}
          defaultAspectRatio="16:9"
          initialPrompt={`Plano geral cinematográfico fotorrealista da locação ${imageTarget.name}, ${imageTarget.description || ""}. ${
            imageTarget.attributes?.locationContext ? `Contexto espacial: ${imageTarget.attributes.locationContext}. ` : ""
          }${
            imageTarget.attributes?.architecture ? `Arquitetura: ${imageTarget.attributes.architecture}. ` : ""
          }${
            imageTarget.attributes?.lighting ? `Iluminação: ${imageTarget.attributes.lighting}. ` : ""
          }${
            imageTarget.attributes?.weatherAndAtmosphere ? `Clima e atmosfera: ${imageTarget.attributes.weatherAndAtmosphere}. ` : ""
          }Fotografia de cinema em lente grande angular, composição visual de estúdio, 8k.`}
          onImageGenerated={() => {
            library.refetch();
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("tomadix:entities-updated", { detail: { type: "environments", projectId } }));
            }
          }}
        />
      )}

      <ImageLightboxModal
        isOpen={Boolean(lightboxImage)}
        onClose={() => setLightboxImage(null)}
        imageUrl={lightboxImage?.url || null}
        title={lightboxImage?.title || "Visualização do Ambiente"}
        subtitle={lightboxImage?.subtitle}
        prompt={lightboxImage?.prompt}
      />
    </div>
  );
}
