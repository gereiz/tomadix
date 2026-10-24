import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError, getClientContext } from "@/lib/auth";
import { AdminProjectsService } from "@/modules/admin/admin-projects.service";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requirePlatformAdmin();
    const { id } = await params;

    const details = await AdminProjectsService.getProjectDetails(id);
    return NextResponse.json(details);
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao consultar detalhes do projeto." },
      { status: 404 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requirePlatformAdmin();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const ctx = await getClientContext();

    const result = await AdminProjectsService.deleteProject(
      admin.id,
      id,
      body.reason || "Exclusão solicitada pela administração",
      { ip: ctx.ipAddress, ua: ctx.userAgent }
    );

    return NextResponse.json({
      message: "Projeto excluído com sucesso da plataforma.",
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
      { error: error?.message || "Erro ao excluir projeto." },
      { status: 400 }
    );
  }
}
