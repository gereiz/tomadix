import { NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { AdminBillingService } from "@/modules/admin/admin-billing.service";

export async function GET() {
  try {
    await requirePlatformAdmin();
    const metrics = await AdminBillingService.getCommercialMetrics();
    return NextResponse.json(metrics);
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao consultar métricas comerciais." },
      { status: 500 }
    );
  }
}
