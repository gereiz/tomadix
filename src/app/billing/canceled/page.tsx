"use client";

import Link from "next/link";

export default function BillingCanceledPage() {
  return (
    <div className="min-h-screen bg-[#07090e] px-6 py-20 flex items-center justify-center text-white">
      <div className="mx-auto max-w-md text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 text-3xl">
          ⏸️
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Checkout Cancelado
          </h1>
          <p className="text-sm text-white/60">
            Você cancelou a operação antes da conclusão do pagamento. Nenhuma cobrança foi realizada no seu cartão ou conta.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <Link
            href="/pricing"
            className="w-full sm:w-auto rounded-xl bg-primary px-6 py-3 text-sm font-bold text-on-primary transition hover:opacity-90 shadow-md shadow-primary/20"
          >
            Voltar aos Planos
          </Link>
          <Link
            href="/projects"
            className="w-full sm:w-auto rounded-xl border border-white/15 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/5"
          >
            Continuar no Estúdio
          </Link>
        </div>
      </div>
    </div>
  );
}
