import { z } from "zod";

export const AnalysisModeSchema = z.enum([
  "TECHNICAL_ANALYSIS",
  "REVERSE_ENGINEERING",
  "VISUAL_CONTINUITY",
  "STYLE_REPRODUCTION",
]);
export type AnalysisMode = z.infer<typeof AnalysisModeSchema>;

export const ModelTierSchema = z.enum(["flash", "pro"]);
export type ModelTier = z.infer<typeof ModelTierSchema>;

// Diretiva de imagem auxiliar em análise multi-imagem
export const AuxiliaryImageDirectiveSchema = z.object({
  image: z.string().min(1, "Imagem auxiliar é obrigatória"),
  thumbnailUrl: z.string().optional(),
  label: z.string().optional(),
  aspects: z.array(z.string()).default([]),
  customInstruction: z.string().optional(),
});
export type AuxiliaryImageDirective = z.infer<typeof AuxiliaryImageDirectiveSchema>;

// Input para requisição de análise
export const CinematicAnalysisInputSchema = z.object({
  mode: AnalysisModeSchema.default("TECHNICAL_ANALYSIS"),
  image: z.string().min(1, "A imagem principal é obrigatória (base64 ou URL)"),
  thumbnailUrl: z.string().optional(),
  comparisonImage: z.string().optional(), // Para o modo VISUAL_CONTINUITY
  auxiliaryImages: z.array(AuxiliaryImageDirectiveSchema).optional(),
  projectId: z.string().optional(),
  sceneId: z.string().optional(),
  userNotes: z.string().optional(),
  modelTier: ModelTierSchema.default("flash"),
  referenceTitle: z.string().optional(),
});
export type CinematicAnalysisInput = z.infer<typeof CinematicAnalysisInputSchema>;

// Dados Técnicos Cinematográficos
export const TechnicalDataSchema = z.object({
  cameraSensor: z.string().describe("Formato do sensor ou câmera (ex: Full Frame 35mm, Anamórfico 65mm, IMAX 70mm, Super 35)"),
  lensFocalLength: z.string().describe("Distância focal estimada da lente (ex: 35mm, 50mm, 85mm anamórfica)"),
  aperture: z.string().describe("Abertura estimada do diafragma (ex: f/1.4, f/2.8, f/5.6)"),
  framing: z.string().describe("Escala do plano (ex: Close-Up, Plano Médio, Plano Geral, Plano Detalhe)"),
  cameraAngle: z.string().describe("Ponto de vista e ângulo (ex: Eye-level, Low-angle dramático, Dutch Angle, High-angle)"),
  cameraMovement: z.string().describe("Sujestão de movimento de câmera para vídeo (ex: Handheld orgânico, Dolly In lento, Estático)"),
  lightingStyle: z.string().describe("Estilo dominante de iluminação (ex: Chiaroscuro de alto contraste, Soft Daylight, Neon Noir, Golden Hour)"),
  lightingSetup: z.string().describe("Configuração de luzes (Key Light, Fill Light, Rim Light/Hair Light)"),
  colorTemperature: z.string().describe("Temperatura e balanço de branco em Kelvin (ex: 3200K Tungstênio, 5600K Daylight, 6500K Fria)"),
  colorPalette: z.array(z.string()).describe("Lista de 5 códigos hexadecimais dominantes identificados na imagem"),
  colorHarmony: z.string().describe("Harmonia de cores (ex: Teal and Orange, Monocromático, Análogo Quente, Complementar)"),
  filmGrain: z.number().min(0).max(100).describe("Intensidade estimada de granulação fotoquímica analógica de 0 a 100"),
  visualAesthetic: z.string().describe("Estilo estético global da direção de fotografia"),
  aspectRatio: z.string().describe("Proporção de aspecto estimada da composição (ex: 16:9, 2.39:1 anamórfico, 4:3)"),
  summaryDescription: z.string().describe("Resumo cinematográfico profissional da tomada em português brasileiro"),
});
export type TechnicalData = z.infer<typeof TechnicalDataSchema>;

// Engenharia Reversa de Prompts para diferentes ferramentas
export const ReverseEngineeredPromptsSchema = z.object({
  midjourney: z.string().describe("Prompt ultra-otimizado para Midjourney v6 com flags --ar, --style raw, --v 6.1"),
  flux: z.string().describe("Prompt em linguagem natural detalhada para Flux 1.1 Pro / Dev"),
  sdxl: z.string().describe("Prompt com pesos e termos cinematográficos para Stable Diffusion XL"),
  videoGenerators: z.string().describe("Prompt com instruções de movimento e física para Kling, Runway Gen-3 e Luma"),
  negativePrompt: z.string().describe("Prompt negativo contra artefatos de IA, deformidades e defeitos visuais"),
  narrativeDescriptionPt: z.string().describe("Descrição cênica cinematográfica completa em português brasileiro"),
  englishPrompt: z.string().describe("Prompt cinematográfico em inglês clássico de alta fidelidade"),
});
export type ReverseEngineeredPrompts = z.infer<typeof ReverseEngineeredPromptsSchema>;

// Relatório de Continuidade Visual entre duas imagens
export const ContinuityReportSchema = z.object({
  score: z.number().min(0).max(100).describe("Índice de consistência e continuidade visual de 0 a 100%"),
  characterConsistency: z.string().describe("Análise de consistência do ator/personagem entre as tomadas"),
  lightingConsistency: z.string().describe("Avaliação de continuidade de luz e sombras (raccord luminotécnico)"),
  spatialConsistency: z.string().describe("Continuidade de cenografia e posicionamento espacial"),
  discrepancies: z.array(z.string()).describe("Lista de discrepâncias ou quebras de raccord encontradas"),
  alignmentRecommendations: z.array(z.string()).describe("Orientações práticas de correção para manter continuidade absoluta"),
});
export type ContinuityReport = z.infer<typeof ContinuityReportSchema>;

// Mapeamento direto para parâmetros de projeto do Tomadix V1
export const ProjectParameterMappingSchema = z.record(z.string(), z.unknown());
export type ProjectParameterMapping = z.infer<typeof ProjectParameterMappingSchema>;

// Resultado completo consolidado
export const CinematicAnalysisResultSchema = z.object({
  id: z.string(),
  mode: AnalysisModeSchema,
  modelUsed: z.string(),
  referenceTitle: z.string().optional(),
  imageUrl: z.string(),
  comparisonImageUrl: z.string().optional(),
  auxiliarySummary: z
    .array(
      z.object({
        label: z.string(),
        imageUrl: z.string().optional(),
        aspects: z.array(z.string()),
        customInstruction: z.string().optional(),
      })
    )
    .optional(),
  createdAt: z.string(),
  technicalData: TechnicalDataSchema,
  prompts: ReverseEngineeredPromptsSchema,
  continuityReport: ContinuityReportSchema.optional(),
  parameterSettings: ProjectParameterMappingSchema.describe("Parâmetros prontos para aplicação direta no Tomadix"),
  isFavorited: z.boolean().default(false),
  // true quando a IA falhou/retornou JSON inválido e os dados vieram da heurística de contingência (não é uma análise real da imagem)
  isFallback: z.boolean().optional(),
});
export type CinematicAnalysisResult = z.infer<typeof CinematicAnalysisResultSchema>;
