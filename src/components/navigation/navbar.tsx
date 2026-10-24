"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { WorkspaceSelector } from "./workspace-selector";

interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  platformRole?: string;
  isPlatformAdmin?: boolean;
  memberships: Array<{
    workspaceId: string;
    workspaceName: string;
    role: string;
  }>;
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.authenticated) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      })
      .catch(() => setUser(null));
  }, [pathname]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/login");
    router.refresh();
  };

  const navLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/projects", label: "Projetos" },
    { href: "/parameters", label: "Parâmetros" },
    { href: "/pricing", label: "Planos" },
  ];

  const primaryMembership = user?.memberships[0];

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0b0d12]/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 text-base font-bold tracking-tight text-white transition hover:opacity-90">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-400 font-mono text-sm font-extrabold text-black">
              T
            </span>
            <span>
              <span className="text-emerald-400">TOMA</span>DIX
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/"
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                pathname === "/"
                  ? "bg-white/10 text-white"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              Início
            </Link>
            {navLinks.map((link) => {
              const isActive = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    isActive
                      ? "bg-emerald-400/10 text-emerald-300 font-semibold border border-emerald-400/20"
                      : "text-white/60 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <WorkspaceSelector />

              <Link
                href="/workspace/members"
                className={`rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/5 ${
                  pathname === "/workspace/members" ? "bg-emerald-400/10 text-emerald-300 border-emerald-400/30" : ""
                }`}
              >
                Equipe
              </Link>

              <Link
                href="/workspace/billing"
                className={`rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/5 ${
                  pathname === "/workspace/billing" ? "bg-emerald-400/10 text-emerald-300 border-emerald-400/30" : ""
                }`}
              >
                Assinatura
              </Link>

              {user.isPlatformAdmin && (
                <Link
                  href="/admin"
                  className={`rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/20 flex items-center gap-1.5 ${
                    pathname.startsWith("/admin") ? "ring-1 ring-amber-400 bg-amber-500/20" : ""
                  }`}
                  title="Painel Administrativo da Plataforma SaaS"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Console Admin
                </Link>
              )}

              <Link
                href="/profile"
                className={`rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/5 ${
                  pathname === "/profile" ? "bg-white/10" : ""
                }`}
              >
                Perfil & Estúdio
              </Link>

              <button
                onClick={handleLogout}
                className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-white/50 transition hover:bg-white/5 hover:text-white"
                title="Encerrar sessão"
              >
                Sair
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/5"
              >
                Entrar
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-emerald-400 px-3.5 py-1.5 text-xs font-semibold text-black transition hover:bg-emerald-300"
              >
                Criar Conta
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
