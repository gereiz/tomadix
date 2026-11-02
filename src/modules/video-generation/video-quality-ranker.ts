export type VideoQualityTier = "ULTRA" | "HIGH" | "BALANCED" | "FAST";

export interface VideoQualityRank {
  score: number; // 0 a 100
  tier: VideoQualityTier;
  tierLabel: string;
  badgeColor: string;
  stars: string;
  rationale: string;
  pollenCostPerSecond: number;
  formattedRate: string;
  sampleCost5s: string;
  supportsAudio: boolean;
  supportsReferenceImage: boolean;
}

const KNOWN_POLLEN_RATES: Record<string, { pollenPerSec: number; audio: boolean; refImage: boolean }> = {
  "bytedance/seedance-2.0-fast": { pollenPerSec: 0.07, audio: true, refImage: true },
  "bytedance/seedance-2.0": { pollenPerSec: 0.18, audio: true, refImage: true },
  "bytedance/seedance-2.5": { pollenPerSec: 0.1028, audio: true, refImage: true },
  "bytedance/seedance-1-pro-fast": { pollenPerSec: 0.021, audio: true, refImage: true },
  "bytedance/seedance-2.0-mini": { pollenPerSec: 0.09, audio: true, refImage: true },
  "google/veo-3.1-fast": { pollenPerSec: 0.08, audio: true, refImage: true },
  "alibaba/wan-2.2-fast": { pollenPerSec: 0.01, audio: true, refImage: true },
  "alibaba/wan-2.6": { pollenPerSec: 0.10, audio: true, refImage: true },
  "alibaba/wan-2.7": { pollenPerSec: 0.10, audio: true, refImage: true },
  "alibaba/wan-3.0": { pollenPerSec: 0.068, audio: true, refImage: true },
  "alibaba/happyhorse-1.1": { pollenPerSec: 0.104, audio: true, refImage: true },
  "kwaivgi/kling-v3.0-std": { pollenPerSec: 0.084, audio: true, refImage: true },
  "x-ai/grok-imagine-video-1.5-lite": { pollenPerSec: 0.03, audio: true, refImage: true },
  "x-ai/grok-imagine-video-1.5": { pollenPerSec: 0.14, audio: true, refImage: true },
  "x-ai/grok-imagine-video": { pollenPerSec: 0.05, audio: true, refImage: true },
  "black-forest-labs/flux-3-max": { pollenPerSec: 0.0425, audio: false, refImage: true },
  "minimax/minimax-h3": { pollenPerSec: 0.05, audio: true, refImage: true },
  "prunaai/p-video": { pollenPerSec: 0.02, audio: false, refImage: true },
};

export function rankVideoModelQuality(
  modelId: string,
  publisher = "",
  name = "",
  customPricing?: any
): VideoQualityRank {
  const id = modelId.toLowerCase();
  const pub = publisher.toLowerCase();
  const n = name.toLowerCase();

  // Extração ou inferência da taxa de pólen
  let pollenPerSec = 0.05;
  if (customPricing?.completionVideoSeconds) {
    pollenPerSec = parseFloat(customPricing.completionVideoSeconds);
  } else if (KNOWN_POLLEN_RATES[id]?.pollenPerSec) {
    pollenPerSec = KNOWN_POLLEN_RATES[id].pollenPerSec;
  }

  const supportsAudio = KNOWN_POLLEN_RATES[id]?.audio ?? true;
  const supportsReferenceImage = KNOWN_POLLEN_RATES[id]?.refImage ?? true;

  // Tier 1: ULTRA CINEMA (Score 96-99)
  if (id.includes("veo-3.1") || id.includes("veo")) {
    return {
      score: 99,
      tier: "ULTRA",
      tierLabel: "Ultra Cinema",
      badgeColor: "bg-amber-400 text-black border-amber-300 font-bold",
      stars: "★★★★★",
      rationale: "Fidelidade cinematográfica de estúdio, física hiper-realista, iluminação volumétrica e suporte nativo a áudio.",
      pollenCostPerSecond: pollenPerSec,
      formattedRate: `${pollenPerSec.toFixed(3)} pollen/s`,
      sampleCost5s: `~${(pollenPerSec * 5).toFixed(2)} pollen / 5s`,
      supportsAudio,
      supportsReferenceImage,
    };
  }

  if (id.includes("seedance-2.0") || id.includes("seedance-2.5") || id.includes("seedance")) {
    return {
      score: 98,
      tier: "ULTRA",
      tierLabel: "Ultra Cinema",
      badgeColor: "bg-amber-400 text-black border-amber-300 font-bold",
      stars: "★★★★★",
      rationale: "Movimentos dinâmicos ultra-fluidos, coerência temporal estrita de anatomia e personagens, com áudio sincronizado.",
      pollenCostPerSecond: pollenPerSec,
      formattedRate: `${pollenPerSec.toFixed(3)} pollen/s`,
      sampleCost5s: `~${(pollenPerSec * 5).toFixed(2)} pollen / 5s`,
      supportsAudio,
      supportsReferenceImage,
    };
  }

  if (id.includes("kling")) {
    return {
      score: 97,
      tier: "ULTRA",
      tierLabel: "Ultra Cinema",
      badgeColor: "bg-amber-400 text-black border-amber-300 font-bold",
      stars: "★★★★★",
      rationale: "Consistência física de ponta com movimentos realistas de câmera, tecido e simulação orgânica.",
      pollenCostPerSecond: pollenPerSec,
      formattedRate: `${pollenPerSec.toFixed(3)} pollen/s`,
      sampleCost5s: `~${(pollenPerSec * 5).toFixed(2)} pollen / 5s`,
      supportsAudio,
      supportsReferenceImage,
    };
  }

  // Tier 2: ALTA PERFORMANCE / PRO (Score 88-95)
  if (id.includes("grok-imagine-video")) {
    return {
      score: 94,
      tier: "HIGH",
      tierLabel: "Pro Studio",
      badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-semibold",
      stars: "★★★★☆",
      rationale: "Renderização rápida com textura fotográfica refinada e transições suaves de perspectiva.",
      pollenCostPerSecond: pollenPerSec,
      formattedRate: `${pollenPerSec.toFixed(3)} pollen/s`,
      sampleCost5s: `~${(pollenPerSec * 5).toFixed(2)} pollen / 5s`,
      supportsAudio,
      supportsReferenceImage,
    };
  }

  if (id.includes("wan-2") || id.includes("wan-3") || id.includes("wan")) {
    return {
      score: 92,
      tier: "HIGH",
      tierLabel: "Pro Studio",
      badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-semibold",
      stars: "★★★★☆",
      rationale: "Excelente estabilidade de enquadramento, custo de pólen extremamente econômico e geração ágil.",
      pollenCostPerSecond: pollenPerSec,
      formattedRate: `${pollenPerSec.toFixed(3)} pollen/s`,
      sampleCost5s: `~${(pollenPerSec * 5).toFixed(2)} pollen / 5s`,
      supportsAudio,
      supportsReferenceImage,
    };
  }

  if (id.includes("flux-3-max")) {
    return {
      score: 93,
      tier: "HIGH",
      tierLabel: "Pro Studio",
      badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-semibold",
      stars: "★★★★☆",
      rationale: "Estética cinematográfica consagrada do motor FLUX com animação de quadros e composição precisa.",
      pollenCostPerSecond: pollenPerSec,
      formattedRate: `${pollenPerSec.toFixed(3)} pollen/s`,
      sampleCost5s: `~${(pollenPerSec * 5).toFixed(2)} pollen / 5s`,
      supportsAudio: false,
      supportsReferenceImage: true,
    };
  }

  // Tier 3: BALANCED MOTION (Score 80-87)
  return {
    score: 85,
    tier: "BALANCED",
    tierLabel: "Balanced Motion",
    badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/30 font-semibold",
    stars: "★★★☆☆",
    rationale: "Modelo versátil para prototipagem rápida de cenas e pré-visualização de planos de câmera.",
    pollenCostPerSecond: pollenPerSec,
    formattedRate: `${pollenPerSec.toFixed(3)} pollen/s`,
    sampleCost5s: `~${(pollenPerSec * 5).toFixed(2)} pollen / 5s`,
    supportsAudio,
    supportsReferenceImage,
  };
}
