import { NextResponse } from "next/server";
import { requireCurrentUser, AuthenticationError } from "@/lib/auth";
import { OnboardingService } from "@/modules/onboarding/onboarding.service";

export async function POST() {
  try {
    const user = await requireCurrentUser();
    const updatedState = await OnboardingService.resetOnboarding(user.id);
    return NextResponse.json({
      message: "Tutorial de onboarding reiniciado com sucesso.",
      data: updatedState,
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Erro ao reiniciar tutorial de onboarding:", error);
    return NextResponse.json({ error: "Erro interno ao reiniciar o tutorial." }, { status: 500 });
  }
}
