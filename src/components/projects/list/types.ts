import type { SpaceVisibilityType } from "@/components/spaces/space-share-modal";

export interface UsageSummary {
  workspaceId: string;
  workspaceName: string;
  planTier: "FREE" | "PRO" | "TEAM" | "ENTERPRISE";
  planName: string;
  projectsCount: number;
  maxProjects: number;
  membersCount: number;
  maxMembers: number;
  creditsBalance: number;
  canCreateProject: boolean;
  canAddMember: boolean;
}

export interface ProjectCounts {
  characters: number;
  environments: number;
  scenes: number;
  parameterValues: number;
  generations: number;
  generatedImages?: number;
  boards?: number;
  spaceMembers?: number;
}

export interface ProjectConfig {
  aspectRatio?: string;
  targetPlatform?: string;
  colorGrade?: string;
  pacing?: string;
  filmGrain?: number;
  soundDesign?: string;
  customNotes?: string;
}

export interface Project {
  id: string;
  workspaceId: string;
  ownerUserId?: string | null;
  userId: string;
  title: string;
  description: string;
  genre: string | null;
  language: string;
  durationSeconds: number | null;
  visibility?: SpaceVisibilityType;
  thumbnailUrl?: string | null;
  configuration: ProjectConfig;
  isArchived: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count: ProjectCounts;
  generatedImages?: Array<{
    id: string;
    imageUrl: string;
    prompt: string;
    aspectRatio?: string | null;
    modelId?: string;
  }>;
  spaceMembers?: Array<{
    userId: string;
    canEdit: boolean;
    user?: {
      id: string;
      displayName: string | null;
      email: string;
    };
  }>;
}

