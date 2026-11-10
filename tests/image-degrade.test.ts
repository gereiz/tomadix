import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { degradeImage, degradeLevelForStyle } from "@/modules/image-generation/image-degrade";

async function sampleImage(width = 640, height = 360): Promise<Buffer> {
  // gradiente com formas nítidas para que a degradação seja mensurável
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#1b6ca8"/><stop offset="1" stop-color="#e8a33d"/></linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <circle cx="${width / 2}" cy="${height / 2}" r="${height / 4}" fill="#fff"/>
    <rect x="20" y="20" width="80" height="40" fill="#000"/>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

describe("Degradação de imagem (granulado / baixa resolução)", () => {
  it("mantém as dimensões e altera os pixels em todos os níveis", async () => {
    const original = await sampleImage();
    for (const level of ["light", "medium", "heavy"] as const) {
      const out = await degradeImage(original, level, { seed: 7 });
      const meta = await sharp(out).metadata();
      expect([meta.width, meta.height]).toEqual([640, 360]);
      expect(out.equals(original)).toBe(false);
    }
  });

  it("níveis mais fortes perdem mais detalhe que os leves", async () => {
    const original = await sampleImage();
    const raw = async (buf: Buffer) => (await sharp(buf).resize(640, 360).removeAlpha().raw().toBuffer());
    const base = await raw(original);
    const diff = async (level: "light" | "heavy") => {
      const out = await raw(await degradeImage(original, level, { seed: 1 }));
      let sum = 0;
      for (let i = 0; i < base.length; i += 7) sum += Math.abs(base[i] - out[i]);
      return sum;
    };
    expect(await diff("heavy")).toBeGreaterThan(await diff("light"));
  });

  it("é determinístico com a mesma seed", async () => {
    const original = await sampleImage(320, 180);
    const a = await degradeImage(original, "medium", { seed: 42 });
    const b = await degradeImage(original, "medium", { seed: 42 });
    expect(a.equals(b)).toBe(true);
  });

  it("escolhe o nível pelo estilo de captura", () => {
    expect(degradeLevelForStyle("lowres_grain")).toBe("heavy");
    expect(degradeLevelForStyle("lowres_grain_extreme")).toBe("extreme");
    expect(degradeLevelForStyle("cctv_lowbit")).toBe("extreme");
    expect(degradeLevelForStyle("amateur_phone")).toBe("medium");
    expect(degradeLevelForStyle("selfie_flash")).toBe("medium");
    expect(degradeLevelForStyle("cinematic")).toBeNull();
    expect(degradeLevelForStyle(undefined)).toBeNull();
  });
});
