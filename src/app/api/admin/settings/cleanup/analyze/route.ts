import { NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { PlatformSettingsService } from "@/modules/admin/platform-settings.service";

export async function POST() {
  try {
    await requirePlatformAdmin("settings:manage");
    const analysis = await PlatformSettingsService.analyzeTestData();
    return NextResponse.json({ success: true, analysis });
  } catch (error: any) {
    if (error instanceof AuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof AuthenticationError) return NextResponse.json({ error: error.message }, { status: 401 });
    return NextResponse.json({ error: error?.message || "Erro ao analisar dados de teste." }, { status: 500 });
  }
}

