import { NextResponse } from "next/server";
import { BillingService } from "@/modules/billing/billing.service";
import { PlatformSettingsService } from "@/modules/admin/platform-settings.service";
import { stripMediaFeatures } from "@/modules/billing/media-visibility";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const allPlans = await BillingService.listPlans();
    const mediaEnabled = await PlatformSettingsService.isMediaGenerationEnabled();
    const plans = mediaEnabled ? allPlans : allPlans.map(stripMediaFeatures);
    return NextResponse.json(
      { data: plans },
      // Catálogo muda raramente: cache curto no navegador/CDN com revalidação em segundo plano
      { headers: { "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=300" } }
    );
  } catch (error: any) {
    console.error("Erro ao listar catálogo de planos:", error);
    return NextResponse.json(
      { error: "Erro ao consultar planos comerciais." },
      { status: 500 }
    );
  }
}
