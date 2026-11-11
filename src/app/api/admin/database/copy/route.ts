import { NextRequest, NextResponse } from "next/server";
import { parseJsonBody, changeConnectionBodySchema } from "@/lib/api-validation";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { AdminDatabaseDumpService } from "@/modules/admin/admin-database-dump.service";

/** Copia o banco ativo para a conexão informada (destino vazio). Não troca a conexão do app. */
export async function POST(request: NextRequest) {
  try {
    const admin = await requirePlatformAdmin("settings:manage");
    const parsed = await parseJsonBody(request, changeConnectionBodySchema);
    if (parsed.response) return parsed.response;

    const result = await AdminDatabaseDumpService.copyToConnection(parsed.data, admin.id);
    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    if (error instanceof AuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof AuthenticationError) return NextResponse.json({ error: error.message }, { status: 401 });
    console.error("Erro ao copiar o banco de dados:", error);
    const message = error instanceof Error ? error.message : "Erro ao copiar o banco de dados.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
