"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  platformRole: string;
  isPlatformAdmin: boolean;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.authenticated && data?.user?.isPlatformAdmin) {
          setAdmin(data.user);
        } else {
          setAccessDenied(true);
        }
      })
      .catch(() => setAccessDenied(true))
      .finally(() => setLoading(false));
  }, []);

  const navTabs = [
    { href: "/admin", label: "Visão Geral", icon: "📊" },
    { href: "/admin/parameters", label: "Parâmetros Cinematográficos", icon: "⚙️" },
    { href: "/admin/users", label: "Usuários", icon: "👥" },
    { href: "/admin/projects", label: "Projetos", icon: "🎬" },
    { href: "/admin/billing", label: "Comercial & Planos", icon: "💳" },
    { href: "/admin/usage", label: "Consumo & Custos IA", icon: "⚡" },
    { href: "/admin/visual-library", label: "Biblioteca Visual", icon: "🎨" },
    { href: "/admin/audit", label: "Auditoria", icon: "🛡️" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07090e] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          <p className="text-xs text-white/50 tracking-wider uppercase font-mono">
            Verificando credenciais administrativas...
          </p>
        </div>
      </div>
    );
  }

  if (accessDenied || !admin) {
    return (
      <div className="min-h-screen bg-[#07090e] text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl border border-rose-500/30 bg-rose-950/20 p-8 text-center backdrop-blur-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/10 text-2xl text-rose-400 mb-4">
            ⛔
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Acesso Restrito</h1>
          <p className="text-sm text-white/70 mb-6 leading-relaxed">
            Esta área é exclusiva para operadores autorizados e administradores da plataforma Tomadix. Seu usuário não possui os privilégios necessários.
          </p>
          <div className="flex flex-col gap-2">
            <Link
              href="/dashboard"
              className="w-full rounded-xl bg-white/10 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-white/20"
            >
              Retornar ao Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07090e] text-white flex flex-col">
      {/* Top Admin Header */}
      <header className="border-b border-amber-500/20 bg-[#0b0e17]/90 backdrop-blur-md sticky top-[57px] z-30">
        <div className="w-full flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3.5">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400 font-mono text-xs font-black text-black">
                TM
              </span>
              <div>
                <span className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                  <span>Tomadix</span>
                  <span className="rounded bg-amber-500/20 border border-amber-500/40 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-300">
                    CONSOLE ADMIN
                  </span>
                </span>
              </div>
            </Link>

            <span className="h-4 w-[1px] bg-white/10 hidden sm:inline" />

            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              SaaS Online
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-semibold text-white">{admin.displayName || admin.email}</span>
              <span className="text-[10px] font-mono text-amber-400/80 uppercase">
                {admin.platformRole}
              </span>
            </div>

            <Link
              href="/dashboard"
              className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              Ir para o Estúdio ➔
            </Link>
          </div>
        </div>

        {/* Sub Navigation Bar */}
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-1 overflow-x-auto py-2 no-scrollbar">
            {navTabs.map((tab) => {
              const isActive =
                tab.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(tab.href);

              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium transition whitespace-nowrap ${
                    isActive
                      ? "bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold"
                      : "text-white/60 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Admin Content */}
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-6">{children}</main>
    </div>
  );
}
