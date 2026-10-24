import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspace, AuthorizationError } from "@/lib/auth";
import { PromptEngineService } from "@/modules/prompt-engine/prompt-engine.service";

type RouteParams = {
  params: Promise<{ id: string; versionId: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId, versionId } = await params;
    const { workspace } = await getCurrentWorkspace();

    const version = await PromptEngineService.getVersionById(versionId, projectId, workspace.id);

    return NextResponse.json({
      data: version,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Erro ao buscar versão de prompt:", error);
    return NextResponse.json(
      { error: error?.message || "Erro ao buscar versão de prompt." },
      { status: 500 }
    );
  }
}
