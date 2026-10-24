import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError, getClientContext } from "@/lib/auth";
import { AdminBillingService } from "@/modules/admin/admin-billing.service";
import { PlanTier } from "@prisma/client";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tier: string }> }
) {
  try {
    const adminUser = await requirePlatformAdmin("plans:manage");
    const { tier } = await params;
    const body = await request.json().catch(() => ({}));
    const clientContext = await getClientContext();

    if (!Object.values(PlanTier).includes(tier as PlanTier)) {
      return NextResponse.json({ error: "Tier de plano inválido." }, { status: 400 });
    }

    const isActive = Boolean(body.isActive);
    const updated = await AdminBillingService.togglePlanStatus(
      adminUser.id,
      tier as PlanTier,
      isActive,
      {
        ip: clientContext.ipAddress,
        ua: clientContext.userAgent,
      }
    );

    return NextResponse.json({
      success: true,
      message: `Plano ${tier} ${isActive ? "ativado" : "desativado"} com sucesso.`,
      plan: updated,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao alterar status do plano." },
      { status: 400 }
    );
  }
}
