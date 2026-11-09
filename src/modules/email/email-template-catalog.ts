import {
  getCreditsNotificationEmail,
  getEmailConfirmationEmail,
  getLowCreditsEmail,
  getPasswordChangedEmail,
  getPasswordResetEmail,
  getSubscriptionConfirmedEmail,
  getTestEmail,
  getWelcomeEmail,
  getWorkspaceInviteEmail,
} from "./email-templates";

export interface EmailTemplateInfo {
  key: string;
  label: string;
  description: string;
  /** Quando o Tomadix envia este e-mail. */
  trigger: string;
}

export const EMAIL_TEMPLATE_CATALOG: EmailTemplateInfo[] = [
  { key: "welcome", label: "Cadastro (boas-vindas)", description: "Boas-vindas com o link de confirmação de e-mail.", trigger: "Ao criar a conta" },
  { key: "email_confirmation", label: "Confirmação de e-mail", description: "Link para confirmar o endereço de e-mail.", trigger: "Reenvio da confirmação" },
  { key: "password_reset", label: "Redefinição de senha", description: "Link de redefinição válido por 60 minutos.", trigger: "Em \"Esqueci minha senha\"" },
  { key: "password_changed", label: "Senha alterada", description: "Aviso de segurança após trocar a senha.", trigger: "Ao concluir a redefinição" },
  { key: "workspace_invite", label: "Convite de equipe", description: "Convite para participar de um estúdio.", trigger: "Ao convidar um membro" },
  { key: "subscription_confirmed", label: "Assinatura confirmada", description: "Confirmação de pagamento e plano ativo.", trigger: "Após o pagamento" },
  { key: "credits_added", label: "Créditos adicionados", description: "Aviso de recarga de créditos.", trigger: "Ao adicionar créditos" },
  { key: "low_credits", label: "Créditos baixos", description: "Aviso de saldo baixo.", trigger: "Saldo abaixo do limite" },
  { key: "test", label: "Teste de configuração", description: "E-mail de teste do console admin.", trigger: "Botão de teste" },
];

const SAMPLE_BASE = "https://exemplo.tomadix.com";

/** Renderiza um template com dados de exemplo (pré-visualização e envio de teste). */
export function renderTemplateSample(key: string): { subject: string; html: string } | null {
  switch (key) {
    case "welcome":
      return getWelcomeEmail({ name: "Maria Silva", confirmUrl: `${SAMPLE_BASE}/confirm-email?token=exemplo` });
    case "email_confirmation":
      return getEmailConfirmationEmail({ name: "Maria Silva", confirmUrl: `${SAMPLE_BASE}/confirm-email?token=exemplo` });
    case "password_reset":
      return getPasswordResetEmail({ name: "Maria Silva", resetUrl: `${SAMPLE_BASE}/reset-password?token=exemplo` });
    case "password_changed":
      return getPasswordChangedEmail({
        name: "Maria Silva",
        loginUrl: `${SAMPLE_BASE}/login`,
        changedAt: new Date().toLocaleString("pt-BR"),
      });
    case "workspace_invite":
      return getWorkspaceInviteEmail({
        inviterName: "João Souza",
        workspaceName: "Estúdio Aurora",
        roleLabel: "Membro",
        acceptUrl: `${SAMPLE_BASE}/invite/exemplo`,
      });
    case "subscription_confirmed":
      return getSubscriptionConfirmedEmail({ name: "Maria Silva", planName: "PRO", billingUrl: `${SAMPLE_BASE}/workspace/billing` });
    case "credits_added":
      return getCreditsNotificationEmail({
        name: "Maria Silva",
        amount: 500,
        newBalance: 720,
        reason: "Renovação mensal do plano",
        loginUrl: SAMPLE_BASE,
      });
    case "low_credits":
      return getLowCreditsEmail({ name: "Maria Silva", balance: 12, billingUrl: `${SAMPLE_BASE}/workspace/billing` });
    case "test":
      return getTestEmail({ providerName: "GMAIL_SMTP", testedBy: "Administrador", timestamp: new Date().toLocaleString("pt-BR") });
    default:
      return null;
  }
}
