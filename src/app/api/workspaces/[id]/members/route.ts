import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser, AuthorizationError, NotFoundError } from "@/lib/auth";
import { WorkspaceService } from "@/modules/workspaces/workspace.service";
import { inviteMemberSchema } from "@/modules/auth/auth.schema";
import { ZodError } from "zod";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id: workspaceId } = await params;
    const user = await requireCurrentUser();

    const members = await WorkspaceService.listMembers(workspaceId, user.id);

    return NextResponse.json({
      data: members,
      total: members.length,
    });
  } catch (error: any) {
    if (error.statusCode === 401) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Erro ao listar membros:", error);
    return NextResponse.json({ error: "Erro ao buscar membros." }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: workspaceId } = await params;
    const user = await requireCurrentUser();
    const body = await request.json();

    const validated = inviteMemberSchema.parse(body);

    const membership = await WorkspaceService.addMember(
      workspaceId,
      user.id,
      validated.email,
      validated.role
    );

    return NextResponse.json(
      {
        message: "Membro adicionado com sucesso.",
        data: membership,
      },
      { status: 201 }
    );
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
    console.error("Erro ao adicionar membro:", error);
    return NextResponse.json({ error: error?.message || "Erro ao adicionar membro." }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: workspaceId } = await params;
    const user = await requireCurrentUser();
    const body = await request.json();
    const { membershipId, role } = body;

    if (!membershipId || !role) {
      return NextResponse.json(
        { error: "membershipId e role são obrigatórios." },
        { status: 400 }
      );
    }

    const updated = await WorkspaceService.updateMemberRole(
      workspaceId,
      user.id,
      membershipId,
      role
    );

    return NextResponse.json({
      message: "Papel atualizado com sucesso.",
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
    return NextResponse.json(
      { error: error.message || "Erro ao atualizar papel do membro." },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: workspaceId } = await params;
    const user = await requireCurrentUser();
    const { searchParams } = new URL(request.url);
    const membershipId = searchParams.get("membershipId");

    if (!membershipId) {
      return NextResponse.json(
        { error: "membershipId é obrigatório na query string." },
        { status: 400 }
      );
    }

    const result = await WorkspaceService.removeMember(workspaceId, user.id, membershipId);

    return NextResponse.json({
      message: "Membro removido com sucesso.",
      data: result,
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
    return NextResponse.json(
      { error: error.message || "Erro ao remover membro do workspace." },
      { status: 400 }
    );
  }
}

