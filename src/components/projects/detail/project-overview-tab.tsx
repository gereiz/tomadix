"use client";

import type { ProjectDetailTabState } from "./use-project-detail";

interface ProjectOverviewTabProps {
  s: ProjectDetailTabState;
}

export function ProjectOverviewTab({ s }: ProjectOverviewTabProps) {
  const { project, activeTab, setActiveTab, setVisitedTabs, setVbModalOpen, handleOpenEditProject, formatDate } = s;
  if (!project) return null;

  return (
    <div className={activeTab === "overview" ? "block" : "hidden"}>
      <div className="mt-8 space-y-8">
        {/* Grid de Estatísticas Rápidas */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div
            onClick={() => setActiveTab("characters")}
            className="cursor-pointer rounded-2xl border border-white/10 bg-white/[0.02] p-5 hover:border-primary/30 transition"
          >
            <div className="flex items-center justify-between text-white/50 text-xs">
              <span>PERSONAGENS</span>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <p className="mt-3 text-3xl font-bold text-white">{project._count.characters}</p>
            <p className="mt-1 text-xs text-white/40">Consistência facial e figurinos</p>
          </div>
    
          <div
            onClick={() => setActiveTab("environments")}
            className="cursor-pointer rounded-2xl border border-white/10 bg-white/[0.02] p-5 hover:border-primary/30 transition"
          >
            <div className="flex items-center justify-between text-white/50 text-xs">
              <span>AMBIENTES</span>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <p className="mt-3 text-3xl font-bold text-white">{project._count.environments}</p>
            <p className="mt-1 text-xs text-white/40">Cenários e iluminação</p>
          </div>
    
          <div
            onClick={() => setActiveTab("scenes")}
            className="cursor-pointer rounded-2xl border border-white/10 bg-white/[0.02] p-5 hover:border-primary/30 transition"
          >
            <div className="flex items-center justify-between text-white/50 text-xs">
              <span>CENAS / TAKES</span>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="mt-3 text-3xl font-bold text-white">{project._count.scenes}</p>
            <p className="mt-1 text-xs text-white/40">Sequência cinematográfica</p>
          </div>
    
          <div
            onClick={() => setActiveTab("prompts")}
            className="cursor-pointer rounded-2xl border border-white/10 bg-white/[0.02] p-5 hover:border-primary/30 transition"
          >
            <div className="flex items-center justify-between text-white/50 text-xs">
              <span>PROMPTS GERADOS</span>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <p className="mt-3 text-3xl font-bold text-primary">{project._count.generations}</p>
            <p className="mt-1 text-xs text-white/40">Versões estruturadas em JSON</p>
          </div>
        </div>
    
        {/* Ficha Técnica Cinematográfica */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
          <h3 className="text-base font-bold text-white">Especificações Cinematográficas da Produção</h3>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Plataforma-Alvo</span>
              <p className="mt-1.5 text-sm font-semibold text-primary">
                {project.configuration?.targetPlatform || "Google Flow"}
              </p>
            </div>
    
            <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Proporção (Aspect Ratio)</span>
              <p className="mt-1.5 text-sm font-semibold text-white">
                {project.configuration?.aspectRatio || "16:9"}
              </p>
            </div>
    
            <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Color Grading</span>
              <p className="mt-1.5 text-sm font-semibold text-white">
                {project.configuration?.colorGrade || "Não especificado"}
              </p>
            </div>
    
            <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Ritmo / Pacing</span>
              <p className="mt-1.5 text-sm font-semibold text-white">
                {project.configuration?.pacing || "Moderado"}
              </p>
            </div>
    
            <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Idioma</span>
              <p className="mt-1.5 text-sm font-semibold text-white">{project.language}</p>
            </div>
    
            <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Duração Alvo</span>
              <p className="mt-1.5 text-sm font-semibold text-white">
                {project.durationSeconds ? `${project.durationSeconds} segundos` : "Livre"}
              </p>
            </div>
    
            <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Criado em</span>
              <p className="mt-1.5 text-xs text-white/70">{formatDate(project.createdAt)}</p>
            </div>
    
            <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Última Atualização</span>
              <p className="mt-1.5 text-xs text-white/70">{formatDate(project.updatedAt)}</p>
            </div>
          </div>
        </div>
    
        {/* Bíblia Visual & Direção de Arte Estética (GEN_VISUAL_BIBLE) */}
        {(() => {
          const charCount = project._count?.characters ?? project.characters?.length ?? 0;
          const envCount = project._count?.environments ?? project.environments?.length ?? 0;
          const hasValidTitle = Boolean(project.title && project.title.trim().length >= 3);
          const hasValidDesc = Boolean(project.description && project.description.trim().length >= 10);
          const hasValidGenre = Boolean(project.genre && project.genre.trim().length > 0);
          const hasValidChars = charCount >= 1;
          const hasValidEnvs = envCount >= 1;
          const isVbReady = hasValidTitle && hasValidDesc && hasValidGenre && hasValidChars && hasValidEnvs;
    
          return (
            <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-primary text-base">✨</span>
                    <h3 className="text-base font-bold text-white">
                      Bíblia Visual & Direção de Arte Estética
                    </h3>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                        isVbReady
                          ? "bg-primary/20 text-primary border-primary/30"
                          : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                      }`}
                    >
                      {isVbReady ? "✓ Pronta para Compilação" : "Pré-requisitos Pendentes"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-white/50">
                    Guia mestre de fotografia, paleta cromática, enquadramento e textura cinematográfica.
                  </p>
                </div>
    
                <button
                  onClick={() => {
                    if (!isVbReady) return;
                    setVbModalOpen(true);
                  }}
                  disabled={!isVbReady}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition shadow-sm self-start md:self-auto ${
                    isVbReady
                      ? "border border-primary/40 bg-primary/20 text-primary hover:bg-primary/30 cursor-pointer"
                      : "border border-white/10 bg-white/5 text-white/40 cursor-not-allowed"
                  }`}
                  title={
                    isVbReady
                      ? "Compilar Bíblia Visual com IA"
                      : "Preencha todos os pré-requisitos essenciais abaixo para liberar a geração"
                  }
                >
                  <span>{isVbReady ? "✨" : "🔒"}</span>
                  {project.visualBible ? "Atualizar com IA" : "Gerar Bíblia Visual com IA"}
                </button>
              </div>
    
              {/* Checklist de Pré-requisitos Obrigatórios */}
              <div
                className={`mt-5 rounded-2xl border p-4 transition ${
                  isVbReady
                    ? "border-primary/20 bg-primary/5"
                    : "border-amber-500/20 bg-amber-500/5"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        isVbReady ? "bg-primary" : "bg-amber-400 animate-pulse"
                      }`}
                    />
                    <span className="text-xs font-bold uppercase tracking-wider text-white">
                      Checklist de Prontidão da Bíblia Visual
                    </span>
                  </div>
                  <span className="text-[11px] text-white/50">
                    {isVbReady
                      ? "Todos os dados essenciais preenchidos. Pronto para compilação."
                      : "Complete os itens pendentes abaixo para liberar a compilação por IA:"}
                  </span>
                </div>
    
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {/* Requisito 1: Título e Sinopse */}
                  <div
                    className={`flex items-center justify-between rounded-xl border p-2.5 text-xs ${
                      hasValidDesc
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-amber-500/30 bg-amber-500/10 text-amber-200"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{hasValidDesc ? "✓" : "○"}</span>
                      <div>
                        <div className="font-semibold text-white">Premissa Dramática / Sinopse</div>
                        <div className="text-[10px] text-white/60">
                          {hasValidDesc
                            ? `${project.description?.slice(0, 35)}...`
                            : "Mínimo de 10 caracteres"}
                        </div>
                      </div>
                    </div>
                    {!hasValidDesc && (
                      <button
                        type="button"
                        onClick={handleOpenEditProject}
                        className="rounded-lg bg-amber-400/20 px-2 py-1 text-[10px] font-bold text-amber-300 hover:bg-amber-400/30 transition cursor-pointer"
                      >
                        Preencher
                      </button>
                    )}
                  </div>
    
                  {/* Requisito 2: Gênero Cinematográfico */}
                  <div
                    className={`flex items-center justify-between rounded-xl border p-2.5 text-xs ${
                      hasValidGenre
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-amber-500/30 bg-amber-500/10 text-amber-200"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{hasValidGenre ? "✓" : "○"}</span>
                      <div>
                        <div className="font-semibold text-white">Gênero Cinematográfico</div>
                        <div className="text-[10px] text-white/60">
                          {hasValidGenre ? project.genre : "Não definido"}
                        </div>
                      </div>
                    </div>
                    {!hasValidGenre && (
                      <button
                        type="button"
                        onClick={handleOpenEditProject}
                        className="rounded-lg bg-amber-400/20 px-2 py-1 text-[10px] font-bold text-amber-300 hover:bg-amber-400/30 transition cursor-pointer"
                      >
                        Definir
                      </button>
                    )}
                  </div>
    
                  {/* Requisito 3: Ao menos 1 Personagem */}
                  <div
                    className={`flex items-center justify-between rounded-xl border p-2.5 text-xs ${
                      hasValidChars
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-amber-500/30 bg-amber-500/10 text-amber-200"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{hasValidChars ? "✓" : "○"}</span>
                      <div>
                        <div className="font-semibold text-white">Personagens Registrados</div>
                        <div className="text-[10px] text-white/60">
                          {hasValidChars ? `${charCount} personagem(ns) ativo(s)` : "Cadastre ao menos 1"}
                        </div>
                      </div>
                    </div>
                    {!hasValidChars && (
                      <button
                        type="button"
                        onClick={() => {
                          setVisitedTabs((prev) => ({ ...prev, characters: true }));
                          setActiveTab("characters");
                        }}
                        className="rounded-lg bg-amber-400/20 px-2 py-1 text-[10px] font-bold text-amber-300 hover:bg-amber-400/30 transition cursor-pointer"
                      >
                        Criar Personagem
                      </button>
                    )}
                  </div>
    
                  {/* Requisito 4: Ao menos 1 Ambiente */}
                  <div
                    className={`flex items-center justify-between rounded-xl border p-2.5 text-xs ${
                      hasValidEnvs
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-amber-500/30 bg-amber-500/10 text-amber-200"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{hasValidEnvs ? "✓" : "○"}</span>
                      <div>
                        <div className="font-semibold text-white">Locações / Ambientes</div>
                        <div className="text-[10px] text-white/60">
                          {hasValidEnvs ? `${envCount} ambiente(s) ativo(s)` : "Cadastre ao menos 1"}
                        </div>
                      </div>
                    </div>
                    {!hasValidEnvs && (
                      <button
                        type="button"
                        onClick={() => {
                          setVisitedTabs((prev) => ({ ...prev, environments: true }));
                          setActiveTab("environments");
                        }}
                        className="rounded-lg bg-amber-400/20 px-2 py-1 text-[10px] font-bold text-amber-300 hover:bg-amber-400/30 transition cursor-pointer"
                      >
                        Criar Ambiente
                      </button>
                    )}
                  </div>
                </div>
              </div>
    
              {project.visualBible ? (
                <div className="mt-6 space-y-6">
                  {/* Conceito de Direção de Arte */}
                  <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                      Conceito de Direção de Arte
                    </span>
                    <p className="mt-2 text-xs text-white/80 leading-relaxed">
                      {project.visualBible.artDirectionConcept}
                    </p>
                  </div>
    
                  <div className="grid gap-4 sm:grid-cols-3">
                    {/* Paleta de Cores */}
                    <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                        Paleta Cromática
                      </span>
                      <div className="mt-3 space-y-1.5 text-xs">
                        <div className="text-white/80">
                          <span className="text-white/40">Dominante:</span>{" "}
                          {project.visualBible.colorPalette?.dominant}
                        </div>
                        <div className="text-white/80">
                          <span className="text-white/40">Secundária:</span>{" "}
                          {project.visualBible.colorPalette?.secondary}
                        </div>
                        <div className="text-white/80">
                          <span className="text-white/40">Destaque:</span>{" "}
                          {project.visualBible.colorPalette?.accent}
                        </div>
                        <p className="mt-2 text-[11px] text-white/50">
                          {project.visualBible.colorPalette?.gradingNotes}
                        </p>
                      </div>
                    </div>
    
                    {/* Cinematografia & Lentes */}
                    <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                        Câmeras & Lentes
                      </span>
                      <div className="mt-3 space-y-1.5 text-xs text-white/80">
                        <div>
                          <span className="text-white/40">Lentes:</span>{" "}
                          {project.visualBible.cinematography?.recommendedLenses}
                        </div>
                        <div>
                          <span className="text-white/40">Movimento:</span>{" "}
                          {project.visualBible.cinematography?.cameraMovementStyle}
                        </div>
                        <div>
                          <span className="text-white/40">Textura:</span>{" "}
                          {project.visualBible.cinematography?.grainAndTexture}
                        </div>
                      </div>
                    </div>
    
                    {/* Filosofia de Iluminação */}
                    <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                        Iluminação & Contraste
                      </span>
                      <div className="mt-3 space-y-1.5 text-xs text-white/80">
                        <div>
                          <span className="text-white/40">Ratio:</span>{" "}
                          {project.visualBible.lightingPhilosophy?.contrastRatio}
                        </div>
                        <div>
                          <span className="text-white/40">Luz Principal:</span>{" "}
                          {project.visualBible.lightingPhilosophy?.keyLightStyle}
                        </div>
                        <div>
                          <span className="text-white/40">Sombras:</span>{" "}
                          {project.visualBible.lightingPhilosophy?.shadowTreatment}
                        </div>
                      </div>
                    </div>
                  </div>
    
                  {/* Diretrizes Visuais */}
                  {project.visualBible.visualDirectives?.length > 0 && (
                    <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                        Diretrizes Estéticas Oficiais
                      </span>
                      <ul className="mt-2 space-y-1 text-xs text-white/70 list-disc list-inside">
                        {project.visualBible.visualDirectives.map((d: string, idx: number) => (
                          <li key={idx}>{d}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-white/[0.01] p-8 text-center">
                  <p className="text-xs text-white/50">
                    {isVbReady
                      ? "Todos os pré-requisitos estão atendidos! Clique em 'Gerar Bíblia Visual com IA' para direcionar a estética cinematográfica de toda a produção."
                      : "Preencha a premissa, gênero, ao menos 1 personagem e 1 ambiente para desbloquear a Bíblia Visual."}
                  </p>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
