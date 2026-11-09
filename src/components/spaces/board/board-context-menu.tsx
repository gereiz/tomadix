"use client";

import { useMediaFlags } from "@/components/providers/feature-flags-provider";
import type { Dispatch, SetStateAction, MutableRefObject } from "react";
import type { Node } from "@xyflow/react";
import type { SpaceLibrary, ContextMenuState, AddLibraryItem, CreatePromptNodeAt, CreateNoteNodeAt } from "../types";

interface BoardContextMenuProps {
  contextMenu: ContextMenuState;
  setContextMenu: Dispatch<SetStateAction<ContextMenuState | null>>;
  genTargetPosRef: MutableRefObject<{ x: number; y: number } | null>;
  setSafeDeleteTarget: Dispatch<SetStateAction<Node | null>>;
  setEditNode: Dispatch<SetStateAction<Node | null>>;
  setEditLabel: Dispatch<SetStateAction<string>>;
  setEditPrompt: Dispatch<SetStateAction<string>>;
  setPreviewNode: Dispatch<SetStateAction<Node | null>>;
  setIsGenModalOpen: Dispatch<SetStateAction<boolean>>;
  setGenInitialPrompt: Dispatch<SetStateAction<string>>;
  setGenSourceNodeId: Dispatch<SetStateAction<string | null>>;
  setIsVideoGenModalOpen: Dispatch<SetStateAction<boolean>>;
  setVideoGenPrompt: Dispatch<SetStateAction<string>>;
  setVideoGenStartFrameUrl: Dispatch<SetStateAction<string | null>>;
  setVideoGenSourceNodeId: Dispatch<SetStateAction<string | null>>;
  library: SpaceLibrary;
  handleGenerateVideoFromNode: (nodeId: string) => void;
  duplicateNode: (node: Node) => void;
  handleCreatePromptNodeAt: CreatePromptNodeAt;
  handleCreateNoteNodeAt: CreateNoteNodeAt;
  addLibraryItemToBoard: AddLibraryItem;
}

export function BoardContextMenu({ contextMenu, setContextMenu, genTargetPosRef, setSafeDeleteTarget, setEditNode, setEditLabel, setEditPrompt, setPreviewNode, setIsGenModalOpen, setGenInitialPrompt, setGenSourceNodeId, setIsVideoGenModalOpen, setVideoGenPrompt, setVideoGenStartFrameUrl, setVideoGenSourceNodeId, library, handleGenerateVideoFromNode, duplicateNode, handleCreatePromptNodeAt, handleCreateNoteNodeAt, addLibraryItemToBoard }: BoardContextMenuProps) {
  // Chave global do admin: sem mídia, somem as ações de gerar imagem/vídeo
  const { image: imageEnabled, video: videoEnabled } = useMediaFlags();
  return (
    <div
      style={{
        position: "fixed",
        left: Math.max(8, Math.min(contextMenu.x, (typeof window !== "undefined" ? window.innerWidth : 1200) - 272)),
        top: Math.max(8, Math.min(contextMenu.y, (typeof window !== "undefined" ? window.innerHeight : 800) - 400)),
        zIndex: 100,
      }}
      onClick={(e) => e.stopPropagation()}
      className="theme-preserve-dark max-h-[calc(100dvh-1rem)] w-64 max-w-[calc(100vw-1rem)] overflow-y-auto rounded-2xl border border-white/20 bg-[#0e131f]/95 p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-white select-none"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-2 py-1.5 mb-1.5">
        <div className="flex items-center gap-1.5 truncate">
          <span className="text-xs">
            {contextMenu.isNodeContext ? "⚙️" : contextMenu.sourceNodeId ? "⚡" : "✨"}
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-white/90 truncate">
            {contextMenu.isNodeContext
              ? String((contextMenu.targetNode?.data as any)?.label || "Ações do Item")
              : contextMenu.sourceNodeId
              ? "Conectar a Novo Nó"
              : "Criar no Board"}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setContextMenu(null)}
          className="rounded p-0.5 text-xs text-white/40 hover:bg-white/10 hover:text-white"
        >
          ✕
        </button>
      </div>
    
      {contextMenu.isNodeContext && contextMenu.targetNode ? (
        /* Menu de Contexto do Nó Selecionado */
        <div className="space-y-1">
          {/* Visualizar */}
          <button
            type="button"
            onClick={() => {
              setPreviewNode(contextMenu.targetNode || null);
              setContextMenu(null);
            }}
            className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-xs font-medium text-white hover:bg-white/10 transition"
          >
            <span>👁️</span> Visualizar em Detalhes
          </button>
    
          {/* Editar / Renomear */}
          <button
            type="button"
            onClick={() => {
              const t = contextMenu.targetNode;
              if (t) {
                const td = t.data as Record<string, any>;
                setEditNode(t);
                setEditLabel(String(td?.label || ""));
                setEditPrompt(String(td?.prompt || td?.text || ""));
              }
              setContextMenu(null);
            }}
            className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-xs font-medium text-white hover:bg-white/10 transition"
          >
            <span>✏️</span> Editar / Renomear
          </button>
    
          {/* Duplicar */}
          <button
            type="button"
            onClick={() => {
              if (contextMenu.targetNode) {
                duplicateNode(contextMenu.targetNode);
              }
              setContextMenu(null);
            }}
            className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-xs font-medium text-white hover:bg-white/10 transition"
          >
            <span>📋</span> Duplicar Nó
          </button>
    
          {/* Animar com Vídeo IA se for Imagem */}
          {videoEnabled && contextMenu.targetNode.type === "IMAGE" && (
            <button
              type="button"
              onClick={() => {
                if (contextMenu.targetNode) {
                  handleGenerateVideoFromNode(contextMenu.targetNode.id);
                }
                setContextMenu(null);
              }}
              className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-xs font-medium text-purple-300 hover:bg-purple-500/20 transition"
            >
              <span>🎥</span> Animar com Vídeo IA
            </button>
          )}
    
          {/* Baixar */}
          {Boolean((contextMenu.targetNode.data as any)?.imageUrl || (contextMenu.targetNode.data as any)?.videoUrl) && (
            <button
              type="button"
              onClick={() => {
                const url = String((contextMenu.targetNode?.data as any)?.imageUrl || (contextMenu.targetNode?.data as any)?.videoUrl || "");
                const a = document.createElement("a");
                a.href = url;
                a.download = `space-item-${contextMenu.targetNode?.id}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setContextMenu(null);
              }}
              className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-xs font-medium text-white hover:bg-white/10 transition"
            >
              <span>⬇️</span> Baixar Arquivo
            </button>
          )}
    
          {/* Excluir com confirmação segura */}
          <button
            type="button"
            onClick={() => {
              setSafeDeleteTarget(contextMenu.targetNode || null);
              setContextMenu(null);
            }}
            className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-xs font-semibold text-red-400 hover:bg-red-500/15 transition border-t border-white/10 mt-1 pt-1.5"
          >
            <span>🗑️</span> Excluir do Board
          </button>
        </div>
      ) : (
        /* Menu de Criação no Canvas */
        <>
          {contextMenu.sourceNodeId && (
            <div className="mb-2 rounded-lg bg-indigo-500/20 border border-indigo-500/30 px-2 py-1 text-[10px] text-indigo-300">
              Conexão automática a partir do nó selecionado
            </div>
          )}
    
          <div className="space-y-1">
            {imageEnabled && (
            <>
            <button
              type="button"
              onClick={() => {
                const flowPos = contextMenu.flowPos;
                const srcId = contextMenu.sourceNodeId;
                setContextMenu(null);
                genTargetPosRef.current = flowPos;
                setGenSourceNodeId(srcId || null);
                setGenInitialPrompt("");
                setIsGenModalOpen(true);
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left text-xs font-medium text-white hover:bg-primary/20 hover:text-primary transition group"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20 text-primary text-sm group-hover:scale-110 transition shrink-0">
                🎨
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white group-hover:text-primary">Gerar Imagem IA</div>
                <div className="text-[10px] text-white/50 truncate">Flux, Pollinations, Imagen</div>
              </div>
            </button>
    
            </>
            )}
            {videoEnabled && (
            <>
            <button
              type="button"
              onClick={() => {
                const flowPos = contextMenu.flowPos;
                const srcId = contextMenu.sourceNodeId;
                setContextMenu(null);
                genTargetPosRef.current = flowPos;
                setVideoGenSourceNodeId(srcId || null);
                setVideoGenPrompt("");
                setVideoGenStartFrameUrl(null);
                setIsVideoGenModalOpen(true);
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left text-xs font-medium text-white hover:bg-purple-500/20 hover:text-purple-300 transition group"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400 text-sm group-hover:scale-110 transition shrink-0">
                🎥
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white group-hover:text-purple-300">Gerar Vídeo IA</div>
                <div className="text-[10px] text-white/50 truncate">Pollinations (Veo, Seedance, Wan)</div>
              </div>
            </button>
            </>
            )}
    
            <button
              type="button"
              onClick={() => {
                handleCreatePromptNodeAt(contextMenu.flowPos, contextMenu.sourceNodeId);
                setContextMenu(null);
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left text-xs font-medium text-white hover:bg-emerald-500/20 hover:text-emerald-300 transition group"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 text-sm group-hover:scale-110 transition shrink-0">
                📜
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white group-hover:text-emerald-300">Prompt Cinematográfico</div>
                <div className="text-[10px] text-white/50 truncate">Bloco de prompt conectável</div>
              </div>
            </button>
    
            <button
              type="button"
              onClick={() => {
                handleCreateNoteNodeAt(contextMenu.flowPos, contextMenu.sourceNodeId);
                setContextMenu(null);
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left text-xs font-medium text-white hover:bg-amber-500/20 hover:text-amber-300 transition group"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 text-sm group-hover:scale-110 transition shrink-0">
                💬
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white group-hover:text-amber-300">Nota da Equipe</div>
                <div className="text-[10px] text-white/50 truncate">Post-it colaborativo</div>
              </div>
            </button>
          </div>
    
          {/* Inserir da Biblioteca do Projeto se disponível */}
          {(library.characters.length > 0 || library.environments.length > 0 || library.scenes.length > 0) && (
            <div className="mt-2 pt-2 border-t border-white/10">
              <div className="px-2 pb-1 text-[9px] font-bold uppercase tracking-wider text-white/40">
                Inserir do Projeto
              </div>
              <div className="grid grid-cols-2 gap-1 min-[380px]:grid-cols-3">
                {library.characters.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      addLibraryItemToBoard("CHARACTER", library.characters[0], contextMenu.flowPos, contextMenu.sourceNodeId);
                      setContextMenu(null);
                    }}
                    className="rounded-lg bg-white/5 p-1.5 text-center hover:bg-white/10 transition"
                    title={`Inserir ${library.characters[0]?.name}`}
                  >
                    <div className="text-sm">👤</div>
                    <div className="text-[9px] font-medium text-white/70 truncate">Personagem</div>
                  </button>
                )}
    
                {library.environments.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      addLibraryItemToBoard("ENVIRONMENT", library.environments[0], contextMenu.flowPos, contextMenu.sourceNodeId);
                      setContextMenu(null);
                    }}
                    className="rounded-lg bg-white/5 p-1.5 text-center hover:bg-white/10 transition"
                    title={`Inserir ${library.environments[0]?.name}`}
                  >
                    <div className="text-sm">🏛️</div>
                    <div className="text-[9px] font-medium text-white/70 truncate">Ambiente</div>
                  </button>
                )}
    
                {library.scenes.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      addLibraryItemToBoard("SCENE", library.scenes[0], contextMenu.flowPos, contextMenu.sourceNodeId);
                      setContextMenu(null);
                    }}
                    className="rounded-lg bg-white/5 p-1.5 text-center hover:bg-white/10 transition"
                    title={`Inserir Cena ${library.scenes[0]?.order}`}
                  >
                    <div className="text-sm">🎬</div>
                    <div className="text-[9px] font-medium text-white/70 truncate">Cena</div>
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    
      {/* Atalho dica */}
      <div className="mt-2 border-t border-white/10 px-2 pt-1.5 text-[9px] text-white/40 flex items-center justify-between">
        <span>Selecione e tecle <kbd className="font-mono text-white/70 bg-white/10 px-1 rounded">Delete</kbd></span>
        <span>Esc fecha</span>
      </div>
    </div>
  );
}
