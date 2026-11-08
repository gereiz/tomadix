import { parseJsonBody, initializeDatabaseBodySchema } from "@/lib/api-validation";
import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { AdminDatabaseService } from "@/modules/admin/admin-database.service";

export async function POST(request: NextRequest) {
  try {
    const admin = await requirePlatformAdmin("settings:manage");
    const parsed = await parseJsonBody(request, initializeDatabaseBodySchema);
    if (parsed.response) return parsed.response;

    const report = await AdminDatabaseService.initializeDatabase(parsed.data, admin.id);
    return NextResponse.json({ report });
  } catch (error: any) {
    if (error instanceof AuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof AuthenticationError) return NextResponse.json({ error: error.message }, { status: 401 });
    return NextResponse.json({ error: error?.message || "Erro durante a inicialização do banco de dados." }, { status: 500 });
  }
}

