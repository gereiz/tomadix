"use client";

import { EntityParametersSection } from "@/components/parameters/entity-parameters-section";
import type { CharacterFormState } from "./types";

interface CharacterFormModalProps {
  projectId: string;
  form: CharacterFormState;
}

export function CharacterFormModal({ projectId, form }: CharacterFormModalProps) {
  const {
    editing: editingCharacter,
    loading: formLoading,
    error: formError,
    formData,
    setFormData,
    paramValues,
    setParamValues,
    submit: handleSubmitForm,
    close,
  } = form;

  return (
    <div className="fixed inset-0 z-50 flex items-center-safe justify-center bg-black/80 p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl max-h-[90dvh] overflow-y-auto rounded-3xl border border-white/10 bg-[#0f1218] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h3 className="text-lg font-bold text-white">
              {editingCharacter ? "Editar Personagem" : "Novo Personagem Cinematográfico"}
            </h3>
            <p className="text-xs text-white/50">
              Defina os elementos visuais permanentes para assegurar consistência em múltiplos takes.
            </p>
          </div>
          <button
            onClick={() => close()}
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
    
        <form onSubmit={handleSubmitForm} className="mt-5 space-y-4">
          {/* Linha 1: Nome e Idade */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-white/80 mb-1">
                Nome do Personagem <span className="text-primary">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Clara Vance, Sargento Miller..."
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/40 focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1">Idade Aparente</label>
              <input
                type="text"
                value={formData.apparentAge}
                onChange={(e) => setFormData({ ...formData, apparentAge: e.target.value })}
                placeholder="Ex: 34 anos"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/40 focus:border-primary focus:outline-none"
              />
            </div>
          </div>
    
          {/* Descrição Narrativa */}
          <div>
            <label className="block text-xs font-semibold text-white/80 mb-1">Descrição Narrativa</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Contexto dramático, papel na história e tom geral..."
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/40 focus:border-primary focus:outline-none"
            />
          </div>
    
          {/* Seção Visual 1: Identidade Visual & Traços Físicos */}
          <div className="rounded-2xl border border-white/5 bg-black/20 p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
              Consistência Visual & Fisiologia
            </h4>
    
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-[11px] font-medium text-white/70 mb-1">Identidade Visual</label>
                <input
                  type="text"
                  value={formData.visualIdentity}
                  onChange={(e) => setFormData({ ...formData, visualIdentity: e.target.value })}
                  placeholder="Ex: Estilo Neo-noir, traços nórdicos, olhar penetrante"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-primary focus:outline-none"
                />
              </div>
    
              <div>
                <label className="block text-[11px] font-medium text-white/70 mb-1">Cabelo e Rosto</label>
                <input
                  type="text"
                  value={formData.hairAndFace}
                  onChange={(e) => setFormData({ ...formData, hairAndFace: e.target.value })}
                  placeholder="Ex: Cabelo curto escuro desgrenhado, cicatriz fina na sobrancelha"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-primary focus:outline-none"
                />
              </div>
            </div>
    
            <div>
              <label className="block text-[11px] font-medium text-white/70 mb-1">
                Características Físicas e Altura
              </label>
              <input
                type="text"
                value={formData.physicalCharacteristics}
                onChange={(e) => setFormData({ ...formData, physicalCharacteristics: e.target.value })}
                placeholder="Ex: 1.80m, compleição atlética esguia, mãos calejadas"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-primary focus:outline-none"
              />
            </div>
          </div>
    
          {/* Seção Visual 2: Figurino Permanente e Personalidade */}
          <div className="rounded-2xl border border-white/5 bg-black/20 p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400">
              Figurino Base & Comportamento
            </h4>
    
            <div>
              <label className="block text-[11px] font-medium text-white/70 mb-1">
                Figurino e Acessórios Permanentes
              </label>
              <input
                type="text"
                value={formData.costumeAndAccessories}
                onChange={(e) => setFormData({ ...formData, costumeAndAccessories: e.target.value })}
                placeholder="Ex: Sobretudo de couro escuro envelhecido, relógio de pulso militar clássico"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-primary focus:outline-none"
              />
            </div>
    
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-[11px] font-medium text-white/70 mb-1">Personalidade e Expressão</label>
                <input
                  type="text"
                  value={formData.personalityAndBehavior}
                  onChange={(e) => setFormData({ ...formData, personalityAndBehavior: e.target.value })}
                  placeholder="Ex: Postura calculista, olhar desconfiado, calma estóica"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-white/70 mb-1">Voz e Idioma (se aplicável)</label>
                <input
                  type="text"
                  value={formData.voiceAndLanguage}
                  onChange={(e) => setFormData({ ...formData, voiceAndLanguage: e.target.value })}
                  placeholder="Ex: Tom grave e sussurrado, português com leve sotaque"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          </div>
    
          {/* Seção 3: Restrições e Prompt Base */}
          <div className="rounded-2xl border border-white/5 bg-black/20 p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Regras de Representação & Prompt Base
            </h4>
    
            <div>
              <label className="block text-[11px] font-medium text-white/70 mb-1">
                Restrições de Representação (O que NUNCA gerar)
              </label>
              <input
                type="text"
                value={formData.restrictions}
                onChange={(e) => setFormData({ ...formData, restrictions: e.target.value })}
                placeholder="Ex: Sem sorrisos exagerados, sem armas modernas, sem óculos"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-primary focus:outline-none"
              />
            </div>
    
            <div>
              <label className="block text-[11px] font-medium text-white/70 mb-1">
                Prompt-Base Customizado (Opcional)
              </label>
              <textarea
                rows={2}
                value={formData.basePrompt}
                onChange={(e) => setFormData({ ...formData, basePrompt: e.target.value })}
                placeholder="Trecho literal de prompt pré-otimizado para ferramentas de imagem/vídeo..."
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-primary focus:outline-none font-mono"
              />
            </div>
          </div>
    
          {/* Seção Dinâmica: Parâmetros Específicos do Personagem */}
          <EntityParametersSection
            projectId={projectId}
            targetType="CHARACTER"
            targetId={editingCharacter?.id}
            values={paramValues}
            excludeKeys={[
              "formato_sensor_camera",
              "tipo_de_plano",
              "movimento_camera",
              "estilo_iluminacao",
              "distancia_focal_lente",
              "angulo_camera_posicao",
              "composicao_quadro",
              "profundidade_campo_foco",
              "velocidade_obturador_movimento",
              "paleta_cor_dominante",
              "atmosfera_climatica_particulas",
            ]}
            title="Parâmetros de Consistência do Personagem"
            description="Diretrizes específicas de anatomia, continuidade e vestimenta aplicadas a este personagem."
            onChange={(defId, val) =>
              setParamValues((prev) => ({ ...prev, [defId]: val }))
            }
          />
    
          {/* Botões do Rodapé */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={() => close()}
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
              {editingCharacter ? "Salvar Alterações" : "Criar Personagem"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
