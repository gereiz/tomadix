export type ModelQualityTier = "ULTRA" | "HIGH" | "BALANCED" | "FAST";

export interface ModelQualityRank {
  score: number; // 0 a 100
  tier: ModelQualityTier;
  tierLabel: string;
  badgeColor: string;
  stars: string;
  rationale: string;
}

export function rankModelQuality(modelId: string, publisher = "", name = ""): ModelQualityRank {
  const id = modelId.toLowerCase();
  const pub = publisher.toLowerCase();
  const n = name.toLowerCase();

  // Tier 1: ULTRA CINEMA (Score 96-99)
  if (
    id.includes("flux.1.1-pro") ||
    id.includes("flux-3-max") ||
    id.includes("flux.2-max") ||
    id.includes("flux-3-image")
  ) {
    return {
      score: 99,
      tier: "ULTRA",
      tierLabel: "Ultra Cinema",
      badgeColor: "bg-amber-400 text-black border-amber-300 font-bold",
      stars: "★★★★★",
      rationale: "Fidelidade fotográfica de estúdio, texturas hiper-realistas e iluminação volumétrica avançada.",
    };
  }

  if (
    id.includes("flux.2-pro") ||
    id.includes("flux.2-flex") ||
    id.includes("recraft-v4.1-pro") ||
    id.includes("seedream-5.0")
  ) {
    return {
      score: 96,
      tier: "ULTRA",
      tierLabel: "Ultra Cinema",
      badgeColor: "bg-amber-400/90 text-black border-amber-300 font-bold",
      stars: "★★★★★",
      rationale: "Alta resolução nativa com suporte a múltiplas referências estéticas e composição refinada.",
    };
  }

  // Tier 2: ALTA FIDELIDADE (Score 88-95)
  if (
    id === "flux" ||
    id.includes("flux.1-schnell") ||
    id.includes("flux-schnell") ||
    id.includes("flux-3-image-klein") ||
    id.includes("flux.2-klein")
  ) {
    return {
      score: 94,
      tier: "HIGH",
      tierLabel: "Alta Fidelidade",
      badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
      stars: "★★★★☆",
      rationale: "Equilíbrio cinematográfico ideal: alto realismo fotográfico com rapidez de geração.",
    };
  }

  if (
    id.includes("qwen-image-2.1-pro") ||
    id.includes("wan-2.7-image-pro") ||
    id.includes("recraft") ||
    id.includes("grok-imagine")
  ) {
    return {
      score: 90,
      tier: "HIGH",
      tierLabel: "Alta Fidelidade",
      badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
      stars: "★★★★☆",
      rationale: "Excelente interpretação semântica e aderência complexa a prompts descritivos.",
    };
  }

  // Tier 3: EQUILIBRADO / VERSÁTIL (Score 75-87)
  if (
    id.includes("seedream") ||
    id.includes("wan-2.7") ||
    id.includes("qwen-image") ||
    id.includes("sdxl") ||
    n.includes("dev")
  ) {
    return {
      score: 82,
      tier: "BALANCED",
      tierLabel: "Equilibrado",
      badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/40",
      stars: "★★★☆☆",
      rationale: "Qualidade sólida para produção diária e composição de cenas gerais.",
    };
  }

  // Tier 4: RÁPIDO / ECONÔMICO (Score 60-74)
  if (
    id.includes("turbo") ||
    id.includes("flash") ||
    id.includes("nano") ||
    id.includes("lite") ||
    id.includes("p-image")
  ) {
    return {
      score: 70,
      tier: "FAST",
      tierLabel: "Rápido / Econômico",
      badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/40",
      stars: "★★☆☆☆",
      rationale: "Otimizado para decupagem veloz, rascunhos conceituais e pré-visualização ágil.",
    };
  }

  // Padrão geral
  return {
    score: 78,
    tier: "BALANCED",
    tierLabel: "Padrão",
    badgeColor: "bg-white/10 text-white/70 border-white/20",
    stars: "★★★☆☆",
    rationale: "Modelo versátil para text-to-image compatível com o catálogo Pollinations.",
  };
}

