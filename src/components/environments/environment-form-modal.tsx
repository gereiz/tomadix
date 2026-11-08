"use client";

import { EntityParametersSection } from "@/components/parameters/entity-parameters-section";
import type { EnvironmentFormState } from "./types";

interface EnvironmentFormModalProps {
  projectId: string;
  form: EnvironmentFormState;
}

export function EnvironmentFormModal({ projectId, form }: EnvironmentFormModalProps) {
  const {
    editing: editingEnvironment,
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
              {editingEnvironment ? "Editar Ambiente" : "Novo Ambiente Cinematográfico"}
            </h3>
            <p className="text-xs text-white/50">
              Configure arquitetura, iluminação e atmosfera para manter consistência de cenário.
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
          {/* Nome e Contexto */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1">
                Nome do Ambiente <span className="text-primary">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Sala de Controle Subterrânea, Bosque Nebuloso..."
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/40 focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1">Localização ou Contexto</label>
              <input
                type="text"
                value={formData.locationContext}
                onChange={(e) => setFormData({ ...formData, locationContext: e.target.value })}
                placeholder="Ex: Berlim Oriental, Setor 4, Planeta desértico..."
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/40 focus:border-primary focus:outline-none"
              />
            </div>
          </div>
    
          {/* Descrição */}
          <div>
            <label className="block text-xs font-semibold text-white/80 mb-1">Descrição do Cenário</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Visão panorâmica, dimensões espaciais, sensação dramática do local..."
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/40 focus:border-primary focus:outline-none"
            />
          </div>
    
          {/* Seção 1: Arquitetura e Objetos */}
          <div className="rounded-2xl border border-white/5 bg-black/20 p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
              Arquitetura & Elementos de Cenário
            </h4>
    
            <div>
              <label className="block text-[11px] font-medium text-white/70 mb-1">
                Arquitetura e Estrutura Física
              </label>
              <input
                type="text"
                value={formData.architecture}
                onChange={(e) => setFormData({ ...formData, architecture: e.target.value })}
                placeholder="Ex: Concreto aparente brutalista, tetos altos com vigas de aço expostas"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-primary focus:outline-none"
              />
            </div>
    
            <div>
              <label className="block text-[11px] font-medium text-white/70 mb-1">
                Elementos de Cenário / Props Recorrentes
              </label>
              <input
                type="text"
                value={formData.propsAndElements}
                onChange={(e) => setFormData({ ...formData, propsAndElements: e.target.value })}
                placeholder="Ex: Terminais analógicos piscando, cabos suspensos, mesas metálicas"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-primary focus:outline-none"
              />
            </div>
          </div>
    
          {/* Seção 2: Paleta de Cores & Atmosfera Cinematográfica */}
          <div className="rounded-2xl border border-white/5 bg-black/20 p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Paleta de Cores & Atmosfera Cinematográfica
            </h4>
    
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-[11px] font-medium text-white/70 mb-1">Paleta de Cores</label>
                <input
                  type="text"
                  value={formData.colorPalette}
                  onChange={(e) => setFormData({ ...formData, colorPalette: e.target.value })}
                  placeholder="Ex: Tons frios ciano, sombras carvão, toques âmbar"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-primary focus:outline-none"
                />
              </div>
    
              <div>
                <label className="block text-[11px] font-medium text-white/70 mb-1">Clima e Atmosfera</label>
                <input
                  type="text"
                  value={formData.weatherAndAtmosphere}
                  onChange={(e) => setFormData({ ...formData, weatherAndAtmosphere: e.target.value })}
                  placeholder="Ex: Névoa densa, umidade no chão"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-primary focus:outline-none"
                />
              </div>
    
              <div>
                <label className="block text-[11px] font-medium text-white/70 mb-1">Época Histórica</label>
                <input
                  type="text"
                  value={formData.historicalEra}
                  onChange={(e) => setFormData({ ...formData, historicalEra: e.target.value })}
                  placeholder="Ex: Anos 80 alternativo, Futuro distante"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          </div>
    
          {/* Seção Dinâmica: Parâmetros do Ambiente (sem duplicação de câmera e fotometria) */}
          <EntityParametersSection
            projectId={projectId}
            targetType="ENVIRONMENT"
            targetId={editingEnvironment?.id}
            values={paramValues}
            excludeKeys={[
              "formato_sensor_camera",
              "tipo_de_plano",
              "movimento_camera",
              "distancia_focal_lente",
              "angulo_camera_posicao",
              "composicao_quadro",
              "profundidade_campo_foco",
              "velocidade_obturador_movimento",
              "paleta_cor_dominante",
            ]}
            title="Parâmetros Cinematográficos do Ambiente"
            description="Variáveis dinâmicas de atmosfera, volumetria e clima aplicadas a este cenário."
            onChange={(defId, val) =>
              setParamValues((prev) => ({ ...prev, [defId]: val }))
            }
          />
    
          {/* Seção 3: Prompt Base */}
          <div className="rounded-2xl border border-white/5 bg-black/20 p-4 space-y-2">
            <label className="block text-[11px] font-medium text-white/70">
              Prompt-Base do Ambiente (Opcional)
            </label>
            <textarea
              rows={2}
              value={formData.basePrompt}
              onChange={(e) => setFormData({ ...formData, basePrompt: e.target.value })}
              placeholder="Trecho literal de prompt para compor o cenário em IA..."
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-primary focus:outline-none font-mono"
            />
          </div>
    
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
              {editingEnvironment ? "Salvar Alterações" : "Criar Ambiente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
