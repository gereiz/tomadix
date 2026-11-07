import { NextRequest, NextResponse } from "next/server";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { Readable } from "stream";
import path from "path";

const MIME_MAP: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

/** Arquivo existente (e regular) ou null, sem bloquear o event loop. */
async function statFile(fullPath: string) {
  try {
    const s = await stat(fullPath);
    return s.isFile() ? s : null;
  } catch {
    return null;
  }
}

/**
 * Serve uma imagem armazenada em disco (STORAGE_DIR, public/generated-images ou uploads) em runtime.
 * Essencial para ambientes standalone (Docker / VPS), onde o Next.js não serve arquivos criados
 * dinamicamente em public/ após o build.
 *
 * - I/O assíncrono e resposta por stream (sem carregar o arquivo inteiro em memória).
 * - ETag + If-None-Match: o navegador revalida com 304 em vez de baixar de novo.
 */
export async function serveStoredImage(
  request: NextRequest,
  slug: string[] | undefined,
  logTag: string
): Promise<NextResponse> {
  try {
    if (!slug || slug.length === 0) {
      return new NextResponse("Not Found", { status: 404 });
    }

    // Prevenção rigorosa de Path Traversal
    for (const segment of slug) {
      if (segment === ".." || segment.includes("\\") || segment.includes("/")) {
        return new NextResponse("Bad Request", { status: 400 });
      }
    }

    const relativePath = path.join(...slug);

    // Locais possíveis do arquivo, em ordem de prioridade
    const candidateDirs: string[] = [];
    if (process.env.STORAGE_DIR && process.env.STORAGE_DIR.trim().length > 0) {
      const storageBase = process.env.STORAGE_DIR.trim();
      candidateDirs.push(storageBase);
      candidateDirs.push(path.join(storageBase, "generated-images"));
    }
    candidateDirs.push(path.join(process.cwd(), "public", "generated-images"));
    candidateDirs.push(path.join(process.cwd(), "uploads"));
    candidateDirs.push(path.join(process.cwd(), "uploads", "generated-images"));

    // Variações de extensão (as imagens foram convertidas para WebP)
    const extReq = path.extname(relativePath).toLowerCase();
    const candidateRelatives = [relativePath];
    if (extReq === ".jpg" || extReq === ".jpeg" || extReq === ".png") {
      candidateRelatives.unshift(relativePath.slice(0, -extReq.length) + ".webp");
    } else if (extReq === ".webp") {
      candidateRelatives.push(relativePath.slice(0, -extReq.length) + ".jpg");
      candidateRelatives.push(relativePath.slice(0, -extReq.length) + ".png");
    }

    let resolvedPath: string | null = null;
    let fileStats: Awaited<ReturnType<typeof statFile>> = null;

    for (const rel of candidateRelatives) {
      // Diretórios candidatos consultados em paralelo; a ordem de prioridade é preservada
      const results = await Promise.all(
        candidateDirs.map(async (baseDir) => {
          const fullPath = path.join(baseDir, rel);
          return { fullPath, s: await statFile(fullPath) };
        })
      );
      const found = results.find((r) => r.s);
      if (found) {
        resolvedPath = found.fullPath;
        fileStats = found.s;
        break;
      }
    }

    if (!resolvedPath || !fileStats) {
      return new NextResponse("Image Not Found", { status: 404 });
    }

    const ext = path.extname(resolvedPath).toLowerCase();
    const contentType = MIME_MAP[ext] || "application/octet-stream";
    const etag = `W/"${fileStats.size.toString(16)}-${Math.floor(fileStats.mtimeMs).toString(16)}"`;
    const cacheControl = "public, max-age=31536000, immutable";

    if (request.headers.get("if-none-match") === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: { ETag: etag, "Cache-Control": cacheControl },
      });
    }

    const body = Readable.toWeb(createReadStream(resolvedPath)) as ReadableStream<Uint8Array>;

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": fileStats.size.toString(),
        "Cache-Control": cacheControl,
        ETag: etag,
      },
    });
  } catch (error) {
    console.error(`[${logTag}] Erro ao servir imagem:`, error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
