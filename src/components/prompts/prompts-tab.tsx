"use client";

import { useState, useEffect, useCallback } from "react";
import { TemplateKey } from "@/modules/prompt-engine/prompt-engine.schema";

interface TemplateInfo {
  key: TemplateKey;
  name: string;
  version: number;
  description: string;
  sections: string[];
}

interface ToolProfileInfo {
  key: string;
  name: string;
  description: string;
}

interface PromptVersionItem {
  id: string;
  templateKey: string;
  templateVersion: number;
  targetTool: string;
  modelName: string;
  versionNumber: number;
  status: "SUCCEEDED" | "FAILED";
  errorMessage?: string | null;
  outputJson?: any;
  outputText?: string | null;
  tokens?: {
    inputTokens: number;
    outputTokens: number;
  } | null;
  durationMs?: number | null;
  parentVersionId?: string | null;
  createdAt: string;
  sceneId?: string | null;
  sceneTitle?: string | null;
  sceneOrder?: number | null;
}

interface EntityOption {
  id: string;
  name: string;
}

interface SceneOption {
  id: string;
  title: string;
  order: number;
}

interface PromptsTabProps {
  projectId: string;
  initialSceneId?: string;
  onStatsUpdate?: () => void;
}

export function PromptsTab({ projectId, initialSceneId, onStatsUpdate }: PromptsTabProps) {
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [toolProfiles, setToolProfiles] = useState<ToolProfileInfo[]>([]);
  const [versions, setVersions] = useState<PromptVersionItem[]>([]);
  const [scenes, setScenes] = useState<SceneOption[]>([]);
  const [characters, setCharacters] = useState<EntityOption[]>([]);
  const [environments, setEnvironments] = useState<EntityOption[]>([]);
  const [loading, setLoading] = useState(true);

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
  }, [loadData]);

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

  if (loading) {
    return (
      <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.02] p-12 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent mb-3" />
        <p className="text-sm text-white/60">Carregando catálogo de templates e ferramentas...</p>
      </div>
    );
  }

  const succeededVersions = versions.filter((v) => v.status === "SUCCEEDED");
  const failedVersions = versions.filter((v) => v.status === "FAILED");

  return (
    <div className="mt-8 space-y-8">
      {/* Grade Principal: Painel de Configuração vs Painel de Saída */}
      <div className="grid gap-8 lg:grid-cols-12">
        {/* Painel Esquerdo: Parâmetros de Geração (5 colunas) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-3xl border border-white/10 bg-black/40 p-6 space-y-5">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Motor de Composição Cinemática
              </h3>
              <p className="mt-1 text-xs text-white/50">
                Selecione o template de saída estruturada e a plataforma de destino.
              </p>
            </div>

            {/* Seleção do Template */}
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5">
                Tipo de Composição (Template Versionado)
              </label>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value as TemplateKey)}
                className="w-full rounded-xl border border-white/10 bg-[#0f1218] px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
              >
                {templates.length > 0 ? (
                  templates.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.name} (v{t.version})
                    </option>
                  ))
                ) : (
                  <>
                    <option value="video_prompt">🎬 Prompt de Vídeo (Movimento e Dinâmica)</option>
                    <option value="individual_scene">🎯 Cena Individual (Decupagem de Produção)</option>
                    <option value="scene_sequence">🎞️ Sequência de Cenas (Montagem Contínua)</option>
                    <option value="image_prompt">📸 Prompt de Imagem (Still Frame / Keyframe)</option>
                    <option value="visual_bible">📖 Bíblia Visual do Projeto</option>
                    <option value="character_definition">👤 Definição de Personagem</option>
                    <option value="environment_definition">🏛️ Definição de Ambiente</option>
                  </>
                )}
              </select>
            </div>

            {/* Ferramenta de Destino (Perfil de Saída) */}
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5">
                Plataforma de Destino (Perfil de Saída)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(toolProfiles.length > 0
                  ? toolProfiles
                  : [
                      { key: "google_flow", name: "Google Flow", description: "" },
                      { key: "nano_banana", name: "Nano Banana", description: "" },
                      { key: "generic", name: "Genérico", description: "" },
                    ]
                ).map((tool) => (
                  <button
                    key={tool.key}
                    type="button"
                    onClick={() => setSelectedTool(tool.key)}
                    className={`rounded-xl p-2.5 text-center text-xs font-medium border transition ${
                      selectedTool === tool.key
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-semibold"
                        : "bg-white/5 text-white/60 border-white/10 hover:text-white"
                    }`}
                  >
                    <span className="block text-base">
                      {tool.key === "google_flow" ? "🌊" : tool.key === "nano_banana" ? "🍌" : "🌐"}
                    </span>
                    <span className="mt-1 block text-[11px] truncate">{tool.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Contexto Específico (Cena, Personagem ou Ambiente) */}
            {needsScene && (
              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1.5">
                  Tomada / Cena de Referência
                </label>
                {scenes.length === 0 ? (
                  <p className="text-xs text-amber-300/80 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                    Nenhuma cena cadastrada no projeto. Crie ao menos uma cena na aba &quot;Cenas&quot;.
                  </p>
                ) : (
                  <select
                    value={selectedSceneId}
                    onChange={(e) => setSelectedSceneId(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#0f1218] px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  >
                    {scenes.map((s) => (
                      <option key={s.id} value={s.id}>
                        Cena #{s.order} - {s.title}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {needsCharacter && (
              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1.5">
                  Personagem para Definição
                </label>
                {characters.length === 0 ? (
                  <p className="text-xs text-amber-300/80 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                    Nenhum personagem cadastrado. Crie um na aba &quot;Personagens&quot;.
                  </p>
                ) : (
                  <select
                    value={selectedCharacterId}
                    onChange={(e) => setSelectedCharacterId(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#0f1218] px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  >
                    {characters.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {needsEnvironment && (
              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1.5">
                  Ambiente para Definição
                </label>
                {environments.length === 0 ? (
                  <p className="text-xs text-amber-300/80 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                    Nenhum ambiente cadastrado. Crie um na aba &quot;Ambientes&quot;.
                  </p>
                ) : (
                  <select
                    value={selectedEnvironmentId}
                    onChange={(e) => setSelectedEnvironmentId(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#0f1218] px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  >
                    {environments.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Formato de Saída Principal (JSON ou Texto Simples) */}
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5 flex items-center justify-between">
                <span>Formato de Saída</span>
                <span className="text-[10px] text-lime-400/90 font-medium">Ambos formatos disponíveis</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOutputFormat("json")}
                  className={`rounded-xl p-2.5 text-center text-xs font-medium border transition flex items-center justify-center gap-2 ${
                    outputFormat === "json"
                      ? "bg-lime-500/20 text-lime-300 border-lime-500/40 font-semibold shadow-sm shadow-lime-500/10"
                      : "bg-white/5 text-white/60 border-white/10 hover:text-white"
                  }`}
                >
                  <span className="font-mono text-lime-400 font-bold">{"{ }"}</span>
                  <span>JSON Estruturado</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOutputFormat("text")}
                  className={`rounded-xl p-2.5 text-center text-xs font-medium border transition flex items-center justify-center gap-2 ${
                    outputFormat === "text"
                      ? "bg-lime-500/20 text-lime-300 border-lime-500/40 font-semibold shadow-sm shadow-lime-500/10"
                      : "bg-white/5 text-white/60 border-white/10 hover:text-white"
                  }`}
                >
                  <span className="text-lime-400">📝</span>
                  <span>Texto Simples (.txt)</span>
                </button>
              </div>
            </div>

            {/* Diretrizes Adicionais do Diretor */}
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5">
                Diretrizes Adicionais do Diretor (Opcional)
              </label>
              <textarea
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="Ex: Enfatizar luz volumétrica de néon, atmosfera de chuva densa, granulação 35mm..."
                rows={3}
                className="w-full rounded-xl border border-white/10 bg-[#0f1218] p-3 text-xs text-white placeholder-white/30 focus:border-lime-500 focus:outline-none resize-none"
              />
            </div>

            {/* Mensagem de Erro na Geração */}
            {generationError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                <div className="font-semibold flex items-center gap-1.5 mb-1">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Erro na Geração:
                </div>
                {generationError}
              </div>
            )}

            {/* Botão de Geração */}
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-lime-400 px-4 py-3 text-xs font-bold text-black shadow-lg shadow-lime-400/20 hover:bg-lime-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                  <span>Compondo e Consultando Gemini...</span>
                </>
              ) : (
                <>
                  <svg className="h-4 w-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                  <span>Gerar Prompt Cinematográfico</span>
                </>
              )}
            </button>
          </div>

          {/* Atalho de Exportação Sequencial */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-5 flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-white">Exportação Completa da Sequência</h4>
              <p className="text-[11px] text-white/50">Baixar roteiro sequencial com prompts compilados.</p>
            </div>
            <a
              href={`/api/projects/${projectId}/prompts/export-sequence?download=true`}
              className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-xs font-medium text-white hover:bg-white/10 transition flex items-center gap-1.5"
            >
              <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Sequência (.json)
            </a>
          </div>
        </div>

        {/* Painel Direito: Exibição Ativa e Histórico (7 colunas) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Visualizador de Resultado Atual */}
          {currentResult && currentResult.status === "SUCCEEDED" ? (
            <div className="rounded-3xl border border-white/10 bg-black/40 p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-lime-500/20 border border-lime-500/30 px-2 py-0.5 text-[10px] font-bold text-lime-300 font-mono">
                      v{currentResult.versionNumber || 1}
                    </span>
                    <h3 className="text-sm font-bold text-white uppercase font-mono">
                      {currentResult.templateKey}
                    </h3>
                    <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/70">
                      {currentResult.targetTool}
                    </span>
                    {currentResult.parentVersionId && (
                      <span className="rounded-md bg-blue-500/20 px-2 py-0.5 text-[10px] font-medium text-blue-300">
                        ↺ Regenerado
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-white/40 mt-1">
                    Gerado em: {new Date(currentResult.createdAt).toLocaleString("pt-BR")}
                  </p>
                </div>

                {/* Alternância de Abas de Saída */}
                <div className="flex items-center gap-1 rounded-xl bg-white/5 p-1 text-xs">
                  <button
                    onClick={() => setActiveViewTab("json")}
                    className={`rounded-lg px-3 py-1 font-medium transition ${
                      activeViewTab === "json"
                        ? "bg-lime-500/20 text-lime-300 font-semibold"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    JSON
                  </button>
                  <button
                    onClick={() => setActiveViewTab("text")}
                    className={`rounded-lg px-3 py-1 font-medium transition ${
                      activeViewTab === "text"
                        ? "bg-lime-500/20 text-lime-300 font-semibold"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    Texto Simples
                  </button>
                  <button
                    onClick={() => setActiveViewTab("details")}
                    className={`rounded-lg px-3 py-1 font-medium transition ${
                      activeViewTab === "details"
                        ? "bg-lime-500/20 text-lime-300 font-semibold"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    Metadados
                  </button>
                </div>
              </div>

              {/* Corpo de Exibição */}
              {activeViewTab === "json" && (
                <div className="space-y-3">
                  <div className="relative rounded-2xl border border-white/10 bg-black/60 p-4 font-mono text-xs text-lime-300/90 max-h-[460px] overflow-y-auto">
                    <pre>{JSON.stringify(currentResult.outputJson, null, 2)}</pre>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                    <div className="flex items-center gap-2">
                      <a
                        href={`/api/projects/${projectId}/prompts/${currentResult.id}/export?format=json&download=true`}
                        className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-xs font-medium text-white hover:bg-white/10 hover:border-lime-500/40 transition"
                      >
                        <svg className="h-3.5 w-3.5 text-lime-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Baixar .json
                      </a>
                      <a
                        href={`/api/projects/${projectId}/prompts/${currentResult.id}/export?format=txt&download=true`}
                        className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-xs font-medium text-white hover:bg-white/10 hover:border-lime-500/40 transition"
                      >
                        <svg className="h-3.5 w-3.5 text-lime-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Baixar .txt
                      </a>
                      <button
                        onClick={() => {
                          setRegeneratingVersion(currentResult);
                          setRegenerateInstructions("");
                        }}
                        className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-xs font-medium text-white hover:bg-white/10 transition"
                      >
                        <svg className="h-3.5 w-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Regenerar
                      </button>
                    </div>
                    <button
                      onClick={() =>
                        handleCopy(JSON.stringify(currentResult.outputJson, null, 2), "json")
                      }
                      className="flex items-center gap-1.5 rounded-xl bg-lime-400 px-4 py-2 text-xs font-bold text-black hover:bg-lime-300 transition"
                    >
                      {copySuccess === "json" ? "✓ JSON Copiado!" : "Copiar JSON (1-Clique)"}
                    </button>
                  </div>
                </div>
              )}

              {activeViewTab === "text" && (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-white/10 bg-black/60 p-5 text-xs text-white/90 leading-relaxed font-sans max-h-[460px] overflow-y-auto whitespace-pre-wrap select-text">
                    {currentResult.outputText ||
                      "Nenhum texto de prompt compilado disponível para este template."}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                    <div className="flex items-center gap-2">
                      <a
                        href={`/api/projects/${projectId}/prompts/${currentResult.id}/export?format=txt&download=true`}
                        className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-xs font-medium text-white hover:bg-white/10 hover:border-lime-500/40 transition"
                      >
                        <svg className="h-3.5 w-3.5 text-lime-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Baixar .txt
                      </a>
                      <a
                        href={`/api/projects/${projectId}/prompts/${currentResult.id}/export?format=json&download=true`}
                        className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-xs font-medium text-white hover:bg-white/10 hover:border-lime-500/40 transition"
                      >
                        <svg className="h-3.5 w-3.5 text-lime-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Baixar .json
                      </a>
                      <button
                        onClick={() => {
                          setRegeneratingVersion(currentResult);
                          setRegenerateInstructions("");
                        }}
                        className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-xs font-medium text-white hover:bg-white/10 transition"
                      >
                        <svg className="h-3.5 w-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Regenerar
                      </button>
                    </div>
                    {currentResult.outputText && (
                      <button
                        onClick={() => handleCopy(currentResult.outputText!, "text")}
                        className="flex items-center gap-1.5 rounded-xl bg-lime-400 px-4 py-2 text-xs font-bold text-black hover:bg-lime-300 transition"
                      >
                        {copySuccess === "text" ? "✓ Texto Copiado!" : "Copiar Texto (1-Clique)"}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {activeViewTab === "details" && (
                <div className="rounded-2xl border border-white/10 bg-black/60 p-5 text-xs space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] text-white/40 uppercase block">Modelo Gemini</span>
                      <span className="font-mono text-white font-semibold">
                        {currentResult.modelName}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-white/40 uppercase block">Plataforma</span>
                      <span className="font-mono text-emerald-300">{currentResult.targetTool}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-white/40 uppercase block">Tokens</span>
                      <span className="font-mono text-white">
                        {currentResult.tokens
                          ? `In: ${currentResult.tokens.inputTokens} | Out: ${currentResult.tokens.outputTokens}`
                          : "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-white/40 uppercase block">Duração de Execução</span>
                      <span className="font-mono text-white">
                        {currentResult.durationMs ? `${currentResult.durationMs}ms` : "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-white/40 uppercase block">Versão Sequencial</span>
                      <span className="font-mono text-white">v{currentResult.versionNumber || 1}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-white/40 uppercase block">Versão do Template</span>
                      <span className="font-mono text-white">v{currentResult.templateVersion}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-8 text-center text-white/50 text-xs">
              Nenhum prompt selecionado. Execute uma geração ou escolha uma versão no histórico abaixo.
            </div>
          )}

          {/* Histórico de Versões Geradas com Barra de Filtros */}
          <div className="rounded-3xl border border-white/10 bg-black/40 p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span>Histórico de Prompts e Versões</span>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/70 font-mono">
                    {versions.length}
                  </span>
                </h4>
              </div>

              <div className="flex items-center gap-2">
                {failedVersions.length > 0 && (
                  <button
                    onClick={handleClearAllErrors}
                    disabled={isClearingAllErrors}
                    title="Excluir todos os registros de erros registrados"
                    className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/20 transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Limpar Erros ({failedVersions.length})
                  </button>
                )}

                {succeededVersions.length >= 2 && (
                  <button
                    onClick={() => {
                      setCompareVersionAId(succeededVersions[1]?.id || "");
                      setCompareVersionBId(succeededVersions[0]?.id || "");
                      setComparisonResult(null);
                      setCompareModalOpen(true);
                    }}
                    className="rounded-xl border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold text-lime-300 hover:border-lime-500/40 hover:bg-white/10 transition flex items-center gap-1.5"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    Comparar Versões (Diff)
                  </button>
                )}
              </div>
            </div>

            {/* Filtros de Histórico */}
            <div className="grid grid-cols-3 gap-2">
              <select
                value={filterTemplate}
                onChange={(e) => {
                  setFilterTemplate(e.target.value);
                  fetchHistory({ template: e.target.value });
                }}
                className="rounded-xl border border-white/10 bg-[#0f1218] px-2.5 py-1.5 text-xs text-white focus:outline-none"
              >
                <option value="ALL">Todos os Templates</option>
                <option value="video_prompt">Prompt de Vídeo</option>
                <option value="individual_scene">Cena Individual</option>
                <option value="scene_sequence">Sequência de Cenas</option>
                <option value="image_prompt">Prompt de Imagem</option>
                <option value="visual_bible">Bíblia Visual</option>
                <option value="character_definition">Personagem</option>
                <option value="environment_definition">Ambiente</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  fetchHistory({ status: e.target.value });
                }}
                className="rounded-xl border border-white/10 bg-[#0f1218] px-2.5 py-1.5 text-xs text-white focus:outline-none"
              >
                <option value="ALL">Todos os Estados</option>
                <option value="SUCCEEDED">Sucesso</option>
                <option value="FAILED">Falhas Registradas</option>
              </select>

              <select
                value={filterScene}
                onChange={(e) => {
                  setFilterScene(e.target.value);
                  fetchHistory({ scene: e.target.value });
                }}
                className="rounded-xl border border-white/10 bg-[#0f1218] px-2.5 py-1.5 text-xs text-white focus:outline-none"
              >
                <option value="ALL">Todas as Cenas</option>
                {scenes.map((sc) => (
                  <option key={sc.id} value={sc.id}>
                    Cena #{sc.order}
                  </option>
                ))}
              </select>
            </div>

            {/* Lista de Versões */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {versions.length === 0 ? (
                <p className="text-center py-6 text-xs text-white/40">
                  Nenhum registro encontrado para os filtros selecionados.
                </p>
              ) : (
                versions.map((ver) => (
                  <div
                    key={ver.id}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition ${
                      currentResult?.id === ver.id
                        ? "border-lime-500/50 bg-lime-500/10"
                        : ver.status === "FAILED"
                        ? "border-red-500/20 bg-red-500/5"
                        : "border-white/5 bg-white/[0.02] hover:border-white/20"
                    }`}
                  >
                    <div
                      className="cursor-pointer flex-1"
                      onClick={() => {
                        if (ver.status === "SUCCEEDED") setCurrentResult(ver);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {ver.status === "SUCCEEDED" ? (
                          <span className="rounded bg-lime-500/20 px-1.5 py-0.5 text-[10px] font-bold text-lime-300 font-mono">
                            v{ver.versionNumber || 1}
                          </span>
                        ) : (
                          <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold text-red-300 font-mono">
                            FALHA
                          </span>
                        )}
                        <span className="font-semibold text-xs text-white font-mono uppercase">
                          {ver.templateKey}
                        </span>
                        <span className="text-[10px] text-white/40 font-mono">
                          {ver.targetTool}
                        </span>
                        {ver.sceneTitle && (
                          <span className="text-[10px] text-white/60 truncate max-w-[120px]">
                            • {ver.sceneTitle}
                          </span>
                        )}
                      </div>

                      {ver.status === "FAILED" ? (
                        <p className="text-[11px] text-red-300/80 mt-1 truncate">
                          {ver.errorMessage}
                        </p>
                      ) : (
                        <p className="text-[10px] text-white/40 mt-1">
                          {new Date(ver.createdAt).toLocaleString("pt-BR")}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 pl-3">
                      {ver.status === "SUCCEEDED" ? (
                        <>
                          <a
                            href={`/api/projects/${projectId}/prompts/${ver.id}/export?format=txt&download=true`}
                            title="Baixar Texto Simples (.txt)"
                            className="p-1.5 rounded-lg text-white/60 hover:text-lime-400 hover:bg-white/5 transition"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </a>
                          <a
                            href={`/api/projects/${projectId}/prompts/${ver.id}/export?format=json&download=true`}
                            title="Baixar JSON (.json)"
                            className="p-1.5 rounded-lg text-white/60 hover:text-lime-400 hover:bg-white/5 transition"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </a>
                          <button
                            onClick={() => {
                              setRegeneratingVersion(ver);
                              setRegenerateInstructions("");
                            }}
                            title="Regenerar a partir desta versão"
                            className="p-1.5 rounded-lg text-white/60 hover:text-blue-400 hover:bg-white/5 transition"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </button>
                        </>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleGenerate()}
                            className="px-2.5 py-1 rounded-lg bg-red-500/20 text-red-300 text-[10px] font-semibold hover:bg-red-500/30 transition"
                          >
                            Tentar Novamente
                          </button>
                          <button
                            onClick={() => handleDeleteError(ver.id)}
                            disabled={deletingJobId === ver.id}
                            title="Excluir este erro"
                            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-300 text-[10px] font-semibold transition flex items-center gap-1 disabled:opacity-50"
                          >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Excluir
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Regeneração */}
      {regeneratingVersion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-3xl border border-white/20 bg-[#0f1218] p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Regenerar a partir da Versão v{regeneratingVersion.versionNumber || 1}
            </h3>
            <p className="text-xs text-white/60">
              O snapshot dos parâmetros originais será reutilizado. Uma <strong>nova versão</strong> será gravada sem apagar a anterior.
            </p>

            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5">
                Novas Instruções de Ajuste do Diretor (Opcional)
              </label>
              <textarea
                value={regenerateInstructions}
                onChange={(e) => setRegenerateInstructions(e.target.value)}
                placeholder="Ex: Corrigir velocidade do movimento de câmera, deixar contraste mais intenso..."
                rows={3}
                className="w-full rounded-xl border border-white/10 bg-black/60 p-3 text-xs text-white placeholder-white/30 focus:border-blue-500 focus:outline-none resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRegeneratingVersion(null)}
                className="rounded-xl px-4 py-2 text-xs font-medium text-white/70 hover:bg-white/10 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleRegenerateSubmit}
                disabled={isRegenerating}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500 transition disabled:opacity-50"
              >
                {isRegenerating ? (
                  <>
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Regenerando...</span>
                  </>
                ) : (
                  <span>Criar Nova Versão</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Comparação de Versões (Diff) */}
      {compareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl rounded-3xl border border-white/20 bg-[#0f1218] p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                Comparador de Versões (Diff)
              </h3>
              <button
                onClick={() => setCompareModalOpen(false)}
                className="text-white/60 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Seleção das Versões */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1">Versão Base (A)</label>
                <select
                  value={compareVersionAId}
                  onChange={(e) => setCompareVersionAId(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs text-white focus:outline-none"
                >
                  {succeededVersions.map((v) => (
                    <option key={v.id} value={v.id}>
                      v{v.versionNumber || 1} - {v.templateKey} ({new Date(v.createdAt).toLocaleDateString("pt-BR")})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1">Versão Comparada (B)</label>
                <select
                  value={compareVersionBId}
                  onChange={(e) => setCompareVersionBId(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs text-white focus:outline-none"
                >
                  {succeededVersions.map((v) => (
                    <option key={v.id} value={v.id}>
                      v{v.versionNumber || 1} - {v.templateKey} ({new Date(v.createdAt).toLocaleDateString("pt-BR")})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleCompareSubmit}
                disabled={comparingLoading || compareVersionAId === compareVersionBId}
                className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-400 transition disabled:opacity-50"
              >
                {comparingLoading ? "Comparando..." : "Executar Comparação"}
              </button>
            </div>

            {/* Resultado da Comparação */}
            {comparisonResult && (
              <div className="space-y-4 pt-3 border-t border-white/10">
                {comparisonResult.identical ? (
                  <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-300 text-center">
                    As duas versões possuem conteúdo JSON e prompts de texto idênticos.
                  </div>
                ) : (
                  <>
                    {/* Chaves Modificadas */}
                    {comparisonResult.jsonDiff.modifiedKeys.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-white mb-2">Chaves JSON com Alterações:</h4>
                        <div className="space-y-2">
                          {comparisonResult.jsonDiff.modifiedKeys.map((m: any) => (
                            <div key={m.key} className="p-3 rounded-xl bg-black/60 border border-white/10 text-xs">
                              <span className="font-mono text-emerald-400 block font-semibold mb-1">{m.key}</span>
                              <div className="grid grid-cols-2 gap-2 text-[11px]">
                                <div className="p-2 rounded bg-red-950/20 border border-red-500/20 text-red-200">
                                  <span className="text-[10px] uppercase text-red-400 block">Versão A:</span>
                                  {typeof m.from === "object" ? JSON.stringify(m.from) : String(m.from)}
                                </div>
                                <div className="p-2 rounded bg-emerald-950/20 border border-emerald-500/20 text-emerald-200">
                                  <span className="text-[10px] uppercase text-emerald-400 block">Versão B:</span>
                                  {typeof m.to === "object" ? JSON.stringify(m.to) : String(m.to)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Comparação Lado a Lado do Prompt em Texto */}
                    <div>
                      <h4 className="text-xs font-bold text-white mb-2">Texto do Prompt Lado a Lado:</h4>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="rounded-xl border border-white/10 bg-black/60 p-3 whitespace-pre-wrap text-white/80 max-h-48 overflow-y-auto">
                          <span className="text-[10px] text-white/40 block font-semibold mb-1 uppercase">Versão A</span>
                          {comparisonResult.versionA.outputText || "N/A"}
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/60 p-3 whitespace-pre-wrap text-white/80 max-h-48 overflow-y-auto">
                          <span className="text-[10px] text-emerald-400 block font-semibold mb-1 uppercase">Versão B</span>
                          {comparisonResult.versionB.outputText || "N/A"}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
