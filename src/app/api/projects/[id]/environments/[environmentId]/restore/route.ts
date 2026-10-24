import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspace, AuthorizationError } from "@/lib/auth";
import { EnvironmentService } from "@/modules/environments/environment.service";

type RouteParams = {
  params: Promise<{ id: string; environmentId: string }>;
};

export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId, environmentId } = await params;
    const { workspace } = await getCurrentWorkspace();

    const restored = await EnvironmentService.restoreEnvironment(
      environmentId,
      projectId,
      workspace.id
    );

    return NextResponse.json({
      message: "Ambiente restaurado com sucesso.",
      data: restored,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Erro ao restaurar ambiente." }, { status: 500 });
  }
}
