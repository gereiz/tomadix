import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { GeminiKeyManagerService } from "@/modules/ai/gemini-key-manager.service";

export async function GET() {
  try {
    await requirePlatformAdmin("settings:manage");
    const settings = await GeminiKeyManagerService.getSettings();

    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao consultar configurações do Gemini." },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const adminUser = await requirePlatformAdmin("settings:manage");
    const body = await request.json().catch(() => ({}));

    const updated = await GeminiKeyManagerService.updateSettings(body, adminUser.id);

    return NextResponse.json({
      success: true,
      message: "Configurações de failover e Circuit Breaker atualizadas com sucesso.",
      settings: updated,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao atualizar configurações do Gemini." },
      { status: 500 }
    );
  }
}

