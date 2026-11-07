import { EntityBoardNode } from "./entity-board-node";
import { ImageBoardNode } from "./image-board-node";
import { NoteBoardNode } from "./note-board-node";
import { PromptBoardNode } from "./prompt-board-node";
import { VideoGeneratorBoardNode } from "./video-generator-board-node";

/** Mapa tipo -> componente. Constante de módulo: referência estável para o React Flow. */
export const BOARD_NODE_TYPES = {
  IMAGE: ImageBoardNode,
  VIDEO: VideoGeneratorBoardNode,
  PROMPT: PromptBoardNode,
  CHARACTER: EntityBoardNode,
  ENVIRONMENT: EntityBoardNode,
  SCENE: EntityBoardNode,
  TEXT_NOTE: NoteBoardNode,
} as const;
