import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser, AuthorizationError, ACTIVE_WORKSPACE_COOKIE } from "@/lib/auth";
import { InviteService } from "@/modules/workspaces/invite.service";
import { EntitlementError } from "@/modules/billing/entitlement.service";

type RouteParams = {
  params: Promise<{ token: string }>;
};

export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;
    const user = await requireCurrentUser();

    const result = await InviteService.acceptInvite(token, user.id);

    const response = NextResponse.json({
      message: "Convite aceito com sucesso! Bem-vindo ao estúdio.",
      data: result,
    });

    // Definir o workspace aceito como ativo
    response.cookies.set(ACTIVE_WORKSPACE_COOKIE, result.workspaceId, {
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
      sameSite: "lax",
      httpOnly: false,
    });

    return response;
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
    console.error("Erro ao aceitar convite:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao aceitar convite." },
      { status: 400 }
    );
  }
}
