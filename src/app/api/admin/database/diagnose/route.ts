import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { AdminDatabaseService } from "@/modules/admin/admin-database.service";

export async function GET() {
  try {
    await requirePlatformAdmin("settings:manage");
    const diagnosis = await AdminDatabaseService.diagnoseDatabase();
    return NextResponse.json({ diagnosis });
  } catch (error: any) {
    if (error instanceof AuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof AuthenticationError) return NextResponse.json({ error: error.message }, { status: 401 });
    return NextResponse.json({ error: error?.message || "Erro ao realizar diagnóstico do banco de dados." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requirePlatformAdmin("settings:manage");
    let targetUrl: string | undefined;
    try {
      const body = await request.json();
      if (body?.targetUrl) targetUrl = body.targetUrl;
    } catch {}

    const diagnosis = await AdminDatabaseService.diagnoseDatabase(targetUrl);
    return NextResponse.json({ diagnosis });
  } catch (error: any) {
    if (error instanceof AuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof AuthenticationError) return NextResponse.json({ error: error.message }, { status: 401 });
    return NextResponse.json({ error: error?.message || "Erro ao realizar diagnóstico do banco de dados." }, { status: 500 });
  }
}

