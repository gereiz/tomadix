import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { PlatformSettingsService } from "@/modules/admin/platform-settings.service";

export async function POST(request: NextRequest) {
  try {
    const admin = await requirePlatformAdmin("settings:manage");
    const body = await request.json();

    if (!body?.confirmationPhrase) {
      return NextResponse.json(
        { error: "É obrigatório fornecer a frase de confirmação de segurança." },
        { status: 400 }
      );
    }

    const report = await PlatformSettingsService.executeTestDataCleanup(
      admin.id,
      body.confirmationPhrase
    );

    return NextResponse.json({ success: true, report });
  } catch (error: any) {
    if (error instanceof AuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof AuthenticationError) return NextResponse.json({ error: error.message }, { status: 401 });
    return NextResponse.json(
      { error: error?.message || "Erro ao executar a limpeza de dados de teste." },
      { status: 500 }
    );
  }
}

