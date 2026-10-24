import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { AdminBillingService } from "@/modules/admin/admin-billing.service";

export async function GET(request: NextRequest) {
  try {
    await requirePlatformAdmin("audit:read");
    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get("workspaceId") || undefined;
    const subscriptionId = searchParams.get("subscriptionId") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const result = await AdminBillingService.listCommercialSnapshots({
      workspaceId,
      subscriptionId,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao consultar snapshots comerciais." },
      { status: 500 }
    );
  }
}
