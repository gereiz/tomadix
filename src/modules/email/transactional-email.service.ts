import { PlatformSettingsService } from "@/modules/admin/platform-settings.service";
import { EmailService } from "./email.service";
import {
  getEmailConfirmationEmail,
  getLowCreditsEmail,
  getPasswordChangedEmail,
  getPasswordResetEmail,
  getSubscriptionConfirmedEmail,
  getWelcomeEmail,
  getWorkspaceInviteEmail,
} from "./email-templates";

const SEND_TIMEOUT_MS = 10_000;

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Proprietário",
  ADMIN: "Administrador",
  MEMBER: "Membro",
  VIEWER: "Visualizador",
};

/** URL pública do app: variável de ambiente primeiro, depois a configuração geral do admin. */
export async function getAppBaseUrl(): Promise<string> {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  const settings = await PlatformSettingsService.getGeneralSettings();
  return (settings.publicUrl || "http://localhost:3000").replace(/\/+$/, "");
}

interface Rendered {
  subject: string;
  html: string;
}

/**
 * E-mails transacionais do Tomadix (cadastro, confirmação, senha, convite, assinatura, créditos).
 * Nunca derruba o fluxo de origem: falhas e o modo desativado viram `false` (e ficam no log de e-mails).
 * Em testes automatizados nada é enviado (os testes rodam contra o banco real).
 */
export class TransactionalEmailService {
  private static async deliver(to: string, rendered: Rendered): Promise<boolean> {
    if (process.env.NODE_ENV === "test" && process.env.EMAIL_FORCE_SEND !== "true") return false;
    try {
      const result = await Promise.race([
        EmailService.sendMail({ to, subject: rendered.subject, html: rendered.html }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Tempo esgotado ao enviar e-mail.")), SEND_TIMEOUT_MS)
        ),
      ]);
      return result.success === true;
    } catch (error) {
      console.error("[TransactionalEmail] Falha no envio:", error instanceof Error ? error.message : error);
      return false;
    }
  }

  /** Cadastro: boas-vindas com o link de confirmação de e-mail. */
  static async sendWelcome(params: { to: string; name?: string; confirmToken?: string }): Promise<boolean> {
    const base = await getAppBaseUrl();
    const confirmUrl = params.confirmToken
      ? `${base}/confirm-email?token=${encodeURIComponent(params.confirmToken)}`
      : undefined;
    return this.deliver(params.to, getWelcomeEmail({ name: params.name, confirmUrl }));
  }

  /** Reenvio isolado do link de confirmação. */
  static async sendEmailConfirmation(params: { to: string; name?: string; confirmToken: string }): Promise<boolean> {
    const base = await getAppBaseUrl();
    return this.deliver(
      params.to,
      getEmailConfirmationEmail({
        name: params.name,
        confirmUrl: `${base}/confirm-email?token=${encodeURIComponent(params.confirmToken)}`,
      })
    );
  }

  /** Esqueci minha senha: link de redefinição (válido por 60 minutos). */
  static async sendPasswordReset(params: { to: string; name?: string; resetToken: string }): Promise<boolean> {
    const base = await getAppBaseUrl();
    return this.deliver(
      params.to,
      getPasswordResetEmail({
        name: params.name,
        resetUrl: `${base}/reset-password?token=${encodeURIComponent(params.resetToken)}`,
        expiresInMinutes: 60,
      })
    );
  }

  /** Senha redefinida: aviso de segurança. */
  static async sendPasswordChanged(params: { to: string; name?: string }): Promise<boolean> {
    const base = await getAppBaseUrl();
    return this.deliver(
      params.to,
      getPasswordChangedEmail({
        name: params.name,
        loginUrl: `${base}/login`,
        changedAt: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
      })
    );
  }

  /** Convite de equipe. */
  static async sendWorkspaceInvite(params: {
    to: string;
    inviterName?: string;
    workspaceName: string;
    role: string;
    inviteToken: string;
  }): Promise<boolean> {
    const base = await getAppBaseUrl();
    return this.deliver(
      params.to,
      getWorkspaceInviteEmail({
        inviterName: params.inviterName,
        workspaceName: params.workspaceName,
        roleLabel: ROLE_LABELS[params.role] || params.role,
        acceptUrl: `${base}/invite/${params.inviteToken}`,
      })
    );
  }

  /** Assinatura confirmada. */
  static async sendSubscriptionConfirmed(params: { to: string; name?: string; planName: string }): Promise<boolean> {
    const base = await getAppBaseUrl();
    return this.deliver(
      params.to,
      getSubscriptionConfirmedEmail({
        name: params.name,
        planName: params.planName,
        billingUrl: `${base}/workspace/billing`,
      })
    );
  }

  /** Créditos baixos. */
  static async sendLowCredits(params: { to: string; name?: string; balance: number }): Promise<boolean> {
    const base = await getAppBaseUrl();
    return this.deliver(
      params.to,
      getLowCreditsEmail({ name: params.name, balance: params.balance, billingUrl: `${base}/workspace/billing` })
    );
  }
}
