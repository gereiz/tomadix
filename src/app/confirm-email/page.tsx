"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function ConfirmEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [inputToken, setInputToken] = useState(token);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const handleConfirm = async (tokenToUse: string) => {
    if (!tokenToUse) return;
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/confirm-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenToUse }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Falha na confirmação do e-mail.");
      }

      setMessage(data.message || "E-mail confirmado com sucesso!");
      setConfirmed(true);
    } catch (err: any) {
      setError(err.message || "Erro ao conectar com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      handleConfirm(token);
    }
  }, [token]);

  return (
    <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0f1219]/90 p-8 shadow-2xl">
      <div className="mb-8 text-center">
        <Link href="/" className="inline-block text-lg font-bold tracking-tight">
          <span className="text-primary">CINE</span>PROMPT{" "}
          <span className="text-xs font-normal tracking-widest text-white/40">STUDIO</span>
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white">Confirmação de E-mail</h1>
        <p className="mt-2 text-sm text-white/50">
          Validação de autenticidade da sua conta cinematográfica.
        </p>
      </div>

      {confirmed && (
        <div className="mb-6 rounded-2xl border border-primary/30 bg-primary/10 p-5 text-center text-primary">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-lg">
            ✓
          </div>
          <p className="text-sm font-semibold">{message}</p>
          <div className="mt-5">
            <Link
              href="/projects"
              className="inline-block rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-on-primary transition hover:opacity-90 shadow-md shadow-primary/20"
            >
              Acessar Meus Projetos
            </Link>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-300">
          {error}
        </div>
      )}

      {!confirmed && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleConfirm(inputToken);
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-medium text-white/70">Código / Token de Confirmação</label>
            <input
              type="text"
              required
              value={inputToken}
              onChange={(e) => setInputToken(e.target.value)}
              placeholder="Cole o token de ativação"
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 font-mono text-sm text-white placeholder-white/20 transition focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-on-primary transition hover:opacity-90 disabled:opacity-50 shadow-md shadow-primary/20"
          >
            {loading ? "Confirmando..." : "Confirmar endereço de e-mail"}
          </button>
        </form>
      )}

      <div className="mt-8 border-t border-white/10 pt-6 text-center text-xs text-white/50">
        <Link href="/login" className="font-semibold text-primary transition hover:text-primary">
          Ir para tela de login
        </Link>
      </div>
    </div>
  );
}

export default function ConfirmEmailPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0b0d12] px-6 py-12">
      <Suspense fallback={<div className="text-white/50">Carregando...</div>}>
        <ConfirmEmailContent />
      </Suspense>
    </main>
  );
}
