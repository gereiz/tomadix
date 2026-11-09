"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useMediaFlags } from "@/components/providers/feature-flags-provider";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { BoardTopBar } from "@/components/spaces/board/board-top-bar";
import { BoardToolbar } from "@/components/spaces/board/board-toolbar";
import { LibraryDrawer } from "@/components/spaces/board/library-drawer";
import { PageSwitcher } from "@/components/spaces/board/page-switcher";
import { ZoomControls } from "@/components/spaces/board/zoom-controls";
import { BoardContextMenu } from "@/components/spaces/board/board-context-menu";
import { SafeDeleteModal } from "@/components/spaces/board/safe-delete-modal";
import { NodeActionsSheet } from "@/components/spaces/board/node-actions-sheet";
import { EditNodeModal } from "@/components/spaces/board/edit-node-modal";
import { PreviewModal } from "@/components/spaces/board/preview-modal";
import type {
  BoardSummary,
  ContextMenuState,
  LibraryTab,
  SaveStatus,
  SpaceLibrary,
} from "@/components/spaces/types";
import { BOARD_NODE_TYPES } from "@/components/spaces/nodes";
import { DirectEntityImageModal } from "@/components/image-generation/direct-entity-image-modal";
import { DirectVideoModal } from "@/components/video-generation/direct-video-modal";


// ============================================================================
// MAIN BOARD CANVAS INNER COMPONENT
// ============================================================================

interface SpaceBoardCanvasProps {
  projectId: string;
  projectTitle: string;
  onSwitchToClassicStudio?: () => void;
  onOpenShareModal?: () => void;
}

function SpaceBoardCanvasInner({
  projectId,
  projectTitle,
  onSwitchToClassicStudio,
  onOpenShareModal,
}: SpaceBoardCanvasProps) {
  const reactFlowInstance = useReactFlow();

  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string>("");
  const [canEdit, setCanEdit] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [zoomPercent, setZoomPercent] = useState<number>(85);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Context Menu & Drag-to-Empty-Space Connection states
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const connectingNodeIdRef = useRef<string | null>(null);
  const genTargetPosRef = useRef<{ x: number; y: number } | null>(null);

  // Gestão de Itens, Ações Contextuais e Exclusão Segura
  const [safeDeleteTarget, setSafeDeleteTarget] = useState<Node | null>(null);
  const [nodeActionsTarget, setNodeActionsTarget] = useState<Node | null>(null);
  const [editNode, setEditNode] = useState<Node | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editPrompt, setEditPrompt] = useState("");
  const [previewNode, setPreviewNode] = useState<Node | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Video Generation Modal diretamente no Space Board
  const [isVideoGenModalOpen, setIsVideoGenModalOpen] = useState(false);
  const [videoGenPrompt, setVideoGenPrompt] = useState("");
  const [videoGenStartFrameUrl, setVideoGenStartFrameUrl] = useState<string | null>(null);
  const [videoGenSourceNodeId, setVideoGenSourceNodeId] = useState<string | null>(null);

  // Library drawer state
  const [isLibraryOpen, setIsLibraryOpen] = useState<boolean>(false);
  const [libraryTab, setLibraryTab] = useState<LibraryTab>("images");

  // Chave global do admin: sem geração de mídia, nós de imagem/vídeo e ações de gerar somem da tela
  // (o estado completo continua salvo no board e volta ao religar a chave).
  const { image: imageEnabled, video: videoEnabled } = useMediaFlags();
  // Tipos de nó ocultos conforme o que está desligado (o estado salvo do board continua intacto)
  const hiddenNodeTypes = useMemo(() => {
    const set = new Set<string>();
    if (!imageEnabled) set.add("IMAGE");
    if (!videoEnabled) set.add("VIDEO");
    return set;
  }, [imageEnabled, videoEnabled]);
  const visibleNodes = useMemo(() => {
    if (imageEnabled && videoEnabled) return nodes;
    return nodes
      .filter((n) => !hiddenNodeTypes.has(String(n.type)))
      .map((n) => {
        if (n.type !== "PROMPT" && n.type !== "IMAGE") return n;
        const data = { ...n.data } as Record<string, unknown>;
        if (!imageEnabled) data.onGenerateFromPrompt = undefined;
        if (!videoEnabled) data.onGenerateVideoFromNode = undefined;
        return { ...n, data };
      });
  }, [nodes, imageEnabled, videoEnabled, hiddenNodeTypes]);
  const visibleEdges = useMemo(() => {
    if (hiddenNodeTypes.size === 0) return edges;
    const hidden = new Set(nodes.filter((n) => hiddenNodeTypes.has(String(n.type))).map((n) => n.id));
    return edges.filter((e) => !hidden.has(e.source) && !hidden.has(e.target));
  }, [edges, nodes, hiddenNodeTypes]);
  const [library, setLibrary] = useState<SpaceLibrary>({
    images: [],
    prompts: [],
    characters: [],
    environments: [],
    scenes: [],
  });

  // Image Generation Modal directly on the board
  const [isGenModalOpen, setIsGenModalOpen] = useState(false);
  const [genInitialPrompt, setGenInitialPrompt] = useState("");
  const [genSourceNodeId, setGenSourceNodeId] = useState<string | null>(null);

  // Refs for autosave & polling coordination
  const isInteractingRef = useRef(false);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedStampRef = useRef<string>("");

  const openImageGenerator = useCallback(() => {
    setGenInitialPrompt("");
    setGenSourceNodeId(null);
    setIsGenModalOpen(true);
  }, []);

  const openVideoGenerator = useCallback(() => {
    setVideoGenPrompt("");
    setVideoGenStartFrameUrl(null);
    setVideoGenSourceNodeId(null);
    setIsVideoGenModalOpen(true);
  }, []);

  const executeDeleteNode = useCallback(
    (nodeId: string) => {
      if (!canEdit) return;
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      setSaveStatus("unsaved");
      setToastMessage("Item removido do Space Board com sucesso!");
      setTimeout(() => setToastMessage(null), 3500);
    },
    [canEdit, setNodes, setEdges]
  );

  const handleRequestDeleteNode = useCallback(
    (nodeId: string) => {
      if (!canEdit) return;
      setNodes((nds) => {
        const target = nds.find((n) => n.id === nodeId);
        if (target) {
          setSafeDeleteTarget(target);
        } else {
          executeDeleteNode(nodeId);
        }
        return nds;
      });
    },
    [canEdit, executeDeleteNode, setNodes]
  );

  const handleOpenNodeActions = useCallback(
    (nodeId: string) => {
      setNodes((nds) => {
        const target = nds.find((n) => n.id === nodeId);
        if (target) {
          setNodeActionsTarget(target);
        }
        return nds;
      });
    },
    [setNodes]
  );

  const handlePreviewNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => {
        const target = nds.find((n) => n.id === nodeId);
        if (target) {
          setPreviewNode(target);
        }
        return nds;
      });
    },
    [setNodes]
  );

  const handleGenerateVideoFromNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => {
        const target = nds.find((n) => n.id === nodeId);
        if (target) {
          const d = target.data as Record<string, any>;
          setVideoGenSourceNodeId(nodeId);
          setVideoGenStartFrameUrl((d?.imageUrl as string) || (d?.startFrameUrl as string) || null);
          setVideoGenPrompt((d?.prompt as string) || "");
          setIsVideoGenModalOpen(true);
        }
        return nds;
      });
    },
    [setNodes]
  );

  const duplicateNode = useCallback(
    (node: Node) => {
      if (!canEdit) return;
      const newId = `node-dup-${Date.now()}`;
      const clone: Node = {
        ...node,
        id: newId,
        position: {
          x: node.position.x + 40,
          y: node.position.y + 40,
        },
        selected: true,
        data: {
          ...node.data,
          label: `${node.data.label || "Item"} (Cópia)`,
          onDeleteNode: handleRequestDeleteNode,
          onUpdateNodeData: (nId: string, data: any) => handleUpdateNodeData(nId, data),
          onOpenNodeActions: handleOpenNodeActions,
          onPreviewNode: handlePreviewNode,
          onGenerateVideoFromNode: handleGenerateVideoFromNode,
        },
      };

      setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), clone]);
      setSaveStatus("unsaved");
      setToastMessage("Item duplicado no board!");
      setTimeout(() => setToastMessage(null), 3000);
    },
    [canEdit, handleRequestDeleteNode, handleOpenNodeActions, handlePreviewNode, handleGenerateVideoFromNode, setNodes]
  );

  const handleUpdateNodeData = useCallback(
    (nodeId: string, nextData: Record<string, any>) => {
      if (!canEdit) return;
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...nextData } } : n))
      );
      setSaveStatus("unsaved");
    },
    [canEdit, setNodes]
  );

  const handleGenerateFromPrompt = useCallback((promptText: string, sourceNodeId: string) => {
    setGenInitialPrompt(promptText);
    setGenSourceNodeId(sourceNodeId);
    genTargetPosRef.current = null;
    setIsGenModalOpen(true);
  }, []);

  // Atalho de teclado global: tecla Delete e Backspace apaga nós/arestas selecionados (sem interferir em digitação)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setContextMenu(null);
        setNodeActionsTarget(null);
        setSafeDeleteTarget(null);
        setEditNode(null);
        setPreviewNode(null);
        return;
      }
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable ||
          target.closest("input") ||
          target.closest("textarea"))
      ) {
        return;
      }
      if (!canEdit) return;

      setNodes((nds) => {
        const selectedNodes = nds.filter((n) => n.selected);
        if (selectedNodes.length === 0) return nds;
        const selectedIds = new Set(selectedNodes.map((n) => n.id));
        setEdges((eds) =>
          eds.filter(
            (ed) =>
              !ed.selected &&
              !selectedIds.has(ed.source) &&
              !selectedIds.has(ed.target)
          )
        );
        setSaveStatus("unsaved");
        return nds.filter((n) => !n.selected);
      });

      setEdges((eds) => {
        const selectedEdges = eds.filter((e) => e.selected);
        if (selectedEdges.length > 0) {
          setSaveStatus("unsaved");
          return eds.filter((e) => !e.selected);
        }
        return eds;
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canEdit, setNodes, setEdges]);

  const decorateNodes = useCallback(
    (rawNodes: any[]): Node[] => {
      return (rawNodes || []).map((n) => {
        const w = n.data?.width || n.width;
        const h = n.data?.height || n.height;
        return {
          id: n.id,
          type: n.type || "IMAGE",
          position: { x: Number(n.x) || 0, y: Number(n.y) || 0 },
          style: w && h ? { width: w, height: h } : undefined,
          data: {
            ...(n.data || {}),
            refType: n.refType,
            refId: n.refId,
            onDeleteNode: handleRequestDeleteNode,
            onUpdateNodeData: handleUpdateNodeData,
            onGenerateFromPrompt: handleGenerateFromPrompt,
            onOpenNodeActions: handleOpenNodeActions,
            onPreviewNode: handlePreviewNode,
            onGenerateVideoFromNode: handleGenerateVideoFromNode,
            onTriggerVideoGen: (nodeId: string) => {
              setNodes((currentNodes) => {
                const target = currentNodes.find((cn) => cn.id === nodeId);
                const d = (target?.data as Record<string, any>) || {};
                setVideoGenSourceNodeId(nodeId);
                setVideoGenPrompt((d?.prompt as string) || "");
                setVideoGenStartFrameUrl((d?.imageUrl as string) || (d?.startFrameUrl as string) || null);
                setIsVideoGenModalOpen(true);
                return currentNodes;
              });
            },
          },
        };
      });
    },
    [handleRequestDeleteNode, handleUpdateNodeData, handleGenerateFromPrompt, handleOpenNodeActions, handlePreviewNode, handleGenerateVideoFromNode, setNodes]
  );

  const decorateEdges = useCallback((rawEdges: any[]): Edge[] => {
    return (rawEdges || []).map((e) => ({
      id: e.id,
      source: e.sourceNodeId,
      target: e.targetNodeId,
      sourceHandle: e.sourceHandle || undefined,
      targetHandle: e.targetHandle || undefined,
      animated: Boolean(e.animated),
      style: { stroke: "#6366f1", strokeWidth: 2.2 },
    }));
  }, []);

  // Load initial boards + library
  const fetchBoardsAndLibrary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/boards`);
      const json = await res.json();
      if (!res.ok || !json.data) return;

      const { project, boards: fetchedBoards, library: fetchedLib } = json.data;
      setCanEdit(Boolean(project?.canEdit ?? true));
      setLibrary(
        fetchedLib || {
          images: [],
          prompts: [],
          characters: [],
          environments: [],
          scenes: [],
        }
      );

      if (fetchedBoards && fetchedBoards.length > 0) {
        setBoards(
          fetchedBoards.map((b: any) => ({
            id: b.id,
            name: b.name,
            order: b.order,
            updatedAt: b.updatedAt,
          }))
        );
        const first = fetchedBoards[0];
        setActiveBoardId(first.id);
        setNodes(decorateNodes(first.nodes));
        setEdges(decorateEdges(first.edges));
        lastSavedStampRef.current = first.updatedAt || "";
      }
    } catch (err) {
      console.error("Erro ao carregar Space Board:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId, decorateNodes, decorateEdges, setNodes, setEdges]);

  useEffect(() => {
    fetchBoardsAndLibrary();
  }, [fetchBoardsAndLibrary]);

  // Save current board state to server (incluindo dimensões redimensionadas)
  const persistBoardNow = useCallback(
    async (currentNodes: Node[], currentEdges: Edge[]) => {
      if (!activeBoardId || !canEdit) return;
      setSaveStatus("saving");
      try {
        const vp = reactFlowInstance.getViewport();
        const payload = {
          viewport: { x: vp.x, y: vp.y, zoom: vp.zoom },
          nodes: currentNodes.map((n, index) => {
            const {
              onDeleteNode: _del,
              onUpdateNodeData: _upd,
              onGenerateFromPrompt: _gen,
              refType,
              refId,
              ...cleanData
            } = (n.data || {}) as Record<string, any>;
            const measuredW =
              n.measured?.width ||
              (typeof n.style?.width === "number" ? n.style.width : undefined) ||
              (typeof n.width === "number" ? n.width : undefined);
            const measuredH =
              n.measured?.height ||
              (typeof n.style?.height === "number" ? n.style.height : undefined) ||
              (typeof n.height === "number" ? n.height : undefined);

            return {
              id: n.id,
              type: n.type || "IMAGE",
              x: Math.round(n.position.x),
              y: Math.round(n.position.y),
              zIndex: index,
              refType: refType || null,
              refId: refId || null,
              data: {
                ...cleanData,
                width: measuredW ? Math.round(measuredW) : cleanData.width,
                height: measuredH ? Math.round(measuredH) : cleanData.height,
              },
            };
          }),
          edges: currentEdges.map((e) => ({
            id: e.id,
            sourceNodeId: e.source,
            targetNodeId: e.target,
            sourceHandle: e.sourceHandle || null,
            targetHandle: e.targetHandle || null,
            animated: Boolean(e.animated),
          })),
        };

        const res = await fetch(`/api/projects/${projectId}/boards/${activeBoardId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (res.ok && json.data) {
          lastSavedStampRef.current = json.data.updatedAt || "";
          setSaveStatus("saved");
        }
      } catch (err) {
        console.error("Falha no autosave do board:", err);
      }
    },
    [activeBoardId, canEdit, projectId, reactFlowInstance]
  );

  // Trigger debounced autosave whenever saveStatus becomes "unsaved"
  useEffect(() => {
    if (saveStatus !== "unsaved" || !canEdit || !activeBoardId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(() => {
      persistBoardNow(nodes, edges);
    }, 1100);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [saveStatus, nodes, edges, canEdit, activeBoardId, persistBoardNow]);

  // Collaborative Polling every 10 seconds when idle and tab visible
  useEffect(() => {
    if (!activeBoardId) return;
    const interval = setInterval(async () => {
      if (isInteractingRef.current || saveStatus !== "saved") return;
      // Aba oculta: não vale gastar requisição (o board é rebuscado ao voltar ao foco)
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      try {
        const res = await fetch(`/api/projects/${projectId}/boards/${activeBoardId}`);
        if (!res.ok) return;
        const json = await res.json();
        const remote = json.data;
        if (remote && remote.updatedAt && remote.updatedAt !== lastSavedStampRef.current) {
          lastSavedStampRef.current = remote.updatedAt;
          setNodes(decorateNodes(remote.nodes));
          setEdges(decorateEdges(remote.edges));
        }
      } catch {
        // ignore transient polling errors
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [activeBoardId, projectId, saveStatus, decorateNodes, decorateEdges, setNodes, setEdges]);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!canEdit) return;
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            id: `edge-${Date.now()}`,
            animated: true,
            style: { stroke: "#6366f1", strokeWidth: 2.2 },
          },
          eds
        )
      );
      setSaveStatus("unsaved");
    },
    [canEdit, setEdges]
  );

  // Switch active board page
  const handleSelectBoardPage = async (boardId: string) => {
    if (boardId === activeBoardId) return;
    if (saveStatus === "unsaved") {
      await persistBoardNow(nodes, edges);
    }
    setActiveBoardId(boardId);
    try {
      const res = await fetch(`/api/projects/${projectId}/boards/${boardId}`);
      const json = await res.json();
      if (res.ok && json.data) {
        setNodes(decorateNodes(json.data.nodes));
        setEdges(decorateEdges(json.data.edges));
        lastSavedStampRef.current = json.data.updatedAt || "";
        setSaveStatus("saved");
      }
    } catch (err) {
      console.error("Erro ao alternar página:", err);
    }
  };

  // Create new board page
  const handleCreateBoardPage = async () => {
    if (!canEdit) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/boards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (res.ok && json.data) {
        const newB = json.data;
        setBoards((prev) => [
          ...prev,
          { id: newB.id, name: newB.name, order: newB.order, updatedAt: newB.updatedAt },
        ]);
        setActiveBoardId(newB.id);
        setNodes([]);
        setEdges([]);
        lastSavedStampRef.current = newB.updatedAt || "";
        setSaveStatus("saved");
      }
    } catch (err) {
      console.error("Erro ao criar página:", err);
    }
  };

  // Helper to compute next node position near center
  const getNextCanvasPosition = () => {
    const vp = reactFlowInstance.getViewport();
    const offset = (nodes.length % 6) * 35;
    return {
      x: Math.round((-vp.x + 260) / (vp.zoom || 1) + offset),
      y: Math.round((-vp.y + 140) / (vp.zoom || 1) + offset),
    };
  };

  const handleCreateVideoNodeAt = (pos: { x: number; y: number }, sourceNodeId?: string | null) => {
    if (!canEdit) return;
    const videoCount = nodes.filter((n) => n.type === "VIDEO").length + 1;
    const newNodeId = `node-video-${Date.now()}`;
    const newNode: Node = {
      id: newNodeId,
      type: "VIDEO",
      position: pos,
      style: { width: 300, height: 460 },
      data: {
        label: `Gerador de vídeos #${videoCount}`,
        aspectRatio: "9:16",
        prompt:
          "High-altitude drone shot descending rapidly in a vertical tilt-down camera movement over a futuristic cyberpunk city...",
        width: 300,
        height: 460,
        onDeleteNode: handleRequestDeleteNode,
        onUpdateNodeData: handleUpdateNodeData,
        onOpenNodeActions: handleOpenNodeActions,
        onPreviewNode: handlePreviewNode,
      },
    };
    setNodes((nds) => [...nds, newNode]);
    if (sourceNodeId) {
      setEdges((eds) => [
        ...eds,
        {
          id: `edge-${sourceNodeId}-${newNodeId}`,
          source: sourceNodeId,
          target: newNodeId,
          animated: true,
          style: { stroke: "#a855f7", strokeWidth: 2.2 },
        },
      ]);
    }
    setSaveStatus("unsaved");
  };

  const handleCreatePromptNodeAt = (
    pos: { x: number; y: number },
    sourceNodeId?: string | null,
    customPrompt = "",
    customLabel = "Prompt Cinematográfico"
  ) => {
    if (!canEdit) return;
    const newNodeId = `node-prompt-${Date.now()}`;
    const newNode: Node = {
      id: newNodeId,
      type: "PROMPT",
      position: pos,
      style: { width: 320, height: 220 },
      data: {
        label: customLabel,
        prompt: customPrompt,
        width: 320,
        height: 220,
        onDeleteNode: handleRequestDeleteNode,
        onUpdateNodeData: handleUpdateNodeData,
        onGenerateFromPrompt: handleGenerateFromPrompt,
        onOpenNodeActions: handleOpenNodeActions,
      },
    };
    setNodes((nds) => [...nds, newNode]);
    if (sourceNodeId) {
      setEdges((eds) => [
        ...eds,
        {
          id: `edge-${sourceNodeId}-${newNodeId}`,
          source: sourceNodeId,
          target: newNodeId,
          animated: true,
          style: { stroke: "#6366f1", strokeWidth: 2.2 },
        },
      ]);
    }
    setSaveStatus("unsaved");
  };

  const handleCreateNoteNodeAt = (pos: { x: number; y: number }, sourceNodeId?: string | null) => {
    if (!canEdit) return;
    const newNodeId = `node-note-${Date.now()}`;
    const newNode: Node = {
      id: newNodeId,
      type: "TEXT_NOTE",
      position: pos,
      style: { width: 240, height: 180 },
      data: {
        text: "",
        width: 240,
        height: 180,
        onDeleteNode: handleRequestDeleteNode,
        onUpdateNodeData: handleUpdateNodeData,
        onOpenNodeActions: handleOpenNodeActions,
      },
    };
    setNodes((nds) => [...nds, newNode]);
    if (sourceNodeId) {
      setEdges((eds) => [
        ...eds,
        {
          id: `edge-${sourceNodeId}-${newNodeId}`,
          source: sourceNodeId,
          target: newNodeId,
          animated: true,
          style: { stroke: "#f59e0b", strokeWidth: 2.2 },
        },
      ]);
    }
    setSaveStatus("unsaved");
  };

  // Add specialized nodes from toolbar or library
  const addVideoGeneratorNode = () => {
    handleCreateVideoNodeAt(getNextCanvasPosition());
  };

  const addPromptNode = (customPrompt = "", customLabel = "Prompt Cinematográfico") => {
    handleCreatePromptNodeAt(getNextCanvasPosition(), null, customPrompt, customLabel);
  };

  const addNoteNode = () => {
    handleCreateNoteNodeAt(getNextCanvasPosition());
  };

  const addLibraryItemToBoard = (
    itemType: "IMAGE" | "PROMPT" | "CHARACTER" | "ENVIRONMENT" | "SCENE",
    item: any,
    customPos?: { x: number; y: number },
    sourceNodeId?: string | null
  ) => {
    if (!canEdit) return;
    const pos = customPos || getNextCanvasPosition();
    const idSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    let createdNodeId = "";

    if (itemType === "IMAGE") {
      createdNodeId = `node-img-${idSuffix}`;
      const newNode: Node = {
        id: createdNodeId,
        type: "IMAGE",
        position: pos,
        style: { width: 300, height: 300 },
        data: {
          label: `#${nodes.filter((n) => n.type === "IMAGE").length + 1} · ${item.modelId || "Imagem"}`,
          imageUrl: item.imageUrl,
          prompt: item.prompt,
          modelId: item.modelId,
          aspectRatio: item.aspectRatio || "1:1",
          width: 300,
          height: 300,
          refType: "GENERATED_IMAGE",
          refId: item.id,
          onDeleteNode: handleRequestDeleteNode,
          onUpdateNodeData: handleUpdateNodeData,
          onOpenNodeActions: handleOpenNodeActions,
          onPreviewNode: handlePreviewNode,
          onGenerateVideoFromNode: handleGenerateVideoFromNode,
        },
      };
      setNodes((nds) => [...nds, newNode]);
    } else if (itemType === "PROMPT") {
      createdNodeId = `node-prompt-${idSuffix}`;
      const newNode: Node = {
        id: createdNodeId,
        type: "PROMPT",
        position: pos,
        style: { width: 320, height: 220 },
        data: {
          label: `Cena ${item.sceneOrder || ""}: ${item.sceneTitle || "Prompt"} (v${item.version || 1})`,
          prompt: item.promptText,
          width: 320,
          height: 220,
          refType: "PROMPT_VERSION",
          refId: item.id,
          onDeleteNode: handleRequestDeleteNode,
          onUpdateNodeData: handleUpdateNodeData,
          onGenerateFromPrompt: handleGenerateFromPrompt,
          onOpenNodeActions: handleOpenNodeActions,
        },
      };
      setNodes((nds) => [...nds, newNode]);
    } else {
      createdNodeId = `node-ent-${idSuffix}`;
      const newNode: Node = {
        id: createdNodeId,
        type: itemType,
        position: pos,
        style: { width: 270, height: 240 },
        data: {
          entityType: itemType,
          label: item.name || item.title,
          title: item.name || item.title,
          description: item.description || "",
          width: 270,
          height: 240,
          refType: itemType,
          refId: item.id,
          onDeleteNode: handleRequestDeleteNode,
          onUpdateNodeData: handleUpdateNodeData,
          onOpenNodeActions: handleOpenNodeActions,
          onPreviewNode: handlePreviewNode,
        },
      };
      setNodes((nds) => [...nds, newNode]);
    }

    if (sourceNodeId && createdNodeId) {
      setEdges((eds) => [
        ...eds,
        {
          id: `edge-${sourceNodeId}-${createdNodeId}`,
          source: sourceNodeId,
          target: createdNodeId,
          animated: true,
          style: { stroke: "#6366f1", strokeWidth: 2.2 },
        },
      ]);
    }

    setSaveStatus("unsaved");
  };

  // Botão direito do mouse em um NÓ específico
  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      event.stopPropagation();
      const clientX = event.clientX;
      const clientY = event.clientY;
      const flowPos = reactFlowInstance.screenToFlowPosition({ x: clientX, y: clientY });
      const menuWidth = 270;
      const menuHeight = 350;
      const clampedX = Math.min(clientX, (typeof window !== "undefined" ? window.innerWidth : 1200) - menuWidth);
      const clampedY = Math.min(clientY, (typeof window !== "undefined" ? window.innerHeight : 800) - menuHeight);

      setContextMenu({
        x: Math.max(10, clampedX),
        y: Math.max(10, clampedY),
        flowPos,
        sourceNodeId: node.id,
        isNodeContext: true,
        targetNode: node,
      });
    },
    [reactFlowInstance]
  );

  // Botão direito do mouse no canvas vazio (abre menu de criação na posição do clique)
  const onPaneContextMenu = useCallback(
    (event: React.MouseEvent | MouseEvent) => {
      event.preventDefault();
      if (!canEdit) return;
      const clientX = event.clientX;
      const clientY = event.clientY;
      const flowPos = reactFlowInstance.screenToFlowPosition({ x: clientX, y: clientY });
      const menuWidth = 270;
      const menuHeight = 420;
      const clampedX = Math.min(clientX, (typeof window !== "undefined" ? window.innerWidth : 1200) - menuWidth);
      const clampedY = Math.min(clientY, (typeof window !== "undefined" ? window.innerHeight : 800) - menuHeight);

      setContextMenu({
        x: Math.max(10, clampedX),
        y: Math.max(10, clampedY),
        flowPos,
        sourceNodeId: null,
        isNodeContext: false,
        targetNode: null,
      });
    },
    [canEdit, reactFlowInstance]
  );

  // Arrastar conector para espaço vazio abre menu para criar nó conectado
  const onConnectStart = useCallback(
    (_event: any, params: { nodeId: string | null }) => {
      connectingNodeIdRef.current = params.nodeId;
    },
    []
  );

  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
      const sourceNodeId = connectingNodeIdRef.current;
      connectingNodeIdRef.current = null;
      if (!sourceNodeId || !canEdit) return;

      const target = event.target as HTMLElement | null;
      const isPane =
        target?.classList?.contains("react-flow__pane") ||
        Boolean(target?.closest(".react-flow__pane")) ||
        target?.tagName === "svg";

      if (isPane) {
        const clientX =
          "clientX" in event
            ? event.clientX
            : "touches" in event && event.touches?.[0]
              ? event.touches[0].clientX
              : 0;
        const clientY =
          "clientY" in event
            ? event.clientY
            : "touches" in event && event.touches?.[0]
              ? event.touches[0].clientY
              : 0;
        const flowPos = reactFlowInstance.screenToFlowPosition({ x: clientX, y: clientY });

        setContextMenu({
          x: clientX,
          y: clientY,
          flowPos,
          sourceNodeId,
        });
      }
    },
    [canEdit, reactFlowInstance]
  );

  // Drag & Drop from Library Drawer onto ReactFlow Canvas
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      if (!canEdit) return;
      const raw = event.dataTransfer.getData("application/tomadix-space-item");
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        const position = reactFlowInstance.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });
        addLibraryItemToBoard(parsed.itemType, parsed.item, position);
      } catch (e) {
        console.error("Erro ao soltar item no board:", e);
      }
    },
    [canEdit, reactFlowInstance, addLibraryItemToBoard]
  );

  // Auto-organize nodes in a clean grid
  const handleAutoOrganize = () => {
    if (!canEdit || nodes.length === 0) return;
    setNodes((nds) =>
      nds.map((n, idx) => {
        const col = idx % 3;
        const row = Math.floor(idx / 3);
        return {
          ...n,
          position: {
            x: 100 + col * 370,
            y: 90 + row * 430,
          },
        };
      })
    );
    setSaveStatus("unsaved");
    setTimeout(() => reactFlowInstance.fitView({ padding: 0.2, duration: 400 }), 50);
  };

  return (
    <div className="relative h-[calc(100dvh-8.5rem)] min-h-[440px] sm:min-h-[560px] w-full overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-2xl">
      <BoardTopBar projectTitle={projectTitle} saveStatus={saveStatus} canEdit={canEdit} onSwitchToClassicStudio={onSwitchToClassicStudio} onOpenShareModal={onOpenShareModal} />

      <BoardToolbar canEdit={canEdit} isLibraryOpen={isLibraryOpen} onToggleLibrary={() => setIsLibraryOpen((prev) => !prev)} onGenerateImage={openImageGenerator} onGenerateVideo={openVideoGenerator} addVideoGeneratorNode={addVideoGeneratorNode} addPromptNode={() => addPromptNode()} addNoteNode={addNoteNode} handleAutoOrganize={handleAutoOrganize} onFitView={() => reactFlowInstance.fitView({ padding: 0.2, duration: 350 })} />

      {isLibraryOpen && (
        <LibraryDrawer canEdit={canEdit} libraryTab={libraryTab} setLibraryTab={setLibraryTab} library={library} onClose={() => setIsLibraryOpen(false)} onGenerateImage={openImageGenerator} addLibraryItemToBoard={addLibraryItemToBoard} />
      )}

      <PageSwitcher boards={boards} activeBoardId={activeBoardId} canEdit={canEdit} handleSelectBoardPage={handleSelectBoardPage} handleCreateBoardPage={handleCreateBoardPage} />

      <ZoomControls zoomPercent={zoomPercent} onZoomIn={() => reactFlowInstance.zoomIn({ duration: 200 })} onZoomOut={() => reactFlowInstance.zoomOut({ duration: 200 })} />

      {/* React Flow Infinite Canvas */}
      {loading ? (
        <div className="flex h-full w-full items-center justify-center text-sm text-on-surface-variant">
          Carregando Space colaborativo...
        </div>
      ) : (
        <ReactFlow
          nodes={visibleNodes}
          edges={visibleEdges}
          nodeTypes={BOARD_NODE_TYPES}
          deleteKeyCode={["Delete", "Backspace"]}
          onNodesDelete={(deletedNodes) => {
            if (!canEdit) return;
            const deletedIds = new Set(deletedNodes.map((n) => n.id));
            setEdges((eds) => eds.filter((e) => !deletedIds.has(e.source) && !deletedIds.has(e.target)));
            setSaveStatus("unsaved");
          }}
          onEdgesDelete={() => {
            if (!canEdit) return;
            setSaveStatus("unsaved");
          }}
          onNodesChange={(changes) => {
            onNodesChange(changes);
            if (
              canEdit &&
              changes.some(
                (c) =>
                  c.type === "position" ||
                  c.type === "remove" ||
                  c.type === "dimensions"
              )
            ) {
              setSaveStatus("unsaved");
            }
          }}
          onEdgesChange={(changes) => {
            onEdgesChange(changes);
            if (canEdit) setSaveStatus("unsaved");
          }}
          onConnect={onConnect}
          onConnectStart={onConnectStart}
          onConnectEnd={onConnectEnd}
          onPaneContextMenu={onPaneContextMenu}
          onNodeContextMenu={onNodeContextMenu}
          onPaneClick={() => setContextMenu(null)}
          onNodeDragStart={() => {
            isInteractingRef.current = true;
            setContextMenu(null);
          }}
          onNodeDragStop={() => {
            isInteractingRef.current = false;
            if (canEdit) setSaveStatus("unsaved");
          }}
          onMove={(_evt, viewport) => {
            setZoomPercent(Math.round((viewport.zoom || 1) * 100));
            if (contextMenu) setContextMenu(null);
          }}
          onDragOver={onDragOver}
          onDrop={onDrop}
          nodesDraggable={canEdit}
          nodesConnectable={canEdit}
          elementsSelectable={true}
          connectionLineStyle={{ stroke: "#10b981", strokeWidth: 2.5 }}
          fitView
          fitViewOptions={{ padding: 0.22 }}
          minZoom={0.15}
          maxZoom={2.5}
          className="bg-surface-container-lowest"
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={22}
            size={1.4}
            color="#94a3b8"
          />
        </ReactFlow>
      )}

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[130] rounded-2xl bg-emerald-500/90 border border-emerald-400 text-white px-4 py-2.5 text-xs font-semibold shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
          ✓ {toastMessage}
        </div>
      )}

      {contextMenu && (
        <BoardContextMenu contextMenu={contextMenu} setContextMenu={setContextMenu} genTargetPosRef={genTargetPosRef} setSafeDeleteTarget={setSafeDeleteTarget} setEditNode={setEditNode} setEditLabel={setEditLabel} setEditPrompt={setEditPrompt} setPreviewNode={setPreviewNode} setIsGenModalOpen={setIsGenModalOpen} setGenInitialPrompt={setGenInitialPrompt} setGenSourceNodeId={setGenSourceNodeId} setIsVideoGenModalOpen={setIsVideoGenModalOpen} setVideoGenPrompt={setVideoGenPrompt} setVideoGenStartFrameUrl={setVideoGenStartFrameUrl} setVideoGenSourceNodeId={setVideoGenSourceNodeId} library={library} handleGenerateVideoFromNode={handleGenerateVideoFromNode} duplicateNode={duplicateNode} handleCreatePromptNodeAt={handleCreatePromptNodeAt} handleCreateNoteNodeAt={handleCreateNoteNodeAt} addLibraryItemToBoard={addLibraryItemToBoard} />
      )}

      {safeDeleteTarget && (
        <SafeDeleteModal safeDeleteTarget={safeDeleteTarget} setSafeDeleteTarget={setSafeDeleteTarget} executeDeleteNode={executeDeleteNode} />
      )}

      {nodeActionsTarget && (
        <NodeActionsSheet nodeActionsTarget={nodeActionsTarget} setNodeActionsTarget={setNodeActionsTarget} setSafeDeleteTarget={setSafeDeleteTarget} setEditNode={setEditNode} setEditLabel={setEditLabel} setEditPrompt={setEditPrompt} setPreviewNode={setPreviewNode} handleGenerateVideoFromNode={handleGenerateVideoFromNode} duplicateNode={duplicateNode} />
      )}

      {editNode && (
        <EditNodeModal editNode={editNode} setEditNode={setEditNode} editLabel={editLabel} setEditLabel={setEditLabel} editPrompt={editPrompt} setEditPrompt={setEditPrompt} setToastMessage={setToastMessage} handleUpdateNodeData={handleUpdateNodeData} />
      )}

      {previewNode && (
        <PreviewModal previewNode={previewNode} setPreviewNode={setPreviewNode} handleGenerateVideoFromNode={handleGenerateVideoFromNode} />
      )}

      {/* Modal de Geração de Imagem Direta no Board */}
      <DirectEntityImageModal
        isOpen={isGenModalOpen}
        onClose={() => {
          setIsGenModalOpen(false);
          genTargetPosRef.current = null;
        }}
        projectId={projectId}
        entityType="SCENE_START"
        title="Gerar Imagem no Space Board"
        subtitle="A imagem gerada será adicionada automaticamente como um nó conectável no board"
        initialPrompt={genInitialPrompt}
        onImageGenerated={(result: { imageUrl: string; imageId: string }) => {
          const newImgObj = {
            id: result.imageId,
            imageUrl: result.imageUrl,
            prompt: genInitialPrompt,
            modelId: "IA",
            aspectRatio: "16:9",
          };
          setLibrary((prev) => ({
            ...prev,
            images: [newImgObj, ...prev.images],
          }));

          const pos = genTargetPosRef.current || getNextCanvasPosition();
          genTargetPosRef.current = null;

          const newImgNodeId = `node-img-${result.imageId || Date.now()}`;
          const newNode: Node = {
            id: newImgNodeId,
            type: "IMAGE",
            position: pos,
            style: { width: 320, height: 260 },
            data: {
              label: `#${nodes.filter((n) => n.type === "IMAGE").length + 1} · Imagem IA`,
              imageUrl: result.imageUrl,
              prompt: genInitialPrompt,
              modelId: "IA",
              aspectRatio: "16:9",
              width: 320,
              height: 260,
              refType: "GENERATED_IMAGE",
              refId: result.imageId,
              onDeleteNode: handleRequestDeleteNode,
              onUpdateNodeData: handleUpdateNodeData,
              onOpenNodeActions: handleOpenNodeActions,
              onPreviewNode: handlePreviewNode,
              onGenerateVideoFromNode: handleGenerateVideoFromNode,
            },
          };

          setNodes((nds) => [...nds, newNode]);

          if (genSourceNodeId) {
            setEdges((eds) => [
              ...eds,
              {
                id: `edge-${genSourceNodeId}-${newImgNodeId}`,
                source: genSourceNodeId,
                target: newImgNodeId,
                animated: true,
                style: { stroke: "#6366f1", strokeWidth: 2.2 },
              },
            ]);
          }
          setSaveStatus("unsaved");
          setIsGenModalOpen(false);
        }}
      />

      {/* Modal de Geração de Vídeo Direta no Board (Pollinations API) */}
      <DirectVideoModal
        isOpen={isVideoGenModalOpen}
        onClose={() => {
          setIsVideoGenModalOpen(false);
          setVideoGenSourceNodeId(null);
          setVideoGenStartFrameUrl(null);
        }}
        projectId={projectId}
        initialPrompt={videoGenPrompt}
        startFrameUrl={videoGenStartFrameUrl || undefined}
        onVideoGenerated={(result) => {
          const pos = genTargetPosRef.current || getNextCanvasPosition();
          genTargetPosRef.current = null;

          const newVideoNodeId = `node-video-${result.videoId || Date.now()}`;
          const newNode: Node = {
            id: newVideoNodeId,
            type: "VIDEO",
            position: pos,
            style: { width: 340, height: 420 },
            data: {
              label: `#${nodes.filter((n) => n.type === "VIDEO").length + 1} · Vídeo IA`,
              videoUrl: result.videoUrl,
              prompt: result.prompt,
              duration: result.duration,
              aspectRatio: "16:9",
              width: 340,
              height: 420,
              refType: "GENERATED_VIDEO",
              refId: result.videoId,
              onDeleteNode: handleRequestDeleteNode,
              onUpdateNodeData: handleUpdateNodeData,
              onOpenNodeActions: handleOpenNodeActions,
              onPreviewNode: handlePreviewNode,
            },
          };

          setNodes((nds) => [...nds, newNode]);

          if (videoGenSourceNodeId) {
            setEdges((eds) => [
              ...eds,
              {
                id: `edge-${videoGenSourceNodeId}-${newVideoNodeId}`,
                source: videoGenSourceNodeId,
                target: newVideoNodeId,
                animated: true,
                style: { stroke: "#a855f7", strokeWidth: 2.2 },
              },
            ]);
          }

          setSaveStatus("unsaved");
          setToastMessage("Vídeo gerado e inserido no Space Board com sucesso!");
          setTimeout(() => setToastMessage(null), 4000);
        }}
      />
    </div>
  );
}

export function SpaceBoardCanvas(props: SpaceBoardCanvasProps) {
  return (
    <ReactFlowProvider>
      <SpaceBoardCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
