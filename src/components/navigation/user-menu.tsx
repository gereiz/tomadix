"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface UserMenuProps {
  displayName: string;
  isPlatformAdmin?: boolean;
  onLogout: () => void;
}

const ITEM =
  "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface";

/** Menu da conta no desktop: reúne Equipe, Assinatura, Console Admin, Perfil e Sair em um único botão. */
export function UserMenu({ displayName, isPlatformAdmin, onLogout }: UserMenuProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const initial = displayName.trim().charAt(0).toUpperCase() || "?";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-9 items-center gap-2 rounded-lg border border-outline-variant/30 pl-1.5 pr-2.5 text-xs font-medium text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">
          {initial}
        </span>
        <span className="max-w-[96px] truncate">{displayName}</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-outline-variant/40 bg-surface-container p-1.5 shadow-xl"
        >
          <Link role="menuitem" href="/workspace/members" className={ITEM}>
            <span aria-hidden="true">👥</span> Equipe
          </Link>
          <Link role="menuitem" href="/workspace/billing" className={ITEM}>
            <span aria-hidden="true">💳</span> Assinatura
          </Link>
          {isPlatformAdmin && (
            <Link
              role="menuitem"
              href="/admin"
              className={`${ITEM} border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:text-amber-200`}
              title="Painel Administrativo da Plataforma SaaS"
            >
              <span aria-hidden="true">🛡️</span> Console Admin
            </Link>
          )}
          <Link role="menuitem" href="/profile" className={ITEM}>
            <span aria-hidden="true">👤</span> Perfil
          </Link>
          <button
            role="menuitem"
            type="button"
            onClick={onLogout}
            className={`${ITEM} w-full text-left hover:text-error`}
          >
            <span aria-hidden="true">🚪</span> Sair
          </button>
        </div>
      )}
    </div>
  );
}
