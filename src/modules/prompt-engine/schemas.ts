import { z } from "zod";

const stringToArray = z.preprocess((val) => {
  if (Array.isArray(val)) return val.map((item) => String(item).trim()).filter(Boolean);
  if (typeof val === "string") {
    return val
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}, z.array(z.string()).default([]));

export const visualBibleSchema = z.object({
  schemaVersion: z.string().default("1.0"),
  type: z.string().default("visual_bible"),
  title: z.string().default("Bíblia Visual"),
  visualStyle: z.string().default("Cinematográfico"),
  palette: stringToArray,
  cinematography: z.string().default("Estética de cinema digital"),
  lighting: z.string().default("Iluminação naturalista"),
  texture: z.string().default("Grão cinematográfico e nitidez orgânica"),
  continuityRules: stringToArray,
  globalRestrictions: stringToArray,
});

export const characterPromptSchema = z.object({
  schemaVersion: z.string().default("1.0"),
  type: z.string().default("character_prompt"),
  name: z.string().default("Personagem"),
  identity: z.string().default(""),
  appearance: z.string().default(""),
  personality: z.string().default(""),
  consistencyRules: stringToArray,
  prompt: z.string().default(""),
});

export const videoPromptSchema = z.object({
  schemaVersion: z.string().default("1.0"),
  type: z.string().default("video_prompt"),
  sceneId: z.string().default(""),
  title: z.string().default("Cena Cinematográfica"),
  targetTool: z.string().default("geral"),
  language: z.string().default("pt-BR"),
  durationSeconds: z.preprocess(
    (val) => (typeof val === "number" ? val : parseFloat(String(val)) || 5),
    z.number().positive().default(5)
  ),
  prompt: z.preprocess(
    (val: any) => {
      if (!val || typeof val !== "object") return {};
      return {
        context: val.context || val.contexto || "",
        action: val.action || val.acao || "",
        camera: val.camera || val.enquadramento || "",
        lighting: val.lighting || val.iluminacao || "",
        visualStyle: val.visualStyle || val.estiloVisual || "",
        audio: typeof val.audio === "object" && val.audio !== null ? val.audio : {},
        continuity: Array.isArray(val.continuity) ? val.continuity : [],
        restrictions: Array.isArray(val.restrictions) ? val.restrictions : [],
      };
    },
    z.object({
      context: z.string().default(""),
      action: z.string().default(""),
      camera: z.string().default(""),
      lighting: z.string().default(""),
      visualStyle: z.string().default(""),
      audio: z.object({
        dialogue: z.boolean().default(false),
        music: z.boolean().default(true),
        ambience: z.string().default("Ambiente natural"),
      }).default({ dialogue: false, music: true, ambience: "Ambiente natural" }),
      continuity: stringToArray,
      restrictions: stringToArray,
    }).default({})
  ),
  negativePrompt: stringToArray,
});

export type VideoPrompt = z.infer<typeof videoPromptSchema>;
