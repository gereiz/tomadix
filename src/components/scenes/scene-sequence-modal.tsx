"use client";

import type { ScenesTabState } from "./use-scenes-tab";

interface SceneSequenceModalProps {
  s: ScenesTabState;
}

export function SceneSequenceModal({ s }: SceneSequenceModalProps) {
  const { availableCharacters, setSequenceModalOpen, sequencePremise, setSequencePremise, sequenceCount, setSequenceCount, sequencePacing, setSequencePacing, sequenceMood, setSequenceMood, sequenceSelectedChars, setSequenceSelectedChars, sequenceLoading, sequenceError, handleSubmitSequence, sequenceModalOpen } = s;
  if (!sequenceModalOpen) return null;

  return (
    <div className="fixed inset-0 overflow-y-auto z-50 flex items-center-safe justify-center bg-black/80 p-3 sm:p-4">
      <div className="relative w-full max-w-xl rounded-3xl border border-white/10 bg-[#0f1218] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span className="text-primary">✨</span> Gerar Sequência de Cenas com IA
            </h3>
            <p className="mt-1 text-xs text-white/50">
              Estruturação seriada e contínua de planos encadeados para seu projeto cinematográfico.
            </p>
          </div>
          <button
            onClick={() => setSequenceModalOpen(false)}
            className="rounded-xl p-1.5 text-white/50 hover:bg-white/10 hover:text-white transition"
          >
            ✕
          </button>
        </div>
    
        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-white/70 mb-1.5">
              Premissa Dramática da Sequência *
            </label>
            <textarea
              value={sequencePremise}
              onChange={(e) => setSequencePremise(e.target.value)}
              placeholder="Ex: Fuga noturna pelos telhados de paralelepípedo, começando com a perda de cobertura e terminando no salto para o caminhão em movimento..."
              rows={3}
              className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white placeholder-white/30 focus:border-primary focus:outline-none resize-none"
            />
          </div>
    
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1.5">
                Número de Cenas ({sequenceCount})
              </label>
              <input
                type="range"
                min="2"
                max="8"
                value={sequenceCount}
                onChange={(e) => setSequenceCount(parseInt(e.target.value, 10))}
                className="w-full accent-primary cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-white/40 mt-1">
                <span>2 cenas</span>
                <span>4 cenas (Padrão)</span>
                <span>8 cenas</span>
              </div>
            </div>
    
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1.5">
                Ritmo Dramático
              </label>
              <select
                value={sequencePacing}
                onChange={(e) => setSequencePacing(e.target.value as any)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white focus:border-primary focus:outline-none"
              >
                <option value="BALANCED" className="bg-[#0f1218]">Equilibrado (Clássico)</option>
                <option value="ACTION_INTENSE" className="bg-[#0f1218]">Ação Intensa / Dinâmico</option>
                <option value="SLOW_BURN" className="bg-[#0f1218]">Slow Burn / Atmosférico</option>
                <option value="FAST_PACED" className="bg-[#0f1218]">Ritmo Acelerado</option>
              </select>
            </div>
          </div>
    
          <div>
            <label className="block text-xs font-medium text-white/70 mb-1.5">
              Clima / Atmosfera Visual (Opcional)
            </label>
            <input
              type="text"
              value={sequenceMood}
              onChange={(e) => setSequenceMood(e.target.value)}
              placeholder="Ex: Iluminação chiaroscuro, chuva volumétrica, névoa densa..."
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/30 focus:border-primary focus:outline-none"
            />
          </div>
    
          {availableCharacters.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1.5">
                Vincular Personagens Presentes
              </label>
              <div className="flex flex-wrap gap-1.5">
                {availableCharacters.map((char) => {
                  const isSelected = sequenceSelectedChars.includes(char.id);
                  return (
                    <button
                      key={char.id}
                      type="button"
                      onClick={() => {
                        setSequenceSelectedChars((prev) =>
                          isSelected ? prev.filter((id) => id !== char.id) : [...prev, char.id]
                        );
                      }}
                      className={`rounded-lg px-2.5 py-1 text-xs transition border ${
                        isSelected
                          ? "bg-primary/20 border-primary text-primary font-semibold"
                          : "bg-white/5 border-white/10 text-white/60 hover:text-white"
                      }`}
                    >
                      👤 {char.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
    
          {sequenceError && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
              {sequenceError}
            </div>
          )}
        </div>
    
        <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
          <span className="text-xs text-white/50 flex items-center gap-1.5">
            <span className="text-amber-400 font-bold flex items-center gap-1">
              <span>🪙</span> 8 créditos
            </span>
            <span>• Tabela de créditos</span>
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSequenceModalOpen(false)}
              className="rounded-xl px-4 py-2 text-xs font-medium text-white/70 hover:bg-white/10 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmitSequence}
              disabled={sequenceLoading}
              className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-on-primary shadow-lg hover:opacity-90 disabled:opacity-50 transition"
            >
              {sequenceLoading ? "Estruturando Sequência..." : "Gerar Sequência"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
