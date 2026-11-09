import { z } from "zod";
import { CAPTURE_STYLE_KEYS } from "@/modules/prompt-engine/capture-styles";

export const MAX_RECIPES_PER_USER = 20;

/** Receita: combinação reutilizável de tipo de conteúdo + ferramenta + estilo + diretrizes. */
export const recipeInputSchema = z.object({
  name: z.string().trim().min(2, "Dê um nome à receita.").max(60),
  templateKey: z.enum([
    "visual_bible",
    "character_definition",
    "environment_definition",
    "image_prompt",
    "video_prompt",
    "scene_sequence",
    "individual_scene",
  ]),
  targetTool: z.enum(["google_flow", "nano_banana", "seedance", "kling", "generic"]),
  captureStyle: z.enum(CAPTURE_STYLE_KEYS).default("cinematic"),
  outputFormat: z.enum(["json", "text"]).default("json"),
  instructions: z.string().trim().max(2000).default(""),
});

export const recipeStoredSchema = recipeInputSchema.extend({
  id: z.string().min(1),
  createdAt: z.string(),
});

export type RecipeInput = z.infer<typeof recipeInputSchema>;
export type Recipe = z.infer<typeof recipeStoredSchema>;
