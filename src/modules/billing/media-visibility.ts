/**
 * Com a geração de imagens/vídeos desligada pelo administrador, o catálogo público
 * (planos e simulação de capacidade) não pode mencionar essas funções.
 */

const MEDIA_OPERATION_CODES = new Set(["GEN_IMAGE_DIRECT", "GEN_VIDEO_DIRECT"]);

// "Geração direta de imagens...", "Acesso a todos os modelos de imagem..." etc.
const MEDIA_FEATURE_PATTERN = /gera[çc][ãa]o (direta )?de (imagens?|v[ií]deos?)|modelos de (imagem|imagens|v[ií]deo|v[ií]deos)/i;

export function isMediaFeatureText(text: string): boolean {
  return MEDIA_FEATURE_PATTERN.test(text);
}

export function stripMediaFeatures<T extends { features?: unknown }>(plan: T): T {
  if (!Array.isArray(plan.features)) return plan;
  return {
    ...plan,
    features: plan.features.filter((f) => typeof f !== "string" || !isMediaFeatureText(f)),
  };
}

export function stripMediaOperations<T extends { services?: Array<{ operationCode: string }> }>(simulation: T): T {
  if (!Array.isArray(simulation.services)) return simulation;
  return {
    ...simulation,
    services: simulation.services.filter((s) => !MEDIA_OPERATION_CODES.has(s.operationCode)),
  };
}
