import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspace, AuthorizationError } from "@/lib/auth";
import { PromptHistoryService } from "@/modules/prompt-engine/prompt-history.service";
import { comparePromptVersionsSchema } from "@/modules/prompt-engine/prompt-engine.schema";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId } = await params;
    const { workspace } = await getCurrentWorkspace();

    const body = await request.json();
    const validated = comparePromptVersionsSchema.parse(body);

    const comparison = await PromptHistoryService.compareVersions(
      validated.versionIdA,
      validated.versionIdB,
      projectId,
      workspace.id
    );

    return NextResponse.json({
      data: comparison,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Erro ao comparar versões de prompt:", error);
    return NextResponse.json(
      { error: error?.message || "Erro ao comparar versões de prompt." },
      { status: 400 }
    );
  }
}
