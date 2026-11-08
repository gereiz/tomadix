export interface ToolProfile {
  key: "google_flow" | "nano_banana" | "seedance" | "kling" | "generic";
  name: string;
  description: string;
  version: number;
  supportedOutputs: ("image" | "video" | "scene" | "bible")[];
  features: {
    supportsAspectRatio: boolean;
    supportsNegativePrompt: boolean;
    supportsMotionVectors: boolean;
    supportsAudioTags: boolean;
    /** Limite do campo de prompt no JSON estruturado. */
    maxPromptCharacters: number;
    /** Limite do Texto Simples (aba, cópia e download .txt). */
    maxPlainTextCharacters: number;
  };
  promptFormattingRules: string[];
}

/** Limite do Texto Simples em todas as plataformas (o JSON pode ter até 5000). */
export const PLAIN_TEXT_LIMIT = 2500;

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
      maxPromptCharacters: 5000,
      maxPlainTextCharacters: PLAIN_TEXT_LIMIT,
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
      maxPromptCharacters: 5000,
      maxPlainTextCharacters: PLAIN_TEXT_LIMIT,
    },
    promptFormattingRules: [
      "Priorize tokens visuais densos e objetivos separados por vírgula no prompt compilado.",
      "Evite divagações literárias abstratas; priorize adjetivos físicos e iluminação mensurável.",
      "Inclua parâmetros de paleta cromática e grão de película cinematográfica.",
      "Defina palavras-chave de composição espacial direta.",
    ],
  },
  seedance: {
    key: "seedance",
    name: "Seedance",
    description: "Otimizado para o Seedance (ByteDance): cenas multi-shot, ação com tempo explícito e áudio nativo.",
    version: 1,
    supportedOutputs: ["video", "scene"],
    features: {
      supportsAspectRatio: true,
      supportsNegativePrompt: false,
      supportsMotionVectors: true,
      supportsAudioTags: true,
      maxPromptCharacters: 5000,
      maxPlainTextCharacters: PLAIN_TEXT_LIMIT,
    },
    promptFormattingRules: [
      "Escreva o prompt compilado como um único bloco coeso: sujeito, ação, cenário, câmera, iluminação e estilo.",
      "Para sequências multi-shot, divida em planos com tempo explícito (ex: 'Shot 1 (0-3s): ...', 'Shot 2 (3-6s): ...') e indique cortes ou transições entre eles.",
      "Descreva a ação em verbos físicos concretos e na ordem em que acontece; mantenha a identidade do sujeito idêntica entre os planos.",
      "Especifique movimento de câmera de forma direta (ex: push-in lento, travelling lateral, câmera na mão, órbita).",
      "Inclua direção de áudio nativo quando houver: som ambiente, efeitos e falas curtas entre aspas.",
      "Prefira o que deve aparecer; use restrições breves ao final apenas para evitar deformações.",
    ],
  },
  kling: {
    key: "kling",
    name: "Kling",
    description: "Otimizado para o Kling (Kuaishou): prosa natural fluida, física realista e movimento de câmera claro.",
    version: 1,
    supportedOutputs: ["image", "video", "scene"],
    features: {
      supportsAspectRatio: true,
      supportsNegativePrompt: true,
      supportsMotionVectors: true,
      supportsAudioTags: false,
      maxPromptCharacters: 5000,
      maxPlainTextCharacters: PLAIN_TEXT_LIMIT,
    },
    promptFormattingRules: [
      "Escreva em prosa natural e fluida seguindo a ordem: sujeito, ação, cenário, câmera, iluminação e atmosfera.",
      "Descreva movimento e física de forma realista (peso, inércia, tecido, cabelo, fluidos, partículas).",
      "Defina o movimento de câmera com clareza e um único movimento principal por plano (ex: dolly in lento, pan à direita, drone ascendente).",
      "Mantenha a descrição do sujeito consistente e específica (idade, figurino, traços) para preservar a identidade ao longo do clipe.",
      "Evite jargão excessivo e listas de tags; o negative prompt deve ficar separado e curto (ex: membros extras, distorção, texto na tela, desfoque).",
    ],
  },
  generic: {
    key: "generic",
    name: "Genérico (Universal: Midjourney, Runway, Sora)",
    description: "Compatibilidade universal com ferramentas de IA generativa de imagem e vídeo cinematográfico.",
    version: 1,
    supportedOutputs: ["image", "video", "scene", "bible"],
    features: {
      supportsAspectRatio: true,
      supportsNegativePrompt: true,
      supportsMotionVectors: true,
      supportsAudioTags: true,
      maxPromptCharacters: 5000,
      maxPlainTextCharacters: PLAIN_TEXT_LIMIT,
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
