export type ProjectCinematicCategoryKey =
  | "CAMERA"
  | "LENS"
  | "FRAMING"
  | "MOVEMENT"
  | "LIGHTING"
  | "AESTHETICS"
  | "ART_ATMOSPHERE"
  | "AUDIO"
  | "CONTINUITY";

export interface ProjectCinematicCategory {
  id: ProjectCinematicCategoryKey;
  name: string;
  icon: string;
  description: string;
  order: number;
  parameterKeys: string[];
}

export interface ProjectParameterOption {
  value: string;
  label: string;
  description?: string;
  imageUrl?: string;
  whatToLookFor?: string;
  comparisonNotes?: string;
}

export interface ProjectConfigurableParameter {
  definitionId: string;
  key: string;
  label: string;
  description?: string;
  category: ProjectCinematicCategoryKey;
  type: string;
  scope: string;
  scopes?: string[];
  required: boolean;
  systemDefaultValue: unknown;
  currentProjectValue: unknown;
  isEnabledInProject: boolean;
  options: ProjectParameterOption[];
  visualCategory?: string;
}

export interface ProjectCategoryWithParameters extends ProjectCinematicCategory {
  isEnabled: boolean;
  enabledCount: number;
  totalCount: number;
  parameters: ProjectConfigurableParameter[];
}

export interface ProjectParameterSettingsData {
  projectId: string;
  totalParameters: number;
  enabledParametersCount: number;
  enabledCategories: ProjectCinematicCategoryKey[];
  enabledParameterKeys: string[];
  categories: ProjectCategoryWithParameters[];
}

export interface UpdateProjectParameterSettingsInput {
  enabledCategories?: ProjectCinematicCategoryKey[];
  enabledParameterKeys: string[];
  defaultValues: Record<string, unknown>; // chave do parâmetro -> valor
}
