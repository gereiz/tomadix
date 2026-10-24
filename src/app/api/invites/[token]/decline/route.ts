import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser, AuthorizationError } from "@/lib/auth";
import { InviteService } from "@/modules/workspaces/invite.service";

type RouteParams = {
  params: Promise<{ token: string }>;
};

export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;
    const user = await requireCurrentUser();

    const result = await InviteService.declineInvite(token, user.id);

    return NextResponse.json({
      message: "Convite recusado com sucesso.",
      data: result,
    });
  } catch (error: any) {
    if (error.statusCode === 401) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Erro ao recusar convite:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao recusar convite." },
      { status: 400 }
    );
  }
}
