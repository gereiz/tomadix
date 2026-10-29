import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { PlatformSettingsService } from "@/modules/admin/platform-settings.service";

export async function GET() {
  try {
    await requirePlatformAdmin("settings:manage");
    const settings = await PlatformSettingsService.getGeneralSettings();
    return NextResponse.json({ settings });
  } catch (error: any) {
    if (error instanceof AuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof AuthenticationError) return NextResponse.json({ error: error.message }, { status: 401 });
    return NextResponse.json({ error: error?.message || "Erro ao obter configurações gerais." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = await requirePlatformAdmin("settings:manage");
    const body = await request.json();

    const updated = await PlatformSettingsService.updateGeneralSettings(body, admin.id);
    return NextResponse.json({ success: true, settings: updated });
  } catch (error: any) {
    if (error instanceof AuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof AuthenticationError) return NextResponse.json({ error: error.message }, { status: 401 });
    return NextResponse.json({ error: error?.message || "Erro ao salvar configurações gerais." }, { status: 500 });
  }
}

