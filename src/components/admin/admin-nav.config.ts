export interface NavItem {
  href: string;
  label: string;
  icon: string;
  badge?: string;
}

export interface NavGroup {
  groupName: string;
  items: NavItem[];
}

export const ADMIN_NAV_GROUPS: NavGroup[] = [
  {
    groupName: "Visão Geral",
    items: [
      { href: "/admin", label: "Dashboard", icon: "📊" },
    ],
  },
  {
    groupName: "Gestão",
    items: [
      { href: "/admin/users", label: "Usuários", icon: "👥" },
      { href: "/admin/projects", label: "Projetos", icon: "🎬" },
      { href: "/admin/billing", label: "Planos & Assinaturas", icon: "💳" },
      { href: "/admin/credits", label: "Tabela de Créditos", icon: "🪙" },
      { href: "/admin/usage", label: "Consumo & Custos IA", icon: "⚡" },
      { href: "/admin/parameters", label: "Parâmetros Dinâmicos", icon: "⚙️" },
    ],
  },
  {
    groupName: "Plataforma",
    items: [
      { href: "/admin/customization", label: "Personalização", icon: "🎨" },
      { href: "/admin/settings", label: "Configurações Gerais", icon: "🛠️" },
      { href: "/admin/settings/email", label: "Servidor de E-mail", icon: "✉️" },
      { href: "/admin/settings/pollinations", label: "Central Pollinations", icon: "🐝" },
      { href: "/admin/settings/database", label: "Banco de Dados", icon: "🗄️" },
      { href: "/admin/settings/gemini", label: "APIs Gemini (Multi-Key)", icon: "✨" },
      { href: "/admin/settings/image-providers", label: "APIs de Imagem (IA)", icon: "🎨" },
      { href: "/admin/settings/video-providers", label: "APIs de Vídeo (IA)", icon: "🎥" },
    ],
  },
  {
    groupName: "Sistema",
    items: [
      { href: "/admin/visual-library", label: "Biblioteca Visual", icon: "🖼️" },
      { href: "/admin/audit", label: "Auditoria & Logs", icon: "🛡️" },
    ],
  },
];

export const ALL_ADMIN_HREFS = ADMIN_NAV_GROUPS.flatMap((g) => g.items.map((i) => i.href));

/**
 * Determina se um item do menu administrativo está ativo para a rota atual,
 * prevenindo seleção dupla quando existem rotas aninhadas como /admin/settings e /admin/settings/gemini.
 */
export function isItemActive(href: string, pathname: string): boolean {
  // Suporte à rota alternativa /admin/gemini-keys
  if (href === "/admin/settings/gemini" && pathname.startsWith("/admin/gemini-keys")) {
    return true;
  }

  if (pathname === href) {
    return true;
  }

  if (href === "/admin") {
    return false;
  }

  if (pathname.startsWith(href)) {
    // Se houver um item mais específico no menu que também corresponda ao pathname,
    // o item pai mais genérico não deve ser marcado como ativo
    const hasMoreSpecificMatch = ALL_ADMIN_HREFS.some(
      (otherHref) =>
        otherHref !== href &&
        otherHref.startsWith(href) &&
        (pathname === otherHref || pathname.startsWith(otherHref + "/"))
    );
    return !hasMoreSpecificMatch;
  }

  return false;
}

