import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser, AuthorizationError, NotFoundError } from "@/lib/auth";
import { WorkspaceService } from "@/modules/workspaces/workspace.service";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id: workspaceId } = await params;
    const user = await requireCurrentUser();

    const workspace = await WorkspaceService.getWorkspaceDetails(workspaceId, user.id);

    return NextResponse.json({ data: workspace });
  } catch (error: any) {
    if (error.statusCode === 401) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("Erro ao obter detalhes do workspace:", error);
    return NextResponse.json({ error: "Erro interno ao buscar workspace." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: workspaceId } = await params;
    const user = await requireCurrentUser();
    const body = await request.json();

    const updated = await WorkspaceService.updateWorkspace(workspaceId, user.id, {
      name: body.name,
      settings: body.settings,
      isArchived: body.isArchived,
    });

    return NextResponse.json({
      message: "Workspace atualizado com sucesso.",
      data: updated,
    });
  } catch (error: any) {
    if (error.statusCode === 401) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("Erro ao atualizar workspace:", error);
    return NextResponse.json(
      { error: error?.message || "Erro ao atualizar workspace." },
      { status: error?.statusCode || 400 }
    );
  }
}
