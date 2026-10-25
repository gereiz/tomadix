import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { CreditPricingService } from "@/modules/billing/credit-pricing.service";

export async function GET(request: NextRequest) {
  try {
    await requirePlatformAdmin("policies:manage");

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || undefined;
    const onlyActive = searchParams.get("onlyActive") === "true";

    const operations = await CreditPricingService.listOperations({
      category,
      onlyActive,
    });

    return NextResponse.json({ operations });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao consultar catálogo de operações de crédito." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminUser = await requirePlatformAdmin("policies:manage");
    const body = await request.json().catch(() => ({}));

    const clientContext = request.headers.get("x-forwarded-for") || undefined;
    const userAgent = request.headers.get("user-agent") || undefined;

    const operation = await CreditPricingService.upsertOperation(
      adminUser.id,
      body,
      { ip: clientContext, ua: userAgent }
    );

    return NextResponse.json({
      success: true,
      message: "Operação de crédito configurada com sucesso.",
      operation,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao configurar operação de crédito." },
      { status: 400 }
    );
  }
}
