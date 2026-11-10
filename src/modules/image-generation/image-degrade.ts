import sharp from "sharp";

export type DegradeLevel = "light" | "medium" | "heavy" | "extreme";

interface DegradeSettings {
  /** Fração da largura original mantida antes de reampliar. */
  scale: number;
  /** Desvio padrão do ruído (0-255). */
  noise: number;
  blur: number;
  jpegQuality: number;
  saturation: number;
  contrast: number;
}

const SETTINGS: Record<DegradeLevel, DegradeSettings> = {
  light: { scale: 0.6, noise: 10, blur: 0.4, jpegQuality: 55, saturation: 1.05, contrast: 0.97 },
  medium: { scale: 0.45, noise: 18, blur: 0.6, jpegQuality: 38, saturation: 1.1, contrast: 0.94 },
  heavy: { scale: 0.38, noise: 23, blur: 0.7, jpegQuality: 30, saturation: 1.12, contrast: 0.92 },
  // Alvo: frame mole de celular repostado (detalhe borrado, cor natural), não pixel gigante nem cor saturada.
  extreme: { scale: 0.4, noise: 26, blur: 1.2, jpegQuality: 22, saturation: 0.95, contrast: 0.9 },
};

/** Ruído gaussiano aproximado (soma de uniformes), determinístico quando `seed` é informado. */
function noiseBuffer(width: number, height: number, sigma: number, seed?: number): Buffer {
  let state = ((seed ?? Math.floor(Math.random() * 2 ** 31)) >>> 0) || 1;
  const rand = () => {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 4294967296;
  };
  const out = Buffer.alloc(width * height);
  for (let i = 0; i < out.length; i++) {
    const g = (rand() + rand() + rand() + rand() - 2) * Math.sqrt(3) * sigma;
    out[i] = Math.max(0, Math.min(255, Math.round(128 + g)));
  }
  return out;
}

/**
 * Simula filmagem amadora de baixa resolução: reduz, desfoca, recomprime, reamplia e soma grão.
 * Mantém as dimensões originais.
 */
export async function degradeImage(
  input: Buffer,
  level: DegradeLevel = "medium",
  options?: { seed?: number }
): Promise<Buffer> {
  const cfg = SETTINGS[level];
  const meta = await sharp(input).metadata();
  const width = meta.width ?? 1024;
  const height = meta.height ?? 1024;
  const smallW = Math.max(64, Math.round(width * cfg.scale));
  const smallH = Math.max(64, Math.round(height * cfg.scale));

  // 1. Reduz, desfoca e recomprime em JPEG pesado (blocos de compressão)
  const small = await sharp(input)
    .resize(smallW, smallH, { fit: "fill" })
    .removeAlpha()
    .blur(cfg.blur)
    .modulate({ saturation: cfg.saturation })
    .linear(cfg.contrast, 128 * (1 - cfg.contrast))
    .jpeg({ quality: cfg.jpegQuality, chromaSubsampling: "4:2:0" })
    .toBuffer();

  // 2. Reamplia com interpolação simples (pixels grandes e macios)
  const upscaled = await sharp(small).resize(width, height, { fit: "fill", kernel: "cubic" }).toBuffer();

  // 3. Soma o grão (luminância) na resolução final
  const grain = await sharp(noiseBuffer(width, height, cfg.noise, options?.seed), {
    raw: { width, height, channels: 1 },
  })
    .png()
    .toBuffer();

  return sharp(upscaled)
    .composite([{ input: grain, blend: "overlay" }])
    .jpeg({ quality: Math.min(90, cfg.jpegQuality + 30) })
    .toBuffer();
}

/** Nível sugerido por estilo de captura (null = não degradar). */
export function degradeLevelForStyle(captureStyle?: string | null): DegradeLevel | null {
  switch (captureStyle) {
    case "lowres_grain_extreme":
    case "cctv_lowbit":
      return "extreme";
    case "lowres_grain":
      return "heavy";
    case "amateur_phone":
    case "selfie_flash":
    case "found_footage":
    case "security_cam":
      return "medium";
    default:
      return null;
  }
}
