import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { CreditPricingService } from "@/modules/billing/credit-pricing.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requirePlatformAdmin("policies:manage");
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const clientContext = request.headers.get("x-forwarded-for") || undefined;
    const userAgent = request.headers.get("user-agent") || undefined;

    const rule = await CreditPricingService.setPricingRule(
      adminUser.id,
      {
        operationId: id,
        planTier: body.planTier,
        creditCost: parseInt(body.creditCost, 10) || 0,
        isFree: Boolean(body.isFree),
        effectiveUntil: body.effectiveUntil,
        priority: body.priority ? parseInt(body.priority, 10) : 1,
      },
      { ip: clientContext, ua: userAgent }
    );

    return NextResponse.json({
      success: true,
      message: "Regra de preço por plano adicionada com sucesso.",
      rule,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao adicionar regra de preço." },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requirePlatformAdmin("policies:manage");
    const { searchParams } = new URL(request.url);
    const ruleId = searchParams.get("ruleId");

    if (!ruleId) {
      return NextResponse.json({ error: "ruleId é obrigatório." }, { status: 400 });
    }

    const clientContext = request.headers.get("x-forwarded-for") || undefined;
    const userAgent = request.headers.get("user-agent") || undefined;

    const result = await CreditPricingService.deletePricingRule(
      adminUser.id,
      ruleId,
      { ip: clientContext, ua: userAgent }
    );

    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao remover regra de preço." },
      { status: 400 }
    );
  }
}
