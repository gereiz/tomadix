import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspace, AuthorizationError } from "@/lib/auth";
import { PromptHistoryService } from "@/modules/prompt-engine/prompt-history.service";
import { PromptHistoryFilter } from "@/modules/prompt-engine/prompt-engine.schema";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId } = await params;
    const { workspace } = await getCurrentWorkspace();
    const { searchParams } = new URL(request.url);

    const filters: PromptHistoryFilter = {
      sceneId: searchParams.get("sceneId") || undefined,
      templateKey: searchParams.get("templateKey") || undefined,
      targetTool: searchParams.get("targetTool") || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      status: (searchParams.get("status") as any) || "ALL",
    };

    const history = await PromptHistoryService.listHistory(projectId, workspace.id, filters);

    return NextResponse.json({
      data: history,
      total: history.length,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Erro ao listar histórico de prompts:", error);
    return NextResponse.json(
      { error: error?.message || "Erro ao buscar histórico de prompts." },
      { status: 500 }
    );
  }
}
