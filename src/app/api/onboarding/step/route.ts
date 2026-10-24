import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser, AuthenticationError } from "@/lib/auth";
import { OnboardingService } from "@/modules/onboarding/onboarding.service";

export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const body = await request.json().catch(() => ({}));
    const step = Number(body.step) || 1;
    const completed = Boolean(body.completed);

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
