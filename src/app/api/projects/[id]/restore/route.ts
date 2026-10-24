import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspace, AuthorizationError } from "@/lib/auth";
import { ProjectService } from "@/modules/projects/project.service";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { workspace } = await getCurrentWorkspace();

    const existing = await ProjectService.getProjectById(id, workspace.id);
    if (!existing) {
      return NextResponse.json({ error: "Projeto não encontrado." }, { status: 404 });
    }

    const restored = await ProjectService.restoreProject(id, workspace.id);

    return NextResponse.json({
      message: "Projeto restaurado com sucesso.",
      data: restored,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Erro ao restaurar projeto:", error);
    return NextResponse.json({ error: "Erro interno ao restaurar projeto." }, { status: 500 });
  }
}
