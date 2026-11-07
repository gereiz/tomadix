import type { Node } from "@xyflow/react";

export type SaveStatus = "saved" | "saving" | "unsaved";

export type LibraryTab = "images" | "prompts" | "characters" | "environments" | "scenes";

export interface BoardSummary {
  id: string;
  name: string;
  order: number;
  updatedAt?: string;
}

/** Itens do acervo (formato vindo da API; cada aba tem campos próprios). */
export interface SpaceLibrary {
  images: any[];
  prompts: any[];
  characters: any[];
  environments: any[];
  scenes: any[];
}

export interface FlowPosition {
  x: number;
  y: number;
}

export interface ContextMenuState {
  x: number;
  y: number;
  flowPos: FlowPosition;
  sourceNodeId?: string | null;
  isNodeContext?: boolean;
  targetNode?: Node | null;
}

export type LibraryItemType = "IMAGE" | "PROMPT" | "CHARACTER" | "ENVIRONMENT" | "SCENE";

export type AddLibraryItem = (
  itemType: LibraryItemType,
  item: any,
  customPos?: FlowPosition,
  sourceNodeId?: string | null
) => void;

export type CreatePromptNodeAt = (
  pos: FlowPosition,
  sourceNodeId?: string | null,
  customPrompt?: string,
  customLabel?: string
) => void;

export type CreateNoteNodeAt = (pos: FlowPosition, sourceNodeId?: string | null) => void;
