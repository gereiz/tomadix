import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError, getClientContext } from "@/lib/auth";
import { AdminBillingService } from "@/modules/admin/admin-billing.service";

export async function GET() {
  try {
    await requirePlatformAdmin("plans:manage");
    const plans = await AdminBillingService.listAllPlans();
    return NextResponse.json({ plans });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao consultar planos." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminUser = await requirePlatformAdmin("plans:manage");
    const body = await request.json().catch(() => ({}));
    const clientContext = await getClientContext();

    if (!body.tier || !body.name || typeof body.priceMonthly !== "number") {
      return NextResponse.json(
        { error: "Dados incompletos. Informe tier, name e priceMonthly." },
        { status: 400 }
      );
    }

    const updatedPlan = await AdminBillingService.upsertPlan(adminUser.id, body, {
      ip: clientContext.ipAddress,
      ua: clientContext.userAgent,
    });

    return NextResponse.json({
      success: true,
      message: "Plano salvo com sucesso com políticas de contrato preservadas.",
      plan: updatedPlan,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao salvar plano." },
      { status: 400 }
    );
  }
}
