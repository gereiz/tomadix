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
    const clientContext = await getClientContext();

    const result = await GatewayManagerService.testConnection(
      adminUser.id,
      id,
      clientContext.ipAddress
    );

    return NextResponse.json({
      success: result.success,
      result,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Erro ao testar conexão com o provedor.",
      },
      { status: 400 }
    );
  }
}
