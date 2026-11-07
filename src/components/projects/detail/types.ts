import { SpaceVisibilityType } from "@/components/spaces/space-share-modal";

export interface SceneCharacterLink {
  character: {
    id: string;
    name: string;
  };
}

export interface SceneEnvironmentLink {
  environment: {
    id: string;
    name: string;
  };
}

export interface SceneItem {
  id: string;
  title: string;
  order: number;
  durationSeconds: number | null;
  description: string;
  characters: SceneCharacterLink[];
  environments: SceneEnvironmentLink[];
}

export interface CharacterItem {
  id: string;
  name: string;
  description: string;
}

export interface EnvironmentItem {
  id: string;
  name: string;
  description: string;
}

export interface ProjectDetail {
  id: string;
  workspaceId: string;
  title: string;
  description: string;
  genre: string | null;
  language: string;
  durationSeconds: number | null;
  configuration: {
    aspectRatio?: string;
    targetPlatform?: string;
    colorGrade?: string;
    pacing?: string;
    soundDesign?: string;
    customNotes?: string;
  };
  visualBible?: any;
  visibility?: SpaceVisibilityType;
  isArchived: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    characters: number;
    environments: number;
    scenes: number;
    parameterValues: number;
    generations: number;
  };
  characters: CharacterItem[];
  environments: EnvironmentItem[];
  scenes: SceneItem[];
}

export type TabType = "board" | "overview" | "characters" | "environments" | "scenes" | "parameters" | "prompts";

