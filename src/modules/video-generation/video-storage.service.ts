import fs from "fs";
import path from "path";
import crypto from "crypto";

export class VideoStorageService {
  private static getStorageBaseDir(): string {
    const customDir = process.env.STORAGE_DIR;
    if (customDir && customDir.trim().length > 0) {
      return path.resolve(customDir.trim(), "generated-videos");
    }
    return path.join(process.cwd(), "public", "generated-videos");
  }

  /**
   * Persiste o arquivo MP4 localmente e retorna URLs de acesso público.
   */
  static async persistVideo(params: {
    videoBuffer?: Buffer;
    remoteUrl?: string;
    userId: string;
  }): Promise<{ publicUrl: string; storageKey: string }> {
    const { videoBuffer, remoteUrl, userId } = params;

    const baseDir = this.getStorageBaseDir();
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const targetDir = path.join(baseDir, yearMonth);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const uniqueHash = crypto.randomBytes(8).toString("hex");
    const filename = `vid-${Date.now()}-${uniqueHash}.mp4`;
    const targetPath = path.join(targetDir, filename);

    const storageKey = `generated-videos/${yearMonth}/${filename}`;
    const publicUrl = `/generated-videos/${yearMonth}/${filename}`;

    try {
      if (videoBuffer && videoBuffer.length > 0) {
        fs.writeFileSync(targetPath, videoBuffer);
        return { publicUrl, storageKey };
      }

      if (remoteUrl && remoteUrl.startsWith("http")) {
        const res = await fetch(remoteUrl, { signal: AbortSignal.timeout(60000) });
        if (res.ok) {
          const ab = await res.arrayBuffer();
          fs.writeFileSync(targetPath, Buffer.from(ab));
          return { publicUrl, storageKey };
        }
        return { publicUrl: remoteUrl, storageKey: "remote" };
      }
    } catch (err) {
      console.warn("[VideoStorageService] Falha ao persistir vídeo localmente:", err);
      if (remoteUrl) {
        return { publicUrl: remoteUrl, storageKey: "remote/fallback" };
      }
    }

    return {
      publicUrl: remoteUrl || "",
      storageKey: "unknown",
    };
  }

  static async deleteVideo(storageKeyOrUrl: string): Promise<boolean> {
    if (!storageKeyOrUrl || storageKeyOrUrl.startsWith("http")) return false;

    const baseDir = this.getStorageBaseDir();
    const cleanRelative = storageKeyOrUrl
      .replace(/^\/?generated-videos\//, "")
      .replace(/^\//, "");

    const targetPath = path.join(baseDir, cleanRelative);

    try {
      if (fs.existsSync(targetPath)) {
        fs.unlinkSync(targetPath);
        return true;
      }
    } catch {
      // Ignora erro
    }
    return false;
  }
}

