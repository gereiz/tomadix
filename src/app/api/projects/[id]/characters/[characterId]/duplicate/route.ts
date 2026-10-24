import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspace, AuthorizationError } from "@/lib/auth";
import { CharacterService } from "@/modules/characters/character.service";

type RouteParams = {
  params: Promise<{ id: string; characterId: string }>;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId, characterId } = await params;
    const { workspace } = await getCurrentWorkspace();

    let customName: string | undefined;
    try {
      const body = await request.json();
      if (body.name) customName = body.name;
    } catch {
      // Body opcional
    }

    const duplicated = await CharacterService.duplicateCharacter(
      characterId,
      projectId,
      workspace.id,
      customName
    );

    return NextResponse.json({
      message: "Personagem duplicado com sucesso.",
      data: duplicated,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Erro ao duplicar personagem." }, { status: 500 });
  }
}
