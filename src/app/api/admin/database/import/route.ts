import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { AdminDatabaseDumpService } from "@/modules/admin/admin-database-dump.service";

const MAX_DUMP_BYTES = 100 * 1024 * 1024;

/** Importa um dump do Tomadix (multipart: `file` e, opcional, `targetUrl`) em um banco vazio. */
export async function POST(request: NextRequest) {
  try {
    const admin = await requirePlatformAdmin("settings:manage");

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Envie o arquivo de dump (.json)." }, { status: 400 });
    }
    if (file.size > MAX_DUMP_BYTES) {
      return NextResponse.json({ error: "Arquivo acima de 100 MB." }, { status: 413 });
    }
    const rawTarget = form.get("targetUrl");
    const targetUrl = typeof rawTarget === "string" ? rawTarget.trim() : "";

    let dump: unknown;
    try {
      dump = JSON.parse(await file.text());
    } catch {
      return NextResponse.json({ error: "Arquivo inválido: o conteúdo não é JSON." }, { status: 400 });
    }

    const result = await AdminDatabaseDumpService.importDump(dump, targetUrl || undefined, admin.id);
    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    if (error instanceof AuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof AuthenticationError) return NextResponse.json({ error: error.message }, { status: 401 });
    console.error("Erro ao importar dump do banco:", error);
    const message = error instanceof Error ? error.message : "Erro ao importar o dump.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
