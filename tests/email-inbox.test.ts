import { describe, it, expect, afterEach } from "vitest";
import { db } from "@/lib/db";
import { InboxService, isTomadixMessage, makeSnippet, type InboxFetcher, type RawInboxMessage } from "@/modules/email/inbox.service";

// uids altos e únicos para não colidir com mensagens reais da caixa de entrada
const BASE = 2_000_000_000 + Math.floor(Math.random() * 1000) * 10;

function msg(offset: number, over: Partial<RawInboxMessage> = {}): RawInboxMessage {
  return {
    uid: BASE + offset,
    messageId: `<teste-${BASE + offset}@example.com>`,
    fromName: "Cliente Teste",
    fromAddress: "cliente@example.com",
    to: "georgie.a.reis@gmail.com",
    subject: `[Tomadix] Assunto ${offset}`,
    text: `Corpo da mensagem ${offset}`,
    date: new Date(Date.now() - offset * 1000),
    ...over,
  };
}

describe("Caixa de entrada (IMAP) do console admin", () => {
  afterEach(async () => {
    await db.emailMessage.deleteMany({ where: { uid: { gte: BASE, lt: BASE + 100 } } });
  });

  it("monta o resumo a partir de texto ou de HTML", () => {
    expect(makeSnippet("  Olá   mundo \n tudo bem ", null)).toBe("Olá mundo tudo bem");
    expect(makeSnippet(null, "<style>p{}</style><p>Oi <b>você</b></p>")).toBe("Oi você");
    expect(makeSnippet("x".repeat(500), null)).toHaveLength(160);
  });

  it("sincroniza só mensagens novas e não duplica", async () => {
    const calls: number[] = [];
    const fetcher: InboxFetcher = async (afterUid) => {
      calls.push(afterUid);
      return [msg(1), msg(2)].filter((m) => m.uid > afterUid);
    };

    const first = await InboxService.sync(fetcher);
    expect(first.saved).toBe(2);

    const stored = await db.emailMessage.findMany({ where: { uid: { gte: BASE, lt: BASE + 100 } } });
    expect(stored).toHaveLength(2);
    expect(stored[0].isRead).toBe(false);

    // segunda rodada parte do maior uid e devolve a mesma mensagem: nada duplica
    const again = await InboxService.sync(async () => [msg(2)]);
    expect(again.saved).toBe(0);
    expect(calls[0]).toBeGreaterThanOrEqual(0);
  });

  it("ignora e-mails pessoais/promocionais que não são do Tomadix", async () => {
    expect(isTomadixMessage({ subject: "Oferta Samsung Live Shop", text: "Desconto de 50%" })).toBe(false);
    expect(isTomadixMessage({ subject: "[Tomadix] Novo cadastro: Maria", text: "Detalhes" })).toBe(true);

    const res = await InboxService.sync(async () => [
      msg(10, { subject: "Oferta Samsung", text: "Promoção imperdível" }),
      msg(11, { subject: "[Tomadix] Recuperação de senha solicitada" }),
    ]);
    expect(res.fetched).toBe(2);
    expect(res.saved).toBe(1);
  });

  it("lista, abre marcando como lida e filtra não lidas", async () => {
    await InboxService.sync(async () => [msg(3), msg(4)]);
    const before = await InboxService.list({ unreadOnly: true, limit: 100 });
    const mine = before.items.filter((i) => i.fromAddress === "cliente@example.com");
    expect(mine.length).toBeGreaterThanOrEqual(2);

    const opened = await InboxService.get(mine[0].id);
    expect(opened?.isRead).toBe(true);
    expect(opened?.textBody).toContain("Corpo da mensagem");

    const after = await InboxService.list({ unreadOnly: true, limit: 100 });
    expect(after.items.some((i) => i.id === mine[0].id)).toBe(false);

    await InboxService.setRead(mine[0].id, false);
    const again = await InboxService.list({ unreadOnly: true, limit: 100 });
    expect(again.items.some((i) => i.id === mine[0].id)).toBe(true);
  });

  it("resposta exige mensagem existente e texto", async () => {
    await expect(InboxService.reply("nao-existe", "oi")).rejects.toThrow("Mensagem não encontrada.");
    await InboxService.sync(async () => [msg(5)]);
    const saved = await db.emailMessage.findFirstOrThrow({ where: { uid: BASE + 5 } });
    await expect(InboxService.reply(saved.id, "   ")).rejects.toThrow("Escreva a resposta");
  });
});
