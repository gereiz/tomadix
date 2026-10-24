import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { AdminUsageService } from "@/modules/admin/admin-usage.service";

export async function GET(request: NextRequest) {
  try {
    await requirePlatformAdmin();

    const { searchParams } = new URL(request.url);
    const periodDays = parseInt(searchParams.get("periodDays") || "30", 10);

    const metrics = await AdminUsageService.getUsageAndCostMetrics(periodDays);
    return NextResponse.json(metrics);
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao consultar métricas de uso e custos." },
      { status: 500 }
    );
  }
}
