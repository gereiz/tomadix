import { NextRequest, NextResponse } from "next/server";
import { InviteService } from "@/modules/workspaces/invite.service";
import { NotFoundError } from "@/lib/auth";

type RouteParams = {
  params: Promise<{ token: string }>;
};

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;
    const invite = await InviteService.getInviteByToken(token);

    return NextResponse.json({
      data: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        status: invite.status,
        expiresAt: invite.expiresAt,
        workspace: invite.workspace,
        invitedBy: invite.invitedBy,
      },
    });
  } catch (error: any) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("Erro ao consultar convite por token:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao consultar convite." },
      { status: 400 }
    );
  }
}
