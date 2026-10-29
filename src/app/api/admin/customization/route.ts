import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { PlatformSettingsService } from "@/modules/admin/platform-settings.service";

export async function GET() {
  try {
    await requirePlatformAdmin("customization:manage");
    const customization = await PlatformSettingsService.getCustomization();
    return NextResponse.json({ customization });
  } catch (error: any) {
    if (error instanceof AuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof AuthenticationError) return NextResponse.json({ error: error.message }, { status: 401 });
    return NextResponse.json({ error: error?.message || "Erro ao obter personalização." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = await requirePlatformAdmin("customization:manage");
    const body = await request.json();

    const updated = await PlatformSettingsService.updateCustomization(body, admin.id);
    return NextResponse.json({ success: true, customization: updated });
  } catch (error: any) {
    if (error instanceof AuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof AuthenticationError) return NextResponse.json({ error: error.message }, { status: 401 });
    return NextResponse.json({ error: error?.message || "Erro ao salvar personalização." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requirePlatformAdmin("customization:manage");
    const body = await request.json();

    if (body.action === "reset") {
      const reset = await PlatformSettingsService.resetCustomization(admin.id);
      return NextResponse.json({ success: true, customization: reset });
    }

    return NextResponse.json({ error: "Ação não suportada." }, { status: 400 });
  } catch (error: any) {
    if (error instanceof AuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof AuthenticationError) return NextResponse.json({ error: error.message }, { status: 401 });
    return NextResponse.json({ error: error?.message || "Erro ao executar ação." }, { status: 500 });
  }
}

