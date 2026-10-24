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
      return NextResponse.json(
        { error: `Tier de origem '${tier}' inválido.` },
        { status: 400 }
      );
    }

    if (!body.targetTier || !body.name) {
      return NextResponse.json(
        { error: "Informe o tier de destino (targetTier) e o nome do novo plano (name)." },
        { status: 400 }
      );
    }

    const duplicated = await AdminBillingService.duplicatePlan(
      adminUser.id,
      tier as PlanTier,
      body.targetTier as PlanTier,
      body.name,
      {
        ip: clientContext.ipAddress,
        ua: clientContext.userAgent,
      }
    );

    return NextResponse.json({
      success: true,
      message: `Plano duplicado com sucesso como '${body.name}' em estado RASCUNHO.`,
      plan: duplicated,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao duplicar plano." },
      { status: 400 }
    );
  }
}
