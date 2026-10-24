import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { WorkspaceService } from "@/modules/workspaces/workspace.service";
import { createWorkspaceSchema } from "@/modules/auth/auth.schema";
import { ZodError } from "zod";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    const workspaces = await WorkspaceService.getUserWorkspaces(user.id);

    return NextResponse.json({
      data: workspaces,
      total: workspaces.length,
    });
  } catch (error: any) {
    if (error.statusCode === 401) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Erro ao listar workspaces:", error);
    return NextResponse.json({ error: "Erro ao buscar workspaces." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const body = await request.json();
    const validated = createWorkspaceSchema.parse(body);

    const workspace = await WorkspaceService.createWorkspace(user.id, validated.name);

    return NextResponse.json(
      {
        message: "Workspace criado com sucesso.",
        data: workspace,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.statusCode === 401) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Dados inválidos.",
          issues: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        },
        { status: 422 }
      );
    }
    console.error("Erro ao criar workspace:", error);
    return NextResponse.json({ error: "Erro ao criar workspace." }, { status: 500 });
  }
}
