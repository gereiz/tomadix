import { z } from "zod";

export const environmentAttributesBaseSchema = z.object({
  locationContext: z.string().max(2000).default(""),
  architecture: z.string().max(2000).default(""),
  propsAndElements: z.string().max(2000).default(""),
  lighting: z.string().max(2000).default(""),
  colorPalette: z.string().max(1000).default(""),
  weatherAndAtmosphere: z.string().max(1000).default(""),
  historicalEra: z.string().max(500).default(""),
  visualStyle: z.string().max(1000).default(""),
  basePrompt: z.string().max(5000).default(""),
});

export const environmentAttributesSchema = environmentAttributesBaseSchema.default({});

export const createEnvironmentSchema = z.object({
  name: z.string().trim().min(1, "O nome do ambiente é obrigatório.").max(120),
  description: z.string().max(3000).default(""),
  attributes: environmentAttributesBaseSchema.partial().optional(),
});

export const updateEnvironmentSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().max(3000).optional(),
  attributes: environmentAttributesBaseSchema.partial().optional(),
  isArchived: z.boolean().optional(),
});

export const duplicateEnvironmentSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
});

export const environmentPromptOutputSchema = z.object({
  schemaVersion: z.string().default("1.0"),
  type: z.string().default("environment_prompt"),
  environmentId: z.string(),
  name: z.string(),
  summary: z.string(),
  permanentFeatures: z.object({
    location: z.string().default(""),
    architecture: z.string().default(""),
    props: z.string().default(""),
    lighting: z.string().default(""),
    palette: z.string().default(""),
    atmosphere: z.string().default(""),
    era: z.string().default(""),
    style: z.string().default(""),
  }),
  compiledPromptText: z.string(),
});

export type EnvironmentAttributes = z.infer<typeof environmentAttributesSchema>;
export type CreateEnvironmentInput = z.infer<typeof createEnvironmentSchema>;
export type UpdateEnvironmentInput = z.infer<typeof updateEnvironmentSchema>;
export type DuplicateEnvironmentInput = z.infer<typeof duplicateEnvironmentSchema>;
export type EnvironmentPromptOutput = z.infer<typeof environmentPromptOutputSchema>;
