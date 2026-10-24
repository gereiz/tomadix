import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { AdminBillingService } from "@/modules/admin/admin-billing.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requirePlatformAdmin("plans:manage");
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const days = parseInt(body.days, 10);
    const justification = body.justification || "";

    const clientContext = request.headers.get("x-forwarded-for") || undefined;
    const userAgent = request.headers.get("user-agent") || undefined;

    const updated = await AdminBillingService.extendTrial(
      adminUser.id,
      id,
      days,
      justification,
      { ip: clientContext, ua: userAgent }
    );

    return NextResponse.json({
      success: true,
      message: `Período de teste estendido em ${days} dia(s).`,
      subscription: updated,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao estender trial da assinatura." },
      { status: 400 }
    );
  }
}
