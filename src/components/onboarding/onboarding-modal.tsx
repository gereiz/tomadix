"use client";

import React, { useState, useEffect } from "react";
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
  const [currentStep, setCurrentStep] = useState(1);
  const [creatingStarter, setCreatingStarter] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [error, setError] = useState<string | null>(null);

  const totalSteps = 3;

  useEffect(() => {
    if (isOpen) {
      const initialStep =
        state?.onboardingStep && state.onboardingStep >= 1 && state.onboardingStep <= totalSteps
          ? state.onboardingStep
          : 1;
      setCurrentStep(initialStep);
      setError(null);
    }
  }, [isOpen, state?.onboardingStep]);

  if (!isOpen || !state) return null;

  const handleRestartTutorial = async () => {
    setError(null);
    try {
      const res = await fetch("/api/onboarding/reset", { method: "POST" });
      if (res.ok) {
        setCurrentStep(1);
        if (onStateUpdate) onStateUpdate();
      } else {
        setCurrentStep(1);
      }
    } catch {
      setCurrentStep(1);
    }
  };

  const handleNextStep = async (stepToSave?: number) => {
    const next = stepToSave || currentStep + 1;
    setError(null);
    try {
      const res = await fetch("/api/onboarding/step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: next, completed: next > totalSteps }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Não foi possível salvar o progresso. Tente novamente.");
        return;
      }
      if (next > totalSteps) {
        onClose();
        if (onStateUpdate) onStateUpdate();
        router.refresh();
      } else {
        setCurrentStep(next);
      }
    } catch (e) {
      console.error(e);
      setError("Falha de conexão ao salvar o progresso.");
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
      router.push(`/projects/${data.data.id}?tab=prompts`);
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 animate-in fade-in duration-200"
    >
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#121620] via-[#0d1017] to-black text-white shadow-2xl">
        {/* Glow de fundo */}

        {/* Topo / Barra de Progresso */}
        <div className="border-b border-white/10 p-6 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary font-mono text-xs font-black text-black">
                T
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                Guia de Início Rápido • Tomadix
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-white/70">
                Etapa {currentStep} de {totalSteps}
              </span>
              <button
                type="button"
                onClick={handleRestartTutorial}
                className="text-xs text-white/50 hover:text-primary transition flex items-center gap-1"
                title="Voltar ao início do tutorial"
              >
                🔄 Reiniciar
              </button>
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
                    ? "bg-primary"
                    : idx + 1 === currentStep
                    ? "bg-primary shadow-sm shadow-primary/50"
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
              <div className="inline-flex rounded-2xl border border-primary/30 bg-primary/10 p-3 text-primary">
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
                        ? "bg-primary/20 text-primary border border-primary/30"
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

          {/* Etapa 2: Arquitetura Cinematográfica */}
          {currentStep === 2 && (
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
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary font-bold">1</span>
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

          {/* Etapa 3: Criar Primeiro Projeto ou Escolher Template */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="inline-flex rounded-2xl border border-primary/30 bg-primary/10 p-3 text-primary">
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
                      (selectedTemplate || state.starterTemplates[0]?.key) === template.key
                        ? "border-primary bg-primary/20 shadow-lg shadow-primary/10"
                        : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/60">
                        {template.genre}
                      </span>
                      {(selectedTemplate || state.starterTemplates[0]?.key) === template.key && (
                        <span className="text-primary text-xs font-bold">✓ Selecionado</span>
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
                  disabled={creatingStarter || !(selectedTemplate || state.starterTemplates[0]?.key)}
                  onClick={() => handleCreateStarterProject(selectedTemplate || state.starterTemplates[0]?.key)}
                  className="flex-1 rounded-xl bg-primary py-3 text-xs font-bold text-on-primary transition hover:opacity-90 shadow-lg shadow-primary/20 disabled:opacity-50 text-center"
                >
                  {creatingStarter ? "Criando Universo..." : `Criar Projeto e Gerar meu Primeiro Prompt`}
                </button>
                {state.activeWorkspace?.hasProjects && (
                  <button
                    type="button"
                    onClick={() => handleNextStep(totalSteps + 1)}
                    className="rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-xs font-semibold text-white/80 hover:bg-white/10 hover:text-white transition text-center"
                  >
                    Manter meus projetos atuais →
                  </button>
                )}
              </div>
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
                className="rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-on-primary transition hover:opacity-90 shadow-md shadow-primary/20"
              >
                Próximo →
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleNextStep(totalSteps + 1)}
                className="rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-on-primary transition hover:opacity-90 shadow-lg shadow-primary/20"
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
