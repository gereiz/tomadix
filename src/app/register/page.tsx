"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          email,
          workspaceName: workspaceName || `Estúdio de ${displayName}`,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Falha ao criar conta.");
      }

      router.push("/projects");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Erro ao conectar com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0f1219]/90 p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block text-lg font-bold tracking-tight">
            <span className="text-primary font-black">TOMA</span>DIX
          </Link>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white">Criar novo estúdio</h1>
          <p className="mt-2 text-sm text-white/50">Comece a estruturar produções com consistência.</p>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-white/70">Seu nome ou cargo</label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ex: Sofia Coppola ou Diretora de Fotografia"
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-sm text-white placeholder-white/20 transition focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white/70">Nome da produtora / estúdio</label>
            <input
              type="text"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              placeholder="Ex: Cinema Novo Lab"
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-sm text-white placeholder-white/20 transition focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white/70">E-mail corporativo ou pessoal</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="diretor@cineprompt.ai"
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-sm text-white placeholder-white/20 transition focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white/70">Senha (mínimo 8 caracteres)</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-sm text-white placeholder-white/20 transition focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-on-primary transition hover:opacity-90 shadow-md shadow-primary/20 disabled:opacity-50"
          >
            {loading ? "Criando estúdio..." : "Criar estúdio e começar"}
          </button>
        </form>

        <div className="mt-8 border-t border-white/10 pt-6 text-center text-xs text-white/50">
          Já possui uma conta?{" "}
          <Link href="/login" className="font-semibold text-primary transition hover:opacity-80">
            Fazer login
          </Link>
        </div>
      </div>
    </main>
  );
}
