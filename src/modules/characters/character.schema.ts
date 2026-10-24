import { z } from "zod";

export const characterAttributesBaseSchema = z.object({
  visualIdentity: z.string().max(2000).default(""),
  physicalCharacteristics: z.string().max(2000).default(""),
  apparentAge: z.string().max(50).default(""),
  hairAndFace: z.string().max(2000).default(""),
  costumeAndAccessories: z.string().max(2000).default(""),
  personalityAndBehavior: z.string().max(2000).default(""),
  voiceAndLanguage: z.string().max(200).default(""),
  restrictions: z.string().max(2000).default(""),
  basePrompt: z.string().max(5000).default(""),
});

export const characterAttributesSchema = characterAttributesBaseSchema.default({});

export const createCharacterSchema = z.object({
  name: z.string().trim().min(1, "O nome do personagem é obrigatório.").max(120),
  description: z.string().max(3000).default(""),
  attributes: characterAttributesBaseSchema.partial().optional(),
});

export const updateCharacterSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().max(3000).optional(),
  attributes: characterAttributesBaseSchema.partial().optional(),
  isArchived: z.boolean().optional(),
});

export const duplicateCharacterSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
});

export const characterPromptOutputSchema = z.object({
  schemaVersion: z.literal("1.0"),
  type: z.literal("character_prompt"),
  characterId: z.string(),
  name: z.string(),
  visualSummary: z.string(),
  permanentFeatures: z.object({
    identity: z.string(),
    physical: z.string(),
    hairAndFace: z.string(),
    costume: z.string(),
    personality: z.string(),
    restrictions: z.array(z.string()),
  }),
  compiledPromptText: z.string(),
});

export type CharacterAttributes = z.infer<typeof characterAttributesSchema>;
export type CreateCharacterInput = z.infer<typeof createCharacterSchema>;
export type UpdateCharacterInput = z.infer<typeof updateCharacterSchema>;
export type DuplicateCharacterInput = z.infer<typeof duplicateCharacterSchema>;
export type CharacterPromptOutput = z.infer<typeof characterPromptOutputSchema>;
