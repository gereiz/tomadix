import { aiRateLimitResponse } from "@/lib/ai-rate-limit";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspace, AuthorizationError } from "@/lib/auth";
import { PromptHistoryService } from "@/modules/prompt-engine/prompt-history.service";
import { regeneratePromptRequestSchema } from "@/modules/prompt-engine/prompt-engine.schema";

type RouteParams = {
  params: Promise<{ id: string; versionId: string }>;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId, versionId } = await params;
    const { workspace } = await getCurrentWorkspace();
    const rateLimited = aiRateLimitResponse(workspace.id);
    if (rateLimited) return rateLimited;

    const body = await request.json().catch(() => ({}));
    const validated = regeneratePromptRequestSchema.parse(body);

    const result = await PromptHistoryService.regenerate(
      versionId,
      projectId,
      workspace.id,
      validated
    );

    return NextResponse.json({
      success: true,
      data: result,
      message: "Nova versão gerada com sucesso a partir da versão anterior.",
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Erro ao regenerar versão de prompt:", error);
    return NextResponse.json(
      { error: error?.message || "Erro ao regenerar prompt." },
      { status: error?.statusCode || 500 }
    );
  }
}
