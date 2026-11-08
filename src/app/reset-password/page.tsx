"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialToken = searchParams.get("token") || "";

  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("As senhas informadas não coincidem.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Falha ao redefinir a senha.");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/projects");
        router.refresh();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Erro ao conectar com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0f1219]/90 p-5 sm:p-8 shadow-2xl">
      <div className="mb-8 text-center">
        <Link href="/" className="inline-block text-lg font-bold tracking-tight">
          <span className="text-primary font-black">TOMA</span>DIX
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white">Criar Nova Senha</h1>
        <p className="mt-2 text-sm text-white/50">Defina sua nova credencial de segurança.</p>
      </div>

      {success && (
        <div className="mb-5 rounded-xl border border-primary/30 bg-primary/10 p-4 text-xs text-primary">
          Senha alterada com sucesso! Redirecionando para o estúdio...
        </div>
      )}

      {error && (
        <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {!initialToken && (
          <div>
            <label className="block text-xs font-medium text-white/70">Token de Recuperação</label>
            <input
              type="text"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Cole o token recebido"
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 font-mono text-sm text-white placeholder-white/20 transition focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-white/70">Nova Senha (mínimo 8 caracteres)</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-sm text-white placeholder-white/20 transition focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-white/70">Confirmar Nova Senha</label>
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-sm text-white placeholder-white/20 transition focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <button
          type="submit"
          disabled={loading || success}
          className="mt-2 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-on-primary transition hover:opacity-90 shadow-md shadow-primary/20 disabled:opacity-50"
        >
          {loading ? "Redefinindo senha..." : "Salvar nova senha"}
        </button>
      </form>

      <div className="mt-8 border-t border-white/10 pt-6 text-center text-xs text-white/50">
        <Link href="/login" className="font-semibold text-primary transition hover:opacity-80">
          Voltar para o login
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-6 py-12">
      <Suspense fallback={<div className="text-white/50">Carregando...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
