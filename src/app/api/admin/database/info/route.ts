import { NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { AdminDatabaseService } from "@/modules/admin/admin-database.service";

export async function GET() {
  try {
    await requirePlatformAdmin("settings:manage");
    const info = AdminDatabaseService.getCurrentConnectionDetails();
    return NextResponse.json({ connection: info });
  } catch (error: any) {
    if (error instanceof AuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof AuthenticationError) return NextResponse.json({ error: error.message }, { status: 401 });
    return NextResponse.json({ error: error?.message || "Erro ao obter detalhes da conexão com o banco." }, { status: 500 });
  }
}

