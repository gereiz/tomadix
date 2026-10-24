import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspace, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { ProjectService } from "@/modules/projects/project.service";
import { updateProjectSchema } from "@/lib/schemas/project";
import { ZodError } from "zod";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { workspace } = await getCurrentWorkspace(null, "projects:read");

    const project = await ProjectService.getProjectById(id, workspace.id);
    if (!project) {
      return NextResponse.json({ error: "Projeto não encontrado." }, { status: 404 });
    }

    return NextResponse.json({ data: project });
  } catch (error: any) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Erro ao obter projeto:", error);
    return NextResponse.json({ error: "Erro interno ao buscar projeto." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { workspace } = await getCurrentWorkspace(null, "projects:update");

    const body = await request.json();
    const validatedData = updateProjectSchema.parse(body);

    const existing = await ProjectService.getProjectById(id, workspace.id);
    if (!existing) {
      return NextResponse.json({ error: "Projeto não encontrado ou acesso negado." }, { status: 404 });
    }

    const updated = await ProjectService.updateProject(id, workspace.id, validatedData);

    return NextResponse.json({
      message: "Projeto atualizado com sucesso.",
      data: updated,
    });
  } catch (error: any) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Dados inválidos para atualização.",
          issues: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        },
        { status: 422 }
      );
    }
    console.error("Erro ao atualizar projeto:", error);
    return NextResponse.json({ error: "Erro interno ao atualizar projeto." }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { workspace } = await getCurrentWorkspace(null, "projects:delete");

    const existing = await ProjectService.getProjectById(id, workspace.id);
    if (!existing) {
      return NextResponse.json({ error: "Projeto não encontrado ou acesso negado." }, { status: 404 });
    }

    await ProjectService.deleteProject(id, workspace.id);

    return NextResponse.json({ message: "Projeto excluído com sucesso." });
  } catch (error: any) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Erro ao excluir projeto:", error);
    return NextResponse.json({ error: "Erro interno ao excluir projeto." }, { status: 500 });
  }
}
