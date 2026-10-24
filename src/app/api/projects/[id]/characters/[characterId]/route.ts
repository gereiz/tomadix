import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspace, AuthorizationError } from "@/lib/auth";
import { CharacterService } from "@/modules/characters/character.service";
import { updateCharacterSchema } from "@/modules/characters/character.schema";
import { ZodError } from "zod";

type RouteParams = {
  params: Promise<{ id: string; characterId: string }>;
};

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId, characterId } = await params;
    const { workspace } = await getCurrentWorkspace();

    const character = await CharacterService.getCharacterById(characterId, projectId, workspace.id);
    if (!character) {
      return NextResponse.json({ error: "Personagem não encontrado." }, { status: 404 });
    }

    return NextResponse.json({ data: character });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Erro ao buscar personagem." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId, characterId } = await params;
    const { workspace } = await getCurrentWorkspace();
    const body = await request.json();

    const validatedInput = updateCharacterSchema.parse(body);

    const updated = await CharacterService.updateCharacter(
      characterId,
      projectId,
      workspace.id,
      validatedInput
    );

    return NextResponse.json({
      message: "Personagem atualizado com sucesso.",
      data: updated,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Dados inválidos.",
          issues: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        },
        { status: 422 }
      );
    }
    return NextResponse.json({ error: "Erro ao atualizar personagem." }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId, characterId } = await params;
    const { workspace } = await getCurrentWorkspace();

    await CharacterService.deleteCharacter(characterId, projectId, workspace.id);

    return NextResponse.json({ message: "Personagem excluído com sucesso." });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Erro ao excluir personagem." }, { status: 500 });
  }
}
