import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser, getCurrentWorkspace, AuthenticationError } from "@/lib/auth";
import { OnboardingService } from "@/modules/onboarding/onboarding.service";
import { EntitlementService, EntitlementError } from "@/modules/billing/entitlement.service";

export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const { workspace } = await getCurrentWorkspace();
    const body = await request.json().catch(() => ({}));
    const templateKey = body.templateKey || "cyberpunk_nordestino";

    // Verifica cota do plano
    await EntitlementService.assertCanCreateProject(workspace.id);

    const project = await OnboardingService.createStarterProject(
      user.id,
      workspace.id,
      templateKey
    );

    return NextResponse.json(
      {
        message: "Projeto inicial criado com sucesso!",
        data: project,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof EntitlementError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode || 403 }
      );
    }
    console.error("Erro ao criar projeto inicial:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno ao criar projeto inicial." },
      { status: 500 }
    );
  }
}
