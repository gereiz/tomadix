import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { AdminProjectsService } from "@/modules/admin/admin-projects.service";

export async function POST(request: NextRequest) {
  try {
    const adminUser = await requirePlatformAdmin("projects:manage");
    const body = await request.json().catch(() => ({}));

    if (!Array.isArray(body.projectIds) || body.projectIds.length === 0) {
      return NextResponse.json({ error: "projectIds deve ser uma lista não vazia." }, { status: 400 });
    }
    if (!body.targetWorkspaceId) {
      return NextResponse.json({ error: "targetWorkspaceId é obrigatório." }, { status: 400 });
    }

    const clientContext = request.headers.get("x-forwarded-for") || undefined;
    const userAgent = request.headers.get("user-agent") || undefined;

    const result = await AdminProjectsService.transferProjectsBatch(
      adminUser.id,
      body.projectIds,
      body.targetWorkspaceId,
      body.reason || "Transferência em lote administrativa",
      { allowLimitOverride: Boolean(body.allowLimitOverride) },
      { ip: clientContext, ua: userAgent }
    );

    return NextResponse.json({
      success: true,
      message: `${result.transferredCount} projeto(s) transferido(s) com sucesso.`,
      result,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao transferir projetos em lote." },
      { status: 400 }
    );
  }
}
