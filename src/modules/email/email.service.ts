import nodemailer from "nodemailer";
import { db } from "@/lib/db";
import { EmailProviderType } from "@prisma/client";
import { encryptString, decryptString, maskSecretValue } from "@/lib/encryption";
import { getTestEmail } from "./email-templates";
import { renderTemplateSample } from "./email-template-catalog";

export interface SendMailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  /** Message-ID da mensagem respondida (mantém a conversa encadeada no cliente de e-mail). */
  inReplyTo?: string;
  references?: string;
}

export interface SaveEmailSettingsInput {
  provider: EmailProviderType;
  isEnabled: boolean;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPassword?: string; // se fornecido, criptografa
  clientId?: string;
  clientSecret?: string; // se fornecido, criptografa
  refreshToken?: string; // se fornecido, criptografa
  tenantId?: string;
  senderEmail: string;
  senderName: string;
  replyTo?: string;
}

/** Conta Gmail padrão de envio e recebimento (a senha de app é informada no console admin). */
export const DEFAULT_GMAIL_ADDRESS = process.env.SMTP_USER || "georgie.a.reis@gmail.com";

export class EmailService {
  /**
   * Obtém as configurações atuais do banco ou cria as configurações padrão.
   */
  static async getSettings() {
    let settings = await db.emailSettings.findUnique({
      where: { id: "default" },
    });

    if (!settings) {
      settings = await db.emailSettings.create({
        data: {
          id: "default",
          provider: EmailProviderType.GMAIL_SMTP,
          isEnabled: false,
          smtpHost: "smtp.gmail.com",
          smtpPort: 587,
          smtpSecure: false,
          smtpUser: DEFAULT_GMAIL_ADDRESS,
          senderEmail: process.env.SMTP_FROM || DEFAULT_GMAIL_ADDRESS,
          senderName: "Tomadix Studio",
          replyTo: DEFAULT_GMAIL_ADDRESS,
        },
      });
    }

    return settings;
  }

  /**
   * Retorna as configurações mascaradas para exibição no frontend (nunca expõe senhas ou secrets).
   */
  static async getMaskedSettings() {
    const s = await this.getSettings();

    return {
      id: s.id,
      provider: s.provider,
      isEnabled: s.isEnabled,
      smtpHost: s.smtpHost,
      smtpPort: s.smtpPort,
      smtpSecure: s.smtpSecure,
      smtpUser: s.smtpUser || "",
      hasPassword: Boolean(s.smtpPasswordEnc && s.smtpPasswordEnc.length > 0),
      smtpPasswordMasked: s.smtpPasswordEnc ? maskSecretValue(decryptString(s.smtpPasswordEnc)) : "",
      clientId: s.clientId || "",
      hasClientSecret: Boolean(s.clientSecretEnc && s.clientSecretEnc.length > 0),
      clientSecretMasked: s.clientSecretEnc ? maskSecretValue(decryptString(s.clientSecretEnc)) : "",
      hasRefreshToken: Boolean(s.refreshTokenEnc && s.refreshTokenEnc.length > 0),
      tenantId: s.tenantId || "",
      senderEmail: s.senderEmail,
      senderName: s.senderName,
      replyTo: s.replyTo || "",
      lastTestedAt: s.lastTestedAt,
      lastTestStatus: s.lastTestStatus,
      lastTestError: s.lastTestError,
      updatedAt: s.updatedAt,
    };
  }

  /**
   * Salva configurações de e-mail com criptografia segura das credenciais.
   */
  static async saveSettings(input: SaveEmailSettingsInput) {
    const existing = await this.getSettings();

    const dataToUpdate: any = {
      provider: input.provider,
      isEnabled: input.isEnabled,
      smtpHost: input.smtpHost || "smtp.gmail.com",
      smtpPort: input.smtpPort || 587,
      smtpSecure: Boolean(input.smtpSecure),
      smtpUser: input.smtpUser?.trim() || null,
      senderEmail: input.senderEmail.trim(),
      senderName: input.senderName.trim(),
      replyTo: input.replyTo?.trim() || null,
      tenantId: input.tenantId?.trim() || null,
      clientId: input.clientId?.trim() || null,
    };

    // Atualiza a senha apenas se uma nova foi digitada
    if (input.smtpPassword && input.smtpPassword.trim().length > 0) {
      dataToUpdate.smtpPasswordEnc = encryptString(input.smtpPassword.trim());
    }

    // Atualiza client secret se novo
    if (input.clientSecret && input.clientSecret.trim().length > 0) {
      dataToUpdate.clientSecretEnc = encryptString(input.clientSecret.trim());
    }

    // Atualiza refresh token se novo
    if (input.refreshToken && input.refreshToken.trim().length > 0) {
      dataToUpdate.refreshTokenEnc = encryptString(input.refreshToken.trim());
    }

    const updated = await db.emailSettings.update({
      where: { id: existing.id },
      data: dataToUpdate,
    });

    return updated;
  }

  /**
   * Monta o transporter Nodemailer com base no provedor configurado.
   */
  private static async createTransporter(customConfig?: Partial<SaveEmailSettingsInput>) {
    const settings = await this.getSettings();

    const provider = customConfig?.provider || settings.provider;
    let host = customConfig?.smtpHost || settings.smtpHost;
    let port = customConfig?.smtpPort || settings.smtpPort;
    let secure = customConfig?.smtpSecure !== undefined ? customConfig.smtpSecure : settings.smtpSecure;
    const user = customConfig?.smtpUser !== undefined ? customConfig.smtpUser : settings.smtpUser;

    let pass = "";
    if (customConfig?.smtpPassword && customConfig.smtpPassword.trim().length > 0) {
      pass = customConfig.smtpPassword.trim();
    } else if (settings.smtpPasswordEnc) {
      pass = decryptString(settings.smtpPasswordEnc);
    } else if (process.env.SMTP_PASSWORD) {
      // Alternativa por variável de ambiente (senha de app do Gmail)
      pass = process.env.SMTP_PASSWORD;
    }

    // Configurações padrão por provedor
    if (provider === EmailProviderType.GMAIL_SMTP) {
      host = host || "smtp.gmail.com";
      port = port || 587;
      secure = port === 465;
    } else if (provider === EmailProviderType.OUTLOOK_SMTP) {
      host = host || "smtp-mail.outlook.com";
      port = port || 587;
      secure = false; // Outlook usa STARTTLS na 587
    }

    const transportOptions: any = {
      host,
      port,
      secure, // true para 465, false para 587
      auth: user && pass ? { user, pass } : undefined,
      tls: {
        rejectUnauthorized: true,
      },
    };

    return nodemailer.createTransport(transportOptions);
  }

  /**
   * Credenciais da conta configurada (usuário e senha em texto), para uso interno do servidor
   * (ex.: leitura da caixa de entrada por IMAP). Nunca exponha ao cliente.
   */
  static async getMailboxCredentials() {
    const settings = await this.getSettings();
    let pass = "";
    if (settings.smtpPasswordEnc) pass = decryptString(settings.smtpPasswordEnc);
    else if (process.env.SMTP_PASSWORD) pass = process.env.SMTP_PASSWORD;
    return {
      provider: settings.provider,
      smtpHost: settings.smtpHost,
      user: settings.smtpUser || "",
      pass,
    };
  }

  /**
   * Valida a conexão com o servidor SMTP sem enviar e-mails.
   */
  static async testConnection(customConfig?: Partial<SaveEmailSettingsInput>) {
    try {
      const transporter = await this.createTransporter(customConfig);
      await transporter.verify();

      await db.emailSettings.update({
        where: { id: "default" },
        data: {
          lastTestedAt: new Date(),
          lastTestStatus: "SUCCESS",
          lastTestError: null,
        },
      });

      return {
        success: true,
        message: "Conexão com o servidor SMTP estabelecida e autenticada com sucesso!",
      };
    } catch (error: any) {
      const errorMsg = error?.message || "Falha na verificação da conexão SMTP.";

      await db.emailSettings.update({
        where: { id: "default" },
        data: {
          lastTestedAt: new Date(),
          lastTestStatus: "FAILED",
          lastTestError: errorMsg,
        },
      });

      return {
        success: false,
        message: `Falha na conexão SMTP: ${errorMsg}`,
      };
    }
  }

  /**
   * Envia um e-mail transacional e registra o log de auditoria no banco.
   */
  static async sendMail(options: SendMailOptions) {
    const settings = await this.getSettings();

    const recipient = Array.isArray(options.to) ? options.to.join(", ") : options.to;

    if (!settings.isEnabled) {
      console.warn(`[EmailService] O envio de e-mails está desativado. Mensagem para ${recipient} não foi disparada.`);
      return {
        success: false,
        skipped: true,
        message: "O envio de e-mails está desativado nas configurações do sistema.",
      };
    }

    try {
      const transporter = await this.createTransporter();

      const sender = `"${settings.senderName}" <${settings.senderEmail}>`;

      const info = await transporter.sendMail({
        from: sender,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo || settings.replyTo || undefined,
        inReplyTo: options.inReplyTo,
        references: options.references,
      });

      // Registrar log com sucesso
      await db.emailLog.create({
        data: {
          recipient,
          subject: options.subject,
          provider: settings.provider,
          status: "SENT",
          messageId: info.messageId,
          metadata: {
            response: info.response,
            accepted: info.accepted,
          },
        },
      });

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error: any) {
      const errorMsg = error?.message || "Erro desconhecido ao enviar e-mail.";

      // Registrar log com falha
      await db.emailLog.create({
        data: {
          recipient,
          subject: options.subject,
          provider: settings.provider,
          status: "FAILED",
          errorMessage: errorMsg,
        },
      });

      console.error("[EmailService] Falha ao enviar e-mail:", error);
      throw new Error(`Falha no envio de e-mail: ${errorMsg}`);
    }
  }

  /**
   * Envia um e-mail de teste para um destinatário especificado.
   */
  static async sendTestEmail(targetEmail: string, testedBy = "Administrador") {
    const settings = await this.getSettings();
    const template = getTestEmail({
      providerName: settings.provider,
      testedBy,
      timestamp: new Date().toLocaleString("pt-BR"),
    });

    const transporter = await this.createTransporter();
    const sender = `"${settings.senderName}" <${settings.senderEmail}>`;

    const info = await transporter.sendMail({
      from: sender,
      to: targetEmail,
      subject: template.subject,
      html: template.html,
      replyTo: settings.replyTo || undefined,
    });

    await db.emailLog.create({
      data: {
        recipient: targetEmail,
        subject: template.subject,
        provider: settings.provider,
        status: "SENT",
        messageId: info.messageId,
        metadata: {
          isTest: true,
          testedBy,
        },
      },
    });

    return {
      success: true,
      messageId: info.messageId,
      message: `E-mail de teste enviado com sucesso para ${targetEmail}!`,
    };
  }

  /**
   * Envia um template do catálogo com dados de exemplo (teste do console admin).
   */
  static async sendTemplateTest(targetEmail: string, templateKey: string, testedBy = "Administrador") {
    const rendered = renderTemplateSample(templateKey);
    if (!rendered) throw new Error("Template de e-mail desconhecido.");

    const settings = await this.getSettings();
    const transporter = await this.createTransporter();
    const sender = `"${settings.senderName}" <${settings.senderEmail}>`;

    const info = await transporter.sendMail({
      from: sender,
      to: targetEmail,
      subject: `[Teste] ${rendered.subject}`,
      html: rendered.html,
      replyTo: settings.replyTo || undefined,
    });

    await db.emailLog.create({
      data: {
        recipient: targetEmail,
        subject: `[Teste] ${rendered.subject}`,
        provider: settings.provider,
        status: "SENT",
        messageId: info.messageId,
        metadata: { isTest: true, templateKey, testedBy },
      },
    });

    return {
      success: true,
      messageId: info.messageId,
      message: `Modelo enviado com sucesso para ${targetEmail}!`,
    };
  }

  /**
   * Lista histórico de logs de e-mail para auditoria.
   */
  static async getLogs(limit = 50) {
    return db.emailLog.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
    });
  }
}
