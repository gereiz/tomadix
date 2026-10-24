import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspace, AuthorizationError } from "@/lib/auth";
import { CharacterService } from "@/modules/characters/character.service";
import { createCharacterSchema } from "@/modules/characters/character.schema";
import { ZodError } from "zod";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId } = await params;
    const { workspace } = await getCurrentWorkspace();
    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search") ?? undefined;
    const status = (searchParams.get("status") || "active") as "active" | "archived" | "all";

    const characters = await CharacterService.listCharacters(projectId, workspace.id, {
      search,
      status,
    });

    return NextResponse.json({
      data: characters,
      total: characters.length,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Erro ao listar personagens:", error);
    return NextResponse.json({ error: "Erro ao buscar personagens." }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId } = await params;
    const { workspace } = await getCurrentWorkspace();
    const body = await request.json();

    const validatedInput = createCharacterSchema.parse(body);

    const created = await CharacterService.createCharacter(
      projectId,
      workspace.id,
      validatedInput
    );

    return NextResponse.json(
      {
        message: "Personagem criado com sucesso.",
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
        {
          error: "Dados do personagem inválidos.",
          issues: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        },
        { status: 422 }
      );
    }
    console.error("Erro ao criar personagem:", error);
    return NextResponse.json({ error: "Erro interno ao salvar personagem." }, { status: 500 });
  }
}
