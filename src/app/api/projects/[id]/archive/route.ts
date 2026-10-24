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

    const archived = await ProjectService.archiveProject(id, workspace.id);

    return NextResponse.json({
      message: "Projeto arquivado com sucesso.",
      data: archived,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Erro ao arquivar projeto:", error);
    return NextResponse.json({ error: "Erro interno ao arquivar projeto." }, { status: 500 });
  }
}
