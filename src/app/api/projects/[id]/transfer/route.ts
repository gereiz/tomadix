import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser, AuthorizationError, NotFoundError } from "@/lib/auth";
import { ProjectService } from "@/modules/projects/project.service";
import { EntitlementError } from "@/modules/billing/entitlement.service";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId } = await params;
    const user = await requireCurrentUser();
    const body = await request.json();
    const { targetWorkspaceId } = body;

    if (!targetWorkspaceId) {
      return NextResponse.json(
        { error: "targetWorkspaceId é obrigatório." },
        { status: 400 }
      );
    }

    const transferred = await ProjectService.transferProject(
      projectId,
      user.id,
      targetWorkspaceId
    );

    return NextResponse.json({
      message: "Projeto transferido com sucesso.",
      data: transferred,
    });
  } catch (error: any) {
    if (error.statusCode === 401) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof EntitlementError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("Erro ao transferir projeto:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao transferir projeto." },
      { status: 400 }
    );
  }
}
