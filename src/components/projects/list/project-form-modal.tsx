"use client";

import Link from "next/link";
import { GENRE_OPTIONS } from "@/config/genres";
import { PLATFORM_OPTIONS, ASPECT_RATIO_OPTIONS } from "./helpers";
import type { ProjectsListTabState } from "./use-projects-list";

interface ProjectFormModalProps {
  s: ProjectsListTabState;
}

export function ProjectFormModal({ s }: ProjectFormModalProps) {
  const { setIsCreateModalOpen, editingProject, formSubmitError, setFormSubmitError, formData, setFormData, formErrors, submitting, studioParams, selectedParamKeys, setSelectedParamKeys, paramSearch, setParamSearch, paramScopeFilter, setParamScopeFilter, resetForm, handleSubmitForm, isCreateModalOpen } = s;
  if (!isCreateModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-[#12161f] p-6 shadow-2xl md:p-8">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <span className="text-xs uppercase tracking-[0.2em] text-primary">
              {editingProject ? "Edição de Projeto" : "Nova Produção"}
            </span>
            <h2 className="mt-1 text-2xl font-bold">
              {editingProject ? "Editar Projeto Cinematográfico" : "Criar Projeto Cinematográfico"}
            </h2>
          </div>
          <button
            onClick={() => {
              setIsCreateModalOpen(false);
              resetForm();
            }}
            className="rounded-xl p-2 text-white/40 hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>
    
        {/* Alerta Visual de Erro / Limite Inline */}
        {formSubmitError && (
          <div
            className={`mt-5 rounded-2xl border p-4 transition-all ${
              formSubmitError.code === "PROJECT_LIMIT_REACHED" ||
              formSubmitError.message.includes("Limite de projetos")
                ? "border-amber-500/40 bg-amber-950/40 text-amber-200"
                : "border-red-500/40 bg-red-950/40 text-red-200"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div className="flex-1 text-xs">
                <h4 className="font-bold text-sm">
                  {formSubmitError.code === "PROJECT_LIMIT_REACHED" ||
                  formSubmitError.message.includes("Limite de projetos")
                    ? "Limite de Projetos Atingido"
                    : "Não foi possível salvar o projeto"}
                </h4>
                <p className="mt-1 leading-relaxed opacity-95">
                  {formSubmitError.message}
                </p>
                {(formSubmitError.code === "PROJECT_LIMIT_REACHED" ||
                  formSubmitError.message.includes("Limite de projetos")) && (
                  <div className="mt-3 flex items-center gap-2">
                    <Link
                      href="/pricing"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-3.5 py-1.5 text-xs font-bold text-black transition hover:bg-amber-300 shadow-md shadow-amber-400/20"
                    >
                      <span>Fazer Upgrade de Plano</span>
                      <span>→</span>
                    </Link>
                    <Link
                      href="/workspace/billing"
                      className="text-xs text-amber-300 underline underline-offset-4 hover:text-white transition"
                    >
                      Ver Detalhes da Assinatura
                    </Link>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setFormSubmitError(null)}
                className="rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white transition"
                title="Fechar aviso"
              >
                ✕
              </button>
            </div>
          </div>
        )}
    
        <form onSubmit={handleSubmitForm} className="mt-6 space-y-5">
          {/* Nome */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-white/70">
              Nome do Projeto <span className="text-primary">*</span>
            </label>
            <input
              type="text"
              placeholder="Ex: O Brasil em VHS, Neo-Sertão 2099..."
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className={`mt-2 w-full rounded-xl border bg-black/40 px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 ${
                formErrors.title
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                  : "border-white/10 focus:border-primary focus:ring-primary"
              }`}
            />
            {formErrors.title && <p className="mt-1.5 text-xs text-red-400">{formErrors.title}</p>}
          </div>
    
          {/* Descrição */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-white/70">
              Descrição e Visão Criativa
            </label>
            <textarea
              rows={3}
              placeholder="Resumo do universo, proposta estética, tom narrativo e objetivos audiovisuais..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white placeholder-white/30 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
    
          {/* Visibilidade e Compartilhamento no Workspace */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-white/70">
              Compartilhamento do Space no Time
            </label>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(
                [
                  { id: "TEAM" as const, icon: "👥", label: "Toda a Equipe", sub: "Visível ao time" },
                  { id: "PRIVATE" as const, icon: "🔒", label: "Privado", sub: "Somente você" },
                  { id: "SELECTED" as const, icon: "🎯", label: "Selecionados", sub: "Escolher membros" },
                ]
              ).map((opt) => {
                const active = formData.visibility === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, visibility: opt.id })}
                    className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition ${
                      active
                        ? "border-primary bg-primary/15 text-white"
                        : "border-white/10 bg-black/30 text-white/60 hover:bg-white/5"
                    }`}
                  >
                    <span className="text-base">{opt.icon}</span>
                    <div>
                      <div className="text-xs font-bold">{opt.label}</div>
                      <div className="text-[10px] opacity-70">{opt.sub}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
    
          {/* Grid: Gênero, Idioma, Duração */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-white/70">
                Gênero / Estilo
              </label>
              <select
                value={formData.genre}
                onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white focus:border-primary focus:outline-none"
              >
                {GENRE_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
    
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-white/70">
                Idioma Principal
              </label>
              <input
                type="text"
                value={formData.language}
                onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white focus:border-primary focus:outline-none"
              />
            </div>
    
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-white/70">
                Duração Alvo (segundos)
              </label>
              <input
                type="number"
                placeholder="Ex: 30, 60, 120"
                value={formData.durationSeconds}
                onChange={(e) => setFormData({ ...formData, durationSeconds: e.target.value })}
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white focus:border-primary focus:outline-none"
              />
              {formErrors.durationSeconds && (
                <p className="mt-1.5 text-xs text-red-400">{formErrors.durationSeconds}</p>
              )}
            </div>
          </div>
    
          {/* Seção de Configurações Técnicas Cinematográficas */}
          <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-primary mb-3">
              Configurações Técnicas de Destino
            </h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs text-white/60">Plataforma-Alvo de Geração</label>
                <select
                  value={formData.targetPlatform}
                  onChange={(e) => setFormData({ ...formData, targetPlatform: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white focus:border-primary focus:outline-none"
                >
                  {PLATFORM_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
    
              <div>
                <label className="block text-xs text-white/60">Proporção de Tela (Aspect Ratio)</label>
                <select
                  value={formData.aspectRatio}
                  onChange={(e) => setFormData({ ...formData, aspectRatio: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white focus:border-primary focus:outline-none"
                >
                  {ASPECT_RATIO_OPTIONS.map((ar) => (
                    <option key={ar} value={ar}>
                      {ar} {ar === "16:9" ? "(Padrão Cinema / Vídeo)" : ar === "9:16" ? "(Vertical / Reels)" : ar === "2.39:1" ? "(Anamórfico)" : ""}
                    </option>
                  ))}
                </select>
              </div>
    
              <div>
                <label className="block text-xs text-white/60">Color Grading / Look Visual</label>
                <input
                  type="text"
                  placeholder="Ex: Kodachrome 64, Bleach Bypass, Teal & Orange..."
                  value={formData.colorGrade}
                  onChange={(e) => setFormData({ ...formData, colorGrade: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white focus:border-primary focus:outline-none"
                />
              </div>
    
              <div>
                <label className="block text-xs text-white/60">Ritmo / Pacing</label>
                <input
                  type="text"
                  placeholder="Ex: Contemplativo, Rápido com cortes secos..."
                  value={formData.pacing}
                  onChange={(e) => setFormData({ ...formData, pacing: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white focus:border-primary focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2 border-t border-white/5 pt-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🎞️</span>
                    <label className="text-xs font-semibold text-white/80">
                      Granulação da Película (Film Grain):{" "}
                      <span className="font-bold text-primary">{formData.filmGrain ?? 25}%</span>
                    </label>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                    (formData.filmGrain ?? 25) === 0
                      ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/30"
                      : (formData.filmGrain ?? 25) <= 30
                      ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                      : (formData.filmGrain ?? 25) <= 65
                      ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                      : "bg-purple-500/10 text-purple-300 border-purple-500/30"
                  }`}>
                    {(formData.filmGrain ?? 25) === 0
                      ? "Digital Limpo (0% Ruído)"
                      : (formData.filmGrain ?? 25) <= 30
                      ? "35mm Suave (Orgânico)"
                      : (formData.filmGrain ?? 25) <= 65
                      ? "Granulado Clássico (Marcante)"
                      : "16mm / VHS Vintage (Intenso)"}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={formData.filmGrain ?? 25}
                    onChange={(e) => setFormData({ ...formData, filmGrain: Number(e.target.value) })}
                    className="w-full accent-primary h-1.5 bg-white/10 rounded-lg cursor-pointer"
                  />
                  <span className="font-mono text-xs font-bold text-primary min-w-[3rem] text-right">
                    {formData.filmGrain ?? 25}%
                  </span>
                </div>

                {/* Presets rápidos */}
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {[
                    { label: "0% Digital", value: 0 },
                    { label: "25% 35mm Suave", value: 25 },
                    { label: "50% Clássico", value: 50 },
                    { label: "75% 16mm Vintage", value: 75 },
                    { label: "100% VHS / Grão Pesado", value: 100 },
                  ].map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, filmGrain: preset.value })}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-medium border transition ${
                        (formData.filmGrain ?? 25) === preset.value
                          ? "bg-primary/20 text-primary border-primary/40 font-semibold"
                          : "bg-white/5 text-white/60 border-white/10 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] text-white/40">
                  Define a intensidade de textura analógica herdada nas gerações de imagem e vídeo deste projeto.
                </p>
              </div>
            </div>
          </div>
    
          {/* Parâmetros Cinematográficos Permitidos no Projeto */}
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-primary">
                    Parâmetros Permitidos no Projeto
                  </h4>
                  <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    {selectedParamKeys.size} de {studioParams.length} selecionados
                  </span>
                </div>
                <p className="text-[11px] text-white/50 mt-1">
                  Selecione quais parâmetros do estúdio poderão ser utilizados na criação de personagens, ambientes e cenas deste projeto.
                </p>
              </div>
    
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setSelectedParamKeys(new Set(studioParams.map((p) => p.key)))}
                  className="rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-primary/20 transition"
                >
                  Selecionar Todos
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedParamKeys(new Set())}
                  className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/60 hover:bg-white/10 hover:text-white transition"
                >
                  Limpar
                </button>
              </div>
            </div>
    
            {/* Filtros de Parâmetros (Busca e Escopo) */}
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Buscar por nome ou chave de parâmetro..."
                  value={paramSearch}
                  onChange={(e) => setParamSearch(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-white placeholder-white/30 focus:border-primary focus:outline-none"
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {[
                  { key: "ALL", label: "Todos" },
                  { key: "GLOBAL", label: "Globais" },
                  { key: "CHARACTER", label: "Personagem" },
                  { key: "ENVIRONMENT", label: "Ambiente" },
                  { key: "SCENE", label: "Cena" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setParamScopeFilter(tab.key)}
                    className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold transition ${
                      paramScopeFilter === tab.key
                        ? "bg-primary text-on-primary shadow"
                        : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
    
            {/* Grade de Parâmetros com Seleção por Checkbox */}
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {studioParams
                .filter((param) => {
                  if (paramScopeFilter !== "ALL") {
                    const s = String(param.scope || "GLOBAL").toUpperCase();
                    if (paramScopeFilter === "CHARACTER" && s !== "CHARACTER" && s !== "PERSONAGEM") return false;
                    if (paramScopeFilter === "ENVIRONMENT" && s !== "ENVIRONMENT" && s !== "AMBIENTE") return false;
                    if (paramScopeFilter === "SCENE" && s !== "SCENE" && s !== "CENA") return false;
                    if (paramScopeFilter === "GLOBAL" && s !== "GLOBAL") return false;
                  }
                  if (paramSearch.trim()) {
                    const term = paramSearch.toLowerCase();
                    const matchLabel = String(param.label || "").toLowerCase().includes(term);
                    const matchKey = String(param.key || "").toLowerCase().includes(term);
                    const matchDesc = String(param.description || "").toLowerCase().includes(term);
                    if (!matchLabel && !matchKey && !matchDesc) return false;
                  }
                  return true;
                })
                .map((param) => {
                  const isSelected = selectedParamKeys.has(param.key);
                  const scope = String(param.scope || "GLOBAL").toUpperCase();
                  const scopeBadgeClass =
                    scope === "GLOBAL"
                      ? "bg-primary/20 text-primary border-primary/30"
                      : scope === "CHARACTER" || scope === "PERSONAGEM"
                      ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                      : scope === "ENVIRONMENT" || scope === "AMBIENTE"
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                      : scope === "SCENE" || scope === "CENA"
                      ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                      : "bg-slate-500/20 text-slate-300 border-slate-500/30";
    
                  const scopeLabel =
                    scope === "GLOBAL"
                      ? "Global"
                      : scope === "CHARACTER" || scope === "PERSONAGEM"
                      ? "Personagem"
                      : scope === "ENVIRONMENT" || scope === "AMBIENTE"
                      ? "Ambiente"
                      : scope === "SCENE" || scope === "CENA"
                      ? "Cena"
                      : scope;
    
                  return (
                    <div
                      key={param.id || param.key}
                      onClick={() => {
                        const next = new Set(selectedParamKeys);
                        if (isSelected) {
                          next.delete(param.key);
                        } else {
                          next.add(param.key);
                        }
                        setSelectedParamKeys(next);
                      }}
                      className={`flex items-start gap-3 rounded-xl border p-2.5 transition cursor-pointer select-none ${
                        isSelected
                          ? "border-primary/40 bg-primary/10 shadow-sm"
                          : "border-white/5 bg-black/40 hover:border-white/20 hover:bg-black/60"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // tratado no onClick do container
                        className="mt-0.5 h-4 w-4 rounded border-white/20 bg-black/60 text-primary accent-primary focus:ring-0 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-white truncate">
                            {param.label}
                          </span>
                          <span
                            className={`rounded px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider border ${scopeBadgeClass}`}
                          >
                            {scopeLabel}
                          </span>
                          <span className="font-mono text-[10px] text-white/40">
                            {param.key}
                          </span>
                        </div>
                        {param.description && (
                          <p className="text-[10px] text-white/50 mt-0.5 line-clamp-1">
                            {param.description}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
    
              {studioParams.length === 0 && (
                <p className="text-center text-xs text-white/40 py-3">
                  Nenhum parâmetro cadastrado no estúdio.
                </p>
              )}
            </div>
          </div>
    
          {/* Botões do Formulário */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={() => {
                setIsCreateModalOpen(false);
                resetForm();
              }}
              className="rounded-xl border border-white/15 px-4 py-2.5 text-xs font-medium text-white/70 hover:bg-white/5 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-primary px-6 py-2.5 text-xs font-semibold text-on-primary transition hover:bg-primary-fixed disabled:opacity-50"
            >
              {submitting
                ? "Salvando..."
                : editingProject
                ? "Salvar Alterações"
                : "Criar Projeto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
