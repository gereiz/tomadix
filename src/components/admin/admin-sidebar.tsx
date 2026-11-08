"use client";

import Link from "next/link";
import { Drawer } from "@/components/ui/drawer";
import { TouchIconButton } from "@/components/ui/touch-icon-button";
import { usePathname } from "next/navigation";
import {
  ADMIN_NAV_GROUPS,
  NavItem,
  NavGroup,
  isItemActive,
} from "./admin-nav.config";

export type { NavItem, NavGroup };
export { ADMIN_NAV_GROUPS };

interface AdminSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function AdminSidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}: AdminSidebarProps) {
  const pathname = usePathname();

  const navContent = (
    <div className="flex h-full flex-col justify-between overflow-y-auto no-scrollbar py-4 px-3">
      {/* Brand & Toggle header */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <Link
            href="/admin"
            className="flex items-center gap-2.5 transition hover:opacity-90"
            onClick={onCloseMobile}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-400 font-mono text-xs font-black text-black shadow-md shadow-amber-500/10">
              TM
            </span>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                  Tomadix
                  <span className="rounded bg-amber-500/20 border border-amber-500/40 px-1 py-0.2 font-mono text-[9px] font-bold text-amber-300">
                    ADMIN
                  </span>
                </span>
                <span className="text-[10px] text-white/40">Console Operacional</span>
              </div>
            )}
          </Link>

          {/* Desktop collapse button */}
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expandir barra lateral" : "Recolher barra lateral"}
            className="hidden lg:flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-xs text-white/50 hover:bg-white/10 hover:text-white transition"
          >
            {collapsed ? "»" : "«"}
          </button>
        </div>

        {/* Navigation Groups */}
        <nav className="space-y-5">
          {ADMIN_NAV_GROUPS.map((group) => (
            <div key={group.groupName} className="space-y-1">
              {!collapsed && (
                <span className="px-2 text-[10px] font-mono font-semibold uppercase tracking-wider text-white/40">
                  {group.groupName}
                </span>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isItemActive(item.href, pathname);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onCloseMobile}
                      title={collapsed ? item.label : undefined}
                      className={`group flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium transition-all ${
                        active
                          ? "bg-amber-400/15 text-amber-300 border border-amber-400/30 font-semibold shadow-sm shadow-amber-500/5"
                          : "text-white/70 hover:bg-white/5 hover:text-white"
                      } ${collapsed ? "justify-center px-0" : ""}`}
                    >
                      <span className="text-sm shrink-0 transition-transform group-hover:scale-110">
                        {item.icon}
                      </span>
                      {!collapsed && (
                        <span className="truncate flex-1">{item.label}</span>
                      )}
                      {!collapsed && item.badge && (
                        <span className="rounded bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-mono text-amber-300">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Footer Info / Shortcut */}
      <div className="border-t border-white/10 pt-3 mt-4 space-y-2 px-1">
        <Link
          href="/dashboard"
          className={`flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2 text-xs font-medium text-white/80 transition hover:bg-white/10 hover:text-white ${
            collapsed ? "justify-center px-0" : "px-3"
          }`}
          onClick={onCloseMobile}
        >
          <span className="text-sm">🎬</span>
          {!collapsed && <span>Ir ao Estúdio</span>}
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 border-r border-white/10 bg-[#090c14] transition-all duration-300 z-30 sticky top-[var(--navbar-h)] h-[calc(100dvh-var(--navbar-h))] ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        {navContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="lg:hidden">
          <Drawer
            onClose={onCloseMobile}
            label="Menu do console administrativo"
            className="border-r border-white/10 bg-[#090c14] p-2 shadow-2xl"
          >
            <div className="flex justify-end p-2">
              <TouchIconButton
                label="Fechar menu"
                onClick={onCloseMobile}
                className="border border-white/10 bg-white/5 text-sm text-white/60 hover:text-white"
              >
                ✕
              </TouchIconButton>
            </div>
            {navContent}
          </Drawer>
        </div>
      )}
    </>
  );
}

