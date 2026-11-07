import { parseJsonBody, onboardingStepBodySchema } from "@/lib/api-validation";
import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser, AuthenticationError } from "@/lib/auth";
import { OnboardingService } from "@/modules/onboarding/onboarding.service";

export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const parsed = await parseJsonBody(request, onboardingStepBodySchema);
    if (parsed.response) return parsed.response;
    const { step, completed } = parsed.data;

    const updated = await OnboardingService.updateStep(user.id, step, completed);
    return NextResponse.json({
      message: "Etapa de onboarding atualizada.",
      data: updated,
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Erro ao atualizar etapa de onboarding:", error);
    return NextResponse.json({ error: "Erro interno ao atualizar onboarding." }, { status: 500 });
  }
}
