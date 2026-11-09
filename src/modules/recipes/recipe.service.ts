import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { MAX_RECIPES_PER_USER, recipeInputSchema, recipeStoredSchema, type Recipe, type RecipeInput } from "./recipe.schema";

export class RecipeLimitError extends Error {}

/** Lê as receitas válidas de um JSON de preferências (itens corrompidos são ignorados). */
export function parseRecipes(preferences: unknown): Recipe[] {
  const raw = (preferences as { recipes?: unknown } | null)?.recipes;
  if (!Array.isArray(raw)) return [];
  const out: Recipe[] = [];
  for (const item of raw) {
    const parsed = recipeStoredSchema.safeParse(item);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}

/**
 * Receitas ("Apps" de 1 clique) ficam em User.preferences.recipes: pessoais,
 * valem em qualquer projeto e não exigem migração. Os valores são apenas dados.
 */
export class RecipeService {
  static async list(userId: string): Promise<Recipe[]> {
    const user = await db.user.findUnique({ where: { id: userId }, select: { preferences: true } });
    return parseRecipes(user?.preferences);
  }

  static async create(userId: string, input: RecipeInput): Promise<Recipe> {
    const data = recipeInputSchema.parse(input);
    return db.$transaction(async (tx) => {
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { preferences: true } });
      const prefs = (user.preferences as Record<string, unknown> | null) ?? {};
      const recipes = parseRecipes(prefs);
      if (recipes.length >= MAX_RECIPES_PER_USER) {
        throw new RecipeLimitError(`Limite de ${MAX_RECIPES_PER_USER} receitas atingido. Exclua alguma para criar outra.`);
      }
      const recipe: Recipe = { ...data, id: randomUUID(), createdAt: new Date().toISOString() };
      await tx.user.update({
        where: { id: userId },
        data: { preferences: { ...prefs, recipes: [...recipes, recipe] } as Prisma.InputJsonValue },
      });
      return recipe;
    });
  }

  static async remove(userId: string, recipeId: string): Promise<boolean> {
    return db.$transaction(async (tx) => {
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { preferences: true } });
      const prefs = (user.preferences as Record<string, unknown> | null) ?? {};
      const recipes = parseRecipes(prefs);
      const next = recipes.filter((r) => r.id !== recipeId);
      if (next.length === recipes.length) return false;
      await tx.user.update({
        where: { id: userId },
        data: { preferences: { ...prefs, recipes: next } as Prisma.InputJsonValue },
      });
      return true;
    });
  }
}
