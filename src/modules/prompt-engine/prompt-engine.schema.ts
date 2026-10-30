import { z } from "zod";

// 1. Schema: Bíblia Visual do Projeto
export const visualBibleOutputSchema = z.object({
  schemaVersion: z.string().default("1.0"),
  type: z.string().default("visual_bible"),
  projectId: z.string().default(""),
  title: z.string().default(""),
  logline: z.string().default(""),
  visualIdentity: z.string().default(""),
  colorPalette: z.object({
    primary: z.array(z.string()).default([]),
    mood: z.string().default(""),
  }),
  cinematographyPhilosophy: z.object({
    lenses: z.string().default(""),
    framingPreference: z.string().default(""),
    cameraMotion: z.string().default(""),
  }),
  lightingDesign: z.object({
    masterSetup: z.string().default(""),
    contrastStyle: z.string().default(""),
  }),
  textureAndAtmosphere: z.string().default(""),
  continuityRules: z.array(z.string()).default([]),
  globalNegativePrompts: z.array(z.string()).default([]),
});

// 2. Schema: Definição de Personagem
export const characterDefinitionOutputSchema = z.object({
  schemaVersion: z.string().default("1.0"),
  type: z.string().default("character_definition"),
  characterId: z.string().default(""),
  name: z.string().default(""),
  visualIdentity: z.string().default(""),
  physicalAttributes: z.object({
    age: z.string().default(""),
    bodyType: z.string().default(""),
    facialFeatures: z.string().default(""),
    hair: z.string().default(""),
  }),
  permanentWardrobe: z.string().default(""),
  behaviorAndExpression: z.string().default(""),
  representationRestrictions: z.array(z.string()).default([]),
  compiledBasePrompt: z.string(),
  negativePrompt: z.array(z.string()).default([]),
});

// 3. Schema: Definição de Ambiente
export const environmentDefinitionOutputSchema = z.object({
  schemaVersion: z.string().default("1.0"),
  type: z.string().default("environment_definition"),
  environmentId: z.string().default(""),
  name: z.string().default(""),
  locationContext: z.string().default(""),
  architecture: z.string().default(""),
  spatialLayoutAndProps: z.string().default(""),
  lightingScheme: z.string().default(""),
  colorGrading: z.string().default(""),
  atmosphereAndWeather: z.string().default(""),
  eraAndStyle: z.string().default(""),
  compiledBasePrompt: z.string(),
  negativePrompt: z.array(z.string()).default([]),
});

// 4. Schema: Prompt de Imagem (Still Frame / Keyframe)
export const imagePromptOutputSchema = z.object({
  schemaVersion: z.string().default("1.0"),
  type: z.string().default("image_prompt"),
  targetTool: z.string().default("generic"),
  title: z.string().default(""),
  aspectRatio: z.string().default("16:9"),
  promptText: z.string(),
  negativePromptText: z.string().default(""),
  cinematography: z.object({
    shotType: z.string().default(""),
    lens: z.string().default(""),
    lighting: z.string().default(""),
  }),
  artisticStyle: z.string().default(""),
  compositionDetails: z.string().default(""),
});

// 5. Schema: Prompt de Vídeo
export const videoPromptOutputSchema = z.object({
  schemaVersion: z.string().default("1.0"),
  type: z.string().default("video_prompt"),
  targetTool: z.string().default("google_flow"),
  sceneId: z.string().default(""),
  narrativeObjective: z.string().default(""),
  characterReferences: z.array(z.string()).default([]),
  environmentReferences: z.array(z.string()).default([]),
  action: z.string().default(""),
  visualComposition: z.string().default(""),
  camera: z.union([
    z.string().transform((str) => ({ framing: str, movement: str, lens: "" })),
    z.object({
      framing: z.string().default(""),
      movement: z.string().default(""),
      lens: z.string().default(""),
    }),
  ]),
  movement: z.string().default(""),
  lighting: z.string().default(""),
  style: z.string().default(""),
  sound: z.union([
    z.string().transform((str) => ({ ambience: str, dialogue: "N/A", music: "N/A" })),
    z.object({
      ambience: z.string().nullish().transform((s) => s || "N/A"),
      dialogue: z.string().nullish().transform((s) => s || "N/A"),
      music: z.string().nullish().transform((s) => s || "N/A"),
    }),
  ]),
  restrictions: z.array(z.string()).default([]),
  continuityInstructions: z.array(z.string()).default([]),
  compiledPromptText: z.string(),
  compiledNegativePrompt: z.string().default(""),
});

// 6. Schema: Sequência de Cenas
export const sceneSequenceOutputSchema = z.object({
  schemaVersion: z.string().default("1.0"),
  type: z.string().default("scene_sequence"),
  projectId: z.string().default(""),
  sequenceTitle: z.string().default(""),
  targetTool: z.string().default(""),
  narrativePacing: z.string().default(""),
  scenes: z.array(
    z.object({
      sceneId: z.string().default(""),
      order: z.number().default(1),
      title: z.string().default(""),
      durationSeconds: z.number().nullable().default(null),
      shotPrompt: z.string(),
      transition: z.string().default("Corte Direto"),
      continuityNotes: z.string().default(""),
    })
  ).default([]),
  globalAtmosphere: z.string().default(""),
});

// 7. Schema: Cena Individual
export const individualSceneOutputSchema = z.object({
  schemaVersion: z.string().default("1.0"),
  type: z.string().default("individual_scene"),
  sceneId: z.string().default(""),
  order: z.number().default(1),
  title: z.string().default(""),
  targetTool: z.string().default(""),
  productionBreakdown: z.object({
    charactersPresent: z.array(z.string()).default([]),
    location: z.string().default(""),
    durationEstimate: z.string().default(""),
  }),
  visualDirectives: z.object({
    mainAction: z.string().default(""),
    initialState: z.string().default(""),
    finalState: z.string().default(""),
    framing: z.string().default(""),
    cameraMotion: z.string().default(""),
    lighting: z.string().default(""),
  }),
  audioDirectives: z.object({
    dialogueText: z.string().default(""),
    ambience: z.string().default(""),
    music: z.string().default(""),
  }),
  compiledProductionPrompt: z.string(),
  negativePrompt: z.array(z.string()).default([]),
});

// Tipo unificado para saídas do motor
export type PromptEngineOutput =
  | z.infer<typeof visualBibleOutputSchema>
  | z.infer<typeof characterDefinitionOutputSchema>
  | z.infer<typeof environmentDefinitionOutputSchema>
  | z.infer<typeof imagePromptOutputSchema>
  | z.infer<typeof videoPromptOutputSchema>
  | z.infer<typeof sceneSequenceOutputSchema>
  | z.infer<typeof individualSceneOutputSchema>;

export type TemplateKey =
  | "visual_bible"
  | "character_definition"
  | "environment_definition"
  | "image_prompt"
  | "video_prompt"
  | "scene_sequence"
  | "individual_scene";

export const generatePromptRequestSchema = z.object({
  templateKey: z.enum([
    "visual_bible",
    "character_definition",
    "environment_definition",
    "image_prompt",
    "video_prompt",
    "scene_sequence",
    "individual_scene",
  ]),
  targetTool: z.enum(["google_flow", "nano_banana", "generic"]).optional().default("google_flow"),
  sceneId: z.string().optional(),
  characterId: z.string().optional(),
  environmentId: z.string().optional(),
  customInstructions: z.string().max(2000).optional(),
  model: z.string().optional(),
  parentVersionId: z.string().optional(),
  outputFormat: z.enum(["json", "text"]).optional().default("json"),
  references: z
    .object({
      characterIds: z.array(z.string()).optional(),
      environmentIds: z.array(z.string()).optional(),
      sceneIds: z.array(z.string()).optional(),
    })
    .optional(),
});

export type GeneratePromptRequest = z.input<typeof generatePromptRequestSchema>;

// Filtro para listagem de histórico
export const promptHistoryFilterSchema = z.object({
  templateKey: z.string().optional(),
  sceneId: z.string().optional(),
  targetTool: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(["ALL", "SUCCEEDED", "FAILED"]).default("ALL"),
});

export type PromptHistoryFilter = z.input<typeof promptHistoryFilterSchema>;

// Requisição de regeneração a partir de versão anterior
export const regeneratePromptRequestSchema = z.object({
  customInstructions: z.string().max(2000).optional(),
  targetTool: z.enum(["google_flow", "nano_banana", "generic"]).optional(),
  model: z.string().optional(),
  outputFormat: z.enum(["json", "text"]).optional().default("json"),
});

export type RegeneratePromptRequest = z.input<typeof regeneratePromptRequestSchema>;

// Comparador de versões
export const comparePromptVersionsSchema = z.object({
  versionIdA: z.string(),
  versionIdB: z.string(),
});

export type ComparePromptVersions = z.infer<typeof comparePromptVersionsSchema>;

// Opções de exportação de sequência de cenas
export const exportSequenceOptionsSchema = z.object({
  format: z.enum(["json", "txt", "markdown"]).default("json"),
  targetTool: z.string().optional(),
  includeDrafts: z.boolean().default(false),
});

export type ExportSequenceOptions = z.infer<typeof exportSequenceOptionsSchema>;

