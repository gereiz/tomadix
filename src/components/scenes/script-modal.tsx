"use client";

import type { ScenesTabState } from "./use-scenes-tab";

interface ScriptModalProps {
  s: ScenesTabState;
}

export function ScriptModal({ s }: ScriptModalProps) {
  const { setScriptModalOpen, scriptPremise, setScriptPremise, scriptFormat, setScriptFormat, scriptTone, setScriptTone, scriptCreateScenes, setScriptCreateScenes, scriptLoading, scriptResult, scriptError, handleSubmitScript, scriptModalOpen } = s;
  if (!scriptModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border border-white/10 bg-[#0f1218] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span className="text-amber-400">🎬</span> Gerar Roteiro Cinematográfico com IA
            </h3>
            <p className="mt-1 text-xs text-white/50">
              Criação de roteiro técnico com diálogos e rubricas de direção no padrão Master Scene.
            </p>
          </div>
          <button
            onClick={() => setScriptModalOpen(false)}
            className="rounded-xl p-1.5 text-white/50 hover:bg-white/10 hover:text-white transition"
          >
            ✕
          </button>
        </div>
    
        <div className="mt-5 space-y-4 overflow-y-auto flex-1 pr-1">
          {!scriptResult ? (
            <>
              <div>
                <label className="block text-xs font-medium text-white/70 mb-1.5">
                  Premissa Dramática do Roteiro *
                </label>
                <textarea
                  value={scriptPremise}
                  onChange={(e) => setScriptPremise(e.target.value)}
                  placeholder="Ex: Em uma metrópole futurista, um restaurador de memórias descobre um fragmento corrompido que revela a identidade do fundador corporativo..."
                  rows={3}
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white placeholder-white/30 focus:border-amber-400 focus:outline-none resize-none"
                />
              </div>
    
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1.5">
                    Formato
                  </label>
                  <select
                    value={scriptFormat}
                    onChange={(e) => setScriptFormat(e.target.value as any)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                  >
                    <option value="SHORT_FILM" className="bg-[#0f1218]">Curta-Metragem (Narrativo)</option>
                    <option value="COMMERCIAL" className="bg-[#0f1218]">Comercial / Publicidade</option>
                    <option value="SCENE_SEQUENCE" className="bg-[#0f1218]">Sequência Dramática</option>
                    <option value="TRAILER" className="bg-[#0f1218]">Teaser / Trailer Promocional</option>
                  </select>
                </div>
    
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1.5">
                    Tom Narrativo
                  </label>
                  <input
                    type="text"
                    value={scriptTone}
                    onChange={(e) => setScriptTone(e.target.value)}
                    placeholder="Ex: Neo-noir, tenso, lírico..."
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/30 focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>
    
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="createScenes"
                  checked={scriptCreateScenes}
                  onChange={(e) => setScriptCreateScenes(e.target.checked)}
                  className="rounded border-white/20 bg-white/5 text-amber-500 focus:ring-amber-500 h-4 w-4"
                />
                <label htmlFor="createScenes" className="text-xs text-white/80 cursor-pointer">
                  Instanciar automaticamente as cenas no projeto após gerar o roteiro
                </label>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                <h4 className="text-sm font-bold text-amber-300">{scriptResult.title}</h4>
                <p className="mt-1 text-xs text-white/70">{scriptResult.logline}</p>
                <p className="mt-2 text-[11px] text-amber-200/80">
                  ✓ {scriptResult.scenesCount} cena(s) identificada(s) e inserida(s) no projeto.
                </p>
              </div>
    
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-white/80">
                    Texto do Roteiro (Master Scene Format):
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(scriptResult.fullScreenplayText);
                      alert("Roteiro copiado para a área de transferência!");
                    }}
                    className="text-[11px] text-amber-300 hover:underline"
                  >
                    Copiar Roteiro
                  </button>
                </div>
                <pre className="w-full rounded-2xl border border-white/10 bg-black/50 p-4 text-xs font-mono text-white/90 whitespace-pre-wrap max-h-80 overflow-y-auto leading-relaxed">
                  {scriptResult.fullScreenplayText}
                </pre>
              </div>
            </div>
          )}
    
          {scriptError && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
              {scriptError}
            </div>
          )}
        </div>
    
        <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
          <span className="text-xs text-white/50 flex items-center gap-1.5">
            <span className="text-amber-400 font-bold flex items-center gap-1">
              <span>🪙</span> 15 créditos
            </span>
            <span>• Tabela de créditos</span>
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setScriptModalOpen(false)}
              className="rounded-xl px-4 py-2 text-xs font-medium text-white/70 hover:bg-white/10 transition"
            >
              {scriptResult ? "Concluir" : "Cancelar"}
            </button>
            {!scriptResult && (
              <button
                type="button"
                onClick={handleSubmitScript}
                disabled={scriptLoading}
                className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-black shadow-lg hover:bg-amber-400 disabled:opacity-50 transition"
              >
                {scriptLoading ? "Escrevendo Roteiro..." : "Escrever Roteiro com IA"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
