/**
 * Templates de e-mail profissionais e responsivos para o Tomadix
 * Estilizados na identidade visual da plataforma (Dark Luxury Cinematic)
 */

/** Escapa texto de usuário antes de entrar no HTML do e-mail (nome, motivo, workspace...). */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Prefixo de assunto que identifica e-mails gerados pelo Tomadix para o administrador (e filtra a Caixa de Entrada). */
export const TOMADIX_SUBJECT_PREFIX = "[Tomadix]";

/** Aviso interno ao administrador (novo cadastro, recuperação de senha etc.). */
export function getAdminNotificationEmail({
  title,
  summary,
  details,
}: {
  title: string;
  summary: string;
  details: Array<[string, string]>;
}) {
  const rows = details
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#8b98a5;font-size:13px;">${escapeHtml(label)}</td><td style="padding:6px 0;font-size:13px;"><strong>${escapeHtml(value)}</strong></td></tr>`
    )
    .join("");
  return {
    subject: `${TOMADIX_SUBJECT_PREFIX} ${title}`,
    html: renderBaseEmailTemplate({
      title: escapeHtml(title),
      preheader: summary,
      contentHtml: `<p>${escapeHtml(summary)}</p><table role="presentation" cellpadding="0" cellspacing="0">${rows}</table>`,
      footerNote: "Notificação automática do Tomadix para o administrador da plataforma.",
    }),
  };
}

interface BaseEmailWrapperProps {
  title: string;
  preheader?: string;
  contentHtml: string;
  actionUrl?: string;
  actionLabel?: string;
  footerNote?: string;
}

export function renderBaseEmailTemplate({
  title,
  preheader,
  contentHtml,
  actionUrl,
  actionLabel,
  footerNote,
}: BaseEmailWrapperProps): string {
  const currentYear = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #090c10;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #e6edf3;
      -webkit-font-smoothing: antialiased;
    }
    table {
      border-collapse: separate;
    }
    a {
      color: #10b981;
      text-decoration: none;
    }
    .btn-primary {
      display: inline-block;
      padding: 14px 28px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: #ffffff !important;
      font-weight: 700;
      font-size: 14px;
      letter-spacing: 0.5px;
      border-radius: 12px;
      text-decoration: none;
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);
    }
    @media only screen and (max-width: 600px) {
      .container {
        width: 100% !important;
        padding: 16px !important;
      }
      .card {
        padding: 24px 16px !important;
      }
    }
  </style>
</head>
<body style="background-color: #090c10; margin: 0; padding: 0;">
  ${preheader ? `<span style="display:none;font-size:1px;color:#090c10;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</span>` : ""}
  
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #090c10; width: 100%; margin: 0; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" class="container" width="560" cellpadding="0" cellspacing="0" style="max-width: 560px; width: 100%;">
          
          <!-- LOGO TOMADIX -->
          <tr>
            <td align="center" style="padding-bottom: 28px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; padding: 8px 16px;">
                    <span style="font-size: 18px; font-weight: 900; letter-spacing: 2px; color: #10b981;">TOMADIX</span>
                    <span style="font-size: 11px; font-weight: 600; color: #a1a1aa; margin-left: 6px; letter-spacing: 1px;">STUDIO</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CARD PRINCIPAL -->
          <tr>
            <td class="card" style="background: #121720; border: 1px solid #1f2937; border-radius: 20px; padding: 36px 32px; box-shadow: 0 20px 40px rgba(0,0,0,0.4);">
              <h1 style="margin: 0 0 18px 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                ${title}
              </h1>

              <div style="font-size: 14px; line-height: 1.6; color: #9ca3af;">
                ${contentHtml}
              </div>

              ${actionUrl && actionLabel ? `
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 28px 0 16px 0;">
                <tr>
                  <td align="center">
                    <a href="${actionUrl}" class="btn-primary" target="_blank">
                      ${actionLabel}
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 12px 0 0 0; font-size: 12px; color: #6b7280; word-break: break-all;">
                Se o botão não funcionar, copie e cole este link no seu navegador:<br>
                <a href="${actionUrl}" style="color: #10b981;">${actionUrl}</a>
              </p>
              ` : ""}

              ${footerNote ? `
              <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #1f2937; font-size: 12px; color: #6b7280;">
                ${footerNote}
              </div>
              ` : ""}
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td align="center" style="padding-top: 24px; font-size: 12px; color: #4b5563;">
              <p style="margin: 0 0 6px 0;">
                © ${currentYear} Tomadix Studio — Inteligência Artificial Cinematográfica.
              </p>
              <p style="margin: 0;">
                Este é um e-mail transacional do Tomadix Studio. Dúvidas? Basta responder a esta mensagem.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Template: E-mail de redefinição de senha
 */
export function getPasswordResetEmail({
  name,
  resetUrl,
  expiresInMinutes = 60,
}: {
  name?: string;
  resetUrl: string;
  expiresInMinutes?: number;
}) {
  const greeting = name ? `Olá, <strong>${escapeHtml(name)}</strong>!` : "Olá!";
  return {
    subject: "Redefinição de senha — Tomadix Studio",
    html: renderBaseEmailTemplate({
      title: "Solicitação para redefinir sua senha",
      preheader: "Recebemos um pedido para alterar a senha da sua conta Tomadix.",
      contentHtml: `
        <p>${greeting}</p>
        <p>Recebemos uma solicitação para redefinir a senha de acesso à sua conta no <strong>Tomadix Studio</strong>.</p>
        <p>Para criar uma nova senha com segurança, clique no botão abaixo. Este link expira em <strong>${expiresInMinutes} minutos</strong>.</p>
      `,
      actionUrl: resetUrl,
      actionLabel: "Redefinir Minha Senha",
      footerNote: "Se você não solicitou a redefinição de senha, desconsidere este e-mail. Sua senha atual permanecerá segura.",
    }),
  };
}

/**
 * Template: Boas-vindas e confirmação de e-mail
 */
export function getWelcomeEmail({
  name,
  confirmUrl,
}: {
  name?: string;
  confirmUrl?: string;
}) {
  const greeting = name ? `Bem-vindo(a) ao Tomadix Studio, <strong>${escapeHtml(name)}</strong>!` : "Bem-vindo(a) ao Tomadix Studio!";
  return {
    subject: "Bem-vindo ao Tomadix Studio — Confirme seu e-mail",
    html: renderBaseEmailTemplate({
      title: "Criação de Conteúdo Cinematográfico com IA",
      preheader: "Sua jornada com direção de arte e fotografia de ponta começa agora.",
      contentHtml: `
        <p>${greeting}</p>
        <p>Sua conta foi criada com sucesso! Você agora tem acesso à análise de imagens, aos projetos colaborativos e à geração de prompts cinematográficos.</p>
        ${confirmUrl ? "<p>Para ativar todos os recursos e garantir a segurança da sua conta, por favor confirme seu endereço de e-mail:</p>" : ""}
      `,
      actionUrl: confirmUrl,
      actionLabel: confirmUrl ? "Confirmar Meu E-mail" : undefined,
      footerNote: "Dica: Você pode acessar seus projetos e começar a montar seus boards cinematográficos a qualquer momento.",
    }),
  };
}

/**
 * Template: Notificação de Recarga ou Saldo de Créditos
 */
export function getCreditsNotificationEmail({
  name,
  amount,
  newBalance,
  reason,
  loginUrl,
}: {
  name?: string;
  amount: number;
  newBalance: number;
  reason: string;
  loginUrl: string;
}) {
  const greeting = name ? `Olá, <strong>${escapeHtml(name)}</strong>!` : "Olá!";
  return {
    subject: `Créditos atualizados: +${amount} créditos adicionados — Tomadix`,
    html: renderBaseEmailTemplate({
      title: "Atualização no Saldo de Créditos",
      preheader: `Foram adicionados ${amount} créditos à sua conta.`,
      contentHtml: `
        <p>${greeting}</p>
        <p>Seus créditos de IA no <strong>Tomadix</strong> foram atualizados com sucesso:</p>
        <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 12px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0; color: #10b981; font-weight: 700; font-size: 16px;">+${amount} créditos recebidos</p>
          <p style="margin: 0 0 6px 0; color: #d1d5db; font-size: 13px;">Motivo: <strong>${escapeHtml(reason)}</strong></p>
          <p style="margin: 0; color: #ffffff; font-weight: 600; font-size: 14px;">Saldo atual disponível: <strong>${newBalance} créditos</strong></p>
        </div>
        <p>Aproveite para continuar gerando prompts avançados e explorando o potencial cinematográfico dos seus projetos.</p>
      `,
      actionUrl: loginUrl,
      actionLabel: "Abrir o Tomadix Studio",
    }),
  };
}

/**
 * Template: E-mail de teste de configuração administrativa
 */
export function getTestEmail({
  providerName,
  testedBy,
  timestamp,
}: {
  providerName: string;
  testedBy: string;
  timestamp: string;
}) {
  return {
    subject: `[Teste Tomadix] Conexão de E-mail Validada com Sucesso (${providerName})`,
    html: renderBaseEmailTemplate({
      title: "Conexão de E-mail Verificada!",
      preheader: `E-mail de teste enviado via ${providerName}.`,
      contentHtml: `
        <p>Este é um e-mail de teste disparado pelo painel administrativo do <strong>Tomadix</strong> para validar a integração com o provedor <strong>${escapeHtml(providerName)}</strong>.</p>
        <div style="background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.25); border-radius: 12px; padding: 16px; margin: 18px 0;">
          <p style="margin: 0 0 6px 0; color: #60a5fa; font-weight: 600; font-size: 13px;">Status do Teste: CONECTADO COM SUCESSO</p>
          <p style="margin: 0 0 4px 0; color: #9ca3af; font-size: 12px;">Disparado por: <strong>${escapeHtml(testedBy)}</strong></p>
          <p style="margin: 0; color: #9ca3af; font-size: 12px;">Data / Hora: <strong>${timestamp}</strong></p>
        </div>
        <p>Seus disparos transacionais de boas-vindas, redefinição de senhas e notificações de créditos estão operacionais.</p>
      `,
      footerNote: "Configuração administrada em Configurações → Integrações → E-mail no Tomadix Studio.",
    }),
  };
}


/**
 * Template: Confirmação de e-mail (reenvio ou confirmação isolada)
 */
export function getEmailConfirmationEmail({
  name,
  confirmUrl,
  expiresInHours = 24,
}: {
  name?: string;
  confirmUrl: string;
  expiresInHours?: number;
}) {
  const greeting = name ? `Olá, <strong>${escapeHtml(name)}</strong>!` : "Olá!";
  return {
    subject: "Confirme seu e-mail — Tomadix Studio",
    html: renderBaseEmailTemplate({
      title: "Confirme seu endereço de e-mail",
      preheader: "Falta só um passo para ativar sua conta no Tomadix Studio.",
      contentHtml: `
        <p>${greeting}</p>
        <p>Para ativar sua conta e garantir a segurança do seu acesso, confirme que este endereço de e-mail é seu.</p>
        <p>O link abaixo expira em <strong>${expiresInHours} horas</strong>.</p>
      `,
      actionUrl: confirmUrl,
      actionLabel: "Confirmar Meu E-mail",
      footerNote: "Se você não criou uma conta no Tomadix Studio, pode ignorar este e-mail com tranquilidade.",
    }),
  };
}

/**
 * Template: Aviso de senha alterada
 */
export function getPasswordChangedEmail({
  name,
  loginUrl,
  changedAt,
}: {
  name?: string;
  loginUrl: string;
  changedAt: string;
}) {
  const greeting = name ? `Olá, <strong>${escapeHtml(name)}</strong>!` : "Olá!";
  return {
    subject: "Sua senha foi alterada — Tomadix Studio",
    html: renderBaseEmailTemplate({
      title: "Sua senha foi alterada",
      preheader: "A senha da sua conta Tomadix foi redefinida com sucesso.",
      contentHtml: `
        <p>${greeting}</p>
        <p>A senha de acesso à sua conta no <strong>Tomadix Studio</strong> foi alterada em <strong>${escapeHtml(changedAt)}</strong>.</p>
        <p>Por segurança, todas as sessões anteriores foram encerradas.</p>
      `,
      actionUrl: loginUrl,
      actionLabel: "Acessar Minha Conta",
      footerNote: "Não foi você? Redefina sua senha imediatamente e responda a este e-mail para falar com o suporte.",
    }),
  };
}

/**
 * Template: Convite para entrar em um workspace (equipe)
 */
export function getWorkspaceInviteEmail({
  inviterName,
  workspaceName,
  roleLabel,
  acceptUrl,
  expiresInDays = 7,
}: {
  inviterName?: string;
  workspaceName: string;
  roleLabel: string;
  acceptUrl: string;
  expiresInDays?: number;
}) {
  const who = inviterName ? `<strong>${escapeHtml(inviterName)}</strong>` : "Um colega";
  return {
    subject: `Convite para participar de ${workspaceName} — Tomadix Studio`,
    html: renderBaseEmailTemplate({
      title: "Você foi convidado(a) para uma equipe",
      preheader: `${escapeHtml(inviterName || "Um colega")} convidou você para ${escapeHtml(workspaceName)}.`,
      contentHtml: `
        <p>${who} convidou você para colaborar no estúdio <strong>${escapeHtml(workspaceName)}</strong> como <strong>${escapeHtml(roleLabel)}</strong>.</p>
        <p>Entre ou crie sua conta com este mesmo e-mail e aceite o convite. Ele expira em <strong>${expiresInDays} dias</strong>.</p>
      `,
      actionUrl: acceptUrl,
      actionLabel: "Ver Convite",
      footerNote: "Se você não esperava este convite, pode ignorá-lo.",
    }),
  };
}

/**
 * Template: Assinatura / pagamento confirmado
 */
export function getSubscriptionConfirmedEmail({
  name,
  planName,
  billingUrl,
}: {
  name?: string;
  planName: string;
  billingUrl: string;
}) {
  const greeting = name ? `Olá, <strong>${escapeHtml(name)}</strong>!` : "Olá!";
  return {
    subject: `Assinatura confirmada: plano ${planName} — Tomadix Studio`,
    html: renderBaseEmailTemplate({
      title: "Assinatura confirmada",
      preheader: `Seu plano ${planName} está ativo.`,
      contentHtml: `
        <p>${greeting}</p>
        <p>Recebemos seu pagamento e o plano <strong>${escapeHtml(planName)}</strong> já está ativo na sua conta.</p>
        <p>Você pode acompanhar créditos, faturas e renovação a qualquer momento na área de assinatura.</p>
      `,
      actionUrl: billingUrl,
      actionLabel: "Ver Minha Assinatura",
    }),
  };
}

/**
 * Template: Aviso de créditos baixos
 */
export function getLowCreditsEmail({
  name,
  balance,
  billingUrl,
}: {
  name?: string;
  balance: number;
  billingUrl: string;
}) {
  const greeting = name ? `Olá, <strong>${escapeHtml(name)}</strong>!` : "Olá!";
  return {
    subject: "Seus créditos estão acabando — Tomadix Studio",
    html: renderBaseEmailTemplate({
      title: "Seu saldo de créditos está baixo",
      preheader: `Restam ${balance} créditos na sua conta.`,
      contentHtml: `
        <p>${greeting}</p>
        <p>Seu saldo atual é de <strong>${balance} créditos</strong>. Para não interromper suas gerações, considere recarregar ou mudar de plano.</p>
      `,
      actionUrl: billingUrl,
      actionLabel: "Recarregar Créditos",
    }),
  };
}
