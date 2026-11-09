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

  // Uma única tela: escolher um modelo e já gerar o primeiro resultado
  const totalSteps = 1;

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/85 sm:items-center sm:p-4 animate-in"
    >
      <div className="relative flex max-h-[calc(100dvh-0.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-3xl border border-white/10 bg-gradient-to-b from-[#121620] via-[#0d1017] to-black text-white shadow-2xl">
        {/* Glow de fundo */}

        {/* Topo / Barra de Progresso */}
        <div className="border-b border-white/10 p-4 pb-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary font-mono text-xs font-black text-black">
                T
              </span>
              <span className="truncate text-xs font-bold uppercase tracking-wider text-primary">
                Guia de Início Rápido • Tomadix
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <button
                type="button"
                onClick={handleRestartTutorial}
                className="flex min-h-10 items-center gap-1 text-xs text-white/60 hover:text-primary transition"
                title="Voltar ao início do tutorial"
              >
                🔄 Reiniciar
              </button>
              <button
                onClick={handleSkip}
                className="min-h-10 text-xs text-white/60 hover:text-white transition underline underline-offset-4"
              >
                Pular Introdução
              </button>
            </div>
          </div>
        </div>

        {/* Conteúdo Dinâmico por Etapa */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          {error && (
            <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-950/40 p-4 text-xs text-red-200">
              <p className="font-semibold">Atenção</p>
              <p className="mt-0.5">{error}</p>
            </div>
          )}

          {/* Etapa 3: Criar Primeiro Projeto ou Escolher Template */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="inline-flex rounded-2xl border border-primary/30 bg-primary/10 p-3 text-primary">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h2 id="onboarding-step-title" className="text-2xl font-bold tracking-tight">
                Boas-vindas, {state.displayName}! Escolha um modelo e comece
              </h2>
              <p className="text-sm text-white/70 leading-relaxed">
                Cada modelo já vem com personagens, ambientes e cenas prontos. Você chega direto na tela de prompts para gerar o primeiro resultado:
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

      </div>
    </div>
  );
}
