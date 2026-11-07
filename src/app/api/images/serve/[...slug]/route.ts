import { NextRequest } from "next/server";
import { serveStoredImage } from "@/lib/serve-stored-image";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await context.params;
  return serveStoredImage(request, slug, "ServeImagesRoute");
}
