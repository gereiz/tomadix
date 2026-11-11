import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { parseJsonBody } from "@/lib/api-validation";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { AdminDatabaseDumpService, dumpToSql } from "@/modules/admin/admin-database-dump.service";

const exportBodySchema = z.object({
  // Vazio = banco que o app usa agora.
  sourceUrl: z.string().trim().optional(),
  // pgdump = SQL completo (estrutura + dados) do pg_dump; sql = só dados, gerado pelo Tomadix; json = importação pela tela.
  format: z.enum(["pgdump", "sql", "json"]).default("json"),
});

/** Gera o dump (JSON) do banco e devolve como download. Contém dados sensíveis: só admin com settings:manage. */
export async function POST(request: NextRequest) {
  try {
    const admin = await requirePlatformAdmin("settings:manage");
    const parsed = await parseJsonBody(request, exportBodySchema);
    if (parsed.response) return parsed.response;

    const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 13);

    if (parsed.data.format === "pgdump") {
      const sql = await AdminDatabaseDumpService.pgDump(parsed.data.sourceUrl, admin.id);
      return new NextResponse(new Uint8Array(sql), {
        headers: {
          "Content-Type": "application/sql; charset=utf-8",
          "Content-Disposition": `attachment; filename="tomadix-pgdump-${stamp}.sql"`,
          "Cache-Control": "no-store",
          "X-Dump-Total-Rows": "pg_dump",
        },
      });
    }

    const { dump, tables, warnings } = await AdminDatabaseDumpService.exportDump(parsed.data.sourceUrl, admin.id);

    const isSql = parsed.data.format === "sql";
    return new NextResponse(isSql ? dumpToSql(dump) : JSON.stringify(dump), {
      headers: {
        "Content-Type": isSql ? "application/sql; charset=utf-8" : "application/json",
        "Content-Disposition": `attachment; filename="tomadix-dump-${stamp}.${isSql ? "sql" : "json"}"`,
        "Cache-Control": "no-store",
        "X-Dump-Total-Rows": String(tables.reduce((s, t) => s + t.rows, 0)),
        "X-Dump-Warnings": encodeURIComponent(warnings.join(" | ")),
      },
    });
  } catch (error: unknown) {
    if (error instanceof AuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof AuthenticationError) return NextResponse.json({ error: error.message }, { status: 401 });
    console.error("Erro ao exportar dump do banco:", error);
    const message = error instanceof Error ? error.message : "Erro ao exportar o banco de dados.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
