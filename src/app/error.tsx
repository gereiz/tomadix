"use client";

import { Icon } from "@/components/ui/icon";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/** Limite de erro da aplicação: mostra o que houve e permite tentar de novo. */
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-surface p-6">
      <div className="w-full max-w-md rounded-xl border border-outline-variant/40 bg-surface-container p-8 text-center">
        <Icon name="error" size={32} className="text-error" />
        <h1 className="mt-3 text-xl font-bold text-on-surface">Não foi possível carregar esta página</h1>
        <p className="mt-2 text-sm text-on-surface-variant">
          Tente novamente. Se o problema continuar, informe o código {error.digest ?? "indisponível"} ao suporte.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
