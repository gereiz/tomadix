import { parseJsonBody, checkoutBodySchema } from "@/lib/api-validation";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspace, AuthenticationError, AuthorizationError } from "@/lib/auth";
import { BillingService } from "@/modules/billing/billing.service";
import { PlanTier, BillingInterval } from "@/modules/billing/billing.types";

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseJsonBody(request, checkoutBodySchema);
    if (parsed.response) return parsed.response;
    const { workspaceId, planTier, interval = BillingInterval.MONTHLY } = parsed.data;

    if (!Object.values(PlanTier).includes(planTier)) {
      return NextResponse.json({ error: "Plano inválido." }, { status: 400 });
    }

    // Valida se o usuário tem permissão 'billing:manage' no workspace
    const { workspace, user } = await getCurrentWorkspace(workspaceId, "billing:manage");

    // Resolver URL de origem do servidor
    const originUrl =
      request.nextUrl.origin ||
      request.headers.get("origin") ||
      `http://${request.headers.get("host")}`;

    const result = await BillingService.createCheckout({
      workspaceId: workspace.id,
      userId: user.id,
      planTier,
      interval: interval === "YEARLY" ? BillingInterval.YEARLY : BillingInterval.MONTHLY,
      originUrl,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Erro ao criar sessão de checkout:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao processar checkout comercial." },
      { status: error.statusCode || 500 }
    );
  }
}
