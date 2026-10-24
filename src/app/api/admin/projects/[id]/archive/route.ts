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

    const action = body.action || "archive"; // "archive" ou "unarchive"

    if (action === "unarchive") {
      const updated = await AdminProjectsService.unarchiveProject(
        admin.id,
        id,
        { ip: ctx.ipAddress, ua: ctx.userAgent }
      );
      return NextResponse.json({
        message: "Projeto desarquivado com sucesso.",
        project: updated,
      });
    }

    const updated = await AdminProjectsService.archiveProject(
      admin.id,
      id,
      body.reason || "Arquivado pela administração da plataforma",
      { ip: ctx.ipAddress, ua: ctx.userAgent }
    );

    return NextResponse.json({
      message: "Projeto arquivado com sucesso.",
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
      { error: error?.message || "Erro ao atualizar status de arquivamento do projeto." },
      { status: 400 }
    );
  }
}
