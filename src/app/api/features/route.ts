import { NextResponse } from "next/server";
import { PlatformSettingsService } from "@/modules/admin/platform-settings.service";

export const dynamic = "force-dynamic";

/**
 * Flags públicas e não sensíveis, lidas pelo navegador (inclusive em páginas estáticas).
 * Em caso de falha, a mídia fica desligada.
 */
export async function GET() {
  let mediaGenerationEnabled = false;
  try {
    mediaGenerationEnabled = await PlatformSettingsService.isMediaGenerationEnabled();
  } catch (error) {
    console.error("Erro ao ler feature flags públicas:", error);
  }
  return NextResponse.json(
    { mediaGenerationEnabled },
    { headers: { "Cache-Control": "public, max-age=0, s-maxage=15, stale-while-revalidate=30" } }
  );
}
