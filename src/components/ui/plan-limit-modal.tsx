"use client";

import React from "react";
import Link from "next/link";

export interface PlanLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  planName?: string;
  currentUsage?: number;
  maxLimit?: number;
  limitType?: "projects" | "members" | "credits" | "feature";
}

export function PlanLimitModal({
  isOpen,
  onClose,
  title = "Limite de Projetos Atingido",
  message,
  planName = "Plano Gratuito",
  currentUsage = 2,
  maxLimit = 2,
  limitType = "projects",
}: PlanLimitModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="plan-limit-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-b from-neutral-900 via-neutral-950 to-black p-6 sm:p-8 text-white shadow-2xl shadow-amber-500/10">
        {/* Glow de fundo */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-48 w-48 rounded-full bg-amber-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />

        {/* Header do Modal */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/20 text-amber-400">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                {planName} • Limite Atingido
              </span>
              <h3 id="plan-limit-title" className="mt-1 text-lg font-bold sm:text-xl text-white">
                {title}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-lg border border-white/10 p-1.5 text-white/50 hover:bg-white/10 hover:text-white transition"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Mensagem principal */}
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
            {message ||
              `Seu estúdio atingiu a capacidade máxima de ${currentUsage} de ${maxLimit} projetos ativos inclusos no ${planName}. Para continuar criando novos universos, personagens e prompts cinematográficos sem restrições, faça upgrade para um plano superior.`}
          </p>

          {/* Medidor visual */}
          {maxLimit !== -1 && (
            <div className="mt-4">
              <div className="flex justify-between text-[11px] font-medium text-white/60 mb-1.5">
                <span>Capacidade utilizada</span>
                <span className="text-amber-400 font-semibold">{currentUsage} / {maxLimit} projetos (100%)</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full" />
              </div>
            </div>
          )}
        </div>

        {/* O que o Upgrade desbloqueia */}
        <div className="mt-5 space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-white/50">
            Com o Plano PRO você desbloqueia:
          </p>
          <div className="grid gap-2 text-xs">
            <div className="flex items-center gap-2 text-white/90">
              <span className="text-primary font-bold">✓</span>
              <span><strong>Projetos Ilimitados:</strong> Crie quantos universos e roteiros desejar.</span>
            </div>
            <div className="flex items-center gap-2 text-white/90">
              <span className="text-primary font-bold">✓</span>
              <span><strong>2.500 Créditos Mensais:</strong> Geração acelerada com Google Flow e Gemini.</span>
            </div>
            <div className="flex items-center gap-2 text-white/90">
              <span className="text-primary font-bold">✓</span>
              <span><strong>Modelos Avançados:</strong> Prompts otimizados para Runway Gen-3 e Sora.</span>
            </div>
            <div className="flex items-center gap-2 text-white/90">
              <span className="text-primary font-bold">✓</span>
              <span><strong>Exportação 4K:</strong> Roteiros técnicos completos em JSON e Markdown.</span>
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="mt-6 flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto rounded-xl border border-white/15 px-4 py-2.5 text-xs font-medium text-white/70 hover:bg-white/10 hover:text-white transition text-center"
          >
            Continuar no Plano Atual
          </button>
          <Link
            href="/workspace/billing"
            className="w-full sm:w-auto rounded-xl border border-white/15 px-4 py-2.5 text-xs font-medium text-white/90 hover:bg-white/10 transition text-center"
          >
            Gerenciar Assinatura
          </Link>
          <Link
            href="/pricing"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-primary px-5 py-2.5 text-xs font-bold text-black transition hover:opacity-95 shadow-lg shadow-amber-400/20 text-center"
          >
            <span>Fazer Upgrade Agora</span>
            <span>→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
