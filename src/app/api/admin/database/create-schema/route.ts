import { NextRequest, NextResponse } from "next/server";
import { parseJsonBody, createSchemaBodySchema } from "@/lib/api-validation";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { AdminDatabaseDumpService } from "@/modules/admin/admin-database-dump.service";

/** Cria todas as tabelas (prisma/schema.sql) no banco da conexão informada e, opcionalmente, o administrador inicial. */
export async function POST(request: NextRequest) {
  try {
    const admin = await requirePlatformAdmin("settings:manage");
    const parsed = await parseJsonBody(request, createSchemaBodySchema);
    if (parsed.response) return parsed.response;

    const { adminUser, ...connection } = parsed.data;
    const result = await AdminDatabaseDumpService.createSchema(connection, admin.id, adminUser);
    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    if (error instanceof AuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof AuthenticationError) return NextResponse.json({ error: error.message }, { status: 401 });
    console.error("Erro ao criar as tabelas no banco de destino:", error);
    const message = error instanceof Error ? error.message : "Erro ao criar as tabelas.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
