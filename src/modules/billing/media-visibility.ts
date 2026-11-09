/**
 * Com a geração de imagens e/ou vídeos desligada pelo administrador, o catálogo público
 * (planos e simulação de capacidade) não pode mencionar a função desligada.
 */

export interface MediaFlags {
  image: boolean;
  video: boolean;
}

// "Geração direta de imagens...", "Acesso a todos os modelos de imagem..." etc.
const IMAGE_FEATURE_PATTERN = /gera[çc][ãa]o (direta )?de imag(em|ens)|modelos de imag(em|ens)/i;
const VIDEO_FEATURE_PATTERN = /gera[çc][ãa]o (direta )?de v[ií]deos?|modelos de v[ií]deos?/i;

export function isImageFeatureText(text: string): boolean {
  return IMAGE_FEATURE_PATTERN.test(text);
}

export function isVideoFeatureText(text: string): boolean {
  return VIDEO_FEATURE_PATTERN.test(text);
}

/** Texto de recurso de imagem ou de vídeo. */
export function isMediaFeatureText(text: string): boolean {
  return isImageFeatureText(text) || isVideoFeatureText(text);
}

export function stripMediaFeatures<T extends { features?: unknown }>(plan: T, flags: MediaFlags): T {
  if (!Array.isArray(plan.features)) return plan;
  return {
    ...plan,
    features: plan.features.filter((f) => {
      if (typeof f !== "string") return true;
      if (!flags.image && isImageFeatureText(f)) return false;
      if (!flags.video && isVideoFeatureText(f)) return false;
      return true;
    }),
  };
}

export function stripMediaOperations<T extends { services?: Array<{ operationCode: string }> }>(
  simulation: T,
  flags: MediaFlags
): T {
  if (!Array.isArray(simulation.services)) return simulation;
  return {
    ...simulation,
    services: simulation.services.filter((s) => {
      if (!flags.image && s.operationCode === "GEN_IMAGE_DIRECT") return false;
      if (!flags.video && s.operationCode === "GEN_VIDEO_DIRECT") return false;
      return true;
    }),
  };
}
