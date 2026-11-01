import { db, withDbRetry } from "./db";
import { headers, cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "./session";
import { AuthService } from "@/modules/auth/auth.service";
import { hasPermission, Permission } from "./permissions";

export class AuthenticationError extends Error {
  statusCode = 401;
  constructor(message = "Autenticação necessária para acessar este recurso.") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends Error {
  statusCode = 403;
  constructor(message = "Acesso não autorizado ao recurso.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export class NotFoundError extends Error {
  statusCode = 404;
  constructor(message = "Recurso não encontrado.") {
    super(message);
    this.name = "NotFoundError";
  }
}

/**
 * Obtém o usuário atual a partir de sessão autenticada (cookie ou Bearer token),
 * ou header 'x-user-id' (para testes e ambientes de desenvolvimento integrados).
 */
export async function getCurrentUser() {
  const headersList = await headers();
  const cookieStore = await cookies();

  // 1. Verificar Cookie de Sessão
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (sessionToken) {
    const sessionData = await AuthService.validateSession(sessionToken);
    if (sessionData?.user) {
      return sessionData.user;
    }
  }

  // 2. Verificar Header Authorization (Bearer <token>)
  const authHeader = headersList.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    if (token) {
      const sessionData = await AuthService.validateSession(token);
      if (sessionData?.user) {
        return sessionData.user;
      }
    }
  }

  // 3. Suporte ao header 'x-user-id' para alternância multiusuário em testes automatizados
  const headerUserId = headersList.get("x-user-id");
  if (headerUserId) {
    const user = await withDbRetry(() =>
      db.user.findUnique({
        where: { id: headerUserId },
        include: {
          memberships: {
            include: {
              workspace: true,
            },
          },
        },
      })
    );
    if (user) return user;
  }

  return null;
}

/**
 * Exige que um usuário esteja devidamente autenticado, lançando AuthenticationError se anônimo
 * ou se estiver suspenso pela administração.
 */
export async function requireCurrentUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthenticationError("Sessão não encontrada ou expirada. Efetue login novamente.");
  }

  if (user.isSuspended) {
    throw new AuthenticationError(
      `Sua conta foi suspensa pela administração da plataforma. Motivo: ${
        user.suspensionReason || "Violação das políticas de uso."
      }`
    );
  }

  return user;
}

import { PlatformAdminPermission, hasPlatformPermission } from "./admin-permissions";
export * from "./admin-permissions";

/**
 * Exige autorização estrita de Administrador da Plataforma (ADMIN ou SUPER_ADMIN).
 * Suporta checagem de privilégio granular (ex: 'plans:manage', 'credentials:manage', 'webhooks:reprocess').
 * Totalmente desacoplado dos papéis do Workspace (OWNER, ADMIN, MEMBER, VIEWER).
 * Verifica credencial real no banco de dados e nunca em dados enviados pelo cliente.
 */
export async function requirePlatformAdmin(requiredPermission?: PlatformAdminPermission) {
  const user = await requireCurrentUser();

  const isRoleAdmin = user.platformRole === "ADMIN" || user.platformRole === "SUPER_ADMIN";

  const envAdminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const isEnvAdmin = user.email && envAdminEmails.includes(user.email.toLowerCase());

  if (!isRoleAdmin && !isEnvAdmin) {
    throw new AuthorizationError(
      "Acesso restrito. Este recurso requer privilégios de administrador da plataforma."
    );
  }

  if (requiredPermission) {
    const effectiveRole = isEnvAdmin ? "SUPER_ADMIN" : user.platformRole;
    const customPermissions = (user.preferences as any)?.adminPermissions;
    if (!hasPlatformPermission(effectiveRole, requiredPermission, customPermissions)) {
      throw new AuthorizationError(
        `Permissão insuficiente. Ação requer o privilégio administrativo: '${requiredPermission}'.`
      );
    }
  }

  return user;
}

export async function requirePlatformPermission(permission: PlatformAdminPermission) {
  return requirePlatformAdmin(permission);
}

/**
 * Exige autorização de administrador para parâmetros visuais.
 * Permite Administradores da Plataforma (ADMIN, SUPER_ADMIN) ou Administradores do Workspace (OWNER, ADMIN).
 */
export async function requireParameterAdmin() {
  const user = await requireCurrentUser();
  const isPlatformAdmin = user.platformRole === "ADMIN" || user.platformRole === "SUPER_ADMIN";
  const envAdminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const isEnvAdmin = Boolean(user.email && envAdminEmails.includes(user.email.toLowerCase()));
  const isWorkspaceAdmin = Boolean(
    user.memberships?.some((m) => m.role === "OWNER" || m.role === "ADMIN")
  );

  if (!isPlatformAdmin && !isEnvAdmin && !isWorkspaceAdmin) {
    throw new AuthorizationError(
      "Acesso restrito. Apenas administradores podem gerenciar imagens e referências visuais de parâmetros."
    );
  }

  return user;
}

export const ACTIVE_WORKSPACE_COOKIE = "cineprompt_active_workspace";

/**
 * Obtém o workspace ativo do usuário atual, validando associação obrigatória no banco
 * e verificando permissões RBAC quando uma permissão é requerida.
 */
export async function getCurrentWorkspace(
  requestedWorkspaceId?: string | null,
  requiredPermission?: Permission
) {
  const user = await requireCurrentUser();
  const headersList = await headers();
  const cookieStore = await cookies();

  const effectiveWorkspaceId =
    requestedWorkspaceId ||
    headersList.get("x-workspace-id") ||
    cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value ||
    null;

  let targetMembership = null;

  if (effectiveWorkspaceId) {
    targetMembership = user.memberships.find((m) => m.workspaceId === effectiveWorkspaceId);
    if (!targetMembership) {
      // Tenta buscar no banco para caso as memberships em cache não incluam
      const directMembership = await db.membership.findUnique({
        where: {
          userId_workspaceId: {
            userId: user.id,
            workspaceId: effectiveWorkspaceId,
          },
        },
        include: {
          workspace: true,
        },
      });

      if (directMembership) {
        targetMembership = directMembership;
      }
    }
  }

  // Fallback para o workspace do usuário: prioriza workspace com projetos ativos
  if (!targetMembership) {
    targetMembership =
      user.memberships.find((m) => (m.workspace as any)?._count?.projects > 0) ||
      user.memberships[0];
  }

  if (!targetMembership) {
    throw new AuthorizationError("Nenhum workspace associado ao usuário atual.");
  }

  // Verificação de permissões RBAC centralizada
  if (requiredPermission) {
    if (!hasPermission(targetMembership.role, requiredPermission)) {
      throw new AuthorizationError(
        `Seu papel (${targetMembership.role}) não possui permissão para executar esta ação (${requiredPermission}).`
      );
    }
  }

  return {
    workspace: targetMembership.workspace,
    role: targetMembership.role,
    user,
  };
}

/**
 * Valida se o projeto solicitado pertence ao workspace autorizado.
 */
export async function assertProjectAccess(projectId: string, workspaceId: string) {
  const project = await db.project.findFirst({
    where: {
      id: projectId,
      workspaceId,
    },
  });

  if (!project) {
    throw new NotFoundError("Projeto não encontrado ou acesso não permitido.");
  }

  return project;
}

/**
 * Valida se o usuário atual possui acesso (visualização ou edição) ao Space (Project),
 * considerando a visibilidade (PRIVATE, TEAM, SELECTED) e a lista de SpaceMembers.
 */
export async function assertSpaceAccess(
  projectId: string,
  workspaceId: string,
  userId?: string,
  workspaceRole?: string,
  mode: "view" | "edit" = "view"
) {
  const project = await db.project.findFirst({
    where: {
      id: projectId,
      workspaceId,
    },
    include: {
      spaceMembers: true,
    },
  });

  if (!project) {
    throw new NotFoundError("Space não encontrado ou acesso não permitido.");
  }

  if (!userId) {
    return project;
  }

  const isWorkspaceAdmin = workspaceRole === "OWNER" || workspaceRole === "ADMIN";
  const isOwner = project.ownerUserId === userId || (!project.ownerUserId && isWorkspaceAdmin);

  if (isWorkspaceAdmin || isOwner) {
    return project;
  }

  if (project.visibility === "PRIVATE") {
    if (!project.ownerUserId) {
      // Projetos legados sem owner definido permitem acesso da equipe
      if (mode === "edit" && workspaceRole === "VIEWER") {
        throw new AuthorizationError("Seu papel de visualizador não permite editar este Space.");
      }
      return project;
    }
    throw new AuthorizationError("Este Space é privado e visível apenas para o seu criador.");
  }

  if (project.visibility === "SELECTED") {
    const memberAccess = project.spaceMembers.find((m) => m.userId === userId);
    if (!memberAccess) {
      throw new AuthorizationError("Você não está na lista de membros autorizados a visualizar este Space.");
    }
    if (mode === "edit" && (!memberAccess.canEdit || workspaceRole === "VIEWER")) {
      throw new AuthorizationError("Você possui apenas permissão de leitura neste Space.");
    }
    return project;
  }

  // visibility === "TEAM"
  if (mode === "edit" && workspaceRole === "VIEWER") {
    throw new AuthorizationError("Seu papel de visualizador não permite editar este Space.");
  }

  return project;
}

/**
 * Extrai o contexto do cliente (IP e User-Agent) a partir dos headers da requisição.
 */
export async function getClientContext() {
  const headersList = await headers();
  const forwarded = headersList.get("x-forwarded-for");
  const ipAddress = forwarded ? forwarded.split(",")[0].trim() : headersList.get("x-real-ip") || "127.0.0.1";
  const userAgent = headersList.get("user-agent") || undefined;

  return {
    ipAddress,
    userAgent,
  };
}
