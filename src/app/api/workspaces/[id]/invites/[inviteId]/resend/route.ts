import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser, AuthorizationError, NotFoundError } from "@/lib/auth";
import { InviteService } from "@/modules/workspaces/invite.service";

type RouteParams = {
  params: Promise<{ id: string; inviteId: string }>;
};

export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id: workspaceId, inviteId } = await params;
    const user = await requireCurrentUser();

    const resent = await InviteService.resendInvite(workspaceId, user.id, inviteId);

    return NextResponse.json({
      message: "Convite reenviado com sucesso.",
      data: resent,
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
    console.error("Erro ao reenviar convite:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao reenviar convite." },
      { status: 400 }
    );
  }
}
