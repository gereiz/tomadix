import { NextRequest, NextResponse } from "next/server";
import { CreditSimulationService } from "@/modules/billing/credit-simulation.service";
import { PlatformSettingsService } from "@/modules/admin/platform-settings.service";
import { stripMediaOperations } from "@/modules/billing/media-visibility";

export async function GET() {
  try {
    const simulations = await CreditSimulationService.simulateAllPlans();
    const flags = await PlatformSettingsService.getFeatureFlags();
    const media = { image: flags.imageGenerationEnabled === true, video: flags.videoGenerationEnabled === true };
    return NextResponse.json({
      success: true,
      data: simulations.map((sim) => stripMediaOperations(sim, media)),
    });
  } catch (error: any) {
    console.error("Erro ao gerar simulação de capacidade dos planos:", error);
    return NextResponse.json(
      { error: error?.message || "Erro ao consultar simulação de planos." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const simulation = await CreditSimulationService.simulateCapacityForPlan({
      tier: body.tier || "PRO",
      name: body.name,
      priceMonthly: body.priceMonthly,
      isFreePlan: body.isFreePlan,
      adhesionCredits: body.adhesionCredits,
      monthlyCredits: body.monthlyCredits,
      dailyCredits: body.dailyCredits,
      dailyCreditsAccumulative: body.dailyCreditsAccumulative,
    });

    const flags = await PlatformSettingsService.getFeatureFlags();
    const media = { image: flags.imageGenerationEnabled === true, video: flags.videoGenerationEnabled === true };
    return NextResponse.json({
      success: true,
      simulation: stripMediaOperations(simulation, media),
    });
  } catch (error: any) {
    console.error("Erro ao simular plano sob demanda:", error);
    return NextResponse.json(
      { error: error?.message || "Erro ao simular plano." },
      { status: 500 }
    );
  }
}
