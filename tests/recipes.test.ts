import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "@/lib/db";
import { RecipeService, RecipeLimitError, parseRecipes } from "@/modules/recipes/recipe.service";
import { MAX_RECIPES_PER_USER, recipeInputSchema } from "@/modules/recipes/recipe.schema";

describe("Receitas (apps de 1 clique)", () => {
  let userId: string;

  beforeEach(async () => {
    const user = await db.user.create({
      data: {
        authSubject: `auth_recipe_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        email: `recipe_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`,
        displayName: "Receitas Teste",
        passwordHash: "x",
        preferences: { theme: "dark" },
      },
    });
    userId = user.id;
  });

  afterEach(async () => {
    await db.user.delete({ where: { id: userId } });
  });

  const base = {
    name: "Selfie amadora Kling",
    templateKey: "video_prompt" as const,
    targetTool: "kling" as const,
    captureStyle: "selfie_flash" as const,
    outputFormat: "text" as const,
    instructions: "pizzaria cheia, flash estourado",
  };

  it("cria, lista e exclui preservando as outras preferências", async () => {
    const created = await RecipeService.create(userId, base);
    expect(created.id).toBeTruthy();

    const list = await RecipeService.list(userId);
    expect(list).toHaveLength(1);
    expect(list[0].captureStyle).toBe("selfie_flash");

    const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { preferences: true } });
    expect((user.preferences as Record<string, unknown>).theme).toBe("dark");

    expect(await RecipeService.remove(userId, created.id)).toBe(true);
    expect(await RecipeService.remove(userId, created.id)).toBe(false);
    expect(await RecipeService.list(userId)).toHaveLength(0);
  });

  it("respeita o limite por usuário", async () => {
    for (let i = 0; i < MAX_RECIPES_PER_USER; i++) {
      await RecipeService.create(userId, { ...base, name: `Receita ${i + 1}` });
    }
    await expect(RecipeService.create(userId, base)).rejects.toBeInstanceOf(RecipeLimitError);
  });

  it("valida a entrada e ignora itens corrompidos", () => {
    expect(recipeInputSchema.safeParse({ ...base, name: "a" }).success).toBe(false);
    expect(recipeInputSchema.safeParse({ ...base, targetTool: "outra" }).success).toBe(false);
    expect(parseRecipes({ recipes: [{ lixo: true }, "x"] })).toEqual([]);
    expect(parseRecipes(null)).toEqual([]);
  });
});
