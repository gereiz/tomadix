import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { EmailService } from "@/modules/email/email.service";
import { z } from "zod";

export const dynamic = "force-dynamic";

const testSendSchema = z.object({
  recipient: z.string().trim().email("E-mail de destinatário inválido."),
});

export async function POST(request: NextRequest) {
  try {
    const adminUser = await requirePlatformAdmin("settings:manage");
    const body = await request.json().catch(() => ({}));
    const { recipient } = testSendSchema.parse(body);

    const result = await EmailService.sendTestEmail(recipient, adminUser.email);

    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || "E-mail inválido." },
        { status: 400 }
      );
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Falha ao enviar e-mail de teste." },
      { status: 500 }
    );
  }
}

