import { PlatformRole } from "@prisma/client";

export type PlatformAdminPermission =
  | "users:manage"
  | "projects:manage"
  | "plans:manage"
  | "prices:manage"
  | "policies:manage"
  | "credits:manage"
  | "gateways:manage"
  | "credentials:manage"
  | "webhooks:reprocess"
  | "audit:read";

export interface PermissionDefinition {
  id: PlatformAdminPermission;
  label: string;
  category: "Operações" | "Comercial" | "Técnico" | "Governança";
  description: string;
}

export const PLATFORM_PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  {
    id: "users:manage",
    label: "Gestão de Usuários",
    category: "Operações",
    description: "Suspender, reativar, editar perfil, revogar sessões e gerenciar privilégios.",
  },
  {
    id: "projects:manage",
    label: "Gestão de Projetos",
    category: "Operações",
    description: "Visualizar projetos globais, arquivar, transferir entre workspaces e exclusão.",
  },
  {
    id: "plans:manage",
    label: "Planos e Assinaturas",
    category: "Comercial",
    description: "Gerenciar planos SaaS, recursos e alterar ou estender assinaturas.",
  },
  {
    id: "prices:manage",
    label: "Preços & Moedas",
    category: "Comercial",
    description: "Alterar precificação periódica e planos por intervalo.",
  },
  {
    id: "policies:manage",
    label: "Políticas Comerciais",
    category: "Comercial",
    description: "Configurar limites globais, custos de IA e políticas de retenção.",
  },
  {
    id: "credits:manage",
    label: "Gestão de Créditos",
    category: "Comercial",
    description: "Conceder bônus, ajustar saldos e realizar estornos no livro-razão.",
  },
  {
    id: "gateways:manage",
    label: "Gateways de Pagamento",
    category: "Técnico",
    description: "Configurar Stripe, Asaas ou outros provedores de pagamento.",
  },
  {
    id: "credentials:manage",
    label: "Credenciais de API",
    category: "Técnico",
    description: "Gerenciar chaves secretas de provedores e integração.",
  },
  {
    id: "webhooks:reprocess",
    label: "Reprocessar Webhooks",
    category: "Técnico",
    description: "Reexecutar eventos e disparos de webhook com falha.",
  },
  {
    id: "audit:read",
    label: "Visualização de Auditoria",
    category: "Governança",
    description: "Acessar o log imutável de todas as ações administrativas realizadas.",
  },
];

export const ALL_PLATFORM_PERMISSIONS: PlatformAdminPermission[] =
  PLATFORM_PERMISSION_DEFINITIONS.map((p) => p.id);

export const PLATFORM_ROLE_PERMISSIONS: Record<PlatformRole, PlatformAdminPermission[]> = {
  SUPER_ADMIN: ALL_PLATFORM_PERMISSIONS,
  ADMIN: ALL_PLATFORM_PERMISSIONS,
  USER: [],
};

/**
 * Valida se um papel da plataforma (ou permissões customizadas) possui o privilégio solicitado.
 */
export function hasPlatformPermission(
  role: PlatformRole,
  permission: PlatformAdminPermission,
  customPermissions?: PlatformAdminPermission[]
): boolean {
  if (role === "SUPER_ADMIN") return true;
  if (role === "USER") return false;

  if (customPermissions && Array.isArray(customPermissions)) {
    return customPermissions.includes(permission);
  }

  const rolePerms = PLATFORM_ROLE_PERMISSIONS[role] || [];
  return rolePerms.includes(permission);
}
