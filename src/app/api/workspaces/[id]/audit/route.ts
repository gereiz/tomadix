import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser, AuthorizationError } from "@/lib/auth";
import { WorkspaceService } from "@/modules/workspaces/workspace.service";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id: workspaceId } = await params;
    const user = await requireCurrentUser();

    const logs = await WorkspaceService.getAuditLogs(workspaceId, user.id);

    return NextResponse.json({
      data: logs,
      total: logs.length,
    });
  } catch (error: any) {
    if (error.statusCode === 401) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Erro ao consultar logs de auditoria:", error);
    return NextResponse.json({ error: "Erro ao buscar auditoria." }, { status: 500 });
  }
}
