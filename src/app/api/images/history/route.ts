import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspace, AuthenticationError, AuthorizationError } from "@/lib/auth";
import { GeneratedImageService } from "@/modules/image-generation/generated-image.service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { workspace } = await getCurrentWorkspace();
    const { searchParams } = new URL(request.url);

    const projectId = searchParams.get("projectId") || undefined;
    const characterId = searchParams.get("characterId") || undefined;
    const environmentId = searchParams.get("environmentId") || undefined;
    const sceneId = searchParams.get("sceneId") || undefined;
    const modelId = searchParams.get("modelId") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "24", 10);

    const result = await GeneratedImageService.listImages({
      workspaceId: workspace.id,
      projectId,
      characterId,
      environmentId,
      sceneId,
      modelId,
      page,
      limit,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao consultar histórico de imagens." },
      { status: 500 }
    );
  }
}

