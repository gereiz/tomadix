import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { AdminBillingService } from "@/modules/admin/admin-billing.service";

export async function GET(request: NextRequest) {
  try {
    await requirePlatformAdmin("plans:manage");

    const { searchParams } = new URL(request.url);
    const status = (searchParams.get("status") as any) || undefined;
    const tier = (searchParams.get("tier") as any) || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const result = await AdminBillingService.listSubscriptions({
      status,
      tier,
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
      { error: error?.message || "Erro ao consultar assinaturas." },
      { status: 500 }
    );
  }
}
