import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { EmailService } from "@/modules/email/email.service";
import { z } from "zod";

export const dynamic = "force-dynamic";

const saveSettingsSchema = z.object({
  provider: z.enum(["GMAIL_SMTP", "OUTLOOK_SMTP", "CUSTOM_SMTP", "OFFICE365_OAUTH2", "GMAIL_OAUTH2"]),
  isEnabled: z.boolean(),
  smtpHost: z.string().trim().optional(),
  smtpPort: z.number().int().min(1).max(65535).optional(),
  smtpSecure: z.boolean().optional(),
  smtpUser: z.string().trim().optional(),
  smtpPassword: z.string().optional(),
  clientId: z.string().trim().optional(),
  clientSecret: z.string().optional(),
  refreshToken: z.string().optional(),
  tenantId: z.string().trim().optional(),
  senderEmail: z.string().trim().email("E-mail do remetente inválido."),
  senderName: z.string().trim().min(2, "Nome do remetente deve ter no mínimo 2 caracteres."),
  replyTo: z.string().trim().email("E-mail de resposta inválido.").optional().or(z.literal("")),
});

export async function GET() {
  try {
    await requirePlatformAdmin("settings:manage");
    const settings = await EmailService.getMaskedSettings();
    const logs = await EmailService.getLogs(30);

    return NextResponse.json({
      success: true,
      settings,
      logs,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao consultar configurações de e-mail." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requirePlatformAdmin("settings:manage");
    const body = await request.json().catch(() => ({}));
    const validated = saveSettingsSchema.parse(body);

    const updated = await EmailService.saveSettings({
      ...validated,
      replyTo: validated.replyTo || undefined,
    });

    const masked = await EmailService.getMaskedSettings();

    return NextResponse.json({
      success: true,
      message: "Configurações de e-mail salvas com sucesso!",
      settings: masked,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || "Dados de configuração inválidos." },
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
      { error: error?.message || "Erro ao salvar configurações de e-mail." },
      { status: 500 }
    );
  }
}

