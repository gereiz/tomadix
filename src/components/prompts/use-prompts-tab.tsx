"use client";

import { useState, useEffect, useCallback } from "react";
import { TemplateKey } from "@/modules/prompt-engine/prompt-engine.schema";
import type { TemplateInfo, ToolProfileInfo, PromptVersionItem, EntityOption, SceneOption } from "./types";
import type { PromptsTabProps } from "./types";

export function usePromptsTab({ projectId, initialSceneId, onStatsUpdate }: PromptsTabProps) {
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [toolProfiles, setToolProfiles] = useState<ToolProfileInfo[]>([]);
  const [versions, setVersions] = useState<PromptVersionItem[]>([]);
  const [scenes, setScenes] = useState<SceneOption[]>([]);
  const [characters, setCharacters] = useState<EntityOption[]>([]);
  const [environments, setEnvironments] = useState<EntityOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Modalidade de Operação: Gerar Prompt vs Gerar Imagem vs Galeria
  const [generationMode, setGenerationMode] = useState<"PROMPT" | "IMAGE" | "GALLERY">("PROMPT");
  const [promptForImageGen, setPromptForImageGen] = useState<string>("");

  // Form State
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateKey>("video_prompt");
  const [selectedTool, setSelectedTool] = useState<string>("google_flow");
  const [selectedSceneId, setSelectedSceneId] = useState<string>(initialSceneId || "");
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>("");
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState<string>("");
  const [customInstructions, setCustomInstructions] = useState<string>("");

  // History Filter State
  const [filterTemplate, setFilterTemplate] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterScene, setFilterScene] = useState<string>("ALL");

  // Generation & Active View State
  const [outputFormat, setOutputFormat] = useState<"json" | "text">("json");
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<PromptVersionItem | null>(null);
  const [activeViewTab, setActiveViewTab] = useState<"json" | "text" | "details">("json");
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [enhancingPrompt, setEnhancingPrompt] = useState(false);

  // Modal State: Regeneração
  const [regeneratingVersion, setRegeneratingVersion] = useState<PromptVersionItem | null>(null);
  const [regenerateInstructions, setRegenerateInstructions] = useState<string>("");
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Modal State: Comparação de Versões
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [compareVersionAId, setCompareVersionAId] = useState<string>("");
  const [compareVersionBId, setCompareVersionBId] = useState<string>("");
  const [comparisonResult, setComparisonResult] = useState<any | null>(null);
  const [comparingLoading, setComparingLoading] = useState(false);

  // Estado para exclusão de erros
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);
  const [isClearingAllErrors, setIsClearingAllErrors] = useState(false);

  // Função para buscar histórico com filtros aplicados
  const fetchHistory = useCallback(
    async (overrideFilters?: { template?: string; status?: string; scene?: string }) => {
      const t = overrideFilters?.template ?? filterTemplate;
      const s = overrideFilters?.status ?? filterStatus;
      const sc = overrideFilters?.scene ?? filterScene;

      const params = new URLSearchParams();
      if (t !== "ALL") params.append("templateKey", t);
      if (s !== "ALL") params.append("status", s);
      if (sc !== "ALL") params.append("sceneId", sc);

      try {
        const res = await fetch(`/api/projects/${projectId}/prompts/history?${params.toString()}`);
        if (res.ok) {
          const json = await res.json();
          setVersions(json.data || []);
        }
      } catch (err) {
        console.error("Erro ao carregar histórico:", err);
      }
    },
    [projectId, filterTemplate, filterStatus, filterScene]
  );

  // Carregar dados iniciais
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [templatesRes, historyRes, scenesRes, charsRes, envsRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/prompts/templates`),
        fetch(`/api/projects/${projectId}/prompts/history`),
        fetch(`/api/projects/${projectId}/scenes`),
        fetch(`/api/projects/${projectId}/characters?status=all`),
        fetch(`/api/projects/${projectId}/environments?status=all`),
      ]);

      if (templatesRes.ok) {
        const json = await templatesRes.json();
        setTemplates(json.data?.templates || []);
        setToolProfiles(json.data?.toolProfiles || []);
      }

      if (historyRes.ok) {
        const json = await historyRes.json();
        const items = json.data || [];
        setVersions(items);
        if (items.length > 0 && !currentResult) {
          const firstSuccess = items.find((i: any) => i.status === "SUCCEEDED");
          if (firstSuccess) setCurrentResult(firstSuccess);
        }
      }

      if (scenesRes.ok) {
        const json = await scenesRes.json();
        const scs = (json.data || []).map((s: any) => ({
          id: s.id,
          title: s.title,
          order: s.order,
        }));
        setScenes(scs);
        if (scs.length > 0) {
          setSelectedSceneId((prev) => prev || scs[0].id);
        }
      }

      if (charsRes.ok) {
        const json = await charsRes.json();
        const chs = (json.data || []).map((c: any) => ({ id: c.id, name: c.name }));
        setCharacters(chs);
        if (chs.length > 0) {
          setSelectedCharacterId((prev) => prev || chs[0].id);
        }
      }

      if (envsRes.ok) {
        const json = await envsRes.json();
        const ens = (json.data || []).map((e: any) => ({ id: e.id, name: e.name }));
        setEnvironments(ens);
        if (ens.length > 0) {
          setSelectedEnvironmentId((prev) => prev || ens[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();

    // Sincronização automática em tempo real quando personagens, ambientes ou cenas mudam
    const handleSyncEntities = () => {
      loadData();
    };

    window.addEventListener("tomadix:entities-updated", handleSyncEntities);
    return () => {
      window.removeEventListener("tomadix:entities-updated", handleSyncEntities);
    };
  }, [loadData]);

  // Aprimorar Prompt com IA (REWRITE_ENHANCE)
  const handleEnhancePrompt = async () => {
    if (!customInstructions.trim()) return;
    try {
      setEnhancingPrompt(true);
      const res = await fetch(`/api/projects/${projectId}/prompts/enhance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: customInstructions,
          targetGenerator: selectedTool?.includes("midjourney") ? "MIDJOURNEY" : "RUNWAY_GEN3",
          enhancementFocus: "ALL_CINEMATIC",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao aprimorar prompt.");
      if (data.data?.enhancedPrompt) {
        setCustomInstructions(data.data.enhancedPrompt);
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("tomadix:credits-updated", { detail: { newBalance: data.newBalance } }));
      }
    } catch (err: any) {
      alert(err.message || "Erro ao aprimorar prompt com IA.");
    } finally {
      setEnhancingPrompt(false);
    }
  };

  // Submeter Geração de Prompt via Gemini
  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setGenerationError(null);

      const payload = {
        templateKey: selectedTemplate,
        targetTool: selectedTool,
        sceneId: needsScene ? selectedSceneId : undefined,
        characterId: needsCharacter ? selectedCharacterId : undefined,
        environmentId: needsEnvironment ? selectedEnvironmentId : undefined,
        customInstructions: customInstructions.trim() ? customInstructions : undefined,
        outputFormat,
      };

      const res = await fetch(`/api/projects/${projectId}/prompts/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Falha ao gerar prompt cinematográfico.");
      }

      const newVersionItem: PromptVersionItem = {
        id: data.data.versionId,
        templateKey: data.data.templateKey,
        templateVersion: data.data.templateVersion,
        targetTool: data.data.targetTool,
        modelName: data.data.model,
        versionNumber: data.data.versionNumber || 1,
        status: "SUCCEEDED",
        outputJson: data.data.data,
        outputText:
          data.data.formattedText ||
          data.data.outputText ||
          data.data.data?.compiledPromptText ||
          data.data.data?.compiledProductionPrompt ||
          data.data.data?.compiledBasePrompt ||
          data.data.data?.promptText ||
          null,
        tokens: data.data.tokens || null,
        createdAt: data.data.createdAt,
      };

      setCurrentResult(newVersionItem);
      setActiveViewTab(outputFormat);
      await fetchHistory();
      if (onStatsUpdate) onStatsUpdate();
    } catch (err: any) {
      setGenerationError(err.message || "Erro inesperado na geração.");
      await fetchHistory();
    } finally {
      setGenerating(false);
    }
  };

  // Submeter Regeneração a partir de versão anterior
  const handleRegenerateSubmit = async () => {
    if (!regeneratingVersion) return;
    try {
      setIsRegenerating(true);
      const res = await fetch(
        `/api/projects/${projectId}/prompts/${regeneratingVersion.id}/regenerate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customInstructions: regenerateInstructions.trim() || undefined,
            targetTool: regeneratingVersion.targetTool,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Falha na regeneração da versão.");
      }

      const regeneratedItem: PromptVersionItem = {
        id: data.data.versionId,
        templateKey: data.data.templateKey,
        templateVersion: data.data.templateVersion,
        targetTool: data.data.targetTool,
        modelName: data.data.model,
        versionNumber: data.data.versionNumber || 2,
        status: "SUCCEEDED",
        outputJson: data.data.data,
        outputText:
          data.data.formattedText ||
          data.data.outputText ||
          data.data.data?.compiledPromptText ||
          data.data.data?.compiledProductionPrompt ||
          null,
        tokens: data.data.tokens || null,
        parentVersionId: regeneratingVersion.id,
        createdAt: data.data.createdAt,
      };

      setCurrentResult(regeneratedItem);
      setRegeneratingVersion(null);
      setRegenerateInstructions("");
      await fetchHistory();
      if (onStatsUpdate) onStatsUpdate();
    } catch (err: any) {
      alert(err.message || "Erro ao regenerar prompt.");
    } finally {
      setIsRegenerating(false);
    }
  };

  // Excluir registro de erro individual
  const handleDeleteError = async (jobId: string) => {
    try {
      setDeletingJobId(jobId);
      const res = await fetch(`/api/projects/${projectId}/prompts/jobs?jobId=${jobId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setVersions((prev) => prev.filter((v) => v.id !== jobId));
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao excluir registro de erro.");
      }
    } catch (err: any) {
      console.error("Erro ao excluir erro:", err);
      alert(err.message || "Erro ao excluir registro de erro.");
    } finally {
      setDeletingJobId(null);
    }
  };

  // Excluir todos os registros de erros do projeto
  const handleClearAllErrors = async () => {
    if (!confirm("Deseja realmente excluir todos os registros de erros deste projeto?")) return;
    try {
      setIsClearingAllErrors(true);
      const res = await fetch(`/api/projects/${projectId}/prompts/jobs`, {
        method: "DELETE",
      });
      if (res.ok) {
        setVersions((prev) => prev.filter((v) => v.status !== "FAILED"));
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao limpar registros de erros.");
      }
    } catch (err: any) {
      console.error("Erro ao limpar erros:", err);
      alert(err.message || "Erro ao limpar registros de erros.");
    } finally {
      setIsClearingAllErrors(false);
    }
  };

  // Executar comparação de versões
  const handleCompareSubmit = async () => {
    if (!compareVersionAId || !compareVersionBId) return;
    try {
      setComparingLoading(true);
      const res = await fetch(`/api/projects/${projectId}/prompts/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          versionIdA: compareVersionAId,
          versionIdB: compareVersionBId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao comparar versões.");
      }
      setComparisonResult(data.data);
    } catch (err: any) {
      alert(err.message || "Erro ao executar comparação.");
    } finally {
      setComparingLoading(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(label);
    setTimeout(() => setCopySuccess(null), 2500);
  };

  // Determinar se o template exige cena, personagem ou ambiente
  const needsScene = ["video_prompt", "individual_scene"].includes(selectedTemplate);
  const needsCharacter = selectedTemplate === "character_definition";
  const needsEnvironment = selectedTemplate === "environment_definition";


  const succeededVersions = versions.filter((v) => v.status === "SUCCEEDED");
  const failedVersions = versions.filter((v) => v.status === "FAILED");


  return {
    generationMode,
    setGenerationMode,
    projectId,
    templates,
    toolProfiles,
    scenes,
    characters,
    environments,
    selectedTemplate,
    setSelectedTemplate,
    selectedTool,
    setSelectedTool,
    selectedSceneId,
    setSelectedSceneId,
    selectedCharacterId,
    setSelectedCharacterId,
    selectedEnvironmentId,
    setSelectedEnvironmentId,
    customInstructions,
    setCustomInstructions,
    outputFormat,
    setOutputFormat,
    generating,
    generationError,
    enhancingPrompt,
    handleEnhancePrompt,
    handleGenerate,
    needsScene,
    needsCharacter,
    needsEnvironment,
    setPromptForImageGen,
    currentResult,
    activeViewTab,
    setActiveViewTab,
    copySuccess,
    setRegeneratingVersion,
    setRegenerateInstructions,
    handleCopy,
    versions,
    filterTemplate,
    setFilterTemplate,
    filterStatus,
    setFilterStatus,
    filterScene,
    setFilterScene,
    setCurrentResult,
    setCompareModalOpen,
    setCompareVersionAId,
    setCompareVersionBId,
    setComparisonResult,
    deletingJobId,
    isClearingAllErrors,
    fetchHistory,
    handleDeleteError,
    handleClearAllErrors,
    succeededVersions,
    failedVersions,
    regeneratingVersion,
    regenerateInstructions,
    isRegenerating,
    handleRegenerateSubmit,
    compareVersionAId,
    compareVersionBId,
    comparisonResult,
    comparingLoading,
    handleCompareSubmit,
    onStatsUpdate,
    loading,
    promptForImageGen,
    compareModalOpen,
  };
}

export type PromptsTabState = ReturnType<typeof usePromptsTab>;
