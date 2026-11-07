import { NextRequest } from "next/server";
import { serveStoredImage } from "@/lib/serve-stored-image";

// Desativar cache estático no build para que este Route Handler sirva arquivos em tempo de execução
export const dynamic = "force-dynamic";

/**
 * Route Handler dinâmico para servir imagens geradas pelo Tomadix em runtime.
 * A lógica (stream, ETag, resolução de diretórios) fica em `lib/serve-stored-image.ts`.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await context.params;
  return serveStoredImage(request, slug, "GeneratedImagesRoute");
}
