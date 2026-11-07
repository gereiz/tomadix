import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspace, assertSpaceAccess, AuthorizationError, AuthenticationError, NotFoundError } from "@/lib/auth";
import { ProjectService } from "@/modules/projects/project.service";
import { updateProjectSchema } from "@/lib/schemas/project";
import { ZodError } from "zod";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { workspace, user, role } = await getCurrentWorkspace(null, "projects:read");

    // Verificação de acesso e carga do projeto são independentes: rodam em paralelo.
    // O acesso é conferido primeiro (lança antes de qualquer retorno de dados).
    const [, project] = await Promise.all([
      assertSpaceAccess(id, workspace.id, user?.id, role, "view"),
      ProjectService.getProjectById(id, workspace.id),
    ]);
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
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("Erro ao obter projeto:", error);
    return NextResponse.json({ error: "Erro interno ao buscar projeto." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { workspace, user, role } = await getCurrentWorkspace(null, "projects:update");

    const body = await request.json();
    const validatedData = updateProjectSchema.parse(body);

    // assertSpaceAccess já lança NotFoundError se o projeto não existir no workspace.
    await assertSpaceAccess(id, workspace.id, user?.id, role, "edit");

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
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
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
