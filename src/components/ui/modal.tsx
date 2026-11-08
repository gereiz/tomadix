"use client";

import { useEffect, useRef, type ReactNode } from "react";

type ModalSize = "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl";

const SIZES: Record<ModalSize, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-xl",
  "2xl": "sm:max-w-2xl",
  "3xl": "sm:max-w-3xl",
  "4xl": "sm:max-w-4xl",
};

const DEFAULT_PANEL = "border border-white/10 bg-[#0f1218] text-white shadow-2xl";

interface ModalProps {
  children: ReactNode;
  onClose: () => void;
  /** Largura máxima a partir de `sm`; no celular o painel ocupa a largura toda. */
  size?: ModalSize;
  /** Fecha ao clicar no fundo. Desative em formulários com dados não salvos. */
  closeOnOverlay?: boolean;
  /** `id` do título, para `aria-labelledby`. */
  labelledBy?: string;
  /** Use "alertdialog" em confirmações destrutivas. */
  role?: "dialog" | "alertdialog";
  /** Substitui as cores/bordas padrão do painel (o layout responsivo é mantido). */
  panelClassName?: string;
  /** Classe de z-index do overlay. */
  zIndex?: string;
}

/**
 * Modal responsivo: bottom sheet no celular e janela centralizada a partir de `sm`.
 * O painel nunca passa da altura visível (`dvh`) e rola por dentro; ESC fecha e o
 * fundo da página não rola enquanto o modal está aberto.
 */
export function Modal({
  children,
  onClose,
  size = "lg",
  closeOnOverlay = true,
  labelledBy,
  role = "dialog",
  panelClassName = DEFAULT_PANEL,
  zIndex = "z-50",
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
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
    <div
      className={`fixed inset-0 ${zIndex} flex items-end justify-center overflow-y-auto bg-black/80 sm:items-center-safe sm:p-4 animate-in`}
      onMouseDown={(e) => {
        if (closeOnOverlay && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={`safe-bottom relative max-h-[calc(100dvh-0.5rem)] w-full overflow-y-auto rounded-t-3xl outline-none animate-sheet-up sm:max-h-[calc(100dvh-2rem)] sm:rounded-2xl sm:animate-none ${SIZES[size]} ${panelClassName}`}
      >
        {children}
      </div>
    </div>
  );
}
