import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError, getClientContext } from "@/lib/auth";
import { AdminBillingService } from "@/modules/admin/admin-billing.service";

export const dynamic = "force-dynamic";

export async function PUT(request: NextRequest) {
  try {
    const adminUser = await requirePlatformAdmin("plans:manage");
    const body = await request.json().catch(() => ({}));
    const clientContext = await getClientContext();

    const orderedTiers: string[] =
      body.orderedTiers ||
      body.planTiers ||
      (Array.isArray(body.orders)
        ? body.orders
            .sort((a: any, b: any) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
            .map((o: any) => o.tier)
        : []);

    if (!Array.isArray(orderedTiers) || orderedTiers.length === 0) {
      return NextResponse.json(
        { error: "Informe 'orderedTiers' contendo os identificadores dos planos na ordem desejada." },
        { status: 400 }
      );
    }

    const plans = await AdminBillingService.reorderPlans(adminUser.id, orderedTiers, {
      ip: clientContext.ipAddress,
      ua: clientContext.userAgent,
    });

    return NextResponse.json({
      success: true,
      message: "Ordem de exibição dos planos na vitrine atualizada com sucesso.",
      plans,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao reordenar planos." },
      { status: 500 }
    );
  }
}

