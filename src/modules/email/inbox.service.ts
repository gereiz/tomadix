import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { EmailProviderType, type EmailMessage } from "@prisma/client";
import { db } from "@/lib/db";
import { EmailService } from "./email.service";
import { escapeHtml } from "./email-templates";

const MAILBOX = "INBOX";
const FIRST_SYNC_LIMIT = 50;
const MAX_TEXT = 200_000;
const MAX_HTML = 500_000;

export interface RawInboxMessage {
  uid: number;
  messageId?: string;
  inReplyTo?: string;
  fromName?: string;
  fromAddress: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  date: Date;
}

/** Busca mensagens novas (uid maior que `afterUid`); a primeira sincronização traz só as mais recentes. */
export type InboxFetcher = (afterUid: number, limit: number) => Promise<RawInboxMessage[]>;

export class InboxError extends Error {}

/** Resumo de uma linha para a lista (texto puro; se só houver HTML, remove as tags). */
export function makeSnippet(text?: string | null, html?: string | null): string {
  const base = text?.trim() || (html ? html.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ") : "");
  return base.replace(/\s+/g, " ").trim().slice(0, 160);
}

/**
 * Verifica se um e-mail pertence ao Tomadix (notificações de novos cadastros,
 * recuperação de senha, testes de envio ou respostas a e-mails do Tomadix),
 * ignorando newsletters e mensagens pessoais da conta de e-mail configurada.
 */
export function isTomadixMessage(msg: {
  subject?: string | null;
  fromName?: string | null;
  text?: string | null;
  html?: string | null;
  snippet?: string | null;
}): boolean {
  const haystack = [msg.subject, msg.fromName, msg.snippet, msg.text, msg.html]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes("tomadix");
}

const TOMADIX_DB_FILTER = {
  OR: [
    { subject: { contains: "tomadix", mode: "insensitive" as const } },
    { fromName: { contains: "tomadix", mode: "insensitive" as const } },
    { snippet: { contains: "tomadix", mode: "insensitive" as const } },
    { textBody: { contains: "tomadix", mode: "insensitive" as const } },
    { htmlBody: { contains: "tomadix", mode: "insensitive" as const } },
  ],
};

function imapHostFor(provider: EmailProviderType, smtpHost: string): string {
  if (provider === EmailProviderType.GMAIL_SMTP || provider === EmailProviderType.GMAIL_OAUTH2) return "imap.gmail.com";
  if (provider === EmailProviderType.OUTLOOK_SMTP || provider === EmailProviderType.OFFICE365_OAUTH2) {
    return "outlook.office365.com";
  }
  return smtpHost.replace(/^smtp/i, "imap");
}

/** Leitura real da caixa de entrada por IMAP (mesma conta e senha de app usadas no envio). */
export const imapFetcher: InboxFetcher = async (afterUid, limit) => {
  const creds = await EmailService.getMailboxCredentials();
  if (!creds.user || !creds.pass) {
    throw new InboxError("Configure o usuário e a senha de app do e-mail antes de ler a caixa de entrada.");
  }

  const client = new ImapFlow({
    host: imapHostFor(creds.provider, creds.smtpHost),
    port: 993,
    secure: true,
    auth: { user: creds.user, pass: creds.pass },
    logger: false,
  });

  const out: RawInboxMessage[] = [];
  try {
    await client.connect();
    const lock = await client.getMailboxLock(MAILBOX);
    try {
      const exists = client.mailbox && typeof client.mailbox === "object" ? client.mailbox.exists : 0;
      if (exists > 0) {
        const byUid = afterUid > 0;
        const range = byUid ? `${afterUid + 1}:*` : `${Math.max(1, exists - limit + 1)}:*`;
        for await (const msg of client.fetch(range, { uid: true, source: true, internalDate: true }, { uid: byUid })) {
          if (msg.uid <= afterUid || !msg.source) continue; // "N:*" sempre devolve a última mesmo sem novas
          const parsed = await simpleParser(msg.source);
          const from = parsed.from?.value?.[0];
          const toText = Array.isArray(parsed.to) ? parsed.to.map((t) => t.text).join(", ") : parsed.to?.text || "";
          out.push({
            uid: msg.uid,
            messageId: parsed.messageId || undefined,
            inReplyTo: typeof parsed.inReplyTo === "string" ? parsed.inReplyTo : undefined,
            fromName: from?.name || undefined,
            fromAddress: from?.address || "desconhecido",
            to: toText,
            subject: parsed.subject || "(sem assunto)",
            text: parsed.text || undefined,
            html: typeof parsed.html === "string" ? parsed.html : undefined,
            date: parsed.date || (msg.internalDate instanceof Date ? msg.internalDate : new Date()),
          });
        }
      }
    } finally {
      lock.release();
    }
    await client.logout();
  } catch (error) {
    try {
      await client.close();
    } catch {
      // conexão já encerrada
    }
    if (error instanceof InboxError) throw error;
    const msg = error instanceof Error ? error.message : "Falha desconhecida";
    throw new InboxError(
      `Não foi possível ler a caixa de entrada (${msg}). Confira a senha de app e se o IMAP está ativado no Gmail (Configurações > Encaminhamento e POP/IMAP).`
    );
  }
  return out;
};

/**
 * Caixa de entrada do console admin: sincroniza do servidor IMAP, lista, abre e responde.
 * O conteúdo recebido é dado não confiável: o HTML só é exibido em iframe isolado (sandbox).
 */
export class InboxService {
  static async sync(fetcher: InboxFetcher = imapFetcher, limit = FIRST_SYNC_LIMIT) {
    // Remove eventuais mensagens antigas que não sejam do Tomadix (ex.: promoções pessoais da conta IMAP)
    await db.emailMessage.deleteMany({
      where: {
        mailbox: MAILBOX,
        NOT: TOMADIX_DB_FILTER,
      },
    });

    const last = await db.emailMessage.findFirst({
      where: { mailbox: MAILBOX },
      orderBy: { uid: "desc" },
      select: { uid: true },
    });
    const rawMessages = await fetcher(last?.uid ?? 0, limit);
    const messages = rawMessages.filter((m) => isTomadixMessage(m));

    if (messages.length === 0) {
      return { fetched: rawMessages.length, saved: 0 };
    }

    const result = await db.emailMessage.createMany({
      data: messages.map((m) => ({
        mailbox: MAILBOX,
        uid: m.uid,
        messageId: m.messageId ?? null,
        inReplyTo: m.inReplyTo ?? null,
        fromName: m.fromName ?? null,
        fromAddress: m.fromAddress.slice(0, 320),
        toAddresses: m.to.slice(0, 1000),
        subject: m.subject.slice(0, 998),
        snippet: makeSnippet(m.text, m.html),
        textBody: m.text ? m.text.slice(0, MAX_TEXT) : null,
        htmlBody: m.html ? m.html.slice(0, MAX_HTML) : null,
        receivedAt: m.date,
      })),
      skipDuplicates: true,
    });
    return { fetched: rawMessages.length, saved: result.count };
  }

  static async list(options: { page?: number; limit?: number; unreadOnly?: boolean } = {}) {
    const limit = Math.min(Math.max(options.limit ?? 25, 1), 100);
    const page = Math.max(options.page ?? 1, 1);
    const where = {
      mailbox: MAILBOX,
      ...TOMADIX_DB_FILTER,
      ...(options.unreadOnly ? { isRead: false } : {}),
    };
    const [items, total, unread] = await Promise.all([
      db.emailMessage.findMany({
        where,
        orderBy: { receivedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          fromName: true,
          fromAddress: true,
          subject: true,
          snippet: true,
          receivedAt: true,
          isRead: true,
        },
      }),
      db.emailMessage.count({ where }),
      db.emailMessage.count({ where: { mailbox: MAILBOX, ...TOMADIX_DB_FILTER, isRead: false } }),
    ]);
    return { items, total, unread, page, totalPages: Math.max(1, Math.ceil(total / limit)) };
  }

  /** Abre a mensagem e a marca como lida. */
  static async get(id: string): Promise<EmailMessage | null> {
    const message = await db.emailMessage.findUnique({ where: { id } });
    if (message && !message.isRead) {
      await db.emailMessage.update({ where: { id }, data: { isRead: true } });
      return { ...message, isRead: true };
    }
    return message;
  }

  static async setRead(id: string, isRead: boolean) {
    await db.emailMessage.update({ where: { id }, data: { isRead } });
  }

  /** Responde ao remetente, mantendo o encadeamento (In-Reply-To / References). */
  static async reply(id: string, body: string) {
    const original = await db.emailMessage.findUnique({ where: { id } });
    if (!original) throw new InboxError("Mensagem não encontrada.");
    const text = body.trim();
    if (!text) throw new InboxError("Escreva a resposta antes de enviar.");

    const subject = /^re:/i.test(original.subject) ? original.subject : `Re: ${original.subject}`;
    const html = text
      .split(/\n{2,}/)
      .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
      .join("");

    return EmailService.sendMail({
      to: original.fromAddress,
      subject,
      html,
      text,
      inReplyTo: original.messageId || undefined,
      references: original.messageId || undefined,
    });
  }
}
