"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export interface OnboardingState {
  userId: string;
  displayName: string;
  email: string;
  emailConfirmed: boolean;
  onboardingCompleted: boolean;
  onboardingStep: number;
  activeWorkspace?: {
    id: string;
    name: string;
    slug: string;
    planName: string;
    projectsCount: number;
    hasProjects: boolean;
  } | null;
  starterTemplates: Array<{
    key: string;
    title: string;
    genre: string;
    description: string;
    targetPlatform: string;
    aspectRatio: string;
  }>;
}

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: OnboardingState | null;
  onStateUpdate?: () => void;
}

export function OnboardingModal({
  isOpen,
  onClose,
  state,
  onStateUpdate,
}: OnboardingModalProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(state?.onboardingStep || 1);
  const [creatingStarter, setCreatingStarter] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("cyberpunk_nordestino");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !state) return null;

  const totalSteps = 7;

  const handleNextStep = async (stepToSave?: number) => {
    const next = stepToSave || currentStep + 1;
    setError(null);
    try {
      await fetch("/api/onboarding/step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: next, completed: next >= totalSteps }),
      });
      if (next > totalSteps) {
        onClose();
        if (onStateUpdate) onStateUpdate();
        router.refresh();
      } else {
        setCurrentStep(next);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = async () => {
    try {
      await fetch("/api/onboarding/skip", { method: "POST" });
      onClose();
      if (onStateUpdate) onStateUpdate();
      router.refresh();
    } catch (e) {
      console.error(e);
      onClose();
    }
  };

  const handleCreateStarterProject = async (templateKey: string) => {
    setCreatingStarter(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding/create-starter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateKey }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Não foi possível criar o projeto inicial.");
      }

      onClose();
      if (onStateUpdate) onStateUpdate();
      router.push(`/projects/${data.data.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Erro ao criar projeto inicial.");
    } finally {
      setCreatingStarter(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-step-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#121620] via-[#0d1017] to-black text-white shadow-2xl">
        {/* Glow de fundo */}
        <div className="pointer-events-none absolute -top-32 -left-32 h-64 w-64 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />

        {/* Topo / Barra de Progresso */}
        <div className="border-b border-white/10 p-6 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-400 font-mono text-xs font-black text-black">
                T
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Guia de Início Rápido • Tomadix
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-white/70">
                Etapa {currentStep} de {totalSteps}
              </span>
              <button
                onClick={handleSkip}
                className="text-xs text-white/40 hover:text-white transition underline underline-offset-4"
              >
                Pular Introdução
              </button>
            </div>
          </div>

          {/* Stepper Progress Bar */}
          <div className="mt-4 flex gap-1.5">
            {Array.from({ length: totalSteps }).map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  idx + 1 < currentStep
                    ? "bg-emerald-400"
                    : idx + 1 === currentStep
                    ? "bg-emerald-400 shadow-sm shadow-emerald-400/50"
                    : "bg-white/10"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Conteúdo Dinâmico por Etapa */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8">
          {error && (
            <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-950/40 p-4 text-xs text-red-200">
              <p className="font-semibold">Atenção</p>
              <p className="mt-0.5">{error}</p>
            </div>
          )}

          {/* Etapa 1: Boas-vindas e Confirmação de Conta */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="inline-flex rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-400">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <h2 id="onboarding-step-title" className="text-2xl font-bold tracking-tight">
                Boas-vindas ao Tomadix, {state.displayName}!
              </h2>
              <p className="text-sm text-white/70 leading-relaxed">
                Você acaba de acessar a plataforma profissional para estruturar roteiros cinematográficos, manter consistência de iluminação e figurino, e gerar prompts de alta precisão para geradores de vídeo por inteligência artificial.
              </p>

              <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-white/50">Status do E-mail</p>
                    <p className="text-sm font-semibold">{state.email}</p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      state.emailConfirmed
                        ? "bg-emerald-400/20 text-emerald-300 border border-emerald-400/30"
                        : "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                    }`}
                  >
                    {state.emailConfirmed ? "✓ E-mail Confirmado" : "Confirmação Pendente"}
                  </span>
                </div>
                {!state.emailConfirmed && (
                  <p className="mt-2 text-xs text-white/50">
                    Você pode confirmar seu endereço a qualquer momento na página de Perfil para garantir a segurança da conta.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Etapa 2: Apresentação do Produto */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="inline-flex rounded-2xl border border-blue-500/30 bg-blue-500/10 p-3 text-blue-400">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                </svg>
              </div>
              <h2 id="onboarding-step-title" className="text-2xl font-bold tracking-tight">
                Da ideia ao prompt pronto para produção
              </h2>
              <p className="text-sm text-white/70 leading-relaxed">
                Na Tomadix, o seu processo de pré-produção não é um bloco de texto solto: é um ecossistema modular e conectado.
              </p>

              <div className="grid gap-3 sm:grid-cols-2 mt-4 text-xs">
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                  <span className="text-emerald-400 font-bold text-sm">01. Consistência Visual</span>
                  <p className="mt-1 text-white/60">
                    Defina atores, roupas e rostos uma única vez e reaproveite em todas as cenas sem discrepâncias visuais.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                  <span className="text-emerald-400 font-bold text-sm">02. Decupagem Técnica</span>
                  <p className="mt-1 text-white/60">
                    Lentes, movimentos de câmera, proporção anamórfica e iluminação organizados cena por cena.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                  <span className="text-emerald-400 font-bold text-sm">03. Otimizado para IA</span>
                  <p className="mt-1 text-white/60">
                    Prompts prontos para Google Flow, Runway Gen-3, OpenAI Sora, Midjourney e Kling AI.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                  <span className="text-emerald-400 font-bold text-sm">04. Exportação Profissional</span>
                  <p className="mt-1 text-white/60">
                    Exporte roteiros técnicos em JSON limpo e Markdown para sua equipe ou pós-produção.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Etapa 3: Workspace Ativo */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="inline-flex rounded-2xl border border-purple-500/30 bg-purple-500/10 p-3 text-purple-400">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h2 id="onboarding-step-title" className="text-2xl font-bold tracking-tight">
                Seu Estúdio de Criação (Workspace)
              </h2>
              <p className="text-sm text-white/70 leading-relaxed">
                Toda a sua produção fica organizada em um Workspace isolado e seguro. Você já possui um estúdio pessoal ativo:
              </p>

              <div className="mt-4 rounded-2xl border border-purple-500/30 bg-purple-950/20 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300">
                      Estúdio Ativo
                    </span>
                    <h3 className="text-lg font-bold text-white">
                      {state.activeWorkspace?.name || "Meu Estúdio Pessoal"}
                    </h3>
                    <p className="text-xs text-white/50 mt-0.5">
                      Slug: /{state.activeWorkspace?.slug || "estudio"} • Plano:{" "}
                      <span className="text-emerald-400 font-semibold">
                        {state.activeWorkspace?.planName || "Plano Gratuito"}
                      </span>
                    </p>
                  </div>
                  <span className="rounded-xl bg-purple-400/20 px-3 py-1.5 text-xs font-bold text-purple-200 border border-purple-400/30">
                    OWNER
                  </span>
                </div>
              </div>

              <p className="text-xs text-white/50">
                Mais tarde, você poderá criar workspaces de equipe adicionais e convidar colaboradores com papéis de Admin, Membro ou Visualizador.
              </p>
            </div>
          )}

          {/* Etapa 4: Arquitetura Cinematográfica */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="inline-flex rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-400">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </div>
              <h2 id="onboarding-step-title" className="text-2xl font-bold tracking-tight">
                Como os elementos se conectam
              </h2>
              <p className="text-sm text-white/70 leading-relaxed">
                Entenda a hierarquia que garante a consistência do seu projeto do início ao fim:
              </p>

              <div className="mt-4 space-y-2.5 text-xs">
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-400/20 text-emerald-300 font-bold">1</span>
                  <div>
                    <strong className="text-white">Projeto:</strong> Contêiner com a visão geral, tom narrativo, idioma e plataforma-alvo.
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-blue-400/20 text-blue-300 font-bold">2</span>
                  <div>
                    <strong className="text-white">Personagens & Ambientes:</strong> Fichas detalhadas com roupas, traços físicos e iluminação.
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-purple-400/20 text-purple-300 font-bold">3</span>
                  <div>
                    <strong className="text-white">Cenas & Sequenciamento:</strong> Decupagem com ordem cronológica, enquadramento e ação principal.
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-amber-400/20 text-amber-300 font-bold">4</span>
                  <div>
                    <strong className="text-white">Motor de Prompts:</strong> Compilador que une todas as variáveis e gera o prompt cinematográfico perfeito.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Etapa 5: Criar Primeiro Projeto ou Escolher Template */}
          {currentStep === 5 && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="inline-flex rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-400">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h2 id="onboarding-step-title" className="text-2xl font-bold tracking-tight">
                Inicie com um Modelo Pronto em 1 Clique
              </h2>
              <p className="text-sm text-white/70 leading-relaxed">
                Para acelerar seu aprendizado, criamos templates cinematográficos completos com personagens, ambientes e cenas já decupadas:
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {state.starterTemplates.map((template) => (
                  <div
                    key={template.key}
                    onClick={() => setSelectedTemplate(template.key)}
                    className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                      selectedTemplate === template.key
                        ? "border-emerald-400 bg-emerald-950/20 shadow-lg shadow-emerald-400/10"
                        : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/60">
                        {template.genre}
                      </span>
                      {selectedTemplate === template.key && (
                        <span className="text-emerald-400 text-xs font-bold">✓ Selecionado</span>
                      )}
                    </div>
                    <h3 className="mt-2 font-bold text-white text-base">{template.title}</h3>
                    <p className="mt-1 text-xs text-white/60 line-clamp-3 leading-relaxed">
                      {template.description}
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-[10px] text-white/40">
                      <span>Plataforma: {template.targetPlatform}</span>
                      <span>•</span>
                      <span>{template.aspectRatio}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  disabled={creatingStarter}
                  onClick={() => handleCreateStarterProject(selectedTemplate)}
                  className="flex-1 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-300 py-3 text-xs font-bold text-black transition hover:opacity-90 shadow-lg shadow-emerald-400/20 disabled:opacity-50 text-center"
                >
                  {creatingStarter ? "Criando Universo..." : `Criar Projeto Inicial com "${selectedTemplate === "cyberpunk_nordestino" ? "Neo-Sertão 2099" : "Sombras da Guanabara"}"`}
                </button>
              </div>
            </div>
          )}

          {/* Etapa 6: Motor de Prompts */}
          {currentStep === 6 && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="inline-flex rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-400">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 id="onboarding-step-title" className="text-2xl font-bold tracking-tight">
                O Motor de Prompts Inteligente
              </h2>
              <p className="text-sm text-white/70 leading-relaxed">
                Dentro de cada cena, você encontra o motor de prompts alimentado pelo Google Gemini. Ele compila a bíblia visual e gera instruções de alta densidade sem que você precise digitar parágrafos repetitivos:
              </p>

              <div className="rounded-2xl border border-emerald-500/30 bg-black/60 p-4 font-mono text-xs text-white/80">
                <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2 text-[10px] text-emerald-400">
                  <span>EXEMPLO DE PROMPT ESTRUTURADO</span>
                  <span>JSON / Flow V1</span>
                </div>
                <p className="text-emerald-300 font-semibold">{`// Prompt pronto para o gerador de vídeo:`}</p>
                <p className="mt-1">{`"Cinematic 2.39:1 anamorphic shot of Valquíria do Sol wearing cybernetic leather armor, standing under dust haze in Juazeiro Neural Market, intense amber sun, 50mm lens f/1.8, hyperdetailed textures --ar 2.39:1 --v 6.0"`}</p>
              </div>

              <p className="text-xs text-white/50">
                Cada geração é salva no histórico com controle de versão, permitindo comparar resultados, restaurar versões anteriores e analisar a continuidade.
              </p>
            </div>
          )}

          {/* Etapa 7: Limites do Plano & Conclusão */}
          {currentStep === 7 && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="inline-flex rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-400">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 id="onboarding-step-title" className="text-2xl font-bold tracking-tight">
                Tudo pronto para começar!
              </h2>
              <p className="text-sm text-white/70 leading-relaxed">
                Seu estúdio está configurado. Conheça os limites e recursos do seu plano contratado:
              </p>

              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-xs space-y-2.5">
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-white/60">Plano Atual:</span>
                  <span className="font-bold text-emerald-400">
                    {state.activeWorkspace?.planName || "Plano Gratuito"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-white/60">Capacidade de Projetos:</span>
                  <span className="font-semibold text-white">2 Projetos Ativos</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-white/60">Créditos de IA Inclusos:</span>
                  <span className="font-semibold text-white">20 créditos mensais</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-white/60">Colaboração de Equipe:</span>
                  <span className="font-semibold text-white">1 Membro (Individual)</span>
                </div>
              </div>

              <p className="text-xs text-white/50">
                Precisa de projetos ilimitados ou colaboração em equipe? Você pode fazer upgrade para o Plano PRO ou TEAM a qualquer momento na página de Planos.
              </p>
            </div>
          )}
        </div>

        {/* Rodapé / Botões de Navegação */}
        <div className="flex items-center justify-between border-t border-white/10 p-6 pt-4">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handlePrevStep}
                className="rounded-xl border border-white/15 px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white transition"
              >
                ← Voltar
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={() => handleNextStep()}
                className="rounded-xl bg-emerald-400 px-6 py-2.5 text-xs font-bold text-black transition hover:bg-emerald-300 shadow-md shadow-emerald-400/10"
              >
                Próximo →
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleNextStep(8)}
                className="rounded-xl bg-gradient-to-r from-emerald-400 to-teal-300 px-6 py-2.5 text-xs font-bold text-black transition hover:opacity-90 shadow-lg shadow-emerald-400/20"
              >
                Concluir e Explorar Estúdio
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
