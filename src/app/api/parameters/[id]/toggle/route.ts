import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspace, requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { ParameterService } from "@/modules/parameters/parameter.service";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    await requirePlatformAdmin();
    const { id } = await params;
    const { workspace } = await getCurrentWorkspace(null, "parameters:read");

    const updated = await ParameterService.toggleParameter(id, workspace.id);

    return NextResponse.json({
      message: updated.enabled ? "Parâmetro ativado." : "Parâmetro desativado.",
      data: updated,
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Erro interno ao alternar estado do parâmetro." }, { status: 500 });
  }
}
