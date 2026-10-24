import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspace, AuthorizationError } from "@/lib/auth";
import { CharacterService } from "@/modules/characters/character.service";

type RouteParams = {
  params: Promise<{ id: string; characterId: string }>;
};

export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId, characterId } = await params;
    const { workspace } = await getCurrentWorkspace();

    const archived = await CharacterService.archiveCharacter(characterId, projectId, workspace.id);

    return NextResponse.json({
      message: "Personagem arquivado com sucesso.",
      data: archived,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Erro ao arquivar personagem." }, { status: 500 });
  }
}
