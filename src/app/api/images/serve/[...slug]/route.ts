import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const MIME_MAP: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string[] }> }
) {
  try {
    const { slug } = await context.params;

    if (!slug || slug.length === 0) {
      return new NextResponse("Not Found", { status: 404 });
    }

    for (const segment of slug) {
      if (segment === ".." || segment.includes("\\") || segment.includes("/")) {
        return new NextResponse("Bad Request", { status: 400 });
      }
    }

    const relativePath = path.join(...slug);
    const candidateDirs: string[] = [];

    if (process.env.STORAGE_DIR && process.env.STORAGE_DIR.trim().length > 0) {
      const storageBase = process.env.STORAGE_DIR.trim();
      candidateDirs.push(storageBase);
      candidateDirs.push(path.join(storageBase, "generated-images"));
    }

    candidateDirs.push(path.join(process.cwd(), "public", "generated-images"));
    candidateDirs.push(path.join(process.cwd(), "uploads"));
    candidateDirs.push(path.join(process.cwd(), "uploads", "generated-images"));

    let resolvedPath: string | null = null;

    for (const baseDir of candidateDirs) {
      const fullPath = path.join(baseDir, relativePath);
      if (fs.existsSync(fullPath)) {
        const stat = fs.statSync(fullPath);
        if (stat.isFile()) {
          resolvedPath = fullPath;
          break;
        }
      }
    }

    if (!resolvedPath) {
      return new NextResponse("Image Not Found", { status: 404 });
    }

    const ext = path.extname(resolvedPath).toLowerCase();
    const contentType = MIME_MAP[ext] || "application/octet-stream";
    const fileStats = fs.statSync(resolvedPath);
    const fileBuffer = fs.readFileSync(resolvedPath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": fileStats.size.toString(),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("[ServeImagesRoute] Erro ao servir imagem:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

