import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspace, AuthorizationError } from "@/lib/auth";
import { SceneService } from "@/modules/scenes/scene.service";
import { reorderScenesSchema } from "@/modules/scenes/scene.schema";
import { ZodError } from "zod";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId } = await params;
    const { workspace } = await getCurrentWorkspace();
    const body = await request.json();

    const { sceneIds } = reorderScenesSchema.parse(body);

    const reorderedScenes = await SceneService.reorderScenes(
      projectId,
      workspace.id,
      sceneIds
    );

    return NextResponse.json({
      message: "Sequência de cenas reordenada com sucesso.",
      data: reorderedScenes,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos.", details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    console.error("Erro ao reordenar cenas:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao reordenar cenas." },
      { status: 500 }
    );
  }
}
