import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Otimização de Imagens para WebP", () => {
  const references = [
    "black-white-grain.webp",
    "chiaroscuro.webp",
    "golden-hour.webp",
    "motion-blur.webp",
    "neon-noir.webp",
    "soft-window-light.webp",
  ];

  it("garante que todas as referências do estúdio existem em .webp e são compactas (< 200 KB cada)", () => {
    for (const ref of references) {
      const webpPath = path.join(process.cwd(), "public", "studio-references", ref);
      expect(fs.existsSync(webpPath), `Arquivo ${ref} deve existir em public/studio-references`).toBe(true);

      const webpSize = fs.statSync(webpPath).size;
      expect(webpSize).toBeLessThan(200 * 1024); // Menos de 200 KB
    }
  });

  it("garante que a amostra cinematográfica possui versão .webp gerada e hiper-leve (< 10 KB)", () => {
    const webpPath = path.join(process.cwd(), "public", "sample-cinematic.webp");
    expect(fs.existsSync(webpPath)).toBe(true);
    const size = fs.statSync(webpPath).size;
    expect(size).toBeLessThan(10 * 1024); // Menos de 10 KB
  });
});
