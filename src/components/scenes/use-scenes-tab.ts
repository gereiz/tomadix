"use client";

import { useState, useEffect, useCallback } from "react";
import { ContinuityReport } from "@/modules/scenes/scene.schema";
import type { SceneItem, AvailableEntity } from "./types";
import type { ScenesTabProps } from "./types";

export function useScenesTab({ projectId, onStatsUpdate, onOpenPromptEngine }: ScenesTabProps) {
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
    filmGrain: 25,
  });

  // Dynamic Parameters State
  const [paramValues, setParamValues] = useState<Record<string, any>>({});
  const [paramKeyMap, setParamKeyMap] = useState<Record<string, string>>({});

  // Modal Continuidade
  const [continuityModalOpen, setContinuityModalOpen] = useState(false);
  const [continuityReport, setContinuityReport] = useState<ContinuityReport | null>(null);
  const [continuityLoading, setContinuityLoading] = useState(false);

  // Modal Exclusão
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [sceneToDelete, setSceneToDelete] = useState<SceneItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Modal Expansão de Cena (EXPAND_SCENE)
  const [expandModalOpen, setExpandModalOpen] = useState(false);
  const [sceneToExpand, setSceneToExpand] = useState<SceneItem | null>(null);
  const [expandType, setExpandType] = useState<"SUB_SHOTS" | "CAMERA_ANGLES" | "MICRO_ACTIONS" | "DETAIL_SHOTS">("SUB_SHOTS");
  const [expandCount, setExpandCount] = useState<number>(3);
  const [expandDirectives, setExpandDirectives] = useState<string>("");
  const [expandLoading, setExpandLoading] = useState(false);
  const [expandError, setExpandError] = useState<string | null>(null);

  // Modal Sequência de Cenas (GEN_SCENE_SEQUENCE)
  const [sequenceModalOpen, setSequenceModalOpen] = useState(false);
  const [sequencePremise, setSequencePremise] = useState("");
  const [sequenceCount, setSequenceCount] = useState<number>(4);
  const [sequencePacing, setSequencePacing] = useState<"SLOW_BURN" | "BALANCED" | "FAST_PACED" | "ACTION_INTENSE">("BALANCED");
  const [sequenceMood, setSequenceMood] = useState("");
  const [sequenceSelectedChars, setSequenceSelectedChars] = useState<string[]>([]);
  const [sequenceSelectedEnvs, setSequenceSelectedEnvs] = useState<string[]>([]);
  const [sequenceLoading, setSequenceLoading] = useState(false);
  const [sequenceError, setSequenceError] = useState<string | null>(null);

  // Modal Roteiro Completo (GEN_SCRIPT)
  const [scriptModalOpen, setScriptModalOpen] = useState(false);
  const [scriptPremise, setScriptPremise] = useState("");
  const [scriptFormat, setScriptFormat] = useState<"SHORT_FILM" | "SCENE_SEQUENCE" | "COMMERCIAL" | "TRAILER">("SHORT_FILM");
  const [scriptTone, setScriptTone] = useState("");
  const [scriptCreateScenes, setScriptCreateScenes] = useState(true);
  const [scriptLoading, setScriptLoading] = useState(false);
  const [scriptResult, setScriptResult] = useState<any>(null);
  const [scriptError, setScriptError] = useState<string | null>(null);

  // Modal de Geração Direta de Imagem da Cena (Quadro Inicial e Final)
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageModalScene, setImageModalScene] = useState<SceneItem | null>(null);
  const [imageModalFrameType, setImageModalFrameType] = useState<"SCENE_START" | "SCENE_END">("SCENE_START");

  // Lightbox para visualização de keyframes em alta resolução
  const [lightboxImage, setLightboxImage] = useState<{
    url: string;
    title: string;
    subtitle?: string;
    prompt?: string;
  } | null>(null);

  const handleOpenSceneImage = (scene: SceneItem, frameType: "SCENE_START" | "SCENE_END") => {
    setImageModalScene(scene);
    setImageModalFrameType(frameType);
    setImageModalOpen(true);
  };

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
      filmGrain: 25,
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
      filmGrain: config.filmGrain !== undefined ? Number(config.filmGrain) : 25,
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
          filmGrain: Number(formData.filmGrain) ?? 25,
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

      // Sincroniza granulação de película nos parâmetros dinâmicos se o mapping existir
      const effectiveParamValues = { ...paramValues };
      if (paramKeyMap.nivel_granulacao_pelicula) {
        effectiveParamValues[paramKeyMap.nivel_granulacao_pelicula] = Number(formData.filmGrain) ?? 25;
      }

      // Salva os valores dos parâmetros dinâmicos se preenchidos
      if (savedSceneId && Object.keys(effectiveParamValues).length > 0) {
        const paramPayload = {
          values: Object.entries(effectiveParamValues)
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

  // Abrir Modal de Expansão de Cena
  const handleOpenExpand = (scene: SceneItem) => {
    setSceneToExpand(scene);
    setExpandType("SUB_SHOTS");
    setExpandCount(3);
    setExpandDirectives("");
    setExpandError(null);
    setExpandModalOpen(true);
  };

  // Submeter Expansão de Cena (EXPAND_SCENE)
  const handleSubmitExpand = async () => {
    if (!sceneToExpand) return;
    try {
      setExpandLoading(true);
      setExpandError(null);
      const res = await fetch(`/api/projects/${projectId}/scenes/${sceneToExpand.id}/expand`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expansionType: expandType,
          count: expandCount,
          directives: expandDirectives,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao expandir cena.");

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("tomadix:credits-updated", { detail: { newBalance: data.newBalance } }));
        window.dispatchEvent(new CustomEvent("tomadix:entities-updated", { detail: { type: "scenes", projectId } }));
      }
      setExpandModalOpen(false);
      await fetchScenes();
      onStatsUpdate?.();
    } catch (err: any) {
      setExpandError(err.message || "Erro ao expandir cena.");
    } finally {
      setExpandLoading(false);
    }
  };

  // Abrir Modal de Sequência de Cenas
  const handleOpenSequence = () => {
    setSequencePremise("");
    setSequenceCount(4);
    setSequencePacing("BALANCED");
    setSequenceMood("");
    setSequenceSelectedChars([]);
    setSequenceSelectedEnvs([]);
    setSequenceError(null);
    setSequenceModalOpen(true);
  };

  // Submeter Sequência de Cenas (GEN_SCENE_SEQUENCE)
  const handleSubmitSequence = async () => {
    if (!sequencePremise.trim()) {
      setSequenceError("Por favor informe a premissa da sequência.");
      return;
    }
    try {
      setSequenceLoading(true);
      setSequenceError(null);
      const res = await fetch(`/api/projects/${projectId}/scenes/generate-sequence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          premise: sequencePremise,
          sceneCount: sequenceCount,
          pacing: sequencePacing,
          mood: sequenceMood,
          characterIds: sequenceSelectedChars,
          environmentIds: sequenceSelectedEnvs,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao gerar sequência de cenas.");

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("tomadix:credits-updated", { detail: { newBalance: data.newBalance } }));
        window.dispatchEvent(new CustomEvent("tomadix:entities-updated", { detail: { type: "scenes", projectId } }));
      }
      setSequenceModalOpen(false);
      await fetchScenes();
      onStatsUpdate?.();
    } catch (err: any) {
      setSequenceError(err.message || "Erro ao gerar sequência.");
    } finally {
      setSequenceLoading(false);
    }
  };

  // Abrir Modal de Roteiro
  const handleOpenScript = () => {
    setScriptPremise("");
    setScriptFormat("SHORT_FILM");
    setScriptTone("");
    setScriptCreateScenes(true);
    setScriptResult(null);
    setScriptError(null);
    setScriptModalOpen(true);
  };

  // Submeter Geração de Roteiro (GEN_SCRIPT)
  const handleSubmitScript = async () => {
    if (!scriptPremise.trim()) {
      setScriptError("Por favor informe a premissa dramática do roteiro.");
      return;
    }
    try {
      setScriptLoading(true);
      setScriptError(null);
      const res = await fetch(`/api/projects/${projectId}/script/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          premise: scriptPremise,
          format: scriptFormat,
          tone: scriptTone,
          generateScenesImmediately: scriptCreateScenes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao gerar roteiro.");

      setScriptResult(data.data);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("tomadix:credits-updated", { detail: { newBalance: data.newBalance } }));
        window.dispatchEvent(new CustomEvent("tomadix:entities-updated", { detail: { type: "scenes", projectId } }));
      }
      await fetchScenes();
      onStatsUpdate?.();
    } catch (err: any) {
      setScriptError(err.message || "Erro ao gerar roteiro.");
    } finally {
      setScriptLoading(false);
    }
  };

  // Filtragem
  const filteredScenes = scenes.filter((scene) => {
    const { isReady } = checkSceneReadiness(scene);
    if (filterMode === "ready") return isReady;
    if (filterMode === "incomplete") return !isReady;
    return true;
  });


  return {
    scenes,
    filterMode,
    setFilterMode,
    checkSceneReadiness,
    handleOpenCreate,
    handleRunContinuityCheck,
    handleOpenSequence,
    handleOpenScript,
    onOpenPromptEngine,
    loading,
    setDeleteModalOpen,
    setSceneToDelete,
    setLightboxImage,
    handleOpenSceneImage,
    handleOpenEdit,
    handleMoveScene,
    handleDuplicate,
    handleOpenExpand,
    filteredScenes,
    projectId,
    availableCharacters,
    availableEnvironments,
    setModalOpen,
    editingScene,
    formLoading,
    formError,
    formData,
    setFormData,
    paramValues,
    setParamValues,
    paramKeyMap,
    setParamKeyMap,
    handleSubmitForm,
    setContinuityModalOpen,
    continuityReport,
    continuityLoading,
    setExpandModalOpen,
    sceneToExpand,
    expandType,
    setExpandType,
    expandCount,
    setExpandCount,
    expandDirectives,
    setExpandDirectives,
    expandLoading,
    expandError,
    handleSubmitExpand,
    setSequenceModalOpen,
    sequencePremise,
    setSequencePremise,
    sequenceCount,
    setSequenceCount,
    sequencePacing,
    setSequencePacing,
    sequenceMood,
    setSequenceMood,
    sequenceSelectedChars,
    setSequenceSelectedChars,
    sequenceLoading,
    sequenceError,
    handleSubmitSequence,
    setScriptModalOpen,
    scriptPremise,
    setScriptPremise,
    scriptFormat,
    setScriptFormat,
    scriptTone,
    setScriptTone,
    scriptCreateScenes,
    setScriptCreateScenes,
    scriptLoading,
    scriptResult,
    scriptError,
    handleSubmitScript,
    sceneToDelete,
    deleteLoading,
    handleConfirmDelete,
    imageModalOpen,
    setImageModalOpen,
    imageModalScene,
    setImageModalScene,
    imageModalFrameType,
    fetchScenes,
    lightboxImage,
    modalOpen,
    continuityModalOpen,
    expandModalOpen,
    sequenceModalOpen,
    scriptModalOpen,
    deleteModalOpen,
  };
}

export type ScenesTabState = ReturnType<typeof useScenesTab>;
