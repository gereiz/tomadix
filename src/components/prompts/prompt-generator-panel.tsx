"use client";

import { Spinner } from "@/components/ui/spinner";
import { TemplateKey } from "@/modules/prompt-engine/prompt-engine.schema";
import { getTemplateCreditCost } from "./helpers";
import { listCaptureStyles } from "@/modules/prompt-engine/capture-styles";
import type { PromptsTabState } from "./use-prompts-tab";

interface PromptGeneratorPanelProps {
  s: PromptsTabState;
}

const TOOL_ICONS: Record<string, string> = {
  google_flow: "🌊",
  nano_banana: "🍌",
  seedance: "🎞️",
  kling: "🎬",
  generic: "🌐",
};

export function PromptGeneratorPanel({ s }: PromptGeneratorPanelProps) {
  const { projectId, templates, toolProfiles, scenes, characters, environments, selectedTemplate, setSelectedTemplate, selectedTool, setSelectedTool, selectedSceneId, setSelectedSceneId, selectedCharacterId, setSelectedCharacterId, selectedEnvironmentId, setSelectedEnvironmentId, customInstructions, setCustomInstructions, outputFormat, setOutputFormat, generating, generationError, enhancingPrompt, handleEnhancePrompt, handleGenerate, needsScene, supportsCaptureStyle, captureStyle, setCaptureStyle, needsSequence, sequenceScope, setSequenceScope, sequenceSceneIds, setSequenceSceneIds, needsCharacter, needsEnvironment, blockReason, showAdvanced, setShowAdvanced, loadError } = s;

  const quickChoices: { key: TemplateKey; icon: string; label: string }[] = [
    { key: "video_prompt", icon: "🎬", label: "Vídeo" },
    { key: "image_prompt", icon: "📸", label: "Imagem" },
    { key: "character_definition", icon: "👤", label: "Personagem" },
    { key: "environment_definition", icon: "🏛️", label: "Ambiente" },
  ];

  return (
    <div className="lg:col-span-5 space-y-6">
      <div className="rounded-3xl border border-white/10 bg-black/40 p-6 space-y-5">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Criar prompt
          </h3>
          <p className="mt-1 text-xs text-white/50">
            Escolha o que criar e para qual ferramenta.
          </p>
        </div>
    
        {loadError && (
          <p className="text-xs text-amber-300/90 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
            {loadError}
          </p>
        )}

        {/* O que gerar (modo simples) */}
        <div>
          <label className="block text-xs font-semibold text-white/80 mb-1.5">O que você quer gerar?</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {quickChoices.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setSelectedTemplate(c.key)}
                className={`rounded-xl p-2.5 text-center text-xs font-medium border transition ${
                  selectedTemplate === c.key
                    ? "bg-primary/20 text-primary border-primary/40 font-semibold"
                    : "bg-white/5 text-white/60 border-white/10 hover:text-white"
                }`}
              >
                <span className="block text-base">{c.icon}</span>
                <span className="mt-1 block text-[11px] truncate">{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Seleção do Template (avançado) */}
        {showAdvanced && (
        <div>
          <label className="block text-xs font-semibold text-white/80 mb-1.5">
            Tipo de conteúdo
          </label>
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value as TemplateKey)}
            className="w-full rounded-xl border border-white/10 bg-[#0f1218] px-3 py-2 text-xs text-white focus:border-primary focus:outline-none"
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
        )}

        {/* Ferramenta de destino */}
        <div>
          <label className="block text-xs font-semibold text-white/80 mb-1.5">
            Gerar para (ferramenta)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {(toolProfiles.length > 0
              ? toolProfiles
              : [
                  { key: "google_flow", name: "Google Flow", description: "" },
                  { key: "nano_banana", name: "Nano Banana", description: "" },
                  { key: "seedance", name: "Seedance", description: "" },
                  { key: "kling", name: "Kling", description: "" },
                  { key: "generic", name: "Genérico", description: "" },
                ]
            ).map((tool) => (
              <button
                key={tool.key}
                type="button"
                onClick={() => setSelectedTool(tool.key)}
                className={`rounded-xl p-2.5 text-center text-xs font-medium border transition ${
                  selectedTool === tool.key
                    ? "bg-primary/20 text-primary border-primary/40 font-semibold"
                    : "bg-white/5 text-white/60 border-white/10 hover:text-white"
                }`}
              >
                <span className="block text-base">
                  {TOOL_ICONS[tool.key] ?? "🌐"}
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
              <p className="text-xs text-white/60 bg-white/5 p-2.5 rounded-xl border border-white/10">
                {selectedTemplate === "video_prompt"
                  ? "Nenhuma cena criada ainda: tudo bem, descreva sua ideia abaixo."
                  : "Nenhuma cena cadastrada no projeto. Crie ao menos uma cena na aba \"Cenas\"."}
              </p>
            ) : (
              <select
                value={selectedSceneId}
                onChange={(e) => setSelectedSceneId(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#0f1218] px-3 py-2 text-xs text-white focus:border-primary focus:outline-none"
              >
                {selectedTemplate === "video_prompt" && <option value="">Sem cena (usar só a minha ideia)</option>}
                {scenes.map((s) => (
                  <option key={s.id} value={s.id}>
                    Cena #{s.order} - {s.title}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
    
        {needsSequence && (
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-white/80">Cenas da Sequência</label>
            {scenes.length === 0 ? (
              <p className="text-xs text-amber-300/80 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                Nenhuma cena cadastrada no projeto. Crie ao menos uma cena na aba &quot;Cenas&quot;.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    ["all", `Todas as cenas (${scenes.length})`],
                    ["selected", "Escolher cenas"],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSequenceScope(value)}
                      className={`min-h-11 rounded-xl p-2.5 text-center text-xs font-medium border transition ${
                        sequenceScope === value
                          ? "bg-primary/20 text-primary border-primary/40 font-semibold"
                          : "bg-white/5 text-white/60 border-white/10 hover:text-white"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {sequenceScope === "all" ? (
                  <p className="text-[11px] text-white/50">
                    A sequência usará as {scenes.length} cenas criadas por você, na ordem da aba Cenas.
                  </p>
                ) : (
                  <div className="max-h-44 overflow-y-auto rounded-xl border border-white/10 bg-[#0f1218] p-2 space-y-1">
                    {scenes.map((sc) => {
                      const checked = sequenceSceneIds.includes(sc.id);
                      return (
                        <label key={sc.id} className="flex min-h-9 cursor-pointer items-center gap-2 rounded-lg px-2 text-xs text-white/80 hover:bg-white/5">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setSequenceSceneIds((prev) =>
                                checked ? prev.filter((id) => id !== sc.id) : [...prev, sc.id]
                              )
                            }
                          />
                          <span>Cena #{sc.order} - {sc.title}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </>
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
                className="w-full rounded-xl border border-white/10 bg-[#0f1218] px-3 py-2 text-xs text-white focus:border-primary focus:outline-none"
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
                className="w-full rounded-xl border border-white/10 bg-[#0f1218] px-3 py-2 text-xs text-white focus:border-primary focus:outline-none"
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
    
        {/* Sua ideia (sempre visível) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-white/80">
              Sua ideia {selectedTemplate === "video_prompt" ? "" : "(opcional)"}
            </label>
            <button
              type="button"
              onClick={handleEnhancePrompt}
              disabled={enhancingPrompt || !customInstructions.trim()}
              className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 disabled:opacity-40 transition"
              title="Melhorar o texto com IA"
            >
              <span>✨</span>
              {enhancingPrompt ? "Melhorando..." : "Melhorar com IA"}
            </button>
          </div>
          <textarea
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            placeholder="Descreva o que você quer ver. Ex: carro futurista voando numa rua de ladeira, luz de fim de tarde..."
            rows={3}
            maxLength={2000}
            className="w-full rounded-xl border border-white/10 bg-[#0f1218] p-3 text-xs text-white placeholder-white/30 focus:border-primary focus:outline-none resize-none"
          />
        </div>

        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-[11px] font-semibold text-primary hover:underline"
        >
          {showAdvanced ? "Ocultar opções avançadas" : "Opções avançadas (tipo de conteúdo, estilo de captura, formato)"}
        </button>

        {showAdvanced && (
        <>
        {/* Estilo de Captura (como a imagem/vídeo foi gravado) */}
        {supportsCaptureStyle && (
          <div>
            <label className="block text-xs font-semibold text-white/80 mb-1.5">Estilo de Captura</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {listCaptureStyles().map((st) => (
                <button
                  key={st.key}
                  type="button"
                  title={st.description}
                  onClick={() => setCaptureStyle(st.key)}
                  className={`min-h-11 rounded-xl p-2.5 text-center text-xs font-medium border transition ${
                    captureStyle === st.key
                      ? "bg-primary/20 text-primary border-primary/40 font-semibold"
                      : "bg-white/5 text-white/60 border-white/10 hover:text-white"
                  }`}
                >
                  <span className="block text-base">{st.icon}</span>
                  <span className="mt-1 block text-[11px] truncate">{st.label}</span>
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-white/50">
              {listCaptureStyles().find((st) => st.key === captureStyle)?.description}
            </p>
          </div>
        )}

        {/* Formato de Saída Principal (JSON ou Texto Simples) */}
        <div>
          <label className="block text-xs font-semibold text-white/80 mb-1.5 flex items-center justify-between">
            <span>Formato de Saída</span>
            <span className="text-[10px] text-primary font-medium">Ambos formatos disponíveis</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setOutputFormat("json")}
              className={`rounded-xl p-2.5 text-center text-xs font-medium border transition flex items-center justify-center gap-2 ${
                outputFormat === "json"
                  ? "bg-primary/20 text-primary border-primary/40 font-semibold shadow-sm shadow-primary/10"
                  : "bg-white/5 text-white/60 border-white/10 hover:text-white"
              }`}
            >
              <span className="font-mono text-primary font-bold">{"{ }"}</span>
              <span>JSON Estruturado</span>
            </button>
            <button
              type="button"
              onClick={() => setOutputFormat("text")}
              className={`rounded-xl p-2.5 text-center text-xs font-medium border transition flex items-center justify-center gap-2 ${
                outputFormat === "text"
                  ? "bg-primary/20 text-primary border-primary/40 font-semibold shadow-sm shadow-primary/10"
                  : "bg-white/5 text-white/60 border-white/10 hover:text-white"
              }`}
            >
              <span className="text-primary">📝</span>
              <span>Texto Simples (.txt)</span>
            </button>
          </div>
        </div>
    
        </>
        )}

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
    
        {/* Custo em Créditos e Botão de Geração */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs px-1">
            <span className="text-white/60 flex items-center gap-1.5">
              <span className="text-amber-400 font-bold flex items-center gap-1">
                <span>🪙</span> {getTemplateCreditCost(selectedTemplate)} créditos
              </span>
              <span>• Custo desta geração</span>
            </span>
            <span className="text-[10px] font-mono text-white/40">Tabela de créditos</span>
          </div>
    
          {blockReason && (
            <p className="text-[11px] text-amber-300/90 px-1">{blockReason}</p>
          )}

          <button
            onClick={handleGenerate}
            disabled={generating || Boolean(blockReason)}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-xs font-bold text-on-primary shadow-lg shadow-primary/20 hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? (
              <>
                <Spinner block className="h-4 w-4 border-2 border-current" />
                <span>Compondo e Consultando Gemini...</span>
              </>
            ) : (
              <>
                <svg className="h-4 w-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
                <span>Gerar Prompt Cinematográfico ({getTemplateCreditCost(selectedTemplate)} cr)</span>
              </>
            )}
          </button>
        </div>
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
          <svg className="h-3.5 w-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Sequência (.json)
        </a>
      </div>
    </div>
  );
}
