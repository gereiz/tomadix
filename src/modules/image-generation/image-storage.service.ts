import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export class ImageStorageService {
  private static storageBaseDir = path.join(process.cwd(), "public", "generated-images");

  /**
   * Garante que o diretório de destino exista.
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
  }): Promise<{ publicUrl: string; storageKey: string }> {
    const { b64Json, imageUrl, userId } = params;

    const now = new Date();
    const yearMonth = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`;
    const targetDir = path.join(this.storageBaseDir, yearMonth);
    await this.ensureDirectory(targetDir);

    const uniqueId = `${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
    const filename = `${uniqueId}.jpg`;
    const filePath = path.join(targetDir, filename);
    const storageKey = `generated-images/${yearMonth}/${filename}`;
    const publicUrl = `/generated-images/${yearMonth}/${filename}`;

    try {
      if (b64Json) {
        // Remover prefixo data:image/jpeg;base64, se houver
        const cleanBase64 = b64Json.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(cleanBase64, "base64");
        await fs.writeFile(filePath, buffer);
        return { publicUrl, storageKey };
      }

      if (imageUrl && imageUrl.startsWith("data:")) {
        const cleanBase64 = imageUrl.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(cleanBase64, "base64");
        await fs.writeFile(filePath, buffer);
        return { publicUrl, storageKey };
      }

      if (imageUrl && (imageUrl.startsWith("http://") || imageUrl.startsWith("https://"))) {
        // Download seguro da imagem para evitar dependência de links efêmeros externos
        const res = await fetch(imageUrl, {
          headers: { "User-Agent": "Tomadix-Image-Archiver/1.0" },
        });

        if (res.ok) {
          const arrayBuffer = await res.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          await fs.writeFile(filePath, buffer);
          return { publicUrl, storageKey };
        }
      }
    } catch (writeError) {
      console.error("[ImageStorageService] Falha ao persistir imagem em disco:", writeError);
      // Se houver erro de escrita em disco, fallback gracioso para a imagem original em data-uri ou url externa
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
}

