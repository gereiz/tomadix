/**
 * Utilitários de imagem do Studio de Análise Cinematográfica.
 *
 * - Redimensiona uploads no cliente (reduz payload enviado à API).
 * - Rasteriza referências SVG da biblioteca em PNG, pois o Gemini Vision
 *   aceita apenas formatos raster (PNG/JPEG/WEBP).
 * - Gera miniaturas leves para exibir no histórico.
 */

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB
export const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Não foi possível carregar a imagem."));
    img.src = src;
  });
}

function drawToDataUrl(
  img: HTMLImageElement,
  width: number,
  height: number,
  maxSize: number,
  mime: "image/jpeg" | "image/png" = "image/jpeg",
  quality = 0.88
): string {
  const scale = Math.min(1, maxSize / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível neste navegador.");
  if (mime === "image/jpeg") {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
  }
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL(mime, quality);
}

/** Lê um arquivo de imagem, valida e devolve um data URL otimizado (JPEG, lado máximo `maxSize`). */
export async function fileToOptimizedDataUrl(file: File, maxSize = 1600): Promise<string> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Formato não suportado. Use PNG, JPG ou WEBP.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Arquivo maior que 10MB.");
  }
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    return drawToDataUrl(img, img.naturalWidth, img.naturalHeight, maxSize);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/** Converte qualquer URL de imagem (inclusive SVG local) em data URL raster. */
export async function urlToRasterDataUrl(url: string, maxSize = 1280): Promise<string> {
  if (url.startsWith("data:image/") && !url.startsWith("data:image/svg")) return url;

  if (url.toLowerCase().split("?")[0].endsWith(".svg")) {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Referência visual indisponível.");
    const svgText = await res.text();
    let vbW = 1600;
    let vbH = 900;
    const vb = svgText.match(/viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
    if (vb) {
      vbW = parseFloat(vb[1]) || vbW;
      vbH = parseFloat(vb[2]) || vbH;
    }
    const ratio = vbW / vbH;
    const width = ratio >= 1 ? maxSize : Math.round(maxSize * ratio);
    const height = ratio >= 1 ? Math.round(maxSize / ratio) : maxSize;
    // Força dimensões absolutas para que o navegador rasterize em alta resolução
    const sized = svgText.replace(
      /<svg\b([^>]*)>/i,
      (_m, attrs: string) =>
        `<svg${attrs.replace(/\s(width|height)\s*=\s*["'][^"']*["']/gi, "")} width="${width}" height="${height}">`
    );
    const blobUrl = URL.createObjectURL(new Blob([sized], { type: "image/svg+xml" }));
    try {
      const img = await loadImage(blobUrl);
      return drawToDataUrl(img, width, height, maxSize, "image/png");
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  }

  const img = await loadImage(url);
  return drawToDataUrl(img, img.naturalWidth, img.naturalHeight, maxSize);
}

/** Gera miniatura leve (JPEG) para histórico local. */
export async function makeThumbnail(src: string, maxSize = 480): Promise<string> {
  const img = await loadImage(src);
  return drawToDataUrl(img, img.naturalWidth || maxSize, img.naturalHeight || maxSize, maxSize, "image/jpeg", 0.72);
}

/* ---------------- Persistência local (miniaturas e favoritos) ---------------- */

const THUMBS_KEY = "tomadix.studio.thumbs";
const FAVS_KEY = "tomadix.studio.favorites";
const MAX_THUMBS = 30;

export function loadThumbs(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(THUMBS_KEY) || "{}");
  } catch {
    return {};
  }
}

export function saveThumb(id: string, dataUrl: string): Record<string, string> {
  const current = loadThumbs();
  const next: Record<string, string> = { [id]: dataUrl, ...current };
  const keys = Object.keys(next).slice(0, MAX_THUMBS);
  const trimmed = Object.fromEntries(keys.map((k) => [k, next[k]]));
  try {
    localStorage.setItem(THUMBS_KEY, JSON.stringify(trimmed));
  } catch {
    // quota excedida: mantém apenas em memória
  }
  return trimmed;
}

export function loadFavorites(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(FAVS_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

export function saveFavorites(ids: Set<string>) {
  try {
    localStorage.setItem(FAVS_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    /* noop */
  }
}

