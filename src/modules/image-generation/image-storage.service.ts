import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";
import { degradeImage, type DegradeLevel } from "./image-degrade";

export class ImageStorageService {
  /**
   * Obtém o diretório físico base configurado para persistência de imagens.
   * Suporta volume persistente na VPS (ex: STORAGE_DIR=/app/uploads no Easypanel).
   */
  private static getStorageBaseDir(): string {
    if (process.env.STORAGE_DIR && process.env.STORAGE_DIR.trim().length > 0) {
      return path.resolve(process.env.STORAGE_DIR.trim());
    }
    return path.join(process.cwd(), "public", "generated-images");
  }

  /**
   * Garante que o diretório de destino exista com permissão de escrita.
   */
  private static async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (err: any) {
      if (err.code !== "EEXIST") throw err;
    }
  }

  /**
   * Salva uma imagem recebida em base64 ou URL no armazenamento persistente da aplicação.
   * Retorna a URL pública servível e a chave relativa de armazenamento.
   */
  static async persistImage(params: {
    b64Json?: string;
    imageUrl?: string;
    userId: string;
    workspaceId: string;
    /** Se informado, aplica degradação real (granulado/baixa resolução) antes de salvar. */
    degradeLevel?: DegradeLevel | null;
  }): Promise<{ publicUrl: string; storageKey: string }> {
    const { b64Json, imageUrl, userId, degradeLevel } = params;

    const now = new Date();
    const yearMonth = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`;
    const baseDir = this.getStorageBaseDir();
    const targetDir = path.join(baseDir, yearMonth);

    await this.ensureDirectory(targetDir);

    const uniqueId = `${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
    const filename = `${uniqueId}.webp`;
    const filePath = path.join(targetDir, filename);
    const storageKey = `generated-images/${yearMonth}/${filename}`;
    const publicUrl = `/generated-images/${yearMonth}/${filename}`;

    try {
      let buffer: Buffer | null = null;

      if (b64Json) {
        const cleanBase64 = b64Json.replace(/^data:image\/\w+;base64,/, "");
        buffer = Buffer.from(cleanBase64, "base64");
      } else if (imageUrl && imageUrl.startsWith("data:")) {
        const cleanBase64 = imageUrl.replace(/^data:image\/\w+;base64,/, "");
        buffer = Buffer.from(cleanBase64, "base64");
      } else if (imageUrl && (imageUrl.startsWith("http://") || imageUrl.startsWith("https://"))) {
        const res = await fetch(imageUrl, {
          headers: { "User-Agent": "Tomadix-Image-Archiver/1.0" },
        });

        if (res.ok) {
          const arrayBuffer = await res.arrayBuffer();
          buffer = Buffer.from(arrayBuffer);
        }
      }

      if (buffer) {
        // Otimizar e comprimir em WebP de alta fidelidade visual (reduz ~70-80% do payload)
        let finalBuffer = buffer;
        try {
          const source = degradeLevel ? await degradeImage(buffer, degradeLevel) : buffer;
          finalBuffer = await sharp(source)
            .webp({ quality: 85, effort: 4 })
            .toBuffer();
        } catch (sharpError) {
          console.warn("[ImageStorageService] Falha ao comprimir em WebP, mantendo buffer original:", sharpError);
        }

        // Gravar no diretório principal (STORAGE_DIR ou public/generated-images)
        await fs.writeFile(filePath, finalBuffer);

        // Se STORAGE_DIR estiver definido e diferente de public/generated-images,
        // tentar espelhar em public/generated-images se o diretório for acessível
        const localPublicDir = path.join(process.cwd(), "public", "generated-images", yearMonth);
        if (localPublicDir !== targetDir) {
          try {
            await this.ensureDirectory(localPublicDir);
            await fs.writeFile(path.join(localPublicDir, filename), finalBuffer);
          } catch {
            // Ignorar falha no espelho secundário
          }
        }

        return { publicUrl, storageKey };
      }
    } catch (writeError) {
      console.error("[ImageStorageService] Falha ao persistir imagem em disco:", writeError);
      if (imageUrl) {
        return { publicUrl: imageUrl, storageKey: "memory/fallback" };
      }
      if (b64Json) {
        const dataUrl = b64Json.startsWith("data:") ? b64Json : `data:image/jpeg;base64,${b64Json}`;
        return { publicUrl: dataUrl, storageKey: "memory/fallback" };
      }
    }

    return {
      publicUrl: imageUrl || "",
      storageKey: "unknown",
    };
  }

  /**
   * Remove o arquivo físico de uma imagem gerada do disco da aplicação.
   */
  static async deleteImage(imageUrlOrStorageKey: string): Promise<boolean> {
    if (!imageUrlOrStorageKey || imageUrlOrStorageKey.startsWith("http://") || imageUrlOrStorageKey.startsWith("https://") || imageUrlOrStorageKey.startsWith("data:")) {
      return false;
    }

    // Normalizar caminho relativo: "/generated-images/2026/11/abc.jpg" -> "2026/11/abc.jpg"
    const cleanRelative = imageUrlOrStorageKey
      .replace(/^\/?generated-images\//, "")
      .replace(/^\//, "");

    const ext = path.extname(cleanRelative);
    const altExt = ext === ".webp" ? ".jpg" : ext === ".jpg" ? ".webp" : "";
    const altRelative = altExt ? cleanRelative.slice(0, -ext.length) + altExt : "";

    const baseDir = this.getStorageBaseDir();
    const primaryPath = path.join(baseDir, cleanRelative);
    const primaryAltPath = altRelative ? path.join(baseDir, altRelative) : null;

    let deleted = false;

    try {
      if (fsSync.existsSync(primaryPath)) {
        await fs.unlink(primaryPath);
        deleted = true;
      }
      if (primaryAltPath && fsSync.existsSync(primaryAltPath)) {
        await fs.unlink(primaryAltPath);
        deleted = true;
      }
    } catch (err) {
      console.warn("[ImageStorageService] Falha ao excluir arquivo primário:", primaryPath, err);
    }

    // Tentar excluir também do espelho secundário em public/generated-images se existir
    try {
      const localPublicDir = path.join(process.cwd(), "public", "generated-images", cleanRelative);
      if (localPublicDir !== primaryPath && fsSync.existsSync(localPublicDir)) {
        await fs.unlink(localPublicDir);
        deleted = true;
      }
      if (altRelative) {
        const localPublicAltDir = path.join(process.cwd(), "public", "generated-images", altRelative);
        if (localPublicAltDir !== primaryAltPath && fsSync.existsSync(localPublicAltDir)) {
          await fs.unlink(localPublicAltDir);
          deleted = true;
        }
      }
    } catch {
      // Ignorar falha no espelho
    }

    return deleted;
  }
}
