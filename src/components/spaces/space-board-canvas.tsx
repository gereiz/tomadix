"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  ReactFlowProvider,
  useReactFlow,
  NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { DirectEntityImageModal } from "@/components/image-generation/direct-entity-image-modal";

// ============================================================================
// CUSTOM NODE COMPONENTS
// ============================================================================

function ImageBoardNode({ id, data, selected }: NodeProps) {
  const d = (data || {}) as Record<string, any>;
  const imageUrl = d.imageUrl || "";
  const label = d.label || d.modelId || "Imagem IA";
  const prompt = d.prompt || "";
  const aspectRatio = d.aspectRatio || "1:1";

  const aspectClass =
    aspectRatio === "9:16"
      ? "aspect-[9/16] w-[240px]"
      : aspectRatio === "16:9"
      ? "aspect-[16/9] w-[340px]"
      : aspectRatio === "21:9"
      ? "aspect-[21/9] w-[380px]"
      : aspectRatio === "4:3"
      ? "aspect-[4/3] w-[300px]"
      : "aspect-square w-[260px]";

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!imageUrl) return;
    const downloadUrl = `/api/images/download?url=${encodeURIComponent(
      imageUrl
    )}&filename=${encodeURIComponent(`space-image-${id}.png`)}`;
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `space-image-${id}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="group relative select-none">
      {/* Top Floating Label (Magnific style) */}
      <div className="mb-1.5 flex items-center justify-between px-1 text-[11px] font-medium text-on-surface-variant">
        <span className="flex items-center gap-1.5 truncate max-w-[200px]">
          <span className="text-xs">🖼️</span>
          <span className="font-mono font-semibold">{label}</span>
        </span>
        {d.onDeleteNode && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              d.onDeleteNode(id);
            }}
            className="opacity-0 group-hover:opacity-100 rounded px-1.5 py-0.5 text-[10px] text-red-400 hover:bg-red-500/15 transition"
            title="Remover do board"
          >
            ✕
          </button>
        )}
      </div>

      {/* Main Image Card */}
      <div
        className={`relative overflow-hidden rounded-2xl border bg-[#0e121b] shadow-xl transition-all ${aspectClass} ${
          selected
            ? "border-primary ring-2 ring-primary/40 shadow-primary/20"
            : "border-outline-variant/40 hover:border-outline"
        }`}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={prompt || label}
            className="h-full w-full object-cover pointer-events-none"
            draggable={false}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-white/40">
            Sem imagem
          </div>
        )}

        {/* Hover Overlay with Prompt & Download */}
        <div className=" theme-preserve-dark absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          {prompt && (
            <p className="line-clamp-3 text-[11px] leading-snug text-white/90">
              {prompt}
            </p>
          )}
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="rounded bg-white/15 px-1.5 py-0.5 font-mono text-[9px] text-white/80">
              {aspectRatio}
            </span>
            <button
              type="button"
              onClick={handleDownload}
              className="rounded-lg bg-white/20 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-sm hover:bg-white/30"
            >
              ⬇ Baixar
            </button>
          </div>
        </div>
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!h-4 !w-4 !rounded-full !border-2 !border-primary !bg-surface-container shadow-md"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!h-4 !w-4 !rounded-full !border-2 !border-primary !bg-surface-container shadow-md"
      />
    </div>
  );
}

function VideoGeneratorBoardNode({ id, data, selected }: NodeProps) {
  const d = (data || {}) as Record<string, any>;
  const label = d.label || "Gerador de vídeos #1";
  const previewUrl = d.imageUrl || d.startFrameUrl || "";
  const motionPrompt =
    d.prompt ||
    "High-altitude cinematic camera movement, smooth tracking shot, volumetric lighting, 4k photorealistic motion...";
  const aspectRatio = d.aspectRatio || "9:16";

  const [localPrompt, setLocalPrompt] = useState(motionPrompt);
  const [localRatio, setLocalRatio] = useState(aspectRatio);

  useEffect(() => {
    setLocalPrompt(motionPrompt);
  }, [motionPrompt]);

  const commitChange = (nextPrompt: string, nextRatio: string) => {
    if (d.onUpdateNodeData) {
      d.onUpdateNodeData(id, {
        ...d,
        prompt: nextPrompt,
        aspectRatio: nextRatio,
      });
    }
  };

  return (
    <div className="group relative select-none w-[300px]">
      {/* Top Floating Label (Magnific style) */}
      <div className="mb-1.5 flex items-center justify-between px-1 text-[11px] font-medium text-on-surface-variant">
        <span className="flex items-center gap-1.5">
          <span>🎬</span>
          <span className="font-mono font-semibold">{label}</span>
        </span>
        <div className="flex items-center gap-1">
          <span className="rounded-full bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 text-[9px] font-bold text-purple-400">
            VÍDEO IA
          </span>
          {d.onDeleteNode && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                d.onDeleteNode(id);
              }}
              className="opacity-0 group-hover:opacity-100 rounded px-1.5 py-0.5 text-[10px] text-red-400 hover:bg-red-500/15 transition"
              title="Remover do board"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Video Card Container */}
      <div
        className={`theme-preserve-dark relative overflow-hidden rounded-2xl border bg-[#0d111a] text-white shadow-2xl transition-all ${
          selected
            ? "border-purple-400 ring-2 ring-purple-500/40"
            : "border-white/15 hover:border-purple-400/50"
        }`}
      >
        {/* Visual Frame Area */}
        <div className="relative aspect-[9/14] w-full overflow-hidden bg-gradient-to-br from-indigo-950/80 via-[#0b0f19] to-purple-950/70">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={label}
              className="h-full w-full object-cover opacity-90 pointer-events-none"
              draggable={false}
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/10 text-2xl shadow-inner backdrop-blur-md">
                ▶
              </div>
              <p className="text-xs font-semibold text-white/90">
                Pipeline de Vídeo Preparado
              </p>
              <p className="mt-1 text-[11px] text-white/55">
                Conecte imagens como Frame Inicial / Final nos conectores à esquerda
              </p>
            </div>
          )}

          {/* Top Ratio & Status Pill */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
            <select
              value={localRatio}
              onChange={(e) => {
                setLocalRatio(e.target.value);
                commitChange(localPrompt, e.target.value);
              }}
              onClick={(e) => e.stopPropagation()}
              className="rounded-lg border border-white/20 bg-black/60 px-2 py-1 text-[10px] font-mono text-white backdrop-blur-md focus:outline-none"
            >
              <option value="9:16">9:16 Vertical</option>
              <option value="16:9">16:9 Cinema</option>
              <option value="1:1">1:1 Square</option>
            </select>
            <span className="rounded-lg bg-black/60 border border-white/15 px-2 py-1 text-[9px] font-mono uppercase tracking-wider text-amber-300 backdrop-blur-md">
              ⚡ Em Breve
            </span>
          </div>

          {/* Bottom Motion Prompt Overlay (matches Magnific screenshot) */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent p-3.5 pt-8">
            <textarea
              rows={3}
              value={localPrompt}
              onChange={(e) => setLocalPrompt(e.target.value)}
              onBlur={() => commitChange(localPrompt, localRatio)}
              onClick={(e) => e.stopPropagation()}
              placeholder="Descreva o movimento de câmera e ação do vídeo..."
              className="w-full resize-none rounded-lg border border-white/10 bg-black/40 p-2 text-[11px] leading-snug text-white/95 placeholder:text-white/40 focus:border-purple-400 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Left Connection Handles for Start Frame, End Frame & Prompt */}
      <Handle
        type="target"
        id="start-frame"
        position={Position.Left}
        style={{ top: "30%" }}
        title="Conectar Frame Inicial (Imagem)"
        className="!h-4 !w-4 !rounded-full !border-2 !border-purple-400 !bg-surface-container shadow-md"
      />
      <Handle
        type="target"
        id="end-frame"
        position={Position.Left}
        style={{ top: "65%" }}
        title="Conectar Frame Final (Imagem)"
        className="!h-4 !w-4 !rounded-full !border-2 !border-purple-400 !bg-surface-container shadow-md"
      />
      <Handle
        type="target"
        id="motion-prompt"
        position={Position.Left}
        style={{ top: "85%" }}
        title="Conectar Prompt de Movimento"
        className="!h-4 !w-4 !rounded-full !border-2 !border-amber-400 !bg-surface-container shadow-md"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!h-4 !w-4 !rounded-full !border-2 !border-purple-400 !bg-surface-container shadow-md"
      />
    </div>
  );
}

function PromptBoardNode({ id, data, selected }: NodeProps) {
  const d = (data || {}) as Record<string, any>;
  const label = d.label || "Prompt Cinematográfico";
  const [promptText, setPromptText] = useState(d.prompt || d.description || "");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setPromptText(d.prompt || d.description || "");
  }, [d.prompt, d.description]);

  const handleBlur = () => {
    if (d.onUpdateNodeData && promptText !== d.prompt) {
      d.onUpdateNodeData(id, { ...d, prompt: promptText });
    }
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(promptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="group relative w-[310px] select-none">
      <div className="mb-1 flex items-center justify-between px-1 text-[11px] font-medium text-on-surface-variant">
        <span className="flex items-center gap-1.5 truncate">
          <span>📜</span>
          <span className="font-semibold truncate">{label}</span>
        </span>
        {d.onDeleteNode && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              d.onDeleteNode(id);
            }}
            className="opacity-0 group-hover:opacity-100 rounded px-1.5 py-0.5 text-[10px] text-red-400 hover:bg-red-500/15 transition"
          >
            ✕
          </button>
        )}
      </div>

      <div
        className={`rounded-2xl border bg-surface-container p-3.5 shadow-lg transition-all ${
          selected
            ? "border-primary ring-2 ring-primary/30"
            : "border-outline-variant/40 hover:border-outline"
        }`}
      >
        <textarea
          rows={4}
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          onBlur={handleBlur}
          onClick={(e) => e.stopPropagation()}
          placeholder="Escreva ou edite o prompt..."
          className="w-full resize-none rounded-xl border border-outline-variant/30 bg-surface-container-low p-2.5 text-xs leading-relaxed text-on-surface focus:border-primary focus:outline-none"
        />

        <div className="mt-2.5 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-lg border border-outline-variant/30 bg-surface-container-high px-2.5 py-1 text-[11px] font-medium text-on-surface-variant hover:text-on-surface"
          >
            {copied ? "✓ Copiado" : "📋 Copiar"}
          </button>

          {d.onGenerateFromPrompt && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                d.onGenerateFromPrompt(promptText, id);
              }}
              className="rounded-lg bg-primary/15 border border-primary/30 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/25 transition"
            >
              🎨 Gerar Imagem
            </button>
          )}
        </div>
      </div>

      <Handle
        type="target"
        position={Position.Left}
        className="!h-3.5 !w-3.5 !rounded-full !border-2 !border-primary !bg-surface-container"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3.5 !w-3.5 !rounded-full !border-2 !border-primary !bg-surface-container"
      />
    </div>
  );
}

function EntityBoardNode({ id, data, selected }: NodeProps) {
  const d = (data || {}) as Record<string, any>;
  const entityType = d.entityType || "ENTITY";
  const badge =
    entityType === "CHARACTER"
      ? { icon: "👤", label: "Personagem", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" }
      : entityType === "ENVIRONMENT"
      ? { icon: "🏛️", label: "Ambiente", color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30" }
      : { icon: "🎬", label: "Cena", color: "text-amber-400 bg-amber-500/10 border-amber-500/30" };

  return (
    <div className="group relative w-[270px] select-none">
      <div className="mb-1 flex items-center justify-between px-1 text-[11px] text-on-surface-variant">
        <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${badge.color}`}>
          <span>{badge.icon}</span>
          <span>{badge.label}</span>
        </span>
        {d.onDeleteNode && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              d.onDeleteNode(id);
            }}
            className="opacity-0 group-hover:opacity-100 rounded px-1.5 py-0.5 text-[10px] text-red-400 hover:bg-red-500/15 transition"
          >
            ✕
          </button>
        )}
      </div>

      <div
        className={`overflow-hidden rounded-2xl border bg-surface-container p-3.5 shadow-lg transition-all ${
          selected
            ? "border-primary ring-2 ring-primary/30"
            : "border-outline-variant/40 hover:border-outline"
        }`}
      >
        {d.imageUrl && (
          <div className="mb-2.5 aspect-[16/10] w-full overflow-hidden rounded-xl bg-black/30">
            <img
              src={d.imageUrl}
              alt={d.title || d.label}
              className="h-full w-full object-cover pointer-events-none"
            />
          </div>
        )}
        <h4 className="text-sm font-bold text-on-surface truncate">
          {d.title || d.label || "Elemento"}
        </h4>
        {d.description && (
          <p className="mt-1 line-clamp-3 text-xs text-on-surface-variant leading-relaxed">
            {d.description}
          </p>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Left}
        className="!h-3.5 !w-3.5 !rounded-full !border-2 !border-primary !bg-surface-container"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3.5 !w-3.5 !rounded-full !border-2 !border-primary !bg-surface-container"
      />
    </div>
  );
}

function NoteBoardNode({ id, data, selected }: NodeProps) {
  const d = (data || {}) as Record<string, any>;
  const [text, setText] = useState(d.text || "");

  useEffect(() => {
    setText(d.text || "");
  }, [d.text]);

  return (
    <div
      className={`group relative w-[240px] rounded-2xl border p-3.5 shadow-lg transition-all ${
        selected
          ? "border-amber-400 ring-2 ring-amber-400/30"
          : "border-amber-500/30"
      } bg-amber-500/10 backdrop-blur-md`}
    >
      <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-amber-400">
        <span>📝 Nota da Equipe</span>
        {d.onDeleteNode && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              d.onDeleteNode(id);
            }}
            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300"
          >
            ✕
          </button>
        )}
      </div>
      <textarea
        rows={4}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => d.onUpdateNodeData?.(id, { ...d, text })}
        onClick={(e) => e.stopPropagation()}
        placeholder="Escreva uma anotação ou direção criativa..."
        className="w-full resize-none bg-transparent text-xs leading-relaxed text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none"
      />
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !rounded-full !border-2 !border-amber-400 !bg-surface-container"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !rounded-full !border-2 !border-amber-400 !bg-surface-container"
      />
    </div>
  );
}

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

  const [boards, setBoards] = useState<Array<{ id: string; name: string; order: number; updatedAt?: string }>>([]);
  const [activeBoardId, setActiveBoardId] = useState<string>("");
  const [canEdit, setCanEdit] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [zoomPercent, setZoomPercent] = useState<number>(85);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Library drawer state
  const [isLibraryOpen, setIsLibraryOpen] = useState<boolean>(false);
  const [libraryTab, setLibraryTab] = useState<"images" | "prompts" | "characters" | "environments" | "scenes">("images");
  const [library, setLibrary] = useState<{
    images: any[];
    prompts: any[];
    characters: any[];
    environments: any[];
    scenes: any[];
  }>({
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

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      if (!canEdit) return;
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      setSaveStatus("unsaved");
    },
    [canEdit, setNodes, setEdges]
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
    setIsGenModalOpen(true);
  }, []);

  const decorateNodes = useCallback(
    (rawNodes: any[]): Node[] => {
      return (rawNodes || []).map((n) => ({
        id: n.id,
        type: n.type || "IMAGE",
        position: { x: Number(n.x) || 0, y: Number(n.y) || 0 },
        data: {
          ...(n.data || {}),
          refType: n.refType,
          refId: n.refId,
          onDeleteNode: handleDeleteNode,
          onUpdateNodeData: handleUpdateNodeData,
          onGenerateFromPrompt: handleGenerateFromPrompt,
        },
      }));
    },
    [handleDeleteNode, handleUpdateNodeData, handleGenerateFromPrompt]
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

  // Save current board state to server
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
            return {
              id: n.id,
              type: n.type || "IMAGE",
              x: Math.round(n.position.x),
              y: Math.round(n.position.y),
              zIndex: index,
              refType: refType || null,
              refId: refId || null,
              data: cleanData,
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

  // Collaborative Polling every 6 seconds when idle
  useEffect(() => {
    if (!activeBoardId) return;
    const interval = setInterval(async () => {
      if (isInteractingRef.current || saveStatus !== "saved") return;
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
    }, 6000);

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

  // Add specialized nodes from toolbar or library
  const addVideoGeneratorNode = () => {
    if (!canEdit) return;
    const pos = getNextCanvasPosition();
    const videoCount = nodes.filter((n) => n.type === "VIDEO").length + 1;
    const newNode: Node = {
      id: `node-video-${Date.now()}`,
      type: "VIDEO",
      position: pos,
      data: {
        label: `Gerador de vídeos #${videoCount}`,
        aspectRatio: "9:16",
        prompt:
          "High-altitude drone shot descending rapidly in a vertical tilt-down camera movement over a futuristic cyberpunk city...",
        onDeleteNode: handleDeleteNode,
        onUpdateNodeData: handleUpdateNodeData,
      },
    };
    setNodes((nds) => [...nds, newNode]);
    setSaveStatus("unsaved");
  };

  const addPromptNode = (customPrompt = "", customLabel = "Prompt Cinematográfico") => {
    if (!canEdit) return;
    const pos = getNextCanvasPosition();
    const newNode: Node = {
      id: `node-prompt-${Date.now()}`,
      type: "PROMPT",
      position: pos,
      data: {
        label: customLabel,
        prompt: customPrompt,
        onDeleteNode: handleDeleteNode,
        onUpdateNodeData: handleUpdateNodeData,
        onGenerateFromPrompt: handleGenerateFromPrompt,
      },
    };
    setNodes((nds) => [...nds, newNode]);
    setSaveStatus("unsaved");
  };

  const addNoteNode = () => {
    if (!canEdit) return;
    const pos = getNextCanvasPosition();
    const newNode: Node = {
      id: `node-note-${Date.now()}`,
      type: "TEXT_NOTE",
      position: pos,
      data: {
        text: "",
        onDeleteNode: handleDeleteNode,
        onUpdateNodeData: handleUpdateNodeData,
      },
    };
    setNodes((nds) => [...nds, newNode]);
    setSaveStatus("unsaved");
  };

  const addLibraryItemToBoard = (
    itemType: "IMAGE" | "PROMPT" | "CHARACTER" | "ENVIRONMENT" | "SCENE",
    item: any,
    customPos?: { x: number; y: number }
  ) => {
    if (!canEdit) return;
    const pos = customPos || getNextCanvasPosition();
    const idSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    if (itemType === "IMAGE") {
      const newNode: Node = {
        id: `node-img-${idSuffix}`,
        type: "IMAGE",
        position: pos,
        data: {
          label: `#${nodes.filter((n) => n.type === "IMAGE").length + 1} · ${item.modelId || "Imagem"}`,
          imageUrl: item.imageUrl,
          prompt: item.prompt,
          modelId: item.modelId,
          aspectRatio: item.aspectRatio || "1:1",
          refType: "GENERATED_IMAGE",
          refId: item.id,
          onDeleteNode: handleDeleteNode,
          onUpdateNodeData: handleUpdateNodeData,
        },
      };
      setNodes((nds) => [...nds, newNode]);
    } else if (itemType === "PROMPT") {
      const newNode: Node = {
        id: `node-prompt-${idSuffix}`,
        type: "PROMPT",
        position: pos,
        data: {
          label: `Cena ${item.sceneOrder || ""}: ${item.sceneTitle || "Prompt"} (v${item.version || 1})`,
          prompt: item.promptText,
          refType: "PROMPT_VERSION",
          refId: item.id,
          onDeleteNode: handleDeleteNode,
          onUpdateNodeData: handleUpdateNodeData,
          onGenerateFromPrompt: handleGenerateFromPrompt,
        },
      };
      setNodes((nds) => [...nds, newNode]);
    } else {
      const newNode: Node = {
        id: `node-ent-${idSuffix}`,
        type: itemType,
        position: pos,
        data: {
          entityType: itemType,
          label: item.name || item.title,
          title: item.name || item.title,
          description: item.description || "",
          refType: itemType,
          refId: item.id,
          onDeleteNode: handleDeleteNode,
          onUpdateNodeData: handleUpdateNodeData,
        },
      };
      setNodes((nds) => [...nds, newNode]);
    }
    setSaveStatus("unsaved");
  };

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

  const nodeTypes = useMemo(
    () => ({
      IMAGE: ImageBoardNode,
      VIDEO: VideoGeneratorBoardNode,
      PROMPT: PromptBoardNode,
      CHARACTER: EntityBoardNode,
      ENVIRONMENT: EntityBoardNode,
      SCENE: EntityBoardNode,
      TEXT_NOTE: NoteBoardNode,
    }),
    []
  );

  return (
    <div className="relative h-[calc(100vh-120px)] min-h-[640px] w-full overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-2xl">
      {/* Top Floating Bar inside the Space Canvas (Magnific Reference Style) */}
      <div className="pointer-events-none absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2">
        {/* Left: Space Breadcrumb & Status */}
        <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-outline-variant/30 bg-surface-container/90 px-3 py-1.5 shadow-lg backdrop-blur-md">
          <span className="text-sm">✨</span>
          <span className="text-xs font-bold text-on-surface truncate max-w-[200px]">
            {projectTitle}
          </span>
          <span className="text-on-surface-variant/40">•</span>
          <span className="text-[11px] font-medium text-on-surface-variant">
            {saveStatus === "saving"
              ? "⏳ Salvando..."
              : saveStatus === "unsaved"
              ? "● Alterações pendentes"
              : "✓ Sincronizado"}
          </span>
          {!canEdit && (
            <span className="rounded bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
              Somente Leitura
            </span>
          )}
        </div>

        {/* Right: Quick Actions, Classic Studio Switcher & Share Button */}
        <div className="pointer-events-auto flex items-center gap-2">
          {onSwitchToClassicStudio && (
            <button
              type="button"
              onClick={onSwitchToClassicStudio}
              className="flex items-center gap-1.5 rounded-xl border border-outline-variant/30 bg-surface-container/90 px-3 py-1.5 text-xs font-medium text-on-surface-variant shadow-lg backdrop-blur-md transition hover:bg-surface-container-high hover:text-on-surface"
              title="Alternar para as abas detalhadas de Personagens, Ambientes, Roteiro e Cenas"
            >
              <span>🎬</span>
              <span className="hidden sm:inline">Estúdio Detalhado (Cenas & Personagens)</span>
            </button>
          )}

          {onOpenShareModal && (
            <button
              type="button"
              onClick={onOpenShareModal}
              className="flex items-center gap-1.5 rounded-xl bg-on-surface px-3.5 py-1.5 text-xs font-semibold text-surface shadow-lg transition hover:opacity-90"
            >
              <span>🔗</span>
              <span>Compartilhar</span>
            </button>
          )}
        </div>
      </div>

      {/* Left Floating Vertical Toolbar (Magnific Reference Style) */}
      <div className="pointer-events-auto absolute left-3.5 top-1/2 z-20 -translate-y-1/2 flex flex-col items-center gap-1.5 rounded-2xl border border-outline-variant/30 bg-surface-container/95 p-1.5 shadow-2xl backdrop-blur-xl">
        <button
          type="button"
          onClick={() => setIsLibraryOpen((prev) => !prev)}
          title="Abrir Biblioteca do Space (Arrastar Imagens, Prompts, Personagens)"
          className={`flex h-9 w-9 items-center justify-center rounded-xl text-base font-bold transition ${
            isLibraryOpen
              ? "bg-primary text-on-primary shadow-md shadow-primary/30"
              : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
          }`}
        >
          +
        </button>

        <button
          type="button"
          disabled={!canEdit}
          onClick={() => {
            setGenInitialPrompt("");
            setGenSourceNodeId(null);
            setIsGenModalOpen(true);
          }}
          title="Gerar Nova Imagem com IA direto no Board"
          className="flex h-9 w-9 items-center justify-center rounded-xl text-sm text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface disabled:opacity-40"
        >
          🖼️
        </button>

        <button
          type="button"
          disabled={!canEdit}
          onClick={addVideoGeneratorNode}
          title="Adicionar Nó Gerador de Vídeos (Preparado para Vídeo IA)"
          className="flex h-9 w-9 items-center justify-center rounded-xl text-sm text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface disabled:opacity-40"
        >
          🎬
        </button>

        <button
          type="button"
          disabled={!canEdit}
          onClick={() => addPromptNode()}
          title="Adicionar Bloco de Prompt Conectável"
          className="flex h-9 w-9 items-center justify-center rounded-xl text-sm text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface disabled:opacity-40"
        >
          📜
        </button>

        <button
          type="button"
          disabled={!canEdit}
          onClick={addNoteNode}
          title="Adicionar Nota Colaborativa"
          className="flex h-9 w-9 items-center justify-center rounded-xl text-sm text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface disabled:opacity-40"
        >
          💬
        </button>

        <div className="my-0.5 h-[1px] w-6 bg-outline-variant/30" />

        <button
          type="button"
          disabled={!canEdit}
          onClick={handleAutoOrganize}
          title="Organizar e alinhar elementos automaticamente"
          className="flex h-9 w-9 items-center justify-center rounded-xl text-sm text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface disabled:opacity-40"
        >
          ✨
        </button>

        <button
          type="button"
          onClick={() => reactFlowInstance.fitView({ padding: 0.2, duration: 350 })}
          title="Centralizar visualização (Fit View)"
          className="flex h-9 w-9 items-center justify-center rounded-xl text-sm text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface"
        >
          🎯
        </button>
      </div>

      {/* Collapsible Library Drawer (Next to Left Toolbar) */}
      {isLibraryOpen && (
        <div className="pointer-events-auto absolute left-16 top-16 bottom-16 z-20 flex w-80 flex-col rounded-2xl border border-outline-variant/30 bg-surface-container/95 shadow-2xl backdrop-blur-xl animate-in slide-in-from-left-2 duration-150">
          <div className="flex items-center justify-between border-b border-outline-variant/20 px-4 py-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface">
                Acervo do Space
              </h3>
              <p className="text-[11px] text-on-surface-variant">
                Arraste para o board ou clique para adicionar
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsLibraryOpen(false)}
              className="rounded-lg px-2 py-1 text-xs text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
            >
              ✕
            </button>
          </div>

          {/* Drawer Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto border-b border-outline-variant/20 px-2.5 py-2 no-scrollbar">
            {(
              [
                { id: "images", label: "Imagens", icon: "🖼️", count: library.images.length },
                { id: "prompts", label: "Prompts", icon: "📜", count: library.prompts.length },
                { id: "characters", label: "Personagens", icon: "👤", count: library.characters.length },
                { id: "environments", label: "Ambientes", icon: "🏛️", count: library.environments.length },
                { id: "scenes", label: "Cenas", icon: "🎬", count: library.scenes.length },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setLibraryTab(t.id)}
                className={`flex items-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
                  libraryTab === t.id
                    ? "bg-primary/15 text-primary font-semibold"
                    : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                }`}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
                <span className="text-[10px] opacity-60">({t.count})</span>
              </button>
            ))}
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {libraryTab === "images" && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setGenInitialPrompt("");
                    setGenSourceNodeId(null);
                    setIsGenModalOpen(true);
                  }}
                  className="mb-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-on-primary shadow-sm transition hover:opacity-90"
                >
                  <span>🎨</span>
                  <span>Gerar Nova Imagem IA</span>
                </button>
                {library.images.length === 0 ? (
                  <p className="py-8 text-center text-xs text-on-surface-variant">
                    Nenhuma imagem gerada neste Space ainda.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {library.images.map((img) => (
                      <div
                        key={img.id}
                        draggable={canEdit}
                        onDragStart={(e) => {
                          e.dataTransfer.setData(
                            "application/tomadix-space-item",
                            JSON.stringify({ itemType: "IMAGE", item: img })
                          );
                        }}
                        onClick={() => addLibraryItemToBoard("IMAGE", img)}
                        className="group relative aspect-square cursor-grab overflow-hidden rounded-xl border border-outline-variant/30 bg-black/20 transition hover:border-primary"
                      >
                        <img
                          src={img.imageUrl}
                          alt={img.prompt || "Imagem"}
                          className="h-full w-full object-cover"
                        />
                        <div className="theme-preserve-dark absolute inset-0 flex items-end bg-gradient-to-t from-black/80 via-transparent to-transparent p-1.5 opacity-0 transition group-hover:opacity-100">
                          <span className="text-[10px] font-semibold text-white">
                            + Adicionar ao Board
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {libraryTab === "prompts" && (
              <>
                {library.prompts.length === 0 ? (
                  <p className="py-8 text-center text-xs text-on-surface-variant">
                    Nenhum prompt gerado nas cenas ainda.
                  </p>
                ) : (
                  library.prompts.map((p) => (
                    <div
                      key={p.id}
                      draggable={canEdit}
                      onDragStart={(e) => {
                        e.dataTransfer.setData(
                          "application/tomadix-space-item",
                          JSON.stringify({ itemType: "PROMPT", item: p })
                        );
                      }}
                      onClick={() => addLibraryItemToBoard("PROMPT", p)}
                      className="cursor-grab rounded-xl border border-outline-variant/30 bg-surface-container-low p-2.5 transition hover:border-primary"
                    >
                      <div className="flex items-center justify-between text-[10px] font-semibold text-primary">
                        <span>
                          Cena {p.sceneOrder}: {p.sceneTitle}
                        </span>
                        <span>v{p.version}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-on-surface-variant">
                        {p.promptText}
                      </p>
                    </div>
                  ))
                )}
              </>
            )}

            {libraryTab === "characters" &&
              (library.characters.length === 0 ? (
                <p className="py-8 text-center text-xs text-on-surface-variant">
                  Nenhum personagem cadastrado neste Space.
                </p>
              ) : (
                library.characters.map((ch) => (
                  <div
                    key={ch.id}
                    draggable={canEdit}
                    onDragStart={(e) => {
                      e.dataTransfer.setData(
                        "application/tomadix-space-item",
                        JSON.stringify({ itemType: "CHARACTER", item: ch })
                      );
                    }}
                    onClick={() => addLibraryItemToBoard("CHARACTER", ch)}
                    className="cursor-grab rounded-xl border border-outline-variant/30 bg-surface-container-low p-2.5 transition hover:border-primary"
                  >
                    <div className="text-xs font-bold text-on-surface">👤 {ch.name}</div>
                    {ch.description && (
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-on-surface-variant">
                        {ch.description}
                      </p>
                    )}
                  </div>
                ))
              ))}

            {libraryTab === "environments" &&
              (library.environments.length === 0 ? (
                <p className="py-8 text-center text-xs text-on-surface-variant">
                  Nenhum ambiente cadastrado neste Space.
                </p>
              ) : (
                library.environments.map((env) => (
                  <div
                    key={env.id}
                    draggable={canEdit}
                    onDragStart={(e) => {
                      e.dataTransfer.setData(
                        "application/tomadix-space-item",
                        JSON.stringify({ itemType: "ENVIRONMENT", item: env })
                      );
                    }}
                    onClick={() => addLibraryItemToBoard("ENVIRONMENT", env)}
                    className="cursor-grab rounded-xl border border-outline-variant/30 bg-surface-container-low p-2.5 transition hover:border-primary"
                  >
                    <div className="text-xs font-bold text-on-surface">🏛️ {env.name}</div>
                    {env.description && (
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-on-surface-variant">
                        {env.description}
                      </p>
                    )}
                  </div>
                ))
              ))}

            {libraryTab === "scenes" &&
              (library.scenes.length === 0 ? (
                <p className="py-8 text-center text-xs text-on-surface-variant">
                  Nenhuma cena cadastrada neste Space.
                </p>
              ) : (
                library.scenes.map((sc) => (
                  <div
                    key={sc.id}
                    draggable={canEdit}
                    onDragStart={(e) => {
                      e.dataTransfer.setData(
                        "application/tomadix-space-item",
                        JSON.stringify({ itemType: "SCENE", item: sc })
                      );
                    }}
                    onClick={() => addLibraryItemToBoard("SCENE", sc)}
                    className="cursor-grab rounded-xl border border-outline-variant/30 bg-surface-container-low p-2.5 transition hover:border-primary"
                  >
                    <div className="text-xs font-bold text-on-surface">
                      🎬 Cena {sc.order}: {sc.title}
                    </div>
                    {sc.description && (
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-on-surface-variant">
                        {sc.description}
                      </p>
                    )}
                  </div>
                ))
              ))}
          </div>
        </div>
      )}

      {/* Bottom-Left Page Switcher (Magnific Reference Style: "Page 1") */}
      <div className="pointer-events-auto absolute bottom-3.5 left-3.5 z-20 flex items-center gap-1.5 rounded-xl border border-outline-variant/30 bg-surface-container/95 p-1 shadow-xl backdrop-blur-md">
        {boards.map((b) => {
          const active = b.id === activeBoardId;
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => handleSelectBoardPage(b.id)}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                active
                  ? "bg-surface-container-high text-on-surface font-semibold shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <span>📄</span>
              <span>{b.name}</span>
            </button>
          );
        })}
        {canEdit && (
          <button
            type="button"
            onClick={handleCreateBoardPage}
            title="Nova página de Board"
            className="flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
          >
            +
          </button>
        )}
      </div>

      {/* Bottom-Right Zoom & Controls Pill (Magnific Reference Style: "72%") */}
      <div className="pointer-events-auto absolute bottom-3.5 right-3.5 z-20 flex items-center gap-1.5 rounded-xl border border-outline-variant/30 bg-surface-container/95 px-2.5 py-1.5 text-xs font-medium text-on-surface-variant shadow-xl backdrop-blur-md">
        <button
          type="button"
          onClick={() => reactFlowInstance.zoomOut({ duration: 200 })}
          className="px-1.5 hover:text-on-surface"
          title="Diminuir zoom"
        >
          −
        </button>
        <span className="min-w-[42px] text-center font-mono text-[11px] font-semibold text-on-surface">
          {zoomPercent}%
        </span>
        <button
          type="button"
          onClick={() => reactFlowInstance.zoomIn({ duration: 200 })}
          className="px-1.5 hover:text-on-surface"
          title="Aumentar zoom"
        >
          +
        </button>
      </div>

      {/* React Flow Infinite Canvas */}
      {loading ? (
        <div className="flex h-full w-full items-center justify-center text-sm text-on-surface-variant">
          Carregando Space colaborativo...
        </div>
      ) : (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={(changes) => {
            onNodesChange(changes);
            if (canEdit && changes.some((c) => c.type === "position" || c.type === "remove")) {
              setSaveStatus("unsaved");
            }
          }}
          onEdgesChange={(changes) => {
            onEdgesChange(changes);
            if (canEdit) setSaveStatus("unsaved");
          }}
          onConnect={onConnect}
          onNodeDragStart={() => {
            isInteractingRef.current = true;
          }}
          onNodeDragStop={() => {
            isInteractingRef.current = false;
            if (canEdit) setSaveStatus("unsaved");
          }}
          onMove={(_evt, viewport) => {
            setZoomPercent(Math.round((viewport.zoom || 1) * 100));
          }}
          onDragOver={onDragOver}
          onDrop={onDrop}
          nodesDraggable={canEdit}
          nodesConnectable={canEdit}
          elementsSelectable={true}
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

      {/* Modal de Geração de Imagem Direta no Board */}
      <DirectEntityImageModal
        isOpen={isGenModalOpen}
        onClose={() => setIsGenModalOpen(false)}
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

          const pos = getNextCanvasPosition();
          const newImgNodeId = `node-img-${result.imageId || Date.now()}`;
          const newNode: Node = {
            id: newImgNodeId,
            type: "IMAGE",
            position: pos,
            data: {
              label: `#${nodes.filter((n) => n.type === "IMAGE").length + 1} · Imagem IA`,
              imageUrl: result.imageUrl,
              prompt: genInitialPrompt,
              modelId: "IA",
              aspectRatio: "16:9",
              refType: "GENERATED_IMAGE",
              refId: result.imageId,
              onDeleteNode: handleDeleteNode,
              onUpdateNodeData: handleUpdateNodeData,
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
