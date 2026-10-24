import { PlatformRole } from "@prisma/client";

export type PlatformAdminPermission =
  | "plans:manage"
  | "prices:manage"
  | "policies:manage"
  | "credits:manage"
  | "gateways:manage"
  | "credentials:manage"
  | "webhooks:reprocess"
  | "audit:read";

export const ALL_PLATFORM_PERMISSIONS: PlatformAdminPermission[] = [
  "plans:manage",
  "prices:manage",
  "policies:manage",
  "credits:manage",
  "gateways:manage",
  "credentials:manage",
  "webhooks:reprocess",
  "audit:read",
];

export const PLATFORM_ROLE_PERMISSIONS: Record<PlatformRole, PlatformAdminPermission[]> = {
  SUPER_ADMIN: ALL_PLATFORM_PERMISSIONS,
  ADMIN: [
    "plans:manage",
    "prices:manage",
    "policies:manage",
    "credits:manage",
    "gateways:manage",
    "credentials:manage",
    "webhooks:reprocess",
    "audit:read",
  ],
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
