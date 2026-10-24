import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser, AuthorizationError, NotFoundError } from "@/lib/auth";
import { InviteService } from "@/modules/workspaces/invite.service";

type RouteParams = {
  params: Promise<{ id: string; inviteId: string }>;
};

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id: workspaceId, inviteId } = await params;
    const user = await requireCurrentUser();

    const canceled = await InviteService.cancelInvite(workspaceId, user.id, inviteId);

    return NextResponse.json({
      message: "Convite revogado com sucesso.",
      data: canceled,
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
    console.error("Erro ao cancelar convite:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao revogar convite." },
      { status: 400 }
    );
  }
}
