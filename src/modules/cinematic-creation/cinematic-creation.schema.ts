import { z } from "zod";

export const expandSceneSchema = z.object({
  expansionType: z
    .enum(["SUB_SHOTS", "CAMERA_ANGLES", "MICRO_ACTIONS", "DETAIL_SHOTS"])
    .default("SUB_SHOTS"),
  count: z.number().int().min(2).max(4).default(3),
  directives: z.string().optional().default(""),
});

export type ExpandSceneInput = z.infer<typeof expandSceneSchema>;

export const generateSceneSequenceSchema = z.object({
  premise: z.string().min(5, "A premissa da sequência deve ter no mínimo 5 caracteres"),
  sceneCount: z.number().int().min(2).max(8).default(4),
  characterIds: z.array(z.string()).default([]),
  environmentIds: z.array(z.string()).default([]),
  mood: z.string().optional().default(""),
  pacing: z
    .enum(["SLOW_BURN", "BALANCED", "FAST_PACED", "ACTION_INTENSE"])
    .default("BALANCED"),
});

export type GenerateSceneSequenceInput = z.infer<typeof generateSceneSequenceSchema>;

export const generateScriptSchema = z.object({
  premise: z.string().min(5, "A premissa dramática é obrigatória"),
  format: z.enum(["SHORT_FILM", "SCENE_SEQUENCE", "COMMERCIAL", "TRAILER"]).default("SHORT_FILM"),
  tone: z.string().optional().default(""),
  generateScenesImmediately: z.boolean().default(true),
});

export type GenerateScriptInput = z.infer<typeof generateScriptSchema>;

export const generateCharacterSchema = z.object({
  prompt: z.string().min(3, "Descrição ou premissa do personagem é obrigatória"),
  archetype: z.string().optional().default(""),
  role: z.string().optional().default(""),
});

export type GenerateCharacterInput = z.infer<typeof generateCharacterSchema>;

export const generateEnvironmentSchema = z.object({
  prompt: z.string().min(3, "Descrição ou conceito da locação é obrigatório"),
  locationType: z.enum(["INTERIOR", "EXTERIOR", "HYBRID", "STUDIO"]).default("INTERIOR"),
});

export type GenerateEnvironmentInput = z.infer<typeof generateEnvironmentSchema>;

export const generateVisualBibleSchema = z.object({
  artDirectives: z.string().optional().default(""),
  cinematographerReference: z.string().optional().default(""),
});

export type GenerateVisualBibleInput = z.infer<typeof generateVisualBibleSchema>;

export const enhancePromptSchema = z.object({
  prompt: z.string().min(3, "Prompt a ser aprimorado é obrigatório"),
  targetGenerator: z
    .enum(["MIDJOURNEY", "FLUX", "RUNWAY_GEN3", "KLING", "SORA", "GENERIC"])
    .default("MIDJOURNEY"),
  enhancementFocus: z
    .enum(["LIGHTING", "LENS_CAMERA", "COMPOSITION", "ALL_CINEMATIC"])
    .default("ALL_CINEMATIC"),
});

export type EnhancePromptInput = z.infer<typeof enhancePromptSchema>;

export const batchGeneratePromptsSchema = z.object({
  sceneIds: z.array(z.string()).min(1, "Selecione ao menos uma cena para geração em lote"),
  targetTool: z.string().default("midjourney-v6"),
});

export type BatchGeneratePromptsInput = z.infer<typeof batchGeneratePromptsSchema>;

