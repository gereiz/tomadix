import type { ReactNode } from "react";

/**
 * Ícones SVG inline (24x24, traço). Substituem a fonte Material Symbols,
 * que pesava em todas as páginas. Para adicionar um ícone, inclua-o aqui.
 */
const ICONS = {
  add: <path d="M12 5v14M5 12h14" />,
  archive: (
    <>
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <path d="M5 8v12h14V8M10 12h4" />
    </>
  ),
  arrow_forward: <path d="M5 12h14M13 6l6 6-6 6" />,
  auto_awesome: (
    <>
      <path d="M10 4l1.8 4.7 4.7 1.8-4.7 1.8L10 17l-1.8-4.7-4.7-1.8 4.7-1.8z" />
      <path d="M18 3v4M16 5h4M18 15v4M16 17h4" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  check: <path d="M5 13l4 4L19 7" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  content_copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h8" />
    </>
  ),
  delete: <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" />,
  edit: <path d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4" />,
  error: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6M12 16h.01" />
    </>
  ),
  grid_view: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1" />
      <rect x="13" y="4" width="7" height="7" rx="1" />
      <rect x="4" y="13" width="7" height="7" rx="1" />
      <rect x="13" y="13" width="7" height="7" rx="1" />
    </>
  ),
  groups: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M17 14c2.5 0 4 2 4 5" />
    </>
  ),
  movie: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" />
    </>
  ),
  movie_creation: (
    <>
      <path d="M3 10h18v10H3z" />
      <path d="M3 10l2-5 4 1-2 4M9 6l4 1-2 3M13 7l4 1-2 2" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="M20 20l-4-4" />
    </>
  ),
  swap_horiz: <path d="M4 8h14M14 4l4 4-4 4M20 16H6M10 12l-4 4 4 4" />,
  tune: (
    <>
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="8" cy="17" r="2" />
    </>
  ),
  unarchive: (
    <>
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <path d="M5 8v12h14V8M12 17v-5M9.5 14.5 12 12l2.5 2.5" />
    </>
  ),
  view_agenda: (
    <>
      <rect x="4" y="4" width="16" height="7" rx="1" />
      <rect x="4" y="13" width="16" height="7" rx="1" />
    </>
  ),
  warning: (
    <>
      <path d="M12 3l10 18H2z" />
      <path d="M12 10v5M12 18h.01" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof ICONS;

interface IconProps {
  name: IconName;
  /** Tamanho em px. Se omitido, herda o `font-size` do contexto (ex.: `text-[18px]`). */
  size?: number;
  className?: string;
}

/** Ícone decorativo (oculto para leitores de tela). */
export function Icon({ name, size, className = "" }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={size ?? "1em"}
      height={size ?? "1em"}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`inline-block shrink-0 ${className}`}
    >
      {ICONS[name]}
    </svg>
  );
}
