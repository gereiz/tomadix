import { parseJsonBody, changeConnectionBodySchema } from "@/lib/api-validation";
import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { AdminDatabaseService } from "@/modules/admin/admin-database.service";

/** Prévia do .env que seria gravado (nada é alterado). */
export async function POST(request: NextRequest) {
  try {
    await requirePlatformAdmin("settings:manage");
    const parsed = await parseJsonBody(request, changeConnectionBodySchema);
    if (parsed.response) return parsed.response;

    return NextResponse.json(AdminDatabaseService.previewEnv(parsed.data));
  } catch (error: any) {
    if (error instanceof AuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof AuthenticationError) return NextResponse.json({ error: error.message }, { status: 401 });
    return NextResponse.json({ error: error?.message || "Erro ao gerar prévia do .env." }, { status: 500 });
  }
}
