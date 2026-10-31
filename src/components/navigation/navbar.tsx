"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { WorkspaceSelector } from "./workspace-selector";
import { CreditBadge } from "./credit-badge";

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  // Fecha o menu mobile automaticamente quando a rota muda
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/login");
    router.refresh();
  };

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: "📊" },
    { href: "/studio", label: "Análise Cinematográfica", icon: "🎞️" },
    { href: "/workspace", label: "Workspaces", icon: "🗂️" },
    { href: "/projects", label: "Projetos", icon: "🎬" },
    ...(user?.isPlatformAdmin
      ? [{ href: "/parameters", label: "Parâmetros", icon: "⚙️" }]
      : []),
    { href: "/pricing", label: "Planos", icon: "💳" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-outline-variant/30 bg-surface/85 backdrop-blur-xl">
      <div className="w-full flex items-center justify-between px-4 sm:px-6 lg:px-8 py-2.5">
        {/* Lado Esquerdo: Logo + Links Desktop */}
        <div className="flex items-center gap-6 lg:gap-8">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-base font-bold tracking-tight text-on-surface transition hover:opacity-90 flex-shrink-0"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary font-mono text-sm font-extrabold text-on-primary shadow-md shadow-primary/35">
              T
            </span>
            <span className="tracking-wider font-headline-sm text-headline-sm uppercase text-on-surface">
              <span className="text-primary font-black">TOMA</span>DIX
            </span>
          </Link>

          {/* Links Desktop */}
          <nav className="hidden md:flex items-center gap-1 p-1 bg-surface-container-lowest/60 rounded-xl border border-outline-variant/20">
            {navLinks.map((link) => {
              const isActive = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${isActive
                    ? "bg-surface-container-high text-primary font-semibold shadow-sm shadow-primary/20"
                    : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                    }`}
                >
                  <span className="mr-1.5">{link.icon}</span>
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Lado Direito Desktop */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <WorkspaceSelector />
              <CreditBadge />

              {/*<Link
                href="/workspace"
                className={`rounded-lg border border-outline-variant/30 px-3 py-1.5 text-xs font-medium text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface ${pathname === "/workspace"
                    ? "bg-surface-container-high text-primary border-primary/30"
                    : ""
                  }`}
              >
                Acervo
              </Link> */}

              <Link
                href="/workspace/members"
                className={`rounded-lg border border-outline-variant/30 px-3 py-1.5 text-xs font-medium text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface ${pathname === "/workspace/members"
                  ? "bg-surface-container-high text-primary border-primary/30"
                  : ""
                  }`}
              >
                Equipe
              </Link>

              <Link
                href="/workspace/billing"
                className={`rounded-lg border border-outline-variant/30 px-3 py-1.5 text-xs font-medium text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface ${pathname === "/workspace/billing"
                  ? "bg-surface-container-high text-primary border-primary/30"
                  : ""
                  }`}
              >
                Assinatura
              </Link>

              {user.isPlatformAdmin && (
                <Link
                  href="/admin"
                  className={`rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/20 flex items-center gap-1.5 ${pathname.startsWith("/admin") ? "ring-1 ring-amber-400 bg-amber-500/20" : ""
                    }`}
                  title="Painel Administrativo da Plataforma SaaS"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Console Admin
                </Link>
              )}

              <Link
                href="/profile"
                className={`rounded-lg border border-outline-variant/30 px-3 py-1.5 text-xs font-medium text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface ${pathname === "/profile" ? "bg-surface-container-high text-on-surface" : ""
                  }`}
              >
                Perfil
              </Link>

              <button
                onClick={handleLogout}
                className="rounded-lg border border-outline-variant/30 px-2.5 py-1.5 text-xs text-on-surface-variant transition hover:bg-surface-container hover:text-error"
                title="Encerrar sessão"
              >
                Sair
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-lg border border-outline-variant/40 px-3 py-1.5 text-xs font-medium text-on-surface transition hover:bg-surface-container"
              >
                Entrar
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-on-primary transition hover:bg-primary-fixed shadow-sm shadow-primary/20"
              >
                Criar Conta
              </Link>
            </div>
          )}
        </div>

        {/* Lado Direito Mobile (< md) */}
        <div className="flex md:hidden items-center gap-2">
          {user && (
            <>
              <div className="max-w-[110px] sm:max-w-[140px] truncate">
                <WorkspaceSelector />
              </div>
              <CreditBadge showAddButton={false} />
            </>
          )}

          {!user && (
            <Link
              href="/login"
              className="rounded-lg border border-white/15 px-2.5 py-1 text-xs font-medium text-white hover:bg-white/5"
            >
              Entrar
            </Link>
          )}

          {/* Botão Hamburger */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "Fechar menu" : "Abrir menu"}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] text-white hover:bg-white/10 active:scale-95 transition"
          >
            {isMobileMenuOpen ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Painel Mobile Dropdown Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#090c13]/98 px-4 py-4 space-y-4 backdrop-blur-2xl shadow-2xl animate-in slide-in-from-top-2 duration-200">
          {/* Navegação Geral */}
          <div className="space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 px-3 py-1">
              Navegação
            </div>
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${pathname === "/"
                ? "bg-white/10 text-white font-semibold"
                : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
            >
              <span>🏠</span> Início
            </Link>
            {navLinks.map((link) => {
              const isActive = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${isActive
                    ? "bg-lime-400/10 text-lime-400 font-semibold border border-lime-400/20"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                    }`}
                >
                  <span>{link.icon}</span>
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Área do Usuário Autenticado */}
          {user ? (
            <div className="space-y-1 border-t border-white/10 pt-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 px-3 py-1">
                Estúdio & Conta
              </div>
              <Link
                href="/workspace"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${pathname === "/workspace"
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-white/70 hover:bg-white/5"
                  }`}
              >
                <span>🗂️</span> Acervo & Produções (Workspace)
              </Link>
              <Link
                href="/workspace/members"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${pathname === "/workspace/members"
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-white/70 hover:bg-white/5"
                  }`}
              >
                <span>👥</span> Equipe do Estúdio
              </Link>
              <Link
                href="/workspace/billing"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${pathname === "/workspace/billing"
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-white/70 hover:bg-white/5"
                  }`}
              >
                <span>💳</span> Assinatura & Créditos
              </Link>
              {user.isPlatformAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition border border-amber-500/30 bg-amber-500/10 text-amber-300 ${pathname.startsWith("/admin") ? "ring-1 ring-amber-400" : ""
                    }`}
                >
                  <span>🛡️</span> Console Admin (SaaS)
                </Link>
              )}
              <Link
                href="/profile"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${pathname === "/profile" ? "bg-white/10 text-white font-semibold" : "text-white/70 hover:bg-white/5"
                  }`}
              >
                <span>👤</span> Perfil & Configurações
              </Link>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition text-left"
              >
                <span>🚪</span> Encerrar Sessão (Sair)
              </button>
            </div>
          ) : (
            <div className="border-t border-white/10 pt-3 flex flex-col gap-2">
              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full rounded-xl border border-white/15 px-3 py-2.5 text-center text-sm font-medium text-white hover:bg-white/5"
              >
                Entrar
              </Link>
              <Link
                href="/register"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full rounded-xl bg-primary px-3 py-2.5 text-center text-sm font-semibold text-on-primary hover:opacity-90 shadow-md shadow-primary/20"
              >
                Criar Conta Grátis
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
