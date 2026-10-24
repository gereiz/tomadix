import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { AdminAuditService } from "@/modules/admin/admin-audit.service";

export async function GET(request: NextRequest) {
  try {
    await requirePlatformAdmin("audit:read");

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || undefined;
    const targetType = searchParams.get("targetType") || undefined;
    const targetId = searchParams.get("targetId") || undefined;
    const adminUserId = searchParams.get("adminUserId") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "25", 10);

    const result = await AdminAuditService.listLogs({
      action,
      targetType,
      targetId,
      adminUserId,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao consultar trilha de auditoria." },
      { status: 500 }
    );
  }
}
