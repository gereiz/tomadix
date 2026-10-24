import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError, getClientContext } from "@/lib/auth";
import { AdminProjectsService } from "@/modules/admin/admin-projects.service";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requirePlatformAdmin();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const ctx = await getClientContext();

    if (!body.targetWorkspaceId) {
      return NextResponse.json(
        { error: "Workspace de destino não informado." },
        { status: 400 }
      );
    }

    const updated = await AdminProjectsService.transferProject(
      admin.id,
      id,
      body.targetWorkspaceId,
      body.reason || "Transferência administrativa de workspace",
      { ip: ctx.ipAddress, ua: ctx.userAgent }
    );

    return NextResponse.json({
      message: "Projeto transferido para o novo workspace com sucesso.",
      project: updated,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao transferir projeto." },
      { status: 400 }
    );
  }
}
