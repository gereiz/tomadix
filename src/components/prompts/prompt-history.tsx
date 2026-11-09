"use client";

import type { PromptsTabState } from "./use-prompts-tab";

interface PromptHistoryProps {
  s: PromptsTabState;
}

export function PromptHistory({ s }: PromptHistoryProps) {
  const { projectId, versions, scenes, mediaEnabled, setGenerationMode, setPromptForImageGen, filterTemplate, setFilterTemplate, filterStatus, setFilterStatus, filterScene, setFilterScene, currentResult, setCurrentResult, setRegeneratingVersion, setRegenerateInstructions, setCompareModalOpen, setCompareVersionAId, setCompareVersionBId, setComparisonResult, deletingJobId, isClearingAllErrors, fetchHistory, handleGenerate, handleDeleteError, handleClearAllErrors, succeededVersions, failedVersions } = s;


  return (
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
              className="rounded-xl border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold text-primary hover:border-primary/40 hover:bg-white/10 transition flex items-center gap-1.5"
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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
                  ? "border-primary/50 bg-primary/10"
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
                    <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-primary font-mono">
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
                      className="p-1.5 rounded-lg text-white/60 hover:text-primary hover:bg-white/5 transition"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </a>
                    <a
                      href={`/api/projects/${projectId}/prompts/${ver.id}/export?format=json&download=true`}
                      title="Baixar JSON (.json)"
                      className="p-1.5 rounded-lg text-white/60 hover:text-primary hover:bg-white/5 transition"
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
                      className="p-1.5 rounded-lg text-white/60 hover:text-primary hover:bg-white/5 transition"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                    {mediaEnabled && (
                    <button
                      onClick={() => {
                        const promptText = ver.outputText || JSON.stringify(ver.outputJson);
                        setPromptForImageGen(promptText);
                        setGenerationMode("IMAGE");
                      }}
                      title="Gerar imagem diretamente com este prompt"
                      className="p-1.5 rounded-lg text-white/60 hover:text-amber-400 hover:bg-white/5 transition"
                    >
                      <span className="text-xs">🖼️</span>
                    </button>
                    )}
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
  );
}
