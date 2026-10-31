"use client";

import React from "react";

export interface ToastProps {
  message: {
    text: string;
    type: "success" | "error" | "warning" | "info";
    code?: string;
  } | null;
  onClose: () => void;
}

export function ToastNotification({ message, onClose }: ToastProps) {
  if (!message) return null;

  const isError = message.type === "error";
  const isWarning = message.type === "warning";
  const isSuccess = message.type === "success";

  return (
    <aside
      aria-label="Notificação do Sistema"
      className="fixed bottom-6 right-6 z-[100] max-w-md animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div
        className={`flex items-start gap-3 rounded-2xl border p-4 shadow-2xl backdrop-blur-xl ${
          isError
            ? "border-red-500/40 bg-red-950/80 text-red-200 shadow-red-500/10"
            : isWarning
            ? "border-amber-500/40 bg-amber-950/80 text-amber-200 shadow-amber-500/10"
            : isSuccess
            ? "border-primary/40 bg-primary/80 text-primary shadow-primary/10"
            : "border-white/20 bg-neutral-900/90 text-white shadow-black/40"
        }`}
      >
        <div className="mt-0.5 shrink-0">
          {isError && (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          )}
          {isWarning && (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          )}
          {isSuccess && (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary border border-primary/30">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
        </div>

        <div className="flex-1 text-xs">
          <p className="font-semibold tracking-wide">
            {isError ? "Atenção: Não foi possível prosseguir" : isWarning ? "Aviso do Sistema" : "Sucesso"}
          </p>
          <p className="mt-0.5 opacity-90 leading-relaxed break-words">{message.text}</p>
        </div>

        <button
          onClick={onClose}
          className="ml-2 text-white/50 hover:text-white transition p-1"
          title="Fechar notificação"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
