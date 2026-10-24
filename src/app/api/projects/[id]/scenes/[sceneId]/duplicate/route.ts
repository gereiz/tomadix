import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspace, AuthorizationError } from "@/lib/auth";
import { SceneService } from "@/modules/scenes/scene.service";
import { duplicateSceneSchema } from "@/modules/scenes/scene.schema";

type RouteParams = {
  params: Promise<{ id: string; sceneId: string }>;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId, sceneId } = await params;
    const { workspace } = await getCurrentWorkspace();

    let customTitle: string | undefined;
    try {
      const body = await request.json();
      const parsed = duplicateSceneSchema.safeParse(body);
      if (parsed.success) {
        customTitle = parsed.data.title;
      }
    } catch {
      // Body vazio é aceitável na duplicação
    }

    const duplicated = await SceneService.duplicateScene(
      sceneId,
      projectId,
      workspace.id,
      customTitle ? { title: customTitle } : undefined
    );

    return NextResponse.json(
      {
        message: "Cena duplicada com sucesso.",
        data: duplicated,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Erro ao duplicar cena:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao duplicar cena." },
      { status: 500 }
    );
  }
}
