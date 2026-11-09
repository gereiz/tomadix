import { NextResponse } from "next/server";
import { PlatformSettingsService } from "@/modules/admin/platform-settings.service";

export const dynamic = "force-dynamic";

/**
 * Flags públicas e não sensíveis, lidas pelo navegador (inclusive em páginas estáticas).
 * Em caso de falha, imagens e vídeos ficam desligados.
 */
export async function GET() {
  let imageGenerationEnabled = false;
  let videoGenerationEnabled = false;
  try {
    const flags = await PlatformSettingsService.getFeatureFlags();
    imageGenerationEnabled = flags.imageGenerationEnabled === true;
    videoGenerationEnabled = flags.videoGenerationEnabled === true;
  } catch (error) {
    console.error("Erro ao ler feature flags públicas:", error);
  }
  return NextResponse.json(
    { imageGenerationEnabled, videoGenerationEnabled },
    { headers: { "Cache-Control": "public, max-age=0, s-maxage=15, stale-while-revalidate=30" } }
  );
}
