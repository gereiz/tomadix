import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { GatewayManagerService } from "@/modules/billing/gateways/gateway-manager.service";

export async function GET(request: NextRequest) {
  try {
    await requirePlatformAdmin("webhooks:reprocess");
    const { searchParams } = new URL(request.url);
    const gateway = searchParams.get("gateway") || undefined;
    const environment = searchParams.get("environment") || undefined;
    const status = searchParams.get("status") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

    const result = await GatewayManagerService.listWebhookEvents({
      gateway,
      environment,
      status,
      page,
      pageSize,
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
      { error: error?.message || "Erro ao consultar histórico de webhooks." },
      { status: 500 }
    );
  }
}
