import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { AdminDatabaseService } from "@/modules/admin/admin-database.service";

export async function POST(request: NextRequest) {
  try {
    const admin = await requirePlatformAdmin("settings:manage");
    const body = await request.json();

    if (!body || (!body.url && !body.host)) {
      return NextResponse.json(
        { error: "É necessário fornecer a URL de conexão ou o host e credenciais." },
        { status: 400 }
      );
    }

    const result = await AdminDatabaseService.changeConnection(body, admin.id);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof AuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof AuthenticationError) return NextResponse.json({ error: error.message }, { status: 401 });
    return NextResponse.json({ error: error?.message || "Erro ao alterar conexão do banco de dados." }, { status: 500 });
  }
}

