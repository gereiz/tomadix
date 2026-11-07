import type { EntityFormState } from "@/components/entities/use-entity-form";
import type { EntityAiState } from "@/components/entities/use-entity-ai";

export interface EnvironmentItem {
  id: string;
  projectId: string;
  name: string;
  description: string;
  attributes: {
    imageUrl?: string;
    locationContext?: string;
    architecture?: string;
    propsAndElements?: string;
    lighting?: string;
    colorPalette?: string;
    weatherAndAtmosphere?: string;
    historicalEra?: string;
    visualStyle?: string;
    basePrompt?: string;
  };
  isArchived: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    sceneLinks: number;
  };
}

export interface EnvironmentFormData extends Record<string, string> {
  name: string;
  description: string;
  locationContext: string;
  architecture: string;
  propsAndElements: string;
  lighting: string;
  colorPalette: string;
  weatherAndAtmosphere: string;
  historicalEra: string;
  visualStyle: string;
  basePrompt: string;
}

export const EMPTY_ENVIRONMENT_FORM: EnvironmentFormData = {
  name: "",
  description: "",
  locationContext: "",
  architecture: "",
  propsAndElements: "",
  lighting: "",
  colorPalette: "",
  weatherAndAtmosphere: "",
  historicalEra: "",
  visualStyle: "",
  basePrompt: "",
};

export function environmentToForm(entity: EnvironmentItem): EnvironmentFormData {
  const attrs = entity.attributes || {};
  return {
  name: entity.name || "",
  description: entity.description || "",
  locationContext: attrs.locationContext || "",
  architecture: attrs.architecture || "",
  propsAndElements: attrs.propsAndElements || "",
  lighting: attrs.lighting || "",
  colorPalette: attrs.colorPalette || "",
  weatherAndAtmosphere: attrs.weatherAndAtmosphere || "",
  historicalEra: attrs.historicalEra || "",
  visualStyle: attrs.visualStyle || "",
  basePrompt: attrs.basePrompt || "",
  };
}

export type EnvironmentAiFields = {
  locationType: "INTERIOR" | "EXTERIOR" | "HYBRID" | "STUDIO";
};

export type EnvironmentFormState = EntityFormState<EnvironmentItem, EnvironmentFormData>;
export type EnvironmentAiState = EntityAiState<EnvironmentAiFields>;
