import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspace, AuthorizationError } from "@/lib/auth";
import { PromptEngineService } from "@/modules/prompt-engine/prompt-engine.service";
import { ProjectService } from "@/modules/projects/project.service";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId } = await params;
    const { workspace } = await getCurrentWorkspace();
    await ProjectService.getProjectById(projectId, workspace.id);

    const templates = PromptEngineService.getAvailableTemplates();
    const toolProfiles = PromptEngineService.getAvailableToolProfiles();

    return NextResponse.json({
      data: {
        templates,
        toolProfiles,
      },
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Erro ao buscar templates disponíveis." }, { status: 500 });
  }
}
