import { parseJsonBody, transferOwnershipBodySchema } from "@/lib/api-validation";
import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser, AuthorizationError, NotFoundError } from "@/lib/auth";
import { WorkspaceService } from "@/modules/workspaces/workspace.service";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: workspaceId } = await params;
    const user = await requireCurrentUser();
    const parsed = await parseJsonBody(request, transferOwnershipBodySchema);
    if (parsed.response) return parsed.response;
    const { newOwnerMembershipId } = parsed.data;

    const result = await WorkspaceService.transferOwnership(
      workspaceId,
      user.id,
      newOwnerMembershipId
    );

    return NextResponse.json({
      message: "Propriedade do workspace transferida com sucesso.",
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
    console.error("Erro ao transferir propriedade do workspace:", error);
    return NextResponse.json(
      { error: error?.message || "Erro ao transferir propriedade." },
      { status: 400 }
    );
  }
}
