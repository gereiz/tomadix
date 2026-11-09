import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCurrentUser, AuthenticationError } from "@/lib/auth";
import { RecipeService, RecipeLimitError } from "@/modules/recipes/recipe.service";
import { recipeInputSchema } from "@/modules/recipes/recipe.schema";

function handleError(error: unknown) {
  if (error instanceof AuthenticationError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: "Dados inválidos.", issues: error.issues.map((i) => i.message) }, { status: 422 });
  }
  if (error instanceof RecipeLimitError) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
  console.error("Erro nas receitas:", error);
  return NextResponse.json({ error: "Erro interno ao processar receitas." }, { status: 500 });
}

export async function GET() {
  try {
    const user = await requireCurrentUser();
    return NextResponse.json({ data: await RecipeService.list(user.id) });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const input = recipeInputSchema.parse(await request.json());
    return NextResponse.json({ data: await RecipeService.create(user.id, input) }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const { id } = z.object({ id: z.string().min(1) }).parse(await request.json());
    const removed = await RecipeService.remove(user.id, id);
    if (!removed) return NextResponse.json({ error: "Receita não encontrada." }, { status: 404 });
    return NextResponse.json({ data: { id } });
  } catch (error) {
    return handleError(error);
  }
}
