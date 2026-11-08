import { parseJsonBody, connectionInputBodySchema } from "@/lib/api-validation";
import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { AdminDatabaseService } from "@/modules/admin/admin-database.service";
import { AdminAuditService } from "@/modules/admin/admin-audit.service";

export async function POST(request: NextRequest) {
  try {
    const admin = await requirePlatformAdmin("settings:manage");
    // Corpo vazio indica teste da conexão atual
    const parsed = await parseJsonBody(request, connectionInputBodySchema);
    if (parsed.response) return parsed.response;
    const targetInput = Object.keys(parsed.data).length > 0 ? parsed.data : undefined;

    const result = await AdminDatabaseService.testConnection(targetInput);

    // Registrar auditoria sem expor senhas
    await AdminAuditService.logAction({
      adminUserId: admin.id,
      action: "DATABASE_CONNECTION_TESTED",
      targetType: "DATABASE_INFRASTRUCTURE",
      targetId: result.databaseName || "CURRENT_DB",
      details: {
        success: result.success,
        status: result.status,
        totalLatencyMs: result.totalLatencyMs,
        isCustomTarget: !!targetInput,
        hostMasked: result.hostMasked,
      },
    });

    return NextResponse.json({ test: result });
  } catch (error: any) {
    if (error instanceof AuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof AuthenticationError) return NextResponse.json({ error: error.message }, { status: 401 });
    return NextResponse.json({ error: error?.message || "Erro ao testar conexão." }, { status: 500 });
  }
}

