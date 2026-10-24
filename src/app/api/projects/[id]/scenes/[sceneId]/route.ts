import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspace, AuthorizationError } from "@/lib/auth";
import { SceneService } from "@/modules/scenes/scene.service";
import { updateSceneSchema } from "@/modules/scenes/scene.schema";
import { ZodError } from "zod";

type RouteParams = {
  params: Promise<{ id: string; sceneId: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId, sceneId } = await params;
    const { workspace } = await getCurrentWorkspace();

    const scene = await SceneService.getSceneById(sceneId, projectId, workspace.id);
    if (!scene) {
      return NextResponse.json({ error: "Cena não encontrada." }, { status: 404 });
    }

    return NextResponse.json({ data: scene });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Erro ao buscar cena:", error);
    return NextResponse.json({ error: "Erro ao buscar cena." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId, sceneId } = await params;
    const { workspace } = await getCurrentWorkspace();
    const body = await request.json();

    const validatedInput = updateSceneSchema.parse(body);

    const updated = await SceneService.updateScene(
      sceneId,
      projectId,
      workspace.id,
      validatedInput
    );

    return NextResponse.json({
      message: "Cena atualizada com sucesso.",
      data: updated,
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
    console.error("Erro ao atualizar cena:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao atualizar cena." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId, sceneId } = await params;
    const { workspace } = await getCurrentWorkspace();

    await SceneService.deleteScene(sceneId, projectId, workspace.id);

    return NextResponse.json({
      message: "Cena excluída com sucesso e sequência reordenada.",
      success: true,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Erro ao excluir cena:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao excluir cena." },
      { status: 500 }
    );
  }
}
