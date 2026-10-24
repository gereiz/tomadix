import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspace, AuthenticationError, AuthorizationError } from "@/lib/auth";
import { BillingService } from "@/modules/billing/billing.service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceIdParam = searchParams.get("workspaceId");

    const { workspace } = await getCurrentWorkspace(workspaceIdParam, "billing:read");
    const summary = await BillingService.getWorkspaceBillingStatus(workspace.id);

    return NextResponse.json({ data: summary });
  } catch (error: any) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Erro ao consultar assinatura do workspace:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao consultar assinatura." },
      { status: 500 }
    );
  }
}
