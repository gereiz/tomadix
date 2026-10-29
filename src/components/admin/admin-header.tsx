"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_NAV_GROUPS } from "./admin-sidebar";

interface AdminHeaderProps {
  admin: {
    id: string;
    email: string;
    displayName: string;
    platformRole: string;
  };
  onOpenMobileSidebar: () => void;
}

export function AdminHeader({ admin, onOpenMobileSidebar }: AdminHeaderProps) {
  const pathname = usePathname();

  // Encontrar o título da tela atual e o grupo correspondente
  let currentGroup = "Console";
  let currentTitle = "Visão Geral";

  for (const group of ADMIN_NAV_GROUPS) {
    for (const item of group.items) {
      if (item.href === "/admin" && pathname === "/admin") {
        currentGroup = group.groupName;
        currentTitle = item.label;
      } else if (item.href !== "/admin" && pathname.startsWith(item.href)) {
        currentGroup = group.groupName;
        currentTitle = item.label;
      }
    }
  }

  return (
    <header className="sticky top-[57px] z-20 border-b border-white/10 bg-[#090c14]/90 backdrop-blur-md">
      <div className="flex h-14 w-full items-center justify-between px-4 sm:px-6">
        {/* Left: Mobile Toggle & Breadcrumbs */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Abrir menu lateral"
          >
            ☰
          </button>

          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs">
            <Link
              href="/admin"
              className="text-white/40 hover:text-white transition font-mono"
            >
              Admin
            </Link>
            <span className="text-white/20">/</span>
            <span className="text-white/50 hidden sm:inline">{currentGroup}</span>
            <span className="text-white/20 hidden sm:inline">/</span>
            <span className="font-semibold text-amber-300">{currentTitle}</span>
          </nav>
        </div>

        {/* Right: SaaS Status & Admin Profile */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>SaaS Online</span>
          </div>

          <div className="h-4 w-[1px] bg-white/10 hidden sm:inline" />

          {/* Admin User Info */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-bold font-mono">
              {(admin.displayName || admin.email || "A").substring(0, 1).toUpperCase()}
            </div>
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-semibold text-white truncate max-w-[140px]">
                {admin.displayName || admin.email}
              </span>
              <span className="text-[9px] font-mono font-bold text-amber-400 uppercase tracking-wider">
                {admin.platformRole}
              </span>
            </div>
          </div>

          <Link
            href="/dashboard"
            className="rounded-lg border border-white/15 bg-white/5 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/10 hover:text-white flex items-center gap-1.5"
          >
            <span className="hidden sm:inline">Ir para o Estúdio</span>
            <span>➔</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

