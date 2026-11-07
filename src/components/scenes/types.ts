export interface SceneItem {
  id: string;
  projectId: string;
  title: string;
  order: number;
  durationSeconds: number | null;
  description: string;
  configuration: {
    startFrameUrl?: string;
    endFrameUrl?: string;
    startFrameImageId?: string;
    endFrameImageId?: string;
    mainAction?: string;
    initialState?: string;
    finalState?: string;
    characterMovement?: string;
    framing?: string;
    cameraMovement?: string;
    focusDepth?: string;
    lighting?: string;
    visualStyle?: string;
    transitionIn?: string;
    transitionOut?: string;
    ambientSound?: string;
    dialogue?: {
      enabled: boolean;
      language?: string;
      lines?: string;
    };
    music?: {
      enabled: boolean;
      description?: string;
    };
    restrictions?: string;
    parameters?: Record<string, any>;
  };
  characters: Array<{
    characterId: string;
    character: {
      id: string;
      name: string;
    };
  }>;
  environments: Array<{
    environmentId: string;
    environment: {
      id: string;
      name: string;
    };
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface AvailableEntity {
  id: string;
  name: string;
}

export interface ScenesTabProps {
  projectId: string;
  onStatsUpdate?: () => void;
  onOpenPromptEngine?: (sceneId: string) => void;
}

