import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser, AuthorizationError, NotFoundError } from "@/lib/auth";
import { WorkspaceService } from "@/modules/workspaces/workspace.service";
import { updateMemberRoleSchema } from "@/modules/auth/auth.schema";
import { ZodError } from "zod";

type RouteParams = {
  params: Promise<{ id: string; memberId: string }>;
};

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: workspaceId, memberId } = await params;
    const user = await requireCurrentUser();
    const body = await request.json();

    const validated = updateMemberRoleSchema.parse(body);

    const updated = await WorkspaceService.updateMemberRole(
      workspaceId,
      user.id,
      memberId,
      validated.role
    );

    return NextResponse.json({
      message: "Papel do membro atualizado com sucesso.",
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
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Dados inválidos.",
          issues: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        },
        { status: 422 }
      );
    }
    console.error("Erro ao atualizar papel do membro:", error);
    return NextResponse.json({ error: error?.message || "Erro ao atualizar membro." }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id: workspaceId, memberId } = await params;
    const user = await requireCurrentUser();

    await WorkspaceService.removeMember(workspaceId, user.id, memberId);

    return NextResponse.json({
      message: "Membro removido do workspace com sucesso.",
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
    console.error("Erro ao remover membro:", error);
    return NextResponse.json({ error: error?.message || "Erro ao remover membro." }, { status: 400 });
  }
}
