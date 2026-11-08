"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setResetToken(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Falha ao processar solicitação.");
      }

      setMessage(data.message || "Se o e-mail estiver cadastrado, as instruções foram geradas.");
      if (data.resetToken) {
        setResetToken(data.resetToken);
      }
    } catch (err: any) {
      setError(err.message || "Erro ao conectar com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0f1219]/90 p-5 sm:p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block text-lg font-bold tracking-tight">
            <span className="text-primary font-black">TOMA</span>DIX
          </Link>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white">Recuperação de Acesso</h1>
          <p className="mt-2 text-sm text-white/50">
            Digite seu e-mail cadastrado para redefinir sua senha com segurança.
          </p>
        </div>

        {message && (
          <div className="mb-5 rounded-xl border border-primary/30 bg-primary/10 p-4 text-xs text-primary">
            <p className="font-semibold">{message}</p>
            {resetToken && (
              <div className="mt-3 rounded-lg border border-primary/30 bg-black/40 p-3">
                <p className="text-[11px] text-white/70">Ambiente de desenvolvimento / Link direto:</p>
                <Link
                  href={`/reset-password?token=${resetToken}`}
                  className="mt-1 block font-mono text-xs text-primary underline break-all"
                >
                  /reset-password?token={resetToken}
                </Link>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-white/70">E-mail da sua conta</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="diretor@cineprompt.ai"
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-sm text-white placeholder-white/20 transition focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-on-primary transition hover:opacity-90 shadow-md shadow-primary/20 disabled:opacity-50"
          >
            {loading ? "Gerando token..." : "Enviar instruções de recuperação"}
          </button>
        </form>

        <div className="mt-8 border-t border-white/10 pt-6 text-center text-xs text-white/50">
          Lembrou sua senha?{" "}
          <Link href="/login" className="font-semibold text-primary transition hover:opacity-80">
            Voltar para o login
          </Link>
        </div>
      </div>
    </main>
  );
}
