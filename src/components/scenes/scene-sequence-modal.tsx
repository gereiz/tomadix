"use client";

import { Modal } from "@/components/ui/modal";
import { AdvancedModeToggle } from "@/components/entities/advanced-mode-toggle";
import { useAdvancedMode } from "@/components/entities/use-advanced-mode";
import type { ScenesTabState } from "./use-scenes-tab";

interface SceneSequenceModalProps {
  s: ScenesTabState;
}

// Custo da operação GEN_SCENE_SEQUENCE (credit-pricing.service.ts); o valor final cobrado vem da tabela de créditos.
const SEQUENCE_CREDIT_COST = 12;

const chipClass = (selected: boolean) =>
  `min-h-10 rounded-lg px-2.5 py-1 text-xs transition border ${
    selected
      ? "bg-primary/20 border-primary text-primary font-semibold"
      : "bg-white/5 border-white/10 text-white/60 hover:text-white"
  }`;

const toggleId = (list: string[], id: string) =>
  list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

export function SceneSequenceModal({ s }: SceneSequenceModalProps) {
  const {
    availableCharacters, availableEnvironments, setSequenceModalOpen, sequencePremise, setSequencePremise,
    sequenceCount, setSequenceCount, sequencePacing, setSequencePacing, sequenceMood, setSequenceMood,
    sequenceSelectedChars, setSequenceSelectedChars, sequenceSelectedEnvs, setSequenceSelectedEnvs,
    sequenceLoading, sequenceError, handleSubmitSequence, sequenceModalOpen,
  } = s;
  const [advanced, setAdvanced] = useAdvancedMode();
  if (!sequenceModalOpen) return null;

  return (
    <Modal onClose={() => setSequenceModalOpen(false)} size="xl" labelledBy="sequence-modal-title" closeOnOverlay={!sequenceLoading}>
      <div className="p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <h3 id="sequence-modal-title" className="text-base font-bold text-white">
              Criar cenas com IA
            </h3>
            <p className="mt-1 text-xs text-white/50">
              Escreva uma ideia e a IA monta uma história curta em cenas encadeadas, mantendo personagens e locais iguais do começo ao fim.
            </p>
          </div>
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => setSequenceModalOpen(false)}
            className="min-h-11 min-w-11 rounded-xl p-1.5 text-white/50 hover:bg-white/10 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-white/70 mb-1.5">Ideia inicial *</label>
            <textarea
              value={sequencePremise}
              onChange={(e) => setSequencePremise(e.target.value)}
              placeholder="Ex: Uma ladra foge pelos telhados à noite e, no fim, descobre que o caminhão onde pulou é do seu perseguidor..."
              rows={3}
              className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white placeholder-white/30 focus:border-primary focus:outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white/70 mb-1.5">Número de cenas ({sequenceCount})</label>
            <input
              type="range"
              min="2"
              max="8"
              value={sequenceCount}
              onChange={(e) => setSequenceCount(parseInt(e.target.value, 10))}
              className="w-full accent-primary cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-white/40 mt-1">
              <span>2</span>
              <span>4 (padrão)</span>
              <span>8</span>
            </div>
          </div>

          {availableCharacters.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1.5">Personagens da história</label>
              <div className="flex flex-wrap gap-1.5">
                {availableCharacters.map((char) => (
                  <button
                    key={char.id}
                    type="button"
                    aria-pressed={sequenceSelectedChars.includes(char.id)}
                    onClick={() => setSequenceSelectedChars((prev) => toggleId(prev, char.id))}
                    className={chipClass(sequenceSelectedChars.includes(char.id))}
                  >
                    👤 {char.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {availableEnvironments.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1.5">Ambientes da história</label>
              <div className="flex flex-wrap gap-1.5">
                {availableEnvironments.map((env) => (
                  <button
                    key={env.id}
                    type="button"
                    aria-pressed={sequenceSelectedEnvs.includes(env.id)}
                    onClick={() => setSequenceSelectedEnvs((prev) => toggleId(prev, env.id))}
                    className={chipClass(sequenceSelectedEnvs.includes(env.id))}
                  >
                    📍 {env.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <AdvancedModeToggle advanced={advanced} onChange={setAdvanced} />

          {advanced && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-white/70 mb-1.5">Ritmo dramático</label>
                <select
                  value={sequencePacing}
                  onChange={(e) => setSequencePacing(e.target.value as typeof sequencePacing)}
                  className="min-h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white focus:border-primary focus:outline-none"
                >
                  <option value="BALANCED" className="bg-[#0f1218]">Equilibrado (clássico)</option>
                  <option value="ACTION_INTENSE" className="bg-[#0f1218]">Ação intensa / dinâmico</option>
                  <option value="SLOW_BURN" className="bg-[#0f1218]">Slow burn / atmosférico</option>
                  <option value="FAST_PACED" className="bg-[#0f1218]">Ritmo acelerado</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-white/70 mb-1.5">Clima / atmosfera visual (opcional)</label>
                <input
                  type="text"
                  value={sequenceMood}
                  onChange={(e) => setSequenceMood(e.target.value)}
                  placeholder="Ex: chiaroscuro, chuva volumétrica, névoa densa..."
                  className="min-h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/30 focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          )}

          {sequenceError && (
            <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
              {sequenceError}
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-white/50">
            <span className="text-amber-400 font-bold">🪙 {SEQUENCE_CREDIT_COST} créditos</span>
            <span> • devolvidos se a geração falhar</span>
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSequenceModalOpen(false)}
              className="min-h-11 flex-1 rounded-xl px-4 py-2 text-xs font-medium text-white/70 hover:bg-white/10 transition sm:flex-none"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmitSequence}
              disabled={sequenceLoading}
              className="min-h-11 flex-1 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-on-primary shadow-lg hover:opacity-90 disabled:opacity-50 transition sm:flex-none"
            >
              {sequenceLoading ? "Escrevendo a história..." : "Criar cenas"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
