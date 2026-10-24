import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { AdminBillingService } from "@/modules/admin/admin-billing.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePlatformAdmin("plans:manage");
    const { id } = await params;

    const details = await AdminBillingService.getSubscriptionDetails(id);
    return NextResponse.json(details);
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao consultar assinatura." },
      { status: 400 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requirePlatformAdmin("plans:manage");
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const clientContext = request.headers.get("x-forwarded-for") || undefined;
    const userAgent = request.headers.get("user-agent") || undefined;

    const updated = await AdminBillingService.updateSubscription(
      adminUser.id,
      id,
      body,
      { ip: clientContext, ua: userAgent }
    );

    return NextResponse.json({
      success: true,
      message: "Assinatura atualizada com sucesso.",
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
      { error: error?.message || "Erro ao atualizar assinatura." },
      { status: 400 }
    );
  }
}
