import { z } from "zod";

export const sceneDialogueSchema = z.object({
  enabled: z.boolean().default(false),
  language: z.string().default("pt-BR"),
  lines: z.string().max(2000).default(""),
}).default({ enabled: false, language: "pt-BR", lines: "" });

export const sceneMusicSchema = z.object({
  enabled: z.boolean().default(false),
  description: z.string().max(1000).default(""),
}).default({ enabled: false, description: "" });

export const sceneConfigurationBaseSchema = z.object({
  mainAction: z.string().max(3000).default(""),
  initialState: z.string().max(2000).default(""),
  finalState: z.string().max(2000).default(""),
  characterMovement: z.string().max(2000).default(""),
  framing: z.string().max(100).default("Plano Médio (Medium Shot)"),
  cameraMovement: z.string().max(100).default("Estática"),
  focusDepth: z.string().max(100).default("Profundidade de campo padrão"),
  lighting: z.string().max(500).default("Iluminação natural / ambiente"),
  visualStyle: z.string().max(500).default(""),
  transitionIn: z.string().max(100).default("Corte Direto (Cut)"),
  transitionOut: z.string().max(100).default("Corte Direto (Cut)"),
  ambientSound: z.string().max(1000).default(""),
  dialogue: sceneDialogueSchema.optional(),
  music: sceneMusicSchema.optional(),
  restrictions: z.string().max(2000).default(""),
  filmGrain: z.number().min(0).max(100).default(25).optional(),
  parameters: z.record(z.any()).default({}),
});

export const sceneConfigurationSchema = sceneConfigurationBaseSchema.default({});

export const createSceneSchema = z.object({
  title: z.string().trim().min(1, "O título da cena é obrigatório.").max(150),
  description: z.string().max(4000).default(""),
  order: z.number().int().min(1).optional(),
  durationSeconds: z.number().int().min(1).max(3600).nullable().optional(),
  characterIds: z.array(z.string()).default([]),
  environmentIds: z.array(z.string()).default([]),
  configuration: sceneConfigurationBaseSchema.partial().optional(),
});

export const updateSceneSchema = z.object({
  title: z.string().trim().min(1).max(150).optional(),
  description: z.string().max(4000).optional(),
  order: z.number().int().min(1).optional(),
  durationSeconds: z.number().int().min(1).max(3600).nullable().optional(),
  characterIds: z.array(z.string()).optional(),
  environmentIds: z.array(z.string()).optional(),
  configuration: sceneConfigurationBaseSchema.partial().optional(),
});

export const reorderScenesSchema = z.object({
  sceneIds: z.array(z.string().min(1)).min(1, "Lista de cenas para reordenação é obrigatória."),
});

export const duplicateSceneSchema = z.object({
  title: z.string().trim().min(1).max(150).optional(),
});

export const continuityWarningSchema = z.object({
  type: z.enum([
    "character_consistency",
    "spatial_continuity",
    "action_continuity",
    "lighting_continuity",
    "temporal_coherence",
    "sound_dialogue",
  ]),
  severity: z.enum(["critical", "warning", "info"]),
  sceneIdA: z.string(),
  sceneOrderA: z.number(),
  sceneTitleA: z.string(),
  sceneIdB: z.string().optional(),
  sceneOrderB: z.number().optional(),
  sceneTitleB: z.string().optional(),
  title: z.string(),
  message: z.string(),
  suggestion: z.string(),
});

export const continuityReportSchema = z.object({
  projectId: z.string(),
  analyzedScenesCount: z.number(),
  status: z.enum(["ok", "needs_attention", "critical"]),
  summary: z.object({
    critical: z.number(),
    warning: z.number(),
    info: z.number(),
  }),
  warnings: z.array(continuityWarningSchema),
});

export type SceneConfiguration = z.infer<typeof sceneConfigurationSchema>;
export type CreateSceneInput = z.infer<typeof createSceneSchema>;
export type UpdateSceneInput = z.infer<typeof updateSceneSchema>;
export type ReorderScenesInput = z.infer<typeof reorderScenesSchema>;
export type DuplicateSceneInput = z.infer<typeof duplicateSceneSchema>;
export type ContinuityWarning = z.infer<typeof continuityWarningSchema>;
export type ContinuityReport = z.infer<typeof continuityReportSchema>;
