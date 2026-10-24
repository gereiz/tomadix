import { z } from "zod";

export const visualBibleSchema = z.object({
  schemaVersion: z.literal("1.0"),
  type: z.literal("visual_bible"),
  title: z.string(),
  visualStyle: z.string(),
  palette: z.array(z.string()),
  cinematography: z.string(),
  lighting: z.string(),
  texture: z.string(),
  continuityRules: z.array(z.string()),
  globalRestrictions: z.array(z.string())
});

export const characterPromptSchema = z.object({
  schemaVersion: z.literal("1.0"),
  type: z.literal("character_prompt"),
  name: z.string(),
  identity: z.string(),
  appearance: z.string(),
  personality: z.string(),
  consistencyRules: z.array(z.string()),
  prompt: z.string()
});

export const videoPromptSchema = z.object({
  schemaVersion: z.literal("1.0"),
  type: z.literal("video_prompt"),
  sceneId: z.string(),
  title: z.string(),
  targetTool: z.string(),
  language: z.literal("pt-BR"),
  durationSeconds: z.number().positive(),
  prompt: z.object({
    context: z.string(),
    action: z.string(),
    camera: z.string(),
    lighting: z.string(),
    visualStyle: z.string(),
    audio: z.object({
      dialogue: z.boolean(),
      music: z.boolean(),
      ambience: z.string()
    }),
    continuity: z.array(z.string()),
    restrictions: z.array(z.string())
  }),
  negativePrompt: z.array(z.string())
});

export type VideoPrompt = z.infer<typeof videoPromptSchema>;
