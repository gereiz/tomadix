import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspace, AuthenticationError, AuthorizationError } from "@/lib/auth";
import { BillingService } from "@/modules/billing/billing.service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workspaceId, atPeriodEnd = true } = body;

    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspaceId é obrigatório." },
        { status: 400 }
      );
    }

    const { workspace, user } = await getCurrentWorkspace(workspaceId, "billing:manage");

    const updated = await BillingService.requestCancellation(
      workspace.id,
      user.id,
      Boolean(atPeriodEnd)
    );

    return NextResponse.json({
      success: true,
      subscription: updated,
    });
  } catch (error: any) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Erro ao cancelar assinatura:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao solicitar cancelamento da assinatura." },
      { status: error.statusCode || 500 }
    );
  }
}
