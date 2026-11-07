import { parseJsonBody, createInviteBodySchema } from "@/lib/api-validation";
import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser, AuthorizationError, NotFoundError } from "@/lib/auth";
import { InviteService } from "@/modules/workspaces/invite.service";
import { EntitlementError } from "@/modules/billing/entitlement.service";
import { WorkspaceRole } from "@prisma/client";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id: workspaceId } = await params;
    const user = await requireCurrentUser();

    const invites = await InviteService.listInvites(workspaceId, user.id);

    return NextResponse.json({
      data: invites,
      total: invites.length,
    });
  } catch (error: any) {
    if (error.statusCode === 401) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Erro ao listar convites:", error);
    return NextResponse.json({ error: "Erro ao consultar convites." }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: workspaceId } = await params;
    const user = await requireCurrentUser();
    const parsed = await parseJsonBody(request, createInviteBodySchema);
    if (parsed.response) return parsed.response;
    const { email, role } = parsed.data;

    const invite = await InviteService.createInvite(workspaceId, user.id, email, role as WorkspaceRole);

    return NextResponse.json(
      {
        message: "Convite gerado com sucesso.",
        data: invite,
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
    if (error instanceof EntitlementError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("Erro ao criar convite:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao processar convite." },
      { status: 400 }
    );
  }
}
