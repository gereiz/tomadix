"use client";

import type { PromptsTabState } from "./use-prompts-tab";

interface PromptResultViewerProps {
  s: PromptsTabState;
}

export function PromptResultViewer({ s }: PromptResultViewerProps) {
  const { projectId, setGenerationMode, setPromptForImageGen, openVideoWithPrompt, mediaEnabled, currentResult, activeViewTab, setActiveViewTab, copySuccess, setRegeneratingVersion, setRegenerateInstructions, handleCopy } = s;


  return (
    <>
    {currentResult && currentResult.status === "SUCCEEDED" ? (
      <div className="rounded-3xl border border-white/10 bg-black/40 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-primary/20 border border-primary/30 px-2 py-0.5 text-[10px] font-bold text-primary font-mono">
                v{currentResult.versionNumber || 1}
              </span>
              <h3 className="text-sm font-bold text-white uppercase font-mono">
                {currentResult.templateKey}
              </h3>
              <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/70">
                {currentResult.targetTool}
              </span>
              {currentResult.parentVersionId && (
                <span className="rounded-md bg-primary/20 px-2 py-0.5 text-[10px] font-medium text-primary">
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
                  ? "bg-primary/20 text-primary font-semibold"
                  : "text-white/60 hover:text-white"
              }`}
            >
              JSON
            </button>
            <button
              onClick={() => setActiveViewTab("text")}
              className={`rounded-lg px-3 py-1 font-medium transition ${
                activeViewTab === "text"
                  ? "bg-primary/20 text-primary font-semibold"
                  : "text-white/60 hover:text-white"
              }`}
            >
              Texto Simples
            </button>
            <button
              onClick={() => setActiveViewTab("details")}
              className={`rounded-lg px-3 py-1 font-medium transition ${
                activeViewTab === "details"
                  ? "bg-primary/20 text-primary font-semibold"
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
            <div className="relative rounded-2xl border border-white/10 bg-black/60 p-4 font-mono text-xs text-primary/90 max-h-[460px] overflow-y-auto">
              <pre>{JSON.stringify(currentResult.outputJson, null, 2)}</pre>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <div className="flex items-center gap-2">
                <a
                  href={`/api/projects/${projectId}/prompts/${currentResult.id}/export?format=json&download=true`}
                  className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-xs font-medium text-white hover:bg-white/10 hover:border-primary/40 transition"
                >
                  <svg className="h-3.5 w-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Baixar .json
                </a>
                <a
                  href={`/api/projects/${projectId}/prompts/${currentResult.id}/export?format=txt&download=true`}
                  className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-xs font-medium text-white hover:bg-white/10 hover:border-primary/40 transition"
                >
                  <svg className="h-3.5 w-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                  <svg className="h-3.5 w-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Regenerar
                </button>
                {mediaEnabled && (
                <>
                <button
                  onClick={() => {
                    const promptText = currentResult.outputText || JSON.stringify(currentResult.outputJson);
                    setPromptForImageGen(promptText);
                    setGenerationMode("IMAGE");
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs font-bold text-amber-300 hover:bg-amber-400/20 transition"
                  title="Gerar imagem diretamente com este prompt via IA"
                >
                  <span>🖼️</span>
                  Gerar Imagem
                </button>
                <button
                  onClick={() => openVideoWithPrompt(currentResult.outputText || JSON.stringify(currentResult.outputJson))}
                  className="flex items-center gap-1.5 rounded-xl border border-purple-400/40 bg-purple-400/10 px-3 py-2 text-xs font-bold text-purple-300 hover:bg-purple-400/20 transition"
                  title="Gerar vídeo diretamente com este prompt via IA"
                >
                  <span>🎥</span>
                  Gerar Vídeo
                </button>
                </>
                )}
              </div>
              <button
                onClick={() =>
                  handleCopy(JSON.stringify(currentResult.outputJson, null, 2), "json")
                }
                className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-on-primary hover:opacity-90 shadow-md shadow-primary/20 transition"
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
                  className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-xs font-medium text-white hover:bg-white/10 hover:border-primary/40 transition"
                >
                  <svg className="h-3.5 w-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Baixar .txt
                </a>
                <a
                  href={`/api/projects/${projectId}/prompts/${currentResult.id}/export?format=json&download=true`}
                  className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-xs font-medium text-white hover:bg-white/10 hover:border-primary/40 transition"
                >
                  <svg className="h-3.5 w-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                  <svg className="h-3.5 w-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Regenerar
                </button>
                {mediaEnabled && (
                <>
                <button
                  onClick={() => {
                    const promptText = currentResult.outputText || JSON.stringify(currentResult.outputJson);
                    setPromptForImageGen(promptText);
                    setGenerationMode("IMAGE");
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs font-bold text-amber-300 hover:bg-amber-400/20 transition"
                  title="Gerar imagem diretamente com este prompt via IA"
                >
                  <span>🖼️</span>
                  Gerar Imagem
                </button>
                <button
                  onClick={() => openVideoWithPrompt(currentResult.outputText || JSON.stringify(currentResult.outputJson))}
                  className="flex items-center gap-1.5 rounded-xl border border-purple-400/40 bg-purple-400/10 px-3 py-2 text-xs font-bold text-purple-300 hover:bg-purple-400/20 transition"
                  title="Gerar vídeo diretamente com este prompt via IA"
                >
                  <span>🎥</span>
                  Gerar Vídeo
                </button>
                </>
                )}
              </div>
              {currentResult.outputText && (
                <button
                  onClick={() => handleCopy(currentResult.outputText!, "text")}
                  className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-on-primary hover:opacity-90 shadow-md shadow-primary/20 transition"
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
                <span className="font-mono text-primary">{currentResult.targetTool}</span>
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
      <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-5 sm:p-8 text-center text-white/50 text-xs">
        Nenhum prompt selecionado. Execute uma geração ou escolha uma versão no histórico abaixo.
      </div>
    )}
    </>
  );
}
