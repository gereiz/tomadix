"use client";

import { Spinner } from "@/components/ui/spinner";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMediaFlags } from "@/components/providers/feature-flags-provider";

interface ProjectOption {
  id: string;
  title: string;
}

interface EntityItem {
  id: string;
  name?: string;
  title?: string;
  order?: number;
  description?: string;
}

interface ProjectEntities {
  characters: EntityItem[];
  environments: EntityItem[];
  scenes: EntityItem[];
}

interface QuickCreationBarProps {
  availableProjects?: ProjectOption[];
  currentProjectId?: string;
  currentProjectTitle?: string;
  onItemCreated?: (item: any) => void;
  onOpenFullForm?: (type: string) => void;
}

export function QuickCreationBar({
  availableProjects = [],
  currentProjectId,
  currentProjectTitle,
  onItemCreated,
  onOpenFullForm,
}: QuickCreationBarProps) {
  const router = useRouter();
  // Chave global do admin: sem mídia, some a opção "Imagem IA"
  const { image: mediaEnabled } = useMediaFlags(); // imagens ligadas

  // Preferências persistidas
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [barHeight, setBarHeight] = useState(160);
  const isResizingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(160);

  const [contentType, setContentType] = useState<"PROJECT" | "CHARACTER" | "ENVIRONMENT" | "SCENE" | "PROMPT" | "IMAGE">(
    currentProjectId ? "CHARACTER" : "PROJECT"
  );
  const [selectedProjectId, setSelectedProjectId] = useState<string>(currentProjectId || "");
  const [prompt, setPrompt] = useState("");
  // Opções leves (valem para Prompt IA e Imagem IA); os padrões são os de sempre
  const [targetTool, setTargetTool] = useState("google_flow");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Entidades para menções (@personagem, #ambiente, $cena)
  const [entities, setEntities] = useState<ProjectEntities>({ characters: [], environments: [], scenes: [] });
  const [selectedReferences, setSelectedReferences] = useState<{
    characters: Array<{ id: string; name: string }>;
    environments: Array<{ id: string; name: string }>;
    scenes: Array<{ id: string; title: string }>;
  }>({
    characters: [],
    environments: [],
    scenes: [],
  });

  // Autocomplete popup state
  const [mentionState, setMentionState] = useState<{
    active: boolean;
    type: "character" | "environment" | "scene" | null;
    query: string;
    startIndex: number;
    selectedIndex: number;
  }>({
    active: false,
    type: null,
    query: "",
    startIndex: -1,
    selectedIndex: 0,
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const effectiveProjectId = currentProjectId || selectedProjectId;

  // Carregar preferências salvas no localStorage
  useEffect(() => {
    try {
      const savedCollapsed = localStorage.getItem("tomadix_quickbar_collapsed");
      if (savedCollapsed !== null) {
        setIsCollapsed(savedCollapsed === "true");
      }
      const savedHeight = localStorage.getItem("tomadix_quickbar_height");
      if (savedHeight) {
        const parsed = parseInt(savedHeight, 10);
        if (!isNaN(parsed) && parsed >= 120 && parsed <= 380) {
          setBarHeight(parsed);
        }
      }
    } catch {
      // Ignorar erros de localStorage
    }
  }, []);

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("tomadix_quickbar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  // Carregar entidades do projeto ativo
  const fetchEntities = useCallback(async () => {
    if (!effectiveProjectId) {
      setEntities({ characters: [], environments: [], scenes: [] });
      return;
    }
    try {
      const res = await fetch(`/api/projects/${effectiveProjectId}/entities`);
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setEntities({
            characters: json.data.characters || [],
            environments: json.data.environments || [],
            scenes: json.data.scenes || [],
          });
        }
      }
    } catch (err) {
      console.warn("Falha ao carregar entidades para autocomplete:", err);
    }
  }, [effectiveProjectId]);

  useEffect(() => {
    fetchEntities();
  }, [fetchEntities]);

  // Ouvir atualizações de entidades para sincronização instantânea
  useEffect(() => {
    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (!customEvent.detail?.projectId || customEvent.detail.projectId === effectiveProjectId) {
        fetchEntities();
      }
    };
    window.addEventListener("tomadix:entities-updated", handleSync);
    return () => window.removeEventListener("tomadix:entities-updated", handleSync);
  }, [fetchEntities, effectiveProjectId]);

  // Handler de Redimensionamento Vertical
  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    startYRef.current = e.clientY;
    startHeightRef.current = barHeight;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current) return;
      const deltaY = startYRef.current - moveEvent.clientY;
      const newHeight = Math.min(380, Math.max(120, startHeightRef.current + deltaY));
      setBarHeight(newHeight);
    };

    const onMouseUp = () => {
      if (isResizingRef.current) {
        isResizingRef.current = false;
        try {
          localStorage.setItem("tomadix_quickbar_height", String(barHeight));
        } catch {}
      }
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const ALL_TYPE_OPTIONS = [
    { id: "PROJECT", label: "Projeto", icon: "🎬", placeholder: "Descreva a premissa, gênero e estilo do novo filme..." },
    { id: "CHARACTER", label: "Personagem", icon: "👤", placeholder: "Descreva o personagem (idade, traços, roupas e personalidade)... Dica: use #ambiente para situá-lo" },
    { id: "ENVIRONMENT", label: "Ambiente", icon: "🏙️", placeholder: "Descreva o cenário, iluminação e atmosfera... Dica: use @personagem para associar" },
    { id: "SCENE", label: "Cena", icon: "🎥", placeholder: "Descreva a ação dramática... Mencione @personagem, #ambiente ou $cena anterior" },
    { id: "PROMPT", label: "Prompt IA", icon: "✨", placeholder: "Instruções adicionais para a IA cinematográfica... Use @personagem, #ambiente para direcionar" },
    { id: "IMAGE", label: "Imagem IA", icon: "🎨", placeholder: "Descreva a imagem cinematográfica que deseja gerar diretamente com IA..." },
  ];

  const TYPE_OPTIONS = ALL_TYPE_OPTIONS.filter(
    (opt) => (!currentProjectId || opt.id !== "PROJECT") && (mediaEnabled || opt.id !== "IMAGE")
  );

  const currentOption = TYPE_OPTIONS.find((t) => t.id === contentType) || TYPE_OPTIONS[0];

  // Identificação de menções durante digitação
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const cursorPos = e.target.selectionStart;
    setPrompt(val);

    // Encontrar último caractere trigger antes do cursor
    const textBeforeCursor = val.slice(0, cursorPos);
    const lastAt = textBeforeCursor.lastIndexOf("@");
    const lastHash = textBeforeCursor.lastIndexOf("#");
    const lastDollar = textBeforeCursor.lastIndexOf("$");

    const maxTrigger = Math.max(lastAt, lastHash, lastDollar);

    if (maxTrigger !== -1) {
      // Verificar se não há espaço antes do cursor após o trigger
      const queryAfterTrigger = textBeforeCursor.slice(maxTrigger + 1);
      if (!queryAfterTrigger.includes("\n") && queryAfterTrigger.length <= 30) {
        let mentionType: "character" | "environment" | "scene" = "character";
        if (maxTrigger === lastHash) mentionType = "environment";
        if (maxTrigger === lastDollar) mentionType = "scene";

        setMentionState({
          active: true,
          type: mentionType,
          query: queryAfterTrigger.toLowerCase(),
          startIndex: maxTrigger,
          selectedIndex: 0,
        });
        return;
      }
    }

    if (mentionState.active) {
      setMentionState((prev) => ({ ...prev, active: false }));
    }
  };

  // Filtragem dos itens sugeridos no autocomplete
  const getFilteredSuggestions = () => {
    if (!mentionState.active || !mentionState.type) return [];
    const q = mentionState.query;

    if (mentionState.type === "character") {
      return entities.characters
        .filter((c) => (c.name || "").toLowerCase().includes(q))
        .slice(0, 5)
        .map((c) => ({ id: c.id, label: c.name || "Sem nome", icon: "👤", type: "character" as const }));
    }
    if (mentionState.type === "environment") {
      return entities.environments
        .filter((e) => (e.name || "").toLowerCase().includes(q))
        .slice(0, 5)
        .map((e) => ({ id: e.id, label: e.name || "Sem nome", icon: "🏙️", type: "environment" as const }));
    }
    if (mentionState.type === "scene") {
      return entities.scenes
        .filter((s) => (s.title || "").toLowerCase().includes(q) || String(s.order || "").includes(q))
        .slice(0, 5)
        .map((s) => ({
          id: s.id,
          label: s.title ? `Cena ${s.order ?? ""}: ${s.title}` : `Cena ${s.order ?? ""}`,
          icon: "🎥",
          type: "scene" as const,
        }));
    }
    return [];
  };

  const suggestions = getFilteredSuggestions();

  // Inserção da menção selecionada
  const applyMention = (item: { id: string; label: string; type: "character" | "environment" | "scene" }) => {
    if (!textareaRef.current || mentionState.startIndex === -1) return;

    const prefix = mentionState.type === "character" ? "@" : mentionState.type === "environment" ? "#" : "$";
    const cleanLabel = item.label.replace(/\s+/g, "_");
    const mentionToken = `${prefix}${cleanLabel} `;

    const before = prompt.slice(0, mentionState.startIndex);
    const after = prompt.slice(textareaRef.current.selectionStart);
    const newText = before + mentionToken + after;

    setPrompt(newText);
    setMentionState({ active: false, type: null, query: "", startIndex: -1, selectedIndex: 0 });

    // Salvar referência estruturada
    if (item.type === "character") {
      setSelectedReferences((prev) =>
        prev.characters.some((c) => c.id === item.id)
          ? prev
          : { ...prev, characters: [...prev.characters, { id: item.id, name: item.label }] }
      );
    } else if (item.type === "environment") {
      setSelectedReferences((prev) =>
        prev.environments.some((e) => e.id === item.id)
          ? prev
          : { ...prev, environments: [...prev.environments, { id: item.id, name: item.label }] }
      );
    } else if (item.type === "scene") {
      setSelectedReferences((prev) =>
        prev.scenes.some((s) => s.id === item.id)
          ? prev
          : { ...prev, scenes: [...prev.scenes, { id: item.id, title: item.label }] }
      );
    }

    // Reposicionar cursor
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const nextPos = before.length + mentionToken.length;
        textareaRef.current.setSelectionRange(nextPos, nextPos);
      }
    }, 10);
  };

  // Teclas especiais no autocomplete (ArrowUp, ArrowDown, Enter, Tab, Escape)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionState.active && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionState((prev) => ({
          ...prev,
          selectedIndex: (prev.selectedIndex + 1) % suggestions.length,
        }));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionState((prev) => ({
          ...prev,
          selectedIndex: (prev.selectedIndex - 1 + suggestions.length) % suggestions.length,
        }));
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const chosen = suggestions[mentionState.selectedIndex];
        if (chosen) {
          applyMention(chosen);
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionState((prev) => ({ ...prev, active: false }));
        return;
      }
    }

    // Ctrl+Enter ou Cmd+Enter submete
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleQuickCreate();
    }
  };

  const removeReference = (type: "characters" | "environments" | "scenes", id: string) => {
    setSelectedReferences((prev) => ({
      ...prev,
      [type]: prev[type].filter((item: any) => item.id !== id),
    }));
  };

  const handleQuickCreate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || loading) return;

    try {
      setLoading(true);
      setFeedback(null);

      const effectiveType = currentProjectId && contentType === "PROJECT" ? "CHARACTER" : contentType;

      const references = {
        characterIds: selectedReferences.characters.map((c) => c.id),
        environmentIds: selectedReferences.environments.map((e) => e.id),
        sceneIds: selectedReferences.scenes.map((s) => s.id),
      };

      const res = await fetch("/api/studio/quick-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: effectiveType,
          prompt: prompt.trim(),
          projectId: effectiveProjectId || undefined,
          references,
          ...(effectiveType === "PROMPT" ? { targetTool } : {}),
          ...(effectiveType === "PROMPT" || effectiveType === "IMAGE" ? { aspectRatio } : {}),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Não foi possível criar o conteúdo.");
      }

      setFeedback({ text: json.message || "Conteúdo criado com sucesso!", type: "success" });
      setPrompt("");
      setSelectedReferences({ characters: [], environments: [], scenes: [] });

      // Atualizar saldo de créditos na interface global
      if (typeof json.newBalance === "number") {
        window.dispatchEvent(
          new CustomEvent("tomadix:credits-updated", {
            detail: { creditsBalance: json.newBalance },
          })
        );
      }

      // Notificar outros componentes do estúdio e galeria de imagens
      window.dispatchEvent(
        new CustomEvent("tomadix:entities-updated", {
          detail: { projectId: effectiveProjectId, type: effectiveType },
        })
      );
      window.dispatchEvent(
        new CustomEvent("tomadix:images-updated", {
          detail: { projectId: effectiveProjectId, type: effectiveType },
        })
      );

      if (onItemCreated) {
        onItemCreated(json.data);
      }

      if (contentType === "PROJECT" && json.data?.href && !onItemCreated) {
        router.push(json.data.href);
      }

      setTimeout(() => {
        setFeedback(null);
      }, 4000);
    } catch (err: any) {
      setFeedback({ text: err.message || "Erro ao processar criação.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // Render quando recolhida (botão flutuante compacto)
  if (isCollapsed) {
    return (
      <div className="fixed bottom-4 right-6 z-30 pointer-events-auto">
        <button
          type="button"
          onClick={toggleCollapsed}
          className="flex items-center gap-2 rounded-full border border-white/10 bg-[#12151E]/95 px-4 py-2.5 text-xs font-semibold text-white shadow-2xl transition hover:border-primary/50 hover:bg-[#181C28] group"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary text-xs">
            ⚡
          </span>
          <span>Criação Instantânea</span>
          <span className="text-white/40 group-hover:text-primary transition-colors text-[10px]">▲</span>
        </button>
      </div>
    );
  }

  const hasAnyReferences =
    selectedReferences.characters.length > 0 ||
    selectedReferences.environments.length > 0 ||
    selectedReferences.scenes.length > 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 p-2 sm:p-4 pointer-events-none">
      <div className="w-full max-w-7xl mx-auto px-1 sm:px-3 pointer-events-auto">
        {/* Feedback flutuante */}
        {feedback && (
          <div
            className={`mb-2 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold shadow-lg transition-all ${
              feedback.type === "success"
                ? "bg-primary/20 text-primary border border-primary/40"
                : "bg-red-950/90 text-red-300 border border-red-500/30"
            }`}
          >
            <span>{feedback.type === "success" ? "✓" : "⚠"}</span>
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Container Principal com Redimensionamento */}
        <div
          style={{ minHeight: `${barHeight}px` }}
          className="relative flex flex-col justify-between rounded-2xl border border-white/10 bg-[#12151E]/95 p-2 sm:p-3 shadow-[0_20px_50px_rgba(0,0,0,0.85)] transition-[height] duration-75"
        >
          {/* Barra Superior de Arraste (Resize Handle) */}
          <div
            onMouseDown={handleMouseDownResize}
            title="Arraste para ajustar a altura da barra"
            className="absolute -top-2 left-0 right-0 h-4 cursor-ns-resize flex items-center justify-center group"
          >
            <div className="h-1 w-16 rounded-full bg-white/20 group-hover:bg-primary transition-colors" />
          </div>

          {/* Popover de Menções Autocomplete */}
          {mentionState.active && suggestions.length > 0 && (
            <div className="absolute bottom-[calc(100%+8px)] left-4 z-40 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-white/10 bg-[#181C28]/95 p-1.5 shadow-2xl">
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                Mencionar {mentionState.type === "character" ? "Personagem" : mentionState.type === "environment" ? "Ambiente" : "Cena"}
              </div>
              <div className="mt-1 flex flex-col gap-0.5">
                {suggestions.map((item, idx) => {
                  const isSelected = idx === mentionState.selectedIndex;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => applyMention(item)}
                      onMouseEnter={() => setMentionState((prev) => ({ ...prev, selectedIndex: idx }))}
                      className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-left transition ${
                        isSelected
                          ? "bg-primary text-on-primary font-semibold"
                          : "text-white/80 hover:bg-white/5"
                      }`}
                    >
                      <span className="text-sm">{item.icon}</span>
                      <span className="truncate flex-1">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Linha 1: Seletores de Tipo, Contexto e Controles */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/5">
            {/* Abas de Tipos de Conteúdo */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
              {TYPE_OPTIONS.map((opt) => {
                const isActive = contentType === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setContentType(opt.id as any)}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                      isActive
                        ? "bg-primary text-on-primary shadow-sm shadow-primary/25"
                        : "text-white/60 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span>{opt.icon}</span>
                    <span className="hidden sm:inline">{opt.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Contexto do Projeto e Ações de Janela */}
            <div className="flex items-center gap-2">
              {currentProjectId && currentProjectTitle ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-[11px] text-white/60">
                  <span>🎬</span>
                  <span className="hidden sm:inline text-white/40">Contexto:</span>
                  <span className="font-semibold text-primary truncate max-w-[160px]">
                    {currentProjectTitle}
                  </span>
                </div>
              ) : (
                contentType !== "PROJECT" &&
                !currentProjectId &&
                availableProjects.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-white/40 hidden sm:inline">Projeto:</span>
                    <select
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="rounded-lg border border-white/10 bg-[#181C28] px-2 py-1 text-xs font-medium text-white/80 focus:border-primary focus:outline-none"
                    >
                      <option value="">(Projeto Mais Recente)</option>
                      {availableProjects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )
              )}

              {/* Escolhas leves: ferramenta (só prompts) e proporção (prompts e imagens) */}
              {(contentType === "PROMPT" || contentType === "IMAGE") && (
                <div className="flex items-center gap-1.5">
                  {contentType === "PROMPT" && (
                    <select
                      value={targetTool}
                      onChange={(e) => setTargetTool(e.target.value)}
                      aria-label="Gerar para (ferramenta)"
                      className="rounded-lg border border-white/10 bg-[#181C28] px-2 py-1 text-xs font-medium text-white/80 focus:border-primary focus:outline-none"
                    >
                      <option value="google_flow">Google Flow</option>
                      <option value="nano_banana">Nano Banana</option>
                      <option value="seedance">Seedance</option>
                      <option value="kling">Kling</option>
                      <option value="generic">Genérico</option>
                    </select>
                  )}
                  <select
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value)}
                    aria-label="Proporção"
                    className="rounded-lg border border-white/10 bg-[#181C28] px-2 py-1 text-xs font-medium text-white/80 focus:border-primary focus:outline-none"
                  >
                    <option value="16:9">16:9</option>
                    <option value="9:16">9:16</option>
                    <option value="1:1">1:1</option>
                    <option value="4:3">4:3</option>
                    <option value="3:4">3:4</option>
                  </select>
                </div>
              )}

              {/* Botão Minimizar/Recolher */}
              <button
                type="button"
                onClick={toggleCollapsed}
                title="Minimizar barra de criação instantânea"
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white transition"
              >
                <span className="text-xs">▼</span>
              </button>
            </div>
          </div>

          {/* Badges de Entidades Vinculadas (@, #, $) */}
          {hasAnyReferences && (
            <div className="flex flex-wrap items-center gap-1.5 pt-2">
              <span className="text-[10px] text-white/40">Vinculados:</span>
              {selectedReferences.characters.map((c) => (
                <span
                  key={c.id}
                  className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 text-[11px] font-medium text-blue-300"
                >
                  <span>👤 @{c.name}</span>
                  <button
                    type="button"
                    onClick={() => removeReference("characters", c.id)}
                    className="hover:text-white"
                  >
                    ×
                  </button>
                </span>
              ))}
              {selectedReferences.environments.map((e) => (
                <span
                  key={e.id}
                  className="inline-flex items-center gap-1 rounded-md bg-primary/10 border border-primary/30 px-2 py-0.5 text-[11px] font-medium text-primary"
                >
                  <span>🏙️ #{e.name}</span>
                  <button
                    type="button"
                    onClick={() => removeReference("environments", e.id)}
                    className="hover:text-white"
                  >
                    ×
                  </button>
                </span>
              ))}
              {selectedReferences.scenes.map((s) => (
                <span
                  key={s.id}
                  className="inline-flex items-center gap-1 rounded-md bg-purple-500/10 border border-purple-500/30 px-2 py-0.5 text-[11px] font-medium text-purple-300"
                >
                  <span>🎥 ${s.title}</span>
                  <button
                    type="button"
                    onClick={() => removeReference("scenes", s.id)}
                    className="hover:text-white"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Linha 2: Área de Texto Multilinha com Redimensionamento + Ações */}
          <form onSubmit={handleQuickCreate} className="mt-2 flex flex-1 items-stretch gap-2">
            <div className="relative flex-1 flex flex-col">
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={handleTextChange}
                onKeyDown={handleKeyDown}
                placeholder={currentOption.placeholder}
                rows={barHeight > 200 ? 5 : barHeight > 140 ? 3 : 2}
                disabled={loading}
                className="w-full flex-1 resize-none rounded-xl border border-white/10 bg-[#181C28]/90 px-3.5 py-2 text-xs sm:text-sm text-white placeholder-white/30 focus:border-primary/50 focus:bg-[#181C28] focus:outline-none transition leading-relaxed"
              />
              <div className="absolute right-2 bottom-1.5 flex items-center gap-1 text-[10px] text-white/30 pointer-events-none">
                <span>Dica: @personagem #ambiente $cena</span>
                <span className="hidden sm:inline">| Ctrl+Enter envia</span>
              </div>
            </div>

            {/* Coluna Lateral de Botões */}
            <div className="flex flex-col justify-end gap-2 flex-shrink-0">
              {/* Botão de Formulário Detalhado */}
              {onOpenFullForm && (
                <button
                  type="button"
                  onClick={() => onOpenFullForm(contentType)}
                  title="Configuração detalhada estruturada"
                  className="hidden sm:flex items-center justify-center rounded-xl border border-white/10 bg-white/5 p-2 text-white/60 hover:border-white/20 hover:text-white transition"
                >
                  <span className="text-xs">⚙️</span>
                </button>
              )}

              {/* Botão de Envio / Criação Instantânea */}
              <button
                type="submit"
                disabled={loading || !prompt.trim()}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs sm:text-sm font-bold text-on-primary transition hover:opacity-95 disabled:opacity-40 flex-shrink-0 shadow-lg shadow-primary/20"
              >
                {loading ? (
                  <>
                    <Spinner className="h-3.5 w-3.5 border-2 border-current" />
                    <span className="hidden sm:inline">Criando...</span>
                  </>
                ) : (
                  <>
                    <span>Criar</span>
                    <span className="text-xs">⚡</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
