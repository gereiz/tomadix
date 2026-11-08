"use client";

import { cachedFetch, invalidateClientCache } from "@/lib/client-fetch-cache";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { WorkspaceSelector } from "./workspace-selector";
import { CreditBadge } from "./credit-badge";
import { UserMenu } from "./user-menu";
import { ThemeToggle } from "@/components/theme/theme-toggle";

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

/**
 * A barra completa (links + conta) só cabe a partir de 1280px. Abaixo disso, inclusive em tablets,
 * o menu vira um painel com rolagem aberto pelo botão hambúrguer.
 */
const DESKTOP_QUERY = "(min-width: 1280px)";

const MOBILE_ITEM = "flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // Monta apenas uma instância de WorkspaceSelector/CreditBadge (desktop OU mobile),
  // evitando requisições duplicadas a /api/workspaces e /api/billing/subscription.
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);

  useEffect(() => {
    const mql = window.matchMedia(DESKTOP_QUERY);
    const update = () => setIsDesktop(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    cachedFetch("/api/auth/me", 10_000)
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

  // Fecha com ESC e impede o fundo de rolar enquanto o painel está aberto
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMobileMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isMobileMenuOpen]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    invalidateClientCache();
    setUser(null);
    router.push("/login");
    router.refresh();
  };

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: "📊" },
    { href: "/projects", label: "Spaces", icon: "✨" },
    { href: "/studio", label: "Análise Cinematográfica", icon: "🎞️" },
    { href: "/workspace", label: "Workspaces", icon: "🗂️" },
    ...(user?.isPlatformAdmin
      ? [{ href: "/parameters", label: "Parâmetros", icon: "⚙️" }]
      : []),
    { href: "/pricing", label: "Planos", icon: "💳" },
  ];

  const accountLinks = [
    { href: "/workspace/members", label: "Equipe do Estúdio", icon: "👥" },
    { href: "/workspace/billing", label: "Assinatura & Créditos", icon: "💳" },
    { href: "/profile", label: "Perfil & Configurações", icon: "👤" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-outline-variant/30 bg-surface/95">
      <div className="flex w-full items-center justify-between gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
        {/* Lado Esquerdo: Logo + Links Desktop */}
        <div className="flex min-w-0 items-center gap-6 xl:gap-8">
          <Link
            href="/"
            className="flex flex-shrink-0 items-center gap-2.5 text-base font-bold tracking-tight text-on-surface transition hover:opacity-90"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary font-mono text-sm font-extrabold text-on-primary shadow-md shadow-primary/35">
              T
            </span>
            <span className="font-headline-sm text-headline-sm uppercase tracking-wider text-on-surface">
              <span className="font-black text-primary">TOMA</span>DIX
            </span>
          </Link>

          {/* Links Desktop */}
          <nav className="hidden items-center gap-1 rounded-xl border border-outline-variant/20 bg-surface-container-lowest/60 p-1 xl:flex">
            {navLinks.map((link) => {
              const isActive = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${isActive
                    ? "bg-surface-container-high font-semibold text-primary shadow-sm shadow-primary/20"
                    : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                    }`}
                >
                  <span className="mr-1.5" aria-hidden="true">{link.icon}</span>
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Lado Direito Desktop (>= xl) */}
        <div className="hidden items-center gap-3 xl:flex">
          <ThemeToggle />
          {user ? (
            <>
              {isDesktop === true && (
                <>
                  <WorkspaceSelector />
                  <CreditBadge />
                </>
              )}
              <UserMenu
                displayName={user.displayName}
                isPlatformAdmin={user.isPlatformAdmin}
                onLogout={handleLogout}
              />
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
                className="rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-on-primary shadow-sm shadow-primary/20 transition hover:bg-primary-fixed"
              >
                Criar Conta
              </Link>
            </div>
          )}
        </div>

        {/* Lado Direito Mobile/Tablet (< xl) */}
        <div className="flex items-center gap-2 xl:hidden">
          <ThemeToggle compact />
          {user && isDesktop === false && (
            <div className="hidden sm:block">
              <CreditBadge showAddButton={false} />
            </div>
          )}

          {!user && (
            <Link
              href="/login"
              className="flex min-h-10 items-center rounded-lg border border-outline-variant/40 px-3 text-xs font-medium text-on-surface hover:bg-surface-container"
            >
              Entrar
            </Link>
          )}

          {/* Botão Hamburger */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={isMobileMenuOpen}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-outline-variant/40 bg-surface-container text-on-surface transition hover:bg-surface-container-high active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {isMobileMenuOpen ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Painel Mobile/Tablet: rola por dentro quando a lista passa da altura da tela */}
      {isMobileMenuOpen && (
        <div className="safe-bottom max-h-[calc(100dvh-var(--navbar-h))] space-y-4 overflow-y-auto border-t border-outline-variant/30 bg-surface-container-lowest px-4 py-4 shadow-2xl animate-in xl:hidden">
          {user && isDesktop === false && (
            <div className="flex items-center justify-between gap-3 sm:hidden">
              <WorkspaceSelector />
              <CreditBadge showAddButton={false} />
            </div>
          )}
          {user && isDesktop === false && (
            <div className="hidden sm:block">
              <WorkspaceSelector />
            </div>
          )}

          <div className="space-y-1">
            <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
              Navegação
            </div>
            <Link
              href="/"
              className={`${MOBILE_ITEM} ${pathname === "/"
                ? "bg-surface-container-high font-semibold text-on-surface"
                : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                }`}
            >
              <span aria-hidden="true">🏠</span> Início
            </Link>
            {navLinks.map((link) => {
              const isActive = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`${MOBILE_ITEM} ${isActive
                    ? "border border-primary/20 bg-primary/10 font-semibold text-primary"
                    : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                    }`}
                >
                  <span aria-hidden="true">{link.icon}</span>
                  {link.label}
                </Link>
              );
            })}
          </div>

          {user ? (
            <div className="space-y-1 border-t border-outline-variant/30 pt-3">
              <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                Estúdio & Conta
              </div>
              {accountLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`${MOBILE_ITEM} ${pathname === link.href
                    ? "bg-primary/10 font-semibold text-primary"
                    : "text-on-surface-variant hover:bg-surface-container"
                    }`}
                >
                  <span aria-hidden="true">{link.icon}</span> {link.label}
                </Link>
              ))}
              {user.isPlatformAdmin && (
                <Link
                  href="/admin"
                  className={`${MOBILE_ITEM} border border-amber-500/30 bg-amber-500/10 font-semibold text-amber-300 ${pathname.startsWith("/admin") ? "ring-1 ring-amber-400" : ""
                    }`}
                >
                  <span aria-hidden="true">🛡️</span> Console Admin (SaaS)
                </Link>
              )}
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleLogout();
                }}
                className={`${MOBILE_ITEM} w-full text-left text-rose-400 hover:bg-rose-500/10`}
              >
                <span aria-hidden="true">🚪</span> Encerrar Sessão (Sair)
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 border-t border-outline-variant/30 pt-3">
              <Link
                href="/login"
                className="flex min-h-11 w-full items-center justify-center rounded-xl border border-outline-variant/40 px-3 text-sm font-medium text-on-surface hover:bg-surface-container"
              >
                Entrar
              </Link>
              <Link
                href="/register"
                className="flex min-h-11 w-full items-center justify-center rounded-xl bg-primary px-3 text-sm font-semibold text-on-primary shadow-md shadow-primary/20 hover:opacity-90"
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
