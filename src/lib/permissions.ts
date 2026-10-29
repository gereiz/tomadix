import { WorkspaceRole } from "@prisma/client";

export type Permission =
  | "workspace:read"
  | "workspace:update"
  | "workspace:delete"
  | "members:read"
  | "members:manage"
  | "projects:read"
  | "projects:create"
  | "projects:update"
  | "projects:delete"
  | "parameters:read"
  | "parameters:manage"
  | "characters:read"
  | "characters:manage"
  | "environments:read"
  | "environments:manage"
  | "scenes:read"
  | "scenes:manage"
  | "prompts:read"
  | "prompts:generate"
  | "audit:read"
  | "billing:read"
  | "billing:manage";

export const ROLE_PERMISSIONS: Record<WorkspaceRole, Permission[]> = {
  OWNER: [
    "workspace:read",
    "workspace:update",
    "workspace:delete",
    "members:read",
    "members:manage",
    "projects:read",
    "projects:create",
    "projects:update",
    "projects:delete",
    "parameters:read",
    "characters:read",
    "characters:manage",
    "environments:read",
    "environments:manage",
    "scenes:read",
    "scenes:manage",
    "prompts:read",
    "prompts:generate",
    "audit:read",
    "billing:read",
    "billing:manage",
  ],
  ADMIN: [
    "workspace:read",
    "workspace:update",
    "members:read",
    "members:manage",
    "projects:read",
    "projects:create",
    "projects:update",
    "projects:delete",
    "parameters:read",
    "characters:read",
    "characters:manage",
    "environments:read",
    "environments:manage",
    "scenes:read",
    "scenes:manage",
    "prompts:read",
    "prompts:generate",
    "audit:read",
    "billing:read",
    "billing:manage",
  ],
  MEMBER: [
    "workspace:read",
    "members:read",
    "projects:read",
    "projects:create",
    "projects:update",
    "parameters:read",
    "characters:read",
    "characters:manage",
    "environments:read",
    "environments:manage",
    "scenes:read",
    "scenes:manage",
    "prompts:read",
    "prompts:generate",
    "billing:read",
  ],
  VIEWER: [
    "workspace:read",
    "members:read",
    "projects:read",
    "parameters:read",
    "characters:read",
    "environments:read",
    "scenes:read",
    "prompts:read",
    "billing:read",
  ],
};

export function hasPermission(role: WorkspaceRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;
  return permissions.includes(permission);
}
