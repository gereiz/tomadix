import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { InboxService, InboxError } from "@/modules/email/inbox.service";

export const dynamic = "force-dynamic";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("sync") }),
  z.object({ action: z.literal("reply"), id: z.string().min(1), body: z.string().trim().min(1).max(20000) }),
  z.object({ action: z.literal("read"), id: z.string().min(1), isRead: z.boolean() }),
]);

function handleError(error: unknown) {
  if (error instanceof AuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 });
  if (error instanceof AuthenticationError) return NextResponse.json({ error: error.message }, { status: 401 });
  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: error.issues[0]?.message || "Dados inválidos." }, { status: 422 });
  }
  if (error instanceof InboxError) return NextResponse.json({ error: error.message }, { status: 400 });
  console.error("Erro na caixa de entrada:", error);
  return NextResponse.json({ error: error instanceof Error ? error.message : "Erro na caixa de entrada." }, { status: 500 });
}

/** Lista as mensagens recebidas ou, com ?id=, abre uma (e marca como lida). */
export async function GET(request: NextRequest) {
  try {
    await requirePlatformAdmin("settings:manage");
    const id = request.nextUrl.searchParams.get("id");
    if (id) {
      const message = await InboxService.get(id);
      if (!message) return NextResponse.json({ error: "Mensagem não encontrada." }, { status: 404 });
      return NextResponse.json({ message });
    }
    const page = Number(request.nextUrl.searchParams.get("page") || 1);
    const unreadOnly = request.nextUrl.searchParams.get("unread") === "1";
    return NextResponse.json(await InboxService.list({ page: Number.isFinite(page) ? page : 1, unreadOnly }));
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requirePlatformAdmin("settings:manage");
    const input = actionSchema.parse(await request.json());

    if (input.action === "sync") {
      const result = await InboxService.sync();
      return NextResponse.json({
        success: true,
        ...result,
        message: result.saved > 0 ? `${result.saved} nova(s) mensagem(ns) recebida(s).` : "Nenhuma mensagem nova.",
      });
    }
    if (input.action === "reply") {
      const result = await InboxService.reply(input.id, input.body);
      if (!result.success) {
        return NextResponse.json({ error: result.message || "Resposta não enviada." }, { status: 400 });
      }
      return NextResponse.json({ success: true, message: "Resposta enviada." });
    }
    await InboxService.setRead(input.id, input.isRead);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error);
  }
}
