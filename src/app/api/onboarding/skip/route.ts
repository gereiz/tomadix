import { NextResponse } from "next/server";
import { requireCurrentUser, AuthenticationError } from "@/lib/auth";
import { OnboardingService } from "@/modules/onboarding/onboarding.service";

export async function POST() {
  try {
    const user = await requireCurrentUser();
    const updated = await OnboardingService.skipOnboarding(user.id);
    return NextResponse.json({
      message: "Onboarding ignorado com sucesso.",
      data: updated,
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Erro ao ignorar onboarding:", error);
    return NextResponse.json({ error: "Erro interno ao processar a requisição." }, { status: 500 });
  }
}
