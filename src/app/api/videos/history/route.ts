import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspace, AuthenticationError, AuthorizationError } from "@/lib/auth";
import { VideoGenerationService } from "@/modules/video-generation/video-generation.service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { workspace } = await getCurrentWorkspace();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId") || undefined;
    const limit = parseInt(searchParams.get("limit") || "40", 10);

    const videos = await VideoGenerationService.listVideos({
      workspaceId: workspace.id,
      projectId,
      limit,
    });

    return NextResponse.json({
      success: true,
      videos,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao consultar histórico de vídeos." },
      { status: 500 }
    );
  }
}

