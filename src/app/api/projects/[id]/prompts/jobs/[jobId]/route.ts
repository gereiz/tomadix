import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspace, AuthorizationError } from "@/lib/auth";
import { PromptHistoryService } from "@/modules/prompt-engine/prompt-history.service";

type RouteParams = {
  params: Promise<{ id: string; jobId: string }>;
};

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId, jobId } = await params;
    const { workspace } = await getCurrentWorkspace();

    const result = await PromptHistoryService.deleteFailedJob(jobId, projectId, workspace.id);

    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Erro ao excluir falha de geração:", error);
    return NextResponse.json(
      { error: error?.message || "Erro ao excluir falha de geração." },
      { status: 500 }
    );
  }
}
