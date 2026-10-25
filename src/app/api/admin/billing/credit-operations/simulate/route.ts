import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { CreditPricingService } from "@/modules/billing/credit-pricing.service";

export async function POST(request: NextRequest) {
  try {
    await requirePlatformAdmin("policies:manage");
    const body = await request.json().catch(() => ({}));

    if (!body.operationCode) {
      return NextResponse.json({ error: "operationCode é obrigatório." }, { status: 400 });
    }

    const simulation = await CreditPricingService.simulateCost(
      body.operationCode,
      body.planTier || "FREE"
    );

    return NextResponse.json({ simulation });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao simular custo de operação." },
      { status: 400 }
    );
  }
}
