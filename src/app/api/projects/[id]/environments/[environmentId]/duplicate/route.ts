import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspace, AuthorizationError } from "@/lib/auth";
import { EnvironmentService } from "@/modules/environments/environment.service";

type RouteParams = {
  params: Promise<{ id: string; environmentId: string }>;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId, environmentId } = await params;
    const { workspace } = await getCurrentWorkspace();

    let customName: string | undefined;
    try {
      const body = await request.json();
      if (body.name) customName = body.name;
    } catch {
      // Body opcional
    }

    const duplicated = await EnvironmentService.duplicateEnvironment(
      environmentId,
      projectId,
      workspace.id,
      customName
    );

    return NextResponse.json({
      message: "Ambiente duplicado com sucesso.",
      data: duplicated,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Erro ao duplicar ambiente." }, { status: 500 });
  }
}
