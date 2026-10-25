import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { CreditRenewalService } from "@/modules/billing/credit-renewal.service";

export async function GET(request: NextRequest) {
  try {
    await requirePlatformAdmin("policies:manage");

    const { searchParams } = new URL(request.url);
    const planTier = (searchParams.get("planTier") as any) || undefined;
    const onlyActive = searchParams.get("onlyActive") === "true";

    const policies = await CreditRenewalService.listPolicies({
      planTier,
      onlyActive,
    });

    return NextResponse.json({ policies });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao consultar políticas de renovação." },
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

    const policy = await CreditRenewalService.createPolicy(
      adminUser.id,
      body,
      { ip: clientContext, ua: userAgent }
    );

    return NextResponse.json({
      success: true,
      message: "Política de renovação de créditos cadastrada com sucesso.",
      policy,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao criar política de renovação." },
      { status: 400 }
    );
  }
}
