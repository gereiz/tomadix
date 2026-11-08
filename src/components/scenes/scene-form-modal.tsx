"use client";

import { EntityParametersSection } from "@/components/parameters/entity-parameters-section";
import { VisualParameterSelector } from "@/components/visual-library/visual-parameter-selector";
import type { ScenesTabState } from "./use-scenes-tab";

interface SceneFormModalProps {
  s: ScenesTabState;
}

export function SceneFormModal({ s }: SceneFormModalProps) {
  const { projectId, availableCharacters, availableEnvironments, setModalOpen, editingScene, formLoading, formError, formData, setFormData, paramValues, setParamValues, paramKeyMap, setParamKeyMap, handleSubmitForm, modalOpen } = s;
  if (!modalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center-safe justify-center bg-black/80 p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl max-h-[90dvh] overflow-y-auto rounded-3xl border border-white/10 bg-[#0f1218] p-6 shadow-2xl">
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
                Título da Tomada / Cena <span className="text-primary">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Cena 1 - Invasão ao Beco Neon"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/40 focus:border-primary focus:outline-none"
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
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/40 focus:border-primary focus:outline-none"
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
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/40 focus:border-primary focus:outline-none"
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
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-primary focus:outline-none"
                />
              </div>
    
              <div>
                <label className="block text-[11px] font-medium text-white/70 mb-1">Transição de Entrada</label>
                <input
                  type="text"
                  value={formData.transitionIn}
                  onChange={(e) => setFormData({ ...formData, transitionIn: e.target.value })}
                  placeholder="Ex: Corte Direto, Fade in, Dissolve..."
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-primary focus:outline-none"
                />
              </div>
    
              <div>
                <label className="block text-[11px] font-medium text-white/70 mb-1">Transição de Saída</label>
                <input
                  type="text"
                  value={formData.transitionOut}
                  onChange={(e) => setFormData({ ...formData, transitionOut: e.target.value })}
                  placeholder="Ex: Corte Direto, Match cut..."
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-primary focus:outline-none"
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
                onChange={(val) => {
                  setFormData((prev) => ({ ...prev, framing: val }));
                  if (paramKeyMap.tipo_de_plano) {
                    setParamValues((prev) => ({ ...prev, [paramKeyMap.tipo_de_plano]: val }));
                  }
                }}
                category="FRAMING"
                compactInitial={true}
              />
    
              <VisualParameterSelector
                label="Movimento de Câmera (Camera Movement)"
                description="Define a dinâmica espacial, velocidade e trajetória da câmera durante o plano."
                value={formData.cameraMovement}
                onChange={(val) => {
                  setFormData((prev) => ({ ...prev, cameraMovement: val }));
                  if (paramKeyMap.movimento_camera) {
                    setParamValues((prev) => ({ ...prev, [paramKeyMap.movimento_camera]: val }));
                  }
                }}
                category="CAMERA_MOVEMENT"
                compactInitial={true}
              />
    
              <VisualParameterSelector
                label="Estilo de Iluminação (Lighting)"
                description="Define o contraste, temperatura, direção e atmosfera das fontes de luz."
                value={formData.lighting}
                onChange={(val) => {
                  setFormData((prev) => ({ ...prev, lighting: val }));
                  if (paramKeyMap.estilo_iluminacao) {
                    setParamValues((prev) => ({ ...prev, [paramKeyMap.estilo_iluminacao]: val }));
                  }
                }}
                category="LIGHTING"
                compactInitial={true}
              />

              {/* Granulação de Película (Film Grain) da Cena */}
              <div className="rounded-xl border border-white/10 bg-black/40 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🎞️</span>
                    <div>
                      <h5 className="text-xs font-semibold text-white">
                        Granulação da Película (Film Grain):{" "}
                        <span className="font-bold text-amber-400">{formData.filmGrain ?? 25}%</span>
                      </h5>
                      <p className="text-[10px] text-white/50">
                        Intensidade da textura analógica e ruído de filme na imagem final da tomada.
                      </p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                      (formData.filmGrain ?? 25) === 0
                        ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/30"
                        : (formData.filmGrain ?? 25) <= 30
                        ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                        : (formData.filmGrain ?? 25) <= 65
                        ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                        : "bg-purple-500/10 text-purple-300 border-purple-500/30"
                    }`}
                  >
                    {(formData.filmGrain ?? 25) === 0
                      ? "Digital Limpo (0% Ruído)"
                      : (formData.filmGrain ?? 25) <= 30
                      ? "35mm Suave (Orgânico)"
                      : (formData.filmGrain ?? 25) <= 65
                      ? "Granulado Clássico (Marcante)"
                      : "16mm / VHS Vintage (Intenso)"}
                  </span>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={formData.filmGrain ?? 25}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setFormData((prev) => ({ ...prev, filmGrain: val }));
                      if (paramKeyMap.nivel_granulacao_pelicula) {
                        setParamValues((prev) => ({
                          ...prev,
                          [paramKeyMap.nivel_granulacao_pelicula]: val,
                        }));
                      }
                    }}
                    className="w-full accent-amber-400 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                  />
                  <span className="font-mono text-xs font-bold text-amber-400 min-w-[3rem] text-right">
                    {formData.filmGrain ?? 25}%
                  </span>
                </div>

                {/* Presets rápidos */}
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {[
                    { label: "0% Digital", value: 0 },
                    { label: "25% 35mm Suave", value: 25 },
                    { label: "50% Clássico", value: 50 },
                    { label: "75% 16mm Vintage", value: 75 },
                    { label: "100% VHS Intenso", value: 100 },
                  ].map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, filmGrain: preset.value }));
                        if (paramKeyMap.nivel_granulacao_pelicula) {
                          setParamValues((prev) => ({
                            ...prev,
                            [paramKeyMap.nivel_granulacao_pelicula]: preset.value,
                          }));
                        }
                      }}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-medium border transition ${
                        (formData.filmGrain ?? 25) === preset.value
                          ? "bg-amber-400/20 text-amber-300 border-amber-400/40 font-semibold"
                          : "bg-white/5 text-white/60 border-white/10 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
    
          {/* Seção 3: Ação, Continuidade e Movimentação */}
          <div className="rounded-2xl border border-white/5 bg-black/20 p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
              Ação & Continuidade Narrativa
            </h4>
    
            <div>
              <label className="block text-[11px] font-medium text-white/70 mb-1">
                Ação Principal da Cena <span className="text-primary">*</span>
              </label>
              <textarea
                rows={2}
                value={formData.mainAction}
                onChange={(e) => setFormData({ ...formData, mainAction: e.target.value })}
                placeholder="Descreva a ação física essencial que acontece na tomada..."
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-primary focus:outline-none"
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
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-primary focus:outline-none"
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
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-primary focus:outline-none"
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
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-primary focus:outline-none"
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
                            ? "bg-primary/20 text-primary border-primary/40 font-semibold"
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
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-primary focus:outline-none"
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
                    className="rounded border-white/20 bg-white/10 text-primary"
                  />
                  <span>Habilitar Diálogo nesta tomada</span>
                </label>
    
                {formData.dialogueEnabled && (
                  <span className="text-[10px] font-mono text-primary">
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
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-primary focus:outline-none"
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
                  className="rounded border-white/20 bg-white/10 text-primary"
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
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-primary focus:outline-none mt-2"
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
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-primary focus:outline-none"
            />
          </div>
    
          {/* Seção Dinâmica: Parâmetros Cinematográficos Adicionais (sem duplicação com Linguagem de Câmera) */}
          <EntityParametersSection
            projectId={projectId}
            targetType="SCENE"
            targetId={editingScene?.id}
            values={paramValues}
            excludeKeys={["tipo_de_plano", "movimento_camera", "estilo_iluminacao", "nivel_granulacao_pelicula"]}
            title="Parâmetros Cinematográficos Adicionais"
            description="Lentes, composição de quadro, ângulo e especificações técnicas complementares desta tomada."
            onChange={(defId, val) =>
              setParamValues((prev) => ({ ...prev, [defId]: val }))
            }
            onParametersLoaded={(loaded) => {
              const mapping: Record<string, string> = {};
              for (const p of loaded) {
                mapping[p.key] = p.definitionId;
              }
              setParamKeyMap(mapping);
            }}
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
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-on-primary shadow-lg shadow-primary/20 hover:opacity-90 disabled:opacity-50 transition"
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
  );
}
