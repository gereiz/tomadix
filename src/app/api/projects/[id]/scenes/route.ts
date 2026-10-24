import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspace, AuthorizationError } from "@/lib/auth";
import { SceneService } from "@/modules/scenes/scene.service";
import { createSceneSchema } from "@/modules/scenes/scene.schema";
import { ZodError } from "zod";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId } = await params;
    const { workspace } = await getCurrentWorkspace();

    const scenes = await SceneService.listScenes(projectId, workspace.id);

    return NextResponse.json({
      data: scenes,
      total: scenes.length,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Erro ao listar cenas:", error);
    return NextResponse.json({ error: "Erro ao buscar cenas do projeto." }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId } = await params;
    const { workspace } = await getCurrentWorkspace();
    const body = await request.json();

    const validatedInput = createSceneSchema.parse(body);

    const created = await SceneService.createScene(projectId, workspace.id, validatedInput);

    return NextResponse.json(
      {
        message: "Cena criada com sucesso.",
        data: created,
      },
      { status: 201 }
    );
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
    console.error("Erro ao criar cena:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao criar cena." },
      { status: 500 }
    );
  }
}
