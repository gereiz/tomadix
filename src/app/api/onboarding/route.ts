import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser, getCurrentWorkspace, AuthenticationError } from "@/lib/auth";
import { OnboardingService } from "@/modules/onboarding/onboarding.service";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    const state = await OnboardingService.getOnboardingState(user.id);
    return NextResponse.json({ data: state });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Erro ao obter estado de onboarding:", error);
    return NextResponse.json({ error: "Erro interno ao processar a requisição." }, { status: 500 });
  }
}
