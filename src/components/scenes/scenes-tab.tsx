"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ContinuityReport, ContinuityWarning } from "@/modules/scenes/scene.schema";
import { EntityParametersSection } from "@/components/parameters/entity-parameters-section";
import { VisualParameterSelector } from "@/components/visual-library/visual-parameter-selector";

export interface SceneItem {
  id: string;
  projectId: string;
  title: string;
  order: number;
  durationSeconds: number | null;
  description: string;
  configuration: {
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

interface AvailableEntity {
  id: string;
  name: string;
}

interface ScenesTabProps {
  projectId: string;
  onStatsUpdate?: () => void;
  onOpenPromptEngine?: (sceneId: string) => void;
}

export function ScenesTab({ projectId, onStatsUpdate, onOpenPromptEngine }: ScenesTabProps) {
  const [scenes, setScenes] = useState<SceneItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableCharacters, setAvailableCharacters] = useState<AvailableEntity[]>([]);
  const [availableEnvironments, setAvailableEnvironments] = useState<AvailableEntity[]>([]);

  // Filtro de exibição
  const [filterMode, setFilterMode] = useState<"all" | "ready" | "incomplete">("all");

  // Modal Criar / Editar Cena
  const [modalOpen, setModalOpen] = useState(false);
  const [editingScene, setEditingScene] = useState<SceneItem | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    durationSeconds: "" as string | number,
    selectedCharacterIds: [] as string[],
    selectedEnvironmentIds: [] as string[],
    mainAction: "",
    initialState: "",
    finalState: "",
    characterMovement: "",
    framing: "Plano Médio (Medium Shot)",
    cameraMovement: "Estática",
    focusDepth: "Profundidade de campo padrão",
    lighting: "Iluminação natural / ambiente",
    visualStyle: "",
    transitionIn: "Corte Direto (Cut)",
    transitionOut: "Corte Direto (Cut)",
    ambientSound: "",
    dialogueEnabled: false,
    dialogueLanguage: "pt-BR",
    dialogueLines: "",
    musicEnabled: false,
    musicDescription: "",
    restrictions: "",
  });

  // Dynamic Parameters State
  const [paramValues, setParamValues] = useState<Record<string, any>>({});

  // Modal Continuidade
  const [continuityModalOpen, setContinuityModalOpen] = useState(false);
  const [continuityReport, setContinuityReport] = useState<ContinuityReport | null>(null);
  const [continuityLoading, setContinuityLoading] = useState(false);

  // Modal Exclusão
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [sceneToDelete, setSceneToDelete] = useState<SceneItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Carregar cenas e entidades
  const fetchScenes = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Carrega as cenas imediatamente para exibição prioritária no DOM
      const scenesPromise = fetch(`/api/projects/${projectId}/scenes`)
        .then(async (res) => {
          if (res.ok) {
            const json = await res.json();
            setScenes(json.data || []);
          }
        })
        .catch((err) => console.error("Erro ao carregar cenas:", err))
        .finally(() => {
          setLoading(false);
        });

      // 2. Carrega personagens e ambientes em paralelo em background (usados no modal de criação)
      const entitiesPromise = Promise.all([
        fetch(`/api/projects/${projectId}/characters?status=all`).then(async (res) => {
          if (res.ok) {
            const json = await res.json();
            setAvailableCharacters((json.data || []).map((c: any) => ({ id: c.id, name: c.name })));
          }
        }),
        fetch(`/api/projects/${projectId}/environments?status=all`).then(async (res) => {
          if (res.ok) {
            const json = await res.json();
            setAvailableEnvironments((json.data || []).map((e: any) => ({ id: e.id, name: e.name })));
          }
        }),
      ]).catch((err) => console.error("Erro ao carregar entidades relacionadas:", err));

      await Promise.all([scenesPromise, entitiesPromise]);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchScenes();
  }, [fetchScenes]);

  // Verificar se a cena está pronta para geração
  const checkSceneReadiness = (scene: SceneItem) => {
    const config = scene.configuration || {};
    const hasTitle = Boolean(scene.title && scene.title.trim());
    const hasAction = Boolean(config.mainAction && config.mainAction.trim());
    const hasFraming = Boolean(config.framing && config.framing.trim());
    const hasEntity = scene.characters.length > 0 || scene.environments.length > 0;

    const isReady = hasTitle && hasAction && hasFraming && hasEntity;
    const missing: string[] = [];
    if (!hasAction) missing.push("Ação Principal");
    if (!hasEntity) missing.push("Vínculo de Personagem ou Ambiente");

    return { isReady, missing };
  };

  // Abrir Modal de Criação
  const handleOpenCreate = () => {
    setEditingScene(null);
    setParamValues({});
    setFormData({
      title: `Cena ${scenes.length + 1}`,
      description: "",
      durationSeconds: "",
      selectedCharacterIds: [],
      selectedEnvironmentIds: [],
      mainAction: "",
      initialState: "",
      finalState: "",
      characterMovement: "",
      framing: "Plano Médio (Medium Shot)",
      cameraMovement: "Estática",
      focusDepth: "Profundidade de campo padrão",
      lighting: "Iluminação natural / ambiente",
      visualStyle: "",
      transitionIn: "Corte Direto (Cut)",
      transitionOut: "Corte Direto (Cut)",
      ambientSound: "",
      dialogueEnabled: false,
      dialogueLanguage: "pt-BR",
      dialogueLines: "",
      musicEnabled: false,
      musicDescription: "",
      restrictions: "",
    });
    setFormError(null);
    setModalOpen(true);
  };

  // Abrir Modal de Edição
  const handleOpenEdit = (scene: SceneItem) => {
    setEditingScene(scene);
    setParamValues({});
    const config = scene.configuration || {};
    setFormData({
      title: scene.title || "",
      description: scene.description || "",
      durationSeconds: scene.durationSeconds ?? "",
      selectedCharacterIds: scene.characters.map((c) => c.characterId),
      selectedEnvironmentIds: scene.environments.map((e) => e.environmentId),
      mainAction: config.mainAction || "",
      initialState: config.initialState || "",
      finalState: config.finalState || "",
      characterMovement: config.characterMovement || "",
      framing: config.framing || "Plano Médio (Medium Shot)",
      cameraMovement: config.cameraMovement || "Estática",
      focusDepth: config.focusDepth || "Profundidade de campo padrão",
      lighting: config.lighting || "Iluminação natural / ambiente",
      visualStyle: config.visualStyle || "",
      transitionIn: config.transitionIn || "Corte Direto (Cut)",
      transitionOut: config.transitionOut || "Corte Direto (Cut)",
      ambientSound: config.ambientSound || "",
      dialogueEnabled: config.dialogue?.enabled || false,
      dialogueLanguage: config.dialogue?.language || "pt-BR",
      dialogueLines: config.dialogue?.lines || "",
      musicEnabled: config.music?.enabled || false,
      musicDescription: config.music?.description || "",
      restrictions: config.restrictions || "",
    });
    setFormError(null);
    setModalOpen(true);
  };

  // Salvar Cena
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setFormError("O título da cena é obrigatório.");
      return;
    }

    try {
      setFormLoading(true);
      setFormError(null);

      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        durationSeconds:
          formData.durationSeconds === "" ? null : Number(formData.durationSeconds),
        characterIds: formData.selectedCharacterIds,
        environmentIds: formData.selectedEnvironmentIds,
        configuration: {
          mainAction: formData.mainAction.trim(),
          initialState: formData.initialState.trim(),
          finalState: formData.finalState.trim(),
          framing: paramValues.tipo_de_plano || formData.framing || "Plano Médio (Medium Shot)",
          cameraMovement: paramValues.movimento_camera || formData.cameraMovement || "Estática",
          focusDepth: formData.focusDepth,
          lighting: paramValues.estilo_iluminacao || (formData.lighting ? formData.lighting.trim() : "Iluminação natural / ambiente"),
          visualStyle: formData.visualStyle ? formData.visualStyle.trim() : "",
          transitionIn: formData.transitionIn,
          transitionOut: formData.transitionOut,
          ambientSound: formData.ambientSound.trim(),
          dialogue: {
            enabled: formData.dialogueEnabled,
            language: formData.dialogueLanguage,
            lines: formData.dialogueLines.trim(),
          },
          music: {
            enabled: formData.musicEnabled,
            description: formData.musicDescription.trim(),
          },
          restrictions: formData.restrictions.trim(),
        },
      };

      const endpoint = editingScene
        ? `/api/projects/${projectId}/scenes/${editingScene.id}`
        : `/api/projects/${projectId}/scenes`;
      const method = editingScene ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorJson = await res.json();
        throw new Error(errorJson.error || "Falha ao salvar a cena.");
      }

      const responseJson = await res.json();
      const savedSceneId = editingScene?.id || responseJson.data?.id;

      // Salva os valores dos parâmetros dinâmicos se preenchidos
      if (savedSceneId && Object.keys(paramValues).length > 0) {
        const paramPayload = {
          values: Object.entries(paramValues)
            .filter(([_, val]) => val !== undefined && val !== null && val !== "")
            .map(([defId, val]) => ({
              parameterDefinitionId: defId,
              targetType: "SCENE" as const,
              targetId: savedSceneId,
              value: val,
            })),
        };

        if (paramPayload.values.length > 0) {
          await fetch(`/api/projects/${projectId}/parameters`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(paramPayload),
          });
        }
      }

      setModalOpen(false);
      fetchScenes();
      if (onStatsUpdate) onStatsUpdate();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro desconhecido.");
    } finally {
      setFormLoading(false);
    }
  };

  // Mover Cena na Sequência (Subir / Descer)
  const handleMoveScene = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= scenes.length) return;

    const newScenes = [...scenes];
    const [moved] = newScenes.splice(index, 1);
    newScenes.splice(targetIndex, 0, moved);

    // Atualização otimista
    setScenes(newScenes);

    try {
      const res = await fetch(`/api/projects/${projectId}/scenes/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sceneIds: newScenes.map((s) => s.id) }),
      });
      if (!res.ok) throw new Error("Erro ao salvar nova ordem das cenas.");
      fetchScenes();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Falha na reordenação.");
      fetchScenes();
    }
  };

  // Duplicar Cena
  const handleDuplicate = async (scene: SceneItem) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/scenes/${scene.id}/duplicate`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Erro ao duplicar cena.");
      fetchScenes();
      if (onStatsUpdate) onStatsUpdate();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao duplicar.");
    }
  };

  // Excluir Cena
  const handleConfirmDelete = async () => {
    if (!sceneToDelete) return;
    try {
      setDeleteLoading(true);
      const res = await fetch(`/api/projects/${projectId}/scenes/${sceneToDelete.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao excluir cena.");
      }
      setDeleteModalOpen(false);
      setSceneToDelete(null);
      fetchScenes();
      if (onStatsUpdate) onStatsUpdate();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao excluir.");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Analisar Continuidade
  const handleRunContinuityCheck = async () => {
    try {
      setContinuityLoading(true);
      setContinuityModalOpen(true);
      const res = await fetch(`/api/projects/${projectId}/scenes/continuity`);
      if (!res.ok) throw new Error("Erro ao analisar continuidade.");
      const json = await res.json();
      setContinuityReport(json.data);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao executar análise.");
    } finally {
      setContinuityLoading(false);
    }
  };

  // Filtragem
  const filteredScenes = scenes.filter((scene) => {
    const { isReady } = checkSceneReadiness(scene);
    if (filterMode === "ready") return isReady;
    if (filterMode === "incomplete") return !isReady;
    return true;
  });

  return (
    <div className="mt-8 space-y-6">
      {/* Barra Superior: Filtros, Estatísticas e Ações */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {/* Filtros de Prontidão */}
          <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/10">
            {(["all", "ready", "incomplete"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilterMode(mode)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  filterMode === mode
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold"
                    : "text-white/60 hover:text-white"
                }`}
              >
                {mode === "all" && `Todas (${scenes.length})`}
                {mode === "ready" &&
                  `Prontas (${scenes.filter((s) => checkSceneReadiness(s).isReady).length})`}
                {mode === "incomplete" &&
                  `Incompletas (${scenes.filter((s) => !checkSceneReadiness(s).isReady).length})`}
              </button>
            ))}
          </div>

          {/* Botão de Análise de Continuidade */}
          <button
            onClick={handleRunContinuityCheck}
            className="flex items-center gap-1.5 rounded-xl border border-purple-500/30 bg-purple-500/10 px-3.5 py-2 text-xs font-semibold text-purple-300 hover:bg-purple-500/20 transition shadow-sm"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Análise de Continuidade
          </button>
        </div>

        {/* Botão Nova Cena */}
        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-500 transition"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nova Cena
        </button>
      </div>

      {/* Conteúdo: Lista Sequencial de Cenas */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-white/5 border border-white/10" />
          ))}
        </div>
      ) : filteredScenes.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.01] p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-4">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-white">Nenhuma cena na sequência</h3>
          <p className="mt-1 text-xs text-white/50 max-w-sm mx-auto">
            {filterMode !== "all"
              ? "Nenhuma cena atende ao filtro selecionado."
              : "Estruture sua narrativa em tomadas cinematográficas com enquadramento, ação e continuidade."}
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20 transition"
          >
            + Criar Primeira Cena
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredScenes.map((scene, index) => {
            const config = scene.configuration || {};
            const { isReady, missing } = checkSceneReadiness(scene);

            return (
              <div
                key={scene.id}
                className="flex flex-col md:flex-row md:items-start justify-between gap-4 rounded-2xl border border-white/10 bg-black/40 p-5 transition hover:border-emerald-500/30"
              >
                {/* Lado Esquerdo: Sequenciador e Dados da Cena */}
                <div className="flex items-start gap-4 flex-1">
                  {/* Controles de Reordenação e Número */}
                  <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                    <button
                      onClick={() => handleMoveScene(index, "up")}
                      disabled={index === 0}
                      className="rounded-lg p-1 text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-20 transition"
                      title="Mover para cima"
                    >
                      ▲
                    </button>
                    <span className="rounded-lg bg-emerald-500/10 px-2 py-1 text-xs font-mono font-bold text-emerald-300 border border-emerald-500/20">
                      #{scene.order}
                    </span>
                    <button
                      onClick={() => handleMoveScene(index, "down")}
                      disabled={index === scenes.length - 1}
                      className="rounded-lg p-1 text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-20 transition"
                      title="Mover para baixo"
                    >
                      ▼
                    </button>
                  </div>

                  {/* Informações Centrais da Cena */}
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-bold text-white">{scene.title}</h4>

                      {/* Status de Prontidão */}
                      {isReady ? (
                        <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                          ✓ Pronta para Geração
                        </span>
                      ) : (
                        <span
                          className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-amber-300 border border-amber-500/20"
                          title={`Faltando: ${missing.join(", ")}`}
                        >
                          ⚠ Incompleta ({missing[0]})
                        </span>
                      )}

                      {/* Duração com tag de planejamento */}
                      {scene.durationSeconds ? (
                        <span
                          className="rounded bg-white/5 px-2 py-0.5 text-[10px] font-mono text-white/60 border border-white/10"
                          title="Duração planejada (estimativa de roteiro)"
                        >
                          ⏱️ ~{scene.durationSeconds}s
                        </span>
                      ) : null}
                    </div>

                    {/* Descrição Narrativa */}
                    {scene.description && (
                      <p className="text-xs text-white/60 line-clamp-2">{scene.description}</p>
                    )}

                    {/* Ação Principal */}
                    {config.mainAction && (
                      <div className="text-xs bg-white/[0.02] border border-white/5 rounded-xl p-2.5 text-white/80">
                        <span className="font-semibold text-emerald-400">Ação:</span>{" "}
                        {config.mainAction}
                      </div>
                    )}

                    {/* Badges Cinematográficos */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {config.framing && (
                        <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] text-blue-300 border border-blue-500/20">
                          🎥 {config.framing}
                        </span>
                      )}
                      {config.cameraMovement && (
                        <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-[10px] text-indigo-300 border border-indigo-500/20">
                          🔄 {config.cameraMovement}
                        </span>
                      )}
                      {config.lighting && (
                        <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300 border border-amber-500/20 truncate max-w-[200px]">
                          💡 {config.lighting}
                        </span>
                      )}
                      {config.dialogue?.enabled && (
                        <span className="rounded-md bg-pink-500/10 px-2 py-0.5 text-[10px] text-pink-300 border border-pink-500/20">
                          💬 Diálogo ({config.dialogue.language || "pt-BR"})
                        </span>
                      )}
                      {config.music?.enabled && (
                        <span className="rounded-md bg-teal-500/10 px-2 py-0.5 text-[10px] text-teal-300 border border-teal-500/20">
                          🎵 Música
                        </span>
                      )}
                    </div>

                    {/* Vínculos de Personagens e Ambientes */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
                      {scene.characters.map((sc) => (
                        <span
                          key={sc.characterId}
                          className="rounded-md bg-white/5 px-2 py-0.5 text-white/70 border border-white/10"
                        >
                          👤 {sc.character.name}
                        </span>
                      ))}
                      {scene.environments.map((se) => (
                        <span
                          key={se.environmentId}
                          className="rounded-md bg-white/5 px-2 py-0.5 text-white/70 border border-white/10"
                        >
                          📍 {se.environment.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Lado Direito: Ações */}
                <div className="flex md:flex-col items-center justify-end gap-1.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 md:border-l border-white/10 md:pl-4">
                  {/* Botão Central de Prompts */}
                  <button
                    onClick={() => {
                      if (onOpenPromptEngine) {
                        onOpenPromptEngine(scene.id);
                      } else {
                        handleOpenEdit(scene);
                      }
                    }}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20 transition w-full justify-center"
                    title="Configurar geração de prompt"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Gerar Prompt
                  </button>

                  <div className="flex items-center gap-1 w-full justify-end">
                    {/* Botão Editar */}
                    <button
                      onClick={() => handleOpenEdit(scene)}
                      className="rounded-lg p-1.5 text-white/60 hover:text-white hover:bg-white/10 transition"
                      title="Editar cena"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>

                    {/* Botão Duplicar */}
                    <button
                      onClick={() => handleDuplicate(scene)}
                      className="rounded-lg p-1.5 text-white/60 hover:text-white hover:bg-white/10 transition"
                      title="Duplicar cena"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>

                    {/* Botão Excluir */}
                    <button
                      onClick={() => {
                        setSceneToDelete(scene);
                        setDeleteModalOpen(true);
                      }}
                      className="rounded-lg p-1.5 text-white/60 hover:text-red-400 hover:bg-red-500/10 transition"
                      title="Excluir cena"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Criar / Editar Cena */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-[#0f1218] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">
                  {editingScene ? "Editar Tomada / Cena" : "Nova Tomada Cinematográfica"}
                </h3>
                <p className="text-xs text-white/50">
                  Configure ação, câmera, iluminação, som e continuidade para compor o plano.
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-xl p-1.5 text-white/50 hover:bg-white/10 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mt-4 rounded-xl border border-red-500/20 bg-red-950/30 p-3 text-xs text-red-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmitForm} className="mt-5 space-y-5">
              {/* Seção 1: Identificação e Duração Planejada */}
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-white/80 mb-1">
                    Título da Tomada / Cena <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ex: Cena 1 - Invasão ao Beco Neon"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/40 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1">
                    Duração Planejada (segundos)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={3600}
                    value={formData.durationSeconds}
                    onChange={(e) => setFormData({ ...formData, durationSeconds: e.target.value })}
                    placeholder="Ex: 5"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/40 focus:border-emerald-500 focus:outline-none"
                  />
                  <span className="block text-[10px] text-white/40 mt-1">
                    Intenção de planejamento de roteiro.
                  </span>
                </div>
              </div>

              {/* Descrição Narrativa */}
              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1">Descrição Narrativa</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Contexto dramático da cena..."
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/40 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Seção 2: Foco e Transições Cinematográficas */}
              <div className="rounded-2xl border border-white/5 bg-black/20 p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400">
                  Foco & Transições Cinematográficas
                </h4>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="block text-[11px] font-medium text-white/70 mb-1">Foco e Profundidade</label>
                    <input
                      type="text"
                      value={formData.focusDepth}
                      onChange={(e) => setFormData({ ...formData, focusDepth: e.target.value })}
                      placeholder="Ex: Foco raso f/1.8 com bokeh acentuado"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-white/70 mb-1">Transição de Entrada</label>
                    <input
                      type="text"
                      value={formData.transitionIn}
                      onChange={(e) => setFormData({ ...formData, transitionIn: e.target.value })}
                      placeholder="Ex: Corte Direto, Fade in, Dissolve..."
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-white/70 mb-1">Transição de Saída</label>
                    <input
                      type="text"
                      value={formData.transitionOut}
                      onChange={(e) => setFormData({ ...formData, transitionOut: e.target.value })}
                      placeholder="Ex: Corte Direto, Match cut..."
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Seção Cinematográfica: Enquadramento, Movimento e Iluminação com Referências Visuais */}
              <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-950/10 via-black/20 to-black/40 p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                    <span>🎬</span> Linguagem de Câmera & Fotografia (Referências Visuais)
                  </h4>
                  <span className="text-[10px] text-white/40">
                    Clique nas opções para ver referências e didáticas
                  </span>
                </div>

                <div className="space-y-4">
                  <VisualParameterSelector
                    label="Enquadramento da Cena (Framing)"
                    description="Define a proximidade e a relação de proporção do sujeito no quadro."
                    value={formData.framing}
                    onChange={(val) => setFormData((prev) => ({ ...prev, framing: val }))}
                    category="FRAMING"
                    compactInitial={true}
                  />

                  <VisualParameterSelector
                    label="Movimento de Câmera (Camera Movement)"
                    description="Define a dinâmica espacial, velocidade e trajetória da câmera durante o plano."
                    value={formData.cameraMovement}
                    onChange={(val) => setFormData((prev) => ({ ...prev, cameraMovement: val }))}
                    category="CAMERA_MOVEMENT"
                    compactInitial={true}
                  />

                  <VisualParameterSelector
                    label="Estilo de Iluminação (Lighting)"
                    description="Define o contraste, temperatura, direção e atmosfera das fontes de luz."
                    value={formData.lighting}
                    onChange={(val) => setFormData((prev) => ({ ...prev, lighting: val }))}
                    category="LIGHTING"
                    compactInitial={true}
                  />
                </div>
              </div>

              {/* Seção 3: Ação, Continuidade e Movimentação */}
              <div className="rounded-2xl border border-white/5 bg-black/20 p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Ação & Continuidade Narrativa
                </h4>

                <div>
                  <label className="block text-[11px] font-medium text-white/70 mb-1">
                    Ação Principal da Cena <span className="text-emerald-400">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={formData.mainAction}
                    onChange={(e) => setFormData({ ...formData, mainAction: e.target.value })}
                    placeholder="Descreva a ação física essencial que acontece na tomada..."
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-medium text-white/70 mb-1">
                      Estado Inicial (Como a cena começa)
                    </label>
                    <input
                      type="text"
                      value={formData.initialState}
                      onChange={(e) => setFormData({ ...formData, initialState: e.target.value })}
                      placeholder="Ex: Personagem escondido atrás da pilastra"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-white/70 mb-1">
                      Estado Final Esperado (Como a cena termina)
                    </label>
                    <input
                      type="text"
                      value={formData.finalState}
                      onChange={(e) => setFormData({ ...formData, finalState: e.target.value })}
                      placeholder="Ex: Personagem cai de joelhos desarmado"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-white/70 mb-1">
                    Posição e Direção de Movimento dos Personagens
                  </label>
                  <input
                    type="text"
                    value={formData.characterMovement}
                    onChange={(e) => setFormData({ ...formData, characterMovement: e.target.value })}
                    placeholder="Ex: Avança da esquerda para a direita do quadro em passo acelerado"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Seção 4: Vínculo de Personagens e Ambientes */}
              <div className="rounded-2xl border border-white/5 bg-black/20 p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400">
                  Personagens e Ambientes Participantes
                </h4>

                <div>
                  <label className="block text-[11px] font-medium text-white/70 mb-1.5">
                    Personagens em Cena
                  </label>
                  {availableCharacters.length === 0 ? (
                    <p className="text-[11px] text-white/40">Nenhum personagem cadastrado no projeto.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {availableCharacters.map((char) => {
                        const isSelected = formData.selectedCharacterIds.includes(char.id);
                        return (
                          <button
                            type="button"
                            key={char.id}
                            onClick={() => {
                              const updated = isSelected
                                ? formData.selectedCharacterIds.filter((id) => id !== char.id)
                                : [...formData.selectedCharacterIds, char.id];
                              setFormData({ ...formData, selectedCharacterIds: updated });
                            }}
                            className={`rounded-xl px-3 py-1.5 text-xs font-medium border transition ${
                              isSelected
                                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-semibold"
                                : "bg-white/5 text-white/60 border-white/10 hover:text-white"
                            }`}
                          >
                            {isSelected ? "✓ " : "+ "} {char.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-white/70 mb-1.5">
                    Ambiente do Plano
                  </label>
                  {availableEnvironments.length === 0 ? (
                    <p className="text-[11px] text-white/40">Nenhum ambiente cadastrado no projeto.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {availableEnvironments.map((env) => {
                        const isSelected = formData.selectedEnvironmentIds.includes(env.id);
                        return (
                          <button
                            type="button"
                            key={env.id}
                            onClick={() => {
                              const updated = isSelected
                                ? formData.selectedEnvironmentIds.filter((id) => id !== env.id)
                                : [...formData.selectedEnvironmentIds, env.id];
                              setFormData({ ...formData, selectedEnvironmentIds: updated });
                            }}
                            className={`rounded-xl px-3 py-1.5 text-xs font-medium border transition ${
                              isSelected
                                ? "bg-blue-500/20 text-blue-300 border-blue-500/40 font-semibold"
                                : "bg-white/5 text-white/60 border-white/10 hover:text-white"
                            }`}
                          >
                            {isSelected ? "✓ " : "+ "} {env.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Seção 5: Som, Diálogo e Música */}
              <div className="rounded-2xl border border-white/5 bg-black/20 p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-pink-400">
                  Desenho de Som, Diálogos & Trilha
                </h4>

                <div>
                  <label className="block text-[11px] font-medium text-white/70 mb-1">Som Ambiente</label>
                  <input
                    type="text"
                    value={formData.ambientSound}
                    onChange={(e) => setFormData({ ...formData, ambientSound: e.target.value })}
                    placeholder="Ex: Chuva forte contra janelas, sirenes distantes, eco metálico"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Diálogo */}
                <div className="rounded-xl border border-white/5 bg-black/30 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-white">
                      <input
                        type="checkbox"
                        checked={formData.dialogueEnabled}
                        onChange={(e) =>
                          setFormData({ ...formData, dialogueEnabled: e.target.checked })
                        }
                        className="rounded border-white/20 bg-white/10 text-emerald-500"
                      />
                      <span>Habilitar Diálogo nesta tomada</span>
                    </label>

                    {formData.dialogueEnabled && (
                      <span className="text-[10px] font-mono text-emerald-400">
                        Idioma padrão: {formData.dialogueLanguage}
                      </span>
                    )}
                  </div>

                  {formData.dialogueEnabled && (
                    <div className="pt-2 space-y-2">
                      <textarea
                        rows={2}
                        value={formData.dialogueLines}
                        onChange={(e) =>
                          setFormData({ ...formData, dialogueLines: e.target.value })
                        }
                        placeholder="Ex: KAELEN: 'Eles já sabem que estamos aqui.'"
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-emerald-500 focus:outline-none"
                      />
                      <p className="text-[10px] text-white/40">
                        * Em projetos em português do Brasil, as falas devem respeitar o pt-BR salvo especificação explícita.
                      </p>
                    </div>
                  )}
                </div>

                {/* Música */}
                <div className="rounded-xl border border-white/5 bg-black/30 p-3 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-white">
                    <input
                      type="checkbox"
                      checked={formData.musicEnabled}
                      onChange={(e) => setFormData({ ...formData, musicEnabled: e.target.checked })}
                      className="rounded border-white/20 bg-white/10 text-emerald-500"
                    />
                    <span>Habilitar Música nesta tomada</span>
                  </label>

                  {formData.musicEnabled && (
                    <input
                      type="text"
                      value={formData.musicDescription}
                      onChange={(e) =>
                        setFormData({ ...formData, musicDescription: e.target.value })
                      }
                      placeholder="Ex: Sintetizadores analógicos sombrios com batida pulsante em crescendo"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-emerald-500 focus:outline-none mt-2"
                    />
                  )}
                </div>
              </div>

              {/* Seção 6: Restrições */}
              <div className="rounded-2xl border border-white/5 bg-black/20 p-4 space-y-2">
                <label className="block text-[11px] font-medium text-white/70">
                  Restrições Específicas da Tomada (Negative Prompt / Evitar)
                </label>
                <input
                  type="text"
                  value={formData.restrictions}
                  onChange={(e) => setFormData({ ...formData, restrictions: e.target.value })}
                  placeholder="Ex: Sem cortes rápidos, sem luz solar direta, sem figurantes sorrindo"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Seção Dinâmica: Parâmetros Cinematográficos */}
              <EntityParametersSection
                projectId={projectId}
                targetType="SCENE"
                targetId={editingScene?.id}
                values={paramValues}
                onChange={(defId, val) =>
                  setParamValues((prev) => ({ ...prev, [defId]: val }))
                }
              />

              {/* Botões do Rodapé */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-medium text-white/70 hover:bg-white/10 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 disabled:opacity-50 transition"
                >
                  {formLoading && (
                    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  )}
                  {editingScene ? "Salvar Alterações" : "Criar Cena"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Análise de Continuidade Cinematográfica */}
      {continuityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl border border-white/10 bg-[#0f1218] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-purple-500/10 px-2 py-1 text-xs font-mono text-purple-300 border border-purple-500/20">
                  SCRIPT CONTINUITY
                </span>
                <h3 className="text-base font-bold text-white">Relatório de Continuidade Cinematográfica</h3>
              </div>
              <button
                onClick={() => setContinuityModalOpen(false)}
                className="rounded-xl p-1.5 text-white/50 hover:bg-white/10 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            <div className="mt-4">
              {continuityLoading ? (
                <div className="flex items-center justify-center py-12">
                  <svg className="h-6 w-6 animate-spin text-purple-400" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                </div>
              ) : !continuityReport ? (
                <p className="text-xs text-white/50">Nenhum relatório disponível.</p>
              ) : (
                <div className="space-y-4">
                  {/* Banner de Status Resumido */}
                  <div
                    className={`rounded-2xl border p-4 ${
                      continuityReport.status === "ok"
                        ? "border-emerald-500/20 bg-emerald-950/20 text-emerald-300"
                        : continuityReport.status === "critical"
                        ? "border-red-500/20 bg-red-950/20 text-red-300"
                        : "border-amber-500/20 bg-amber-950/20 text-amber-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">
                        {continuityReport.status === "ok" && "✓ Continuidade Perfeita"}
                        {continuityReport.status === "critical" && "⚠ Inconsistências Críticas Detectadas"}
                        {continuityReport.status === "needs_attention" && "ℹ Pontos de Atenção Identificados"}
                      </span>
                      <span className="text-xs font-mono opacity-80">
                        {continuityReport.analyzedScenesCount} cenas analisadas
                      </span>
                    </div>
                    <div className="mt-2 flex gap-4 text-xs opacity-90">
                      <span>Críticos: {continuityReport.summary.critical}</span>
                      <span>Avisos: {continuityReport.summary.warning}</span>
                      <span>Sugestões: {continuityReport.summary.info}</span>
                    </div>
                  </div>

                  {/* Lista de Alertas Explicáveis com Sugestões */}
                  {continuityReport.warnings.length === 0 ? (
                    <div className="rounded-2xl border border-white/5 bg-black/20 p-8 text-center text-xs text-white/50">
                      Nenhuma quebra de continuidade detectada. As transições de ação, iluminação, ambiente e linha de olhar estão consistentes.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {continuityReport.warnings.map((w, idx) => (
                        <div
                          key={idx}
                          className={`rounded-2xl border bg-black/40 p-4 space-y-2 ${
                            w.severity === "critical"
                              ? "border-red-500/30"
                              : w.severity === "warning"
                              ? "border-amber-500/30"
                              : "border-blue-500/30"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span
                                className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                                  w.severity === "critical"
                                    ? "bg-red-500/20 text-red-300"
                                    : w.severity === "warning"
                                    ? "bg-amber-500/20 text-amber-300"
                                    : "bg-blue-500/20 text-blue-300"
                                }`}
                              >
                                {w.severity === "critical"
                                  ? "Crítico"
                                  : w.severity === "warning"
                                  ? "Atenção"
                                  : "Sugestão"}
                              </span>
                              <h5 className="font-bold text-xs text-white">{w.title}</h5>
                            </div>

                            {w.sceneOrderB && (
                              <span className="text-[10px] font-mono text-white/40">
                                Cena {w.sceneOrderA} → Cena {w.sceneOrderB}
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-white/70">{w.message}</p>

                          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2 text-[11px] text-emerald-300">
                            <strong>💡 Sugestão do Diretor:</strong> {w.suggestion}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => setContinuityModalOpen(false)}
                      className="rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20 transition"
                    >
                      Fechar Relatório
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Exclusão com Confirmação */}
      {deleteModalOpen && sceneToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-3xl border border-red-500/20 bg-[#0f1218] p-6 shadow-2xl">
            <h3 className="text-base font-bold text-red-300">Excluir Cena?</h3>
            <p className="mt-2 text-xs text-white/70">
              Tem certeza que deseja excluir permanentemente a cena{" "}
              <strong className="text-white">&quot;{sceneToDelete.title}&quot;</strong> (Ordem #{sceneToDelete.order})?

            </p>
            <p className="mt-2 text-[11px] text-white/50">
              A ordem das cenas subsequentes será recompactada automaticamente.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="rounded-xl px-4 py-2 text-xs font-medium text-white/70 hover:bg-white/10 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50 transition"
              >
                {deleteLoading ? "Excluindo..." : "Sim, Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
