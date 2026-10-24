import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspace, AuthorizationError } from "@/lib/auth";
import { SceneService } from "@/modules/scenes/scene.service";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId } = await params;
    const { workspace } = await getCurrentWorkspace();

    const report = await SceneService.analyzeContinuity(projectId, workspace.id);

    return NextResponse.json({
      data: report,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Erro ao analisar continuidade:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao analisar continuidade." },
      { status: 500 }
    );
  }
}
