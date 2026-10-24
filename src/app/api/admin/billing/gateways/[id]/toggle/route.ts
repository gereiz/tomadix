import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError, getClientContext } from "@/lib/auth";
import { GatewayManagerService } from "@/modules/billing/gateways/gateway-manager.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requirePlatformAdmin("gateways:manage");
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const clientContext = await getClientContext();

    if (!body.status || (body.status !== "ACTIVE" && body.status !== "INACTIVE")) {
      return NextResponse.json(
        { error: "Status inválido. Deve ser ACTIVE ou INACTIVE." },
        { status: 400 }
      );
    }

    const result = await GatewayManagerService.toggleGatewayStatus(
      adminUser.id,
      id,
      body.status,
      clientContext.ipAddress
    );

    return NextResponse.json({
      success: true,
      gateway: result.gateway,
      activeSubscriptionsCount: result.activeSubscriptionsCount,
      warning: result.warning,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao alterar estado do gateway." },
      { status: 400 }
    );
  }
}
