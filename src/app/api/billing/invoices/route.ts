import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspace, AuthenticationError, AuthorizationError } from "@/lib/auth";
import { BillingService } from "@/modules/billing/billing.service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceIdParam = searchParams.get("workspaceId");

    const { workspace, user } = await getCurrentWorkspace(workspaceIdParam, "billing:read");
    const invoices = await BillingService.listInvoices(workspace.id, user.id);

    return NextResponse.json({ data: invoices });
  } catch (error: any) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Erro ao listar faturas do workspace:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao consultar histórico de faturas." },
      { status: 500 }
    );
  }
}
