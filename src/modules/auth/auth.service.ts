import { db, withDbRetry } from "@/lib/db";
import { TransactionalEmailService } from "@/modules/email/transactional-email.service";
import {
  hashPassword,
  verifyPassword,
  generateSecureToken,
  hashToken,
} from "@/lib/security";
import { Prisma, WorkspaceRole, Session } from "@prisma/client";
import { RegisterInput, LoginInput } from "./auth.schema";

export class AuthenticationError extends Error {
  constructor(message = "Não autenticado.") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export interface ClientContext {
  ipAddress?: string | null;
  userAgent?: string | null;
}

export type ValidatedSessionUser = Prisma.UserGetPayload<{
  include: {
    memberships: {
      include: {
        workspace: true;
      };
    };
  };
}>;

interface SessionCacheEntry {
  data: {
    session: Session;
    user: ValidatedSessionUser;
  };
  expiresAt: number;
}
const sessionCache = new Map<string, SessionCacheEntry>();
const inflightSessionValidations = new Map<
  string,
  Promise<{ session: Session; user: ValidatedSessionUser } | null>
>();
const SESSION_CACHE_TTL_MS = 60 * 1000; // 60 segundos para absorver requisições simultâneas e navegações rápidas

export class AuthService {
  /**
   * Invalida o cache de sessões em memória.
   */
  static invalidateSessionCache(userId?: string) {
    if (userId) {
      for (const [hash, entry] of sessionCache.entries()) {
        if (entry.data?.user?.id === userId) {
          sessionCache.delete(hash);
        }
      }
    } else {
      sessionCache.clear();
    }
  }
  /**
   * Registra um novo usuário no sistema, criando seu Workspace principal com o papel OWNER.
   */
  static async register(input: RegisterInput, ctx?: ClientContext) {
    const existing = await withDbRetry(() =>
      db.user.findUnique({
        where: { email: input.email },
      })
    );

    if (existing) {
      throw new ValidationError("Este e-mail já está em uso na plataforma.");
    }

    const passwordHash = await hashPassword(input.password);
    const emailConfirmationToken = generateSecureToken();
    const emailConfirmationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

    const baseSlug = (input.workspaceName || input.displayName || "meu-estudio")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const uniqueSlug = `${baseSlug}-${Date.now().toString().slice(-6)}`;

    const user = await withDbRetry(() =>
      db.user.create({
        data: {
          authSubject: `local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          email: input.email,
          displayName: input.displayName,
          passwordHash,
          emailConfirmed: false,
          emailConfirmationToken,
          emailConfirmationExpiresAt,
          memberships: {
            create: {
              role: WorkspaceRole.OWNER,
              workspace: {
                create: {
                  name: input.workspaceName || `Estúdio de ${input.displayName}`,
                  slug: uniqueSlug,
                },
              },
            },
          },
        },
        include: {
          memberships: {
            include: {
              workspace: true,
            },
          },
        },
      })
    );

    // Registrar log de auditoria
    const workspaceId = user.memberships[0]?.workspaceId;
    await db.auditLog.create({
      data: {
        userId: user.id,
        workspaceId,
        action: "USER_REGISTER",
        details: { email: user.email, displayName: user.displayName },
        ipAddress: ctx?.ipAddress,
        userAgent: ctx?.userAgent,
      },
    });

    // Cria sessão inicial para o usuário recém-registrado
    const session = await this.createSession(user.id, ctx);

    // Boas-vindas + confirmação de e-mail (não bloqueia nem derruba o cadastro)
    await TransactionalEmailService.sendWelcome({
      to: user.email,
      name: user.displayName ?? undefined,
      confirmToken: emailConfirmationToken,
    });

    // Notifica o administrador sobre o novo cadastro na plataforma
    await TransactionalEmailService.sendAdminNotification({
      title: `Novo cadastro: ${user.displayName || user.email}`,
      summary: "Um novo usuário acabou de se cadastrar no Tomadix.",
      details: [
        ["Nome", user.displayName || "—"],
        ["E-mail", user.email],
        ["Workspace", user.memberships[0]?.workspace?.name || "—"],
        ["Data", new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })],
      ],
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        emailConfirmed: user.emailConfirmed,
      },
      workspace: user.memberships[0].workspace,
      sessionToken: session.rawToken,
      confirmationToken: emailConfirmationToken, // Para testes e ambiente de desenvolvimento
    };
  }

  /**
   * Autentica o usuário por e-mail e senha.
   */
  static async login(input: LoginInput, ctx?: ClientContext) {
    const user = await withDbRetry(() =>
      db.user.findUnique({
        where: { email: input.email },
        include: {
          memberships: {
            include: {
              workspace: true,
            },
          },
        },
      })
    );

    if (!user || !user.passwordHash) {
      throw new AuthenticationError("Credenciais inválidas. Verifique seu e-mail e senha.");
    }

    const isValid = await verifyPassword(input.password, user.passwordHash);
    if (!isValid) {
      throw new AuthenticationError("Credenciais inválidas. Verifique seu e-mail e senha.");
    }

    // Criar sessão de autenticação
    const session = await this.createSession(user.id, ctx);

    // Registrar log de auditoria
    const primaryWorkspaceId = user.memberships[0]?.workspaceId;
    await withDbRetry(() =>
      db.auditLog.create({
        data: {
          userId: user.id,
          workspaceId: primaryWorkspaceId,
          action: "USER_LOGIN",
          details: { email: user.email },
          ipAddress: ctx?.ipAddress,
          userAgent: ctx?.userAgent,
        },
      })
    ).catch(() => {});

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        emailConfirmed: user.emailConfirmed,
      },
      sessionToken: session.rawToken,
      workspaces: user.memberships.map((m) => ({
        ...m.workspace,
        role: m.role,
      })),
    };
  }

  /**
   * Cria uma nova sessão com token criptograficamente seguro e armazena seu hash no banco.
   */
  static async createSession(userId: string, ctx?: ClientContext) {
    const rawToken = generateSecureToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias

    const session = await withDbRetry(() =>
      db.session.create({
        data: {
          userId,
          tokenHash,
          expiresAt,
          ipAddress: ctx?.ipAddress,
          userAgent: ctx?.userAgent,
        },
      })
    );

    return {
      session,
      rawToken,
    };
  }

  /**
   * Valida um token de sessão, renova se próximo do vencimento e retorna o usuário com workspaces.
   */
  static async validateSession(
    rawToken: string
  ): Promise<{ session: Session; user: ValidatedSessionUser } | null> {
    const tokenHash = hashToken(rawToken);

    // Verificar se a sessão está no cache recente
    const cached = sessionCache.get(tokenHash);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    // Deduplicar requisições concorrentes com o mesmo tokenHash
    const inflight = inflightSessionValidations.get(tokenHash);
    if (inflight) {
      return inflight;
    }

    const validationPromise = (async () => {
      try {
        const session = await withDbRetry(() =>
          db.session.findUnique({
            where: { tokenHash },
            include: {
              user: {
                include: {
                  memberships: {
                    include: {
                      workspace: true,
                    },
                  },
                },
              },
            },
          })
        );

        if (!session) {
          sessionCache.delete(tokenHash);
          return null;
        }

        // Verifica se a sessão expirou
        if (session.expiresAt.getTime() <= Date.now()) {
          sessionCache.delete(tokenHash);
          await db.session.delete({ where: { id: session.id } }).catch(() => {});
          return null;
        }

        // Se o usuário foi suspenso pela administração, rejeitar a sessão
        if (session.user.isSuspended) {
          sessionCache.delete(tokenHash);
          return null;
        }

        const result = {
          session,
          user: session.user,
        };

        // Armazenar no cache de curta duração
        sessionCache.set(tokenHash, {
          data: result,
          expiresAt: Date.now() + SESSION_CACHE_TTL_MS,
        });

        return result;
      } finally {
        inflightSessionValidations.delete(tokenHash);
      }
    })();

    inflightSessionValidations.set(tokenHash, validationPromise);
    return validationPromise;
  }

  /**
   * Encerra a sessão atual (logout).
   */
  static async logout(rawToken: string) {
    const tokenHash = hashToken(rawToken);
    sessionCache.delete(tokenHash);
    await db.session.deleteMany({
      where: { tokenHash },
    });
  }

  /**
   * Encerra todas as sessões ativas do usuário.
   */
  static async revokeAllUserSessions(userId: string) {
    this.invalidateSessionCache(userId);
    await db.session.deleteMany({
      where: { userId },
    });
  }

  /**
   * Solicita a recuperação de senha com proteção contra enumeração de contas.
   */
  static async requestPasswordReset(email: string, ctx?: ClientContext) {
    const user = await db.user.findUnique({
      where: { email },
    });

    // Se o usuário não existir, retornamos sucesso genérico para evitar enumeração de contas
    if (!user) {
      return {
        message: "Se o e-mail estiver cadastrado, as instruções de recuperação foram geradas.",
        resetToken: null,
      };
    }

    const resetToken = generateSecureToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora de validade

    await db.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpiresAt: expiresAt,
      },
    });

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: "PASSWORD_RESET_REQUESTED",
        details: { email: user.email },
        ipAddress: ctx?.ipAddress,
        userAgent: ctx?.userAgent,
      },
    });

    // Envia o link por e-mail (a rota nunca devolve o token em produção)
    await TransactionalEmailService.sendPasswordReset({
      to: user.email,
      name: user.displayName ?? undefined,
      resetToken,
    });

    // Notifica o administrador sobre a solicitação de recuperação de senha
    await TransactionalEmailService.sendAdminNotification({
      title: `Recuperação de senha solicitada: ${user.email}`,
      summary: "Um usuário solicitou recuperação de senha no Tomadix.",
      details: [
        ["Nome", user.displayName || "—"],
        ["E-mail", user.email],
        ["Data", new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })],
      ],
    });

    return {
      message: "Se o e-mail estiver cadastrado, as instruções de recuperação foram geradas.",
      resetToken, // Uso interno e testes: as rotas HTTP removem este campo em produção
    };
  }

  /**
   * Redefine a senha utilizando um token de recuperação válido.
   */
  static async resetPassword(token: string, newPassword: string, ctx?: ClientContext) {
    const user = await db.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new ValidationError("Token de recuperação inválido ou expirado.");
    }

    const passwordHash = await hashPassword(newPassword);

    await db.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
      },
    });

    // Revoga todas as sessões anteriores por segurança (sessões antigas invalidadas após troca de senha)
    await this.revokeAllUserSessions(user.id);

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: "PASSWORD_RESET_COMPLETED",
        details: { email: user.email },
        ipAddress: ctx?.ipAddress,
        userAgent: ctx?.userAgent,
      },
    });

    // Cria nova sessão autenticada para o usuário
    const newSession = await this.createSession(user.id, ctx);

    // Aviso de segurança: senha alterada
    await TransactionalEmailService.sendPasswordChanged({ to: user.email, name: user.displayName ?? undefined });

    // Notifica o administrador sobre a conclusão da redefinição de senha
    await TransactionalEmailService.sendAdminNotification({
      title: `Senha redefinida: ${user.email}`,
      summary: "Um usuário concluiu a redefinição de senha no Tomadix.",
      details: [
        ["Nome", user.displayName || "—"],
        ["E-mail", user.email],
        ["Data", new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })],
      ],
    });

    return {
      success: true,
      sessionToken: newSession.rawToken,
    };
  }

  /**
   * Confirma o endereço de e-mail do usuário.
   */
  static async confirmEmail(token: string, ctx?: ClientContext) {
    const user = await db.user.findFirst({
      where: {
        emailConfirmationToken: token,
        emailConfirmationExpiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new ValidationError("Token de confirmação inválido ou expirado.");
    }

    await db.user.update({
      where: { id: user.id },
      data: {
        emailConfirmed: true,
        emailConfirmationToken: null,
        emailConfirmationExpiresAt: null,
      },
    });

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: "EMAIL_CONFIRMED",
        details: { email: user.email },
        ipAddress: ctx?.ipAddress,
        userAgent: ctx?.userAgent,
      },
    });

    return {
      success: true,
      message: "E-mail confirmado com sucesso!",
    };
  }
}
