import { TemplateKey } from "@/modules/prompt-engine/prompt-engine.schema";

export interface TemplateInfo {
  key: TemplateKey;
  name: string;
  version: number;
  description: string;
  sections: string[];
}

export interface ToolProfileInfo {
  key: string;
  name: string;
  description: string;
}

export interface PromptVersionItem {
  id: string;
  templateKey: string;
  templateVersion: number;
  targetTool: string;
  modelName: string;
  versionNumber: number;
  status: "SUCCEEDED" | "FAILED";
  errorMessage?: string | null;
  outputJson?: any;
  outputText?: string | null;
  tokens?: {
    inputTokens: number;
    outputTokens: number;
  } | null;
  durationMs?: number | null;
  parentVersionId?: string | null;
  createdAt: string;
  sceneId?: string | null;
  sceneTitle?: string | null;
  sceneOrder?: number | null;
}

export interface EntityOption {
  id: string;
  name: string;
}

export interface SceneOption {
  id: string;
  title: string;
  order: number;
}

export interface PromptsTabProps {
  projectId: string;
  initialSceneId?: string;
  onStatsUpdate?: () => void;
}

