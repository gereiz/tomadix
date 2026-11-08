"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface DrawerProps {
  children: ReactNode;
  onClose: () => void;
  /** Lado de onde o painel abre. */
  side?: "left" | "right";
  /** Título lido por leitores de tela. */
  label: string;
  /** Classes extras do painel (cores, largura). */
  className?: string;
  zIndex?: string;
}

/** Painel lateral para menus e filtros em telas pequenas: ocupa no máximo 85% da largura e toda a altura visível. */
export function Drawer({ children, onClose, side = "left", label, className = "", zIndex = "z-50" }: DrawerProps) {
  const panelRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <div className={`fixed inset-0 ${zIndex} flex ${side === "right" ? "justify-end" : "justify-start"}`}>
      <div className="absolute inset-0 bg-black/70 animate-fade-in" onClick={onClose} aria-hidden="true" />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={`safe-bottom relative flex h-dvh w-72 max-w-[85vw] flex-col overflow-y-auto outline-none ${
          side === "right" ? "" : "animate-slide-right"
        } ${className}`}
      >
        {children}
      </aside>
    </div>
  );
}
