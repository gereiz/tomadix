import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspace, AuthorizationError } from "@/lib/auth";
import { PromptHistoryService } from "@/modules/prompt-engine/prompt-history.service";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId } = await params;
    const { workspace } = await getCurrentWorkspace();

    const failedJobs = await PromptHistoryService.listFailedJobs(projectId, workspace.id);

    return NextResponse.json({
      data: failedJobs,
      total: failedJobs.length,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Erro ao listar falhas de geração:", error);
    return NextResponse.json(
      { error: error?.message || "Erro ao listar falhas de geração." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId } = await params;
    const { workspace } = await getCurrentWorkspace();
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    if (jobId) {
      const result = await PromptHistoryService.deleteFailedJob(jobId, projectId, workspace.id);
      return NextResponse.json(result);
    } else {
      const result = await PromptHistoryService.clearAllFailedJobs(projectId, workspace.id);
      return NextResponse.json(result);
    }
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Erro ao excluir erro(s) de geração:", error);
    return NextResponse.json(
      { error: error?.message || "Erro ao excluir registros de erro." },
      { status: 500 }
    );
  }
}

