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
  NodeResizer,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { DirectEntityImageModal } from "@/components/image-generation/direct-entity-image-modal";

// ============================================================================
// CUSTOM NODE COMPONENTS COM SUPORTE A REDIMENSIONAMENTO (NodeResizer)
// ============================================================================

function ImageBoardNode({ id, data, selected }: NodeProps) {
  const d = (data || {}) as Record<string, any>;
  const imageUrl = d.imageUrl || "";
  const label = d.label || d.modelId || "Imagem IA";
  const prompt = d.prompt || "";
  const aspectRatio = d.aspectRatio || "1:1";

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
    <div className="group relative select-none h-full w-full flex flex-col min-w-[180px] min-h-[180px]">
      <NodeResizer
        isVisible={Boolean(selected)}
        minWidth={160}
        minHeight={160}
        color="#10b981"
        handleClassName="!h-2.5 !w-2.5 !rounded-full !bg-primary !border-2 !border-white shadow-md"
        lineClassName="!border-primary/50"
      />

      {/* Top Floating Label (Magnific style) */}
      <div className="mb-1.5 flex items-center justify-between px-1 text-[11px] font-medium text-on-surface-variant shrink-0">
        <span className="flex items-center gap-1.5 truncate max-w-[200px]">
          <span className="text-xs">🖼️</span>
          <span className="font-mono font-semibold truncate">{label}</span>
        </span>
        {d.onDeleteNode && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              d.onDeleteNode(id);
            }}
            className="opacity-0 group-hover:opacity-100 rounded px-1.5 py-0.5 text-[10px] text-red-400 hover:bg-red-500/15 transition"
            title="Remover do board (Delete)"
          >
            ✕
          </button>
        )}
      </div>

      {/* Main Image Card */}
      <div
        className={`relative flex-1 w-full h-full min-h-0 overflow-hidden rounded-2xl border bg-[#0e121b] shadow-xl transition-all ${
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
        <div className="theme-preserve-dark absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
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
    <div className="group relative select-none h-full w-full flex flex-col min-w-[260px] min-h-[340px]">
      <NodeResizer
        isVisible={Boolean(selected)}
        minWidth={240}
        minHeight={300}
        color="#a855f7"
        handleClassName="!h-2.5 !w-2.5 !rounded-full !bg-purple-500 !border-2 !border-white shadow-md"
        lineClassName="!border-purple-500/50"
      />

      {/* Top Floating Label (Magnific style) */}
      <div className="mb-1.5 flex items-center justify-between px-1 text-[11px] font-medium text-on-surface-variant shrink-0">
        <span className="flex items-center gap-1.5 truncate">
          <span>🎬</span>
          <span className="font-mono font-semibold truncate">{label}</span>
        </span>
        <div className="flex items-center gap-1 shrink-0">
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
              title="Remover do board (Delete)"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Video Card Container */}
      <div
        className={`theme-preserve-dark relative flex-1 w-full min-h-0 flex flex-col overflow-hidden rounded-2xl border bg-[#0d111a] text-white shadow-2xl transition-all ${
          selected
            ? "border-purple-400 ring-2 ring-purple-500/40"
            : "border-white/15 hover:border-purple-400/50"
        }`}
      >
        {/* Visual Frame Area */}
        <div className="relative flex-1 w-full min-h-0 overflow-hidden bg-gradient-to-br from-indigo-950/80 via-[#0b0f19] to-purple-950/70">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={label}
              className="h-full w-full object-cover opacity-90 pointer-events-none"
              draggable={false}
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center">
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/10 text-xl shadow-inner backdrop-blur-md">
                ▶
              </div>
              <p className="text-xs font-semibold text-white/90">
                Pipeline de Vídeo Preparado
              </p>
              <p className="mt-1 text-[10px] text-white/55 leading-tight">
                Conecte imagens como Frame Inicial / Final nos conectores à esquerda
              </p>
            </div>
          )}

          {/* Top Ratio & Status Pill */}
          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-auto">
            <select
              value={localRatio}
              onChange={(e) => {
                setLocalRatio(e.target.value);
                commitChange(localPrompt, e.target.value);
              }}
              onClick={(e) => e.stopPropagation()}
              className="rounded-lg border border-white/20 bg-black/60 px-2 py-0.5 text-[10px] font-mono text-white backdrop-blur-md focus:outline-none"
            >
              <option value="9:16">9:16 Vertical</option>
              <option value="16:9">16:9 Cinema</option>
              <option value="1:1">1:1 Square</option>
            </select>
            <span className="rounded-lg bg-black/60 border border-white/15 px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider text-amber-300 backdrop-blur-md">
              ⚡ Em Breve
            </span>
          </div>

          {/* Bottom Motion Prompt Overlay (matches Magnific screenshot) */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent p-3 pt-6 pointer-events-auto">
            <textarea
              rows={2}
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
    <div className="group relative select-none h-full w-full flex flex-col min-w-[240px] min-h-[160px]">
      <NodeResizer
        isVisible={Boolean(selected)}
        minWidth={200}
        minHeight={140}
        color="#10b981"
        handleClassName="!h-2.5 !w-2.5 !rounded-full !bg-primary !border-2 !border-white shadow-md"
        lineClassName="!border-primary/50"
      />

      <div className="mb-1 flex items-center justify-between px-1 text-[11px] font-medium text-on-surface-variant shrink-0">
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
            title="Remover do board (Delete)"
          >
            ✕
          </button>
        )}
      </div>

      <div
        className={`flex-1 w-full min-h-0 flex flex-col rounded-2xl border bg-surface-container p-3 shadow-lg transition-all ${
          selected
            ? "border-primary ring-2 ring-primary/30"
            : "border-outline-variant/40 hover:border-outline"
        }`}
      >
        <textarea
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          onBlur={handleBlur}
          onClick={(e) => e.stopPropagation()}
          placeholder="Escreva ou edite o prompt..."
          className="flex-1 w-full min-h-0 resize-none rounded-xl border border-outline-variant/30 bg-surface-container-low p-2.5 text-xs leading-relaxed text-on-surface focus:border-primary focus:outline-none"
        />

        <div className="mt-2 flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-lg border border-outline-variant/30 bg-surface-container-high px-2 py-1 text-[10px] font-medium text-on-surface-variant hover:text-on-surface"
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
              className="rounded-lg bg-primary/15 border border-primary/30 px-2.5 py-1 text-[10px] font-semibold text-primary hover:bg-primary/25 transition"
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
    <div className="group relative select-none h-full w-full flex flex-col min-w-[220px] min-h-[160px]">
      <NodeResizer
        isVisible={Boolean(selected)}
        minWidth={180}
        minHeight={140}
        color="#06b6d4"
        handleClassName="!h-2.5 !w-2.5 !rounded-full !bg-cyan-500 !border-2 !border-white shadow-md"
        lineClassName="!border-cyan-500/50"
      />

      <div className="mb-1 flex items-center justify-between px-1 text-[11px] text-on-surface-variant shrink-0">
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
            title="Remover do board (Delete)"
          >
            ✕
          </button>
        )}
      </div>

      <div
        className={`flex-1 w-full min-h-0 flex flex-col overflow-hidden rounded-2xl border bg-surface-container p-3 shadow-lg transition-all ${
          selected
            ? "border-primary ring-2 ring-primary/30"
            : "border-outline-variant/40 hover:border-outline"
        }`}
      >
        {d.imageUrl && (
          <div className="mb-2 flex-1 w-full min-h-[90px] overflow-hidden rounded-xl bg-black/30">
            <img
              src={d.imageUrl}
              alt={d.title || d.label}
              className="h-full w-full object-cover pointer-events-none"
            />
          </div>
        )}
        <h4 className="text-xs font-bold text-on-surface truncate shrink-0">
          {d.title || d.label || "Elemento"}
        </h4>
        {d.description && (
          <p className="mt-1 line-clamp-3 text-[11px] text-on-surface-variant leading-relaxed">
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
      className={`group relative select-none h-full w-full flex flex-col min-w-[180px] min-h-[140px] rounded-2xl border p-3 shadow-lg transition-all ${
        selected
          ? "border-amber-400 ring-2 ring-amber-400/30"
          : "border-amber-500/30"
      } bg-amber-500/10 backdrop-blur-md`}
    >
      <NodeResizer
        isVisible={Boolean(selected)}
        minWidth={160}
        minHeight={120}
        color="#f59e0b"
        handleClassName="!h-2.5 !w-2.5 !rounded-full !bg-amber-400 !border-2 !border-white shadow-md"
        lineClassName="!border-amber-400/50"
      />

      <div className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-amber-400 shrink-0">
        <span>📝 Nota da Equipe</span>
        {d.onDeleteNode && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              d.onDeleteNode(id);
            }}
            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300"
            title="Remover do board (Delete)"
          >
            ✕
          </button>
        )}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => d.onUpdateNodeData?.(id, { ...d, text })}
        onClick={(e) => e.stopPropagation()}
        placeholder="Escreva uma anotação ou direção criativa..."
        className="flex-1 w-full min-h-0 resize-none bg-transparent text-xs leading-relaxed text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none"
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

  // Context Menu & Drag-to-Empty-Space Connection states
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    flowPos: { x: number; y: number };
    sourceNodeId?: string | null;
  } | null>(null);
  const connectingNodeIdRef = useRef<string | null>(null);
  const genTargetPosRef = useRef<{ x: number; y: number } | null>(null);

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
    genTargetPosRef.current = null;
    setIsGenModalOpen(true);
  }, []);

  // Atalho de teclado global: tecla Delete e Backspace apaga nós/arestas selecionados (sem interferir em digitação)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setContextMenu(null);
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
            onDeleteNode: handleDeleteNode,
            onUpdateNodeData: handleUpdateNodeData,
            onGenerateFromPrompt: handleGenerateFromPrompt,
          },
        };
      });
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
        onDeleteNode: handleDeleteNode,
        onUpdateNodeData: handleUpdateNodeData,
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
        onDeleteNode: handleDeleteNode,
        onUpdateNodeData: handleUpdateNodeData,
        onGenerateFromPrompt: handleGenerateFromPrompt,
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
        onDeleteNode: handleDeleteNode,
        onUpdateNodeData: handleUpdateNodeData,
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
          onDeleteNode: handleDeleteNode,
          onUpdateNodeData: handleUpdateNodeData,
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
          onDeleteNode: handleDeleteNode,
          onUpdateNodeData: handleUpdateNodeData,
          onGenerateFromPrompt: handleGenerateFromPrompt,
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
          onDeleteNode: handleDeleteNode,
          onUpdateNodeData: handleUpdateNodeData,
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

  // Botão direito do mouse no canvas (abre menu de criação na posição do clique)
  const onPaneContextMenu = useCallback(
    (event: React.MouseEvent | MouseEvent) => {
      event.preventDefault();
      if (!canEdit) return;
      const clientX = event.clientX;
      const clientY = event.clientY;
      const flowPos = reactFlowInstance.screenToFlowPosition({ x: clientX, y: clientY });
      setContextMenu({
        x: clientX,
        y: clientY,
        flowPos,
        sourceNodeId: null,
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

      {/* Menu de Contexto Flutuante (Botão Direito ou Arrastar Linha para Espaço Vazio) */}
      {contextMenu && (
        <div
          style={{
            position: "fixed",
            left: Math.min(contextMenu.x, (typeof window !== "undefined" ? window.innerWidth : 1200) - 290),
            top: Math.min(contextMenu.y, (typeof window !== "undefined" ? window.innerHeight : 800) - 400),
            zIndex: 100,
          }}
          onClick={(e) => e.stopPropagation()}
          className="theme-preserve-dark w-64 rounded-2xl border border-white/20 bg-[#0e131f]/95 p-2 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 text-white select-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-2 py-1.5 mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-xs">{contextMenu.sourceNodeId ? "⚡" : "✨"}</span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-white/90">
                {contextMenu.sourceNodeId ? "Conectar a Novo Nó" : "Criar no Board"}
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

          {contextMenu.sourceNodeId && (
            <div className="mb-2 rounded-lg bg-indigo-500/20 border border-indigo-500/30 px-2 py-1 text-[10px] text-indigo-300">
              Conexão automática a partir do nó selecionado
            </div>
          )}

          {/* Opções de Criação Rápida */}
          <div className="space-y-1">
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

            <button
              type="button"
              onClick={() => {
                handleCreateVideoNodeAt(contextMenu.flowPos, contextMenu.sourceNodeId);
                setContextMenu(null);
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left text-xs font-medium text-white hover:bg-purple-500/20 hover:text-purple-300 transition group"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400 text-sm group-hover:scale-110 transition shrink-0">
                🎬
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white group-hover:text-purple-300">Gerador de Vídeo IA</div>
                <div className="text-[10px] text-white/50 truncate">Pipeline start/end frame</div>
              </div>
            </button>

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
              <div className="grid grid-cols-3 gap-1">
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

          {/* Atalho dica */}
          <div className="mt-2 border-t border-white/10 px-2 pt-1.5 text-[9px] text-white/40 flex items-center justify-between">
            <span>Selecione e tecle <kbd className="font-mono text-white/70 bg-white/10 px-1 rounded">Delete</kbd></span>
            <span>Esc fecha</span>
          </div>
        </div>
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
