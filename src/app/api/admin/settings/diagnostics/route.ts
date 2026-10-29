import { NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { PlatformSettingsService } from "@/modules/admin/platform-settings.service";

export async function GET() {
  try {
    await requirePlatformAdmin("settings:manage");
    const diagnostics = await PlatformSettingsService.getDiagnostics();
    return NextResponse.json({ success: true, diagnostics });
  } catch (error: any) {
    if (error instanceof AuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof AuthenticationError) return NextResponse.json({ error: error.message }, { status: 401 });
    return NextResponse.json(
      { error: error?.message || "Erro ao consultar diagnósticos do sistema." },
      { status: 500 }
    );
  }
}

