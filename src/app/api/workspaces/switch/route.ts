import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser, AuthorizationError } from "@/lib/auth";
import { db } from "@/lib/db";
import { ACTIVE_WORKSPACE_COOKIE } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const body = await request.json();
    const { workspaceId } = body;

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId é obrigatório." }, { status: 400 });
    }

    // Validar se o usuário pertence a este workspace
    const membership = await db.membership.findUnique({
      where: {
        userId_workspaceId: {
          userId: user.id,
          workspaceId,
        },
      },
      include: {
        workspace: true,
      },
    });

    if (!membership) {
      throw new AuthorizationError("Você não possui permissão para acessar este workspace.");
    }

    if (membership.workspace.isArchived) {
      throw new AuthorizationError("Este workspace está arquivado.");
    }

    const response = NextResponse.json({
      success: true,
      activeWorkspace: {
        id: membership.workspace.id,
        name: membership.workspace.name,
        slug: membership.workspace.slug,
        role: membership.role,
      },
    });

    // Definir cookie com prazo de 30 dias
    response.cookies.set(ACTIVE_WORKSPACE_COOKIE, workspaceId, {
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
      sameSite: "lax",
      httpOnly: false, // Permitir leitura segura no front-end para sincronização de estado
    });

    return response;
  } catch (error: any) {
    if (error.statusCode === 401) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Erro ao alternar workspace:", error);
    return NextResponse.json({ error: "Erro ao alternar workspace." }, { status: 500 });
  }
}
