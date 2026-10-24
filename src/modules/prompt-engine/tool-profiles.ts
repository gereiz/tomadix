export interface ToolProfile {
  key: "google_flow" | "nano_banana" | "generic";
  name: string;
  description: string;
  version: number;
  supportedOutputs: ("image" | "video" | "scene" | "bible")[];
  features: {
    supportsAspectRatio: boolean;
    supportsNegativePrompt: boolean;
    supportsMotionVectors: boolean;
    supportsAudioTags: boolean;
    maxPromptCharacters: number;
  };
  promptFormattingRules: string[];
}

export const TOOL_PROFILES: Record<string, ToolProfile> = {
  google_flow: {
    key: "google_flow",
    name: "Google Flow",
    description: "Otimizado para fluxos contínuos de vídeo, transições de câmera e consistência de movimentos.",
    version: 1,
    supportedOutputs: ["image", "video", "scene", "bible"],
    features: {
      supportsAspectRatio: true,
      supportsNegativePrompt: true,
      supportsMotionVectors: true,
      supportsAudioTags: false, // Controlado fora do prompt de difusão visual
      maxPromptCharacters: 4000,
    },
    promptFormattingRules: [
      "Utilize descritores de movimento dinâmico e vetores de câmera (ex: Dolly forward, Pan horizontal, Crane descendente).",
      "Estruture a continuidade entre quadros chave (Keyframe A -> Keyframe B).",
      "Separe estritamente o prompt visual positivo do negative prompt de artefatos.",
      "Utilize especificações óticas profissionais (ex: 35mm anamorphic, f/2.0, volumetric lighting).",
    ],
  },
  nano_banana: {
    key: "nano_banana",
    name: "Nano Banana",
    description: "Sintaxe densa orientada a tags, parâmetros estruturados em JSON e palavras-chave de iluminação.",
    version: 1,
    supportedOutputs: ["image", "video", "scene"],
    features: {
      supportsAspectRatio: true,
      supportsNegativePrompt: true,
      supportsMotionVectors: false,
      supportsAudioTags: false,
      maxPromptCharacters: 2500,
    },
    promptFormattingRules: [
      "Priorize tokens visuais densos e objetivos separados por vírgula no prompt compilado.",
      "Evite divagações literárias abstratas; priorize adjetivos físicos e iluminação mensurável.",
      "Inclua parâmetros de paleta cromática e grão de película cinematográfica.",
      "Defina palavras-chave de composição espacial direta.",
    ],
  },
  generic: {
    key: "generic",
    name: "Genérico (Universal: Midjourney, Runway, Sora, Kling)",
    description: "Compatibilidade universal com ferramentas de IA generativa de imagem e vídeo cinematográfico.",
    version: 1,
    supportedOutputs: ["image", "video", "scene", "bible"],
    features: {
      supportsAspectRatio: true,
      supportsNegativePrompt: true,
      supportsMotionVectors: true,
      supportsAudioTags: true,
      maxPromptCharacters: 5000,
    },
    promptFormattingRules: [
      "Parágrafos visuais descritivos e vívidos em ordem decrescente de importância dramática.",
      "Especificação detalhada de textura, iluminação ambiente, lente e figurino.",
      "Indicação de negativas gerais de renderização (evitar distorções, membros extras, texto na tela).",
    ],
  },
};

export function getToolProfile(key?: string): ToolProfile {
  if (key && TOOL_PROFILES[key]) {
    return TOOL_PROFILES[key];
  }
  return TOOL_PROFILES.generic;
}
