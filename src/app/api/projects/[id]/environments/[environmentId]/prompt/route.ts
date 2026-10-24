import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspace, AuthorizationError } from "@/lib/auth";
import { EnvironmentService } from "@/modules/environments/environment.service";

type RouteParams = {
  params: Promise<{ id: string; environmentId: string }>;
};

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId, environmentId } = await params;
    const { workspace } = await getCurrentWorkspace();

    const promptData = await EnvironmentService.generatePromptJson(
      environmentId,
      projectId,
      workspace.id
    );

    return NextResponse.json({ data: promptData });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Erro ao compilar prompt do ambiente." }, { status: 500 });
  }
}
