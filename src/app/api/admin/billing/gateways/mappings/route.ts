import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError, getClientContext } from "@/lib/auth";
import { GatewayManagerService } from "@/modules/billing/gateways/gateway-manager.service";

export async function GET(request: NextRequest) {
  try {
    await requirePlatformAdmin("prices:manage");
    const { searchParams } = new URL(request.url);
    const environment = searchParams.get("environment") || undefined;
    const gatewayConfigId = searchParams.get("gatewayConfigId") || undefined;

    const mappings = await GatewayManagerService.listPriceMappings(environment, gatewayConfigId);
    return NextResponse.json({ mappings });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao consultar mapeamentos de preços." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminUser = await requirePlatformAdmin("prices:manage");
    const body = await request.json().catch(() => ({}));
    const clientContext = await getClientContext();

    if (!body.gatewayConfigId || !body.planTier || !body.environment) {
      return NextResponse.json(
        { error: "Dados incompletos. Informe gatewayConfigId, planTier e environment." },
        { status: 400 }
      );
    }

    const saved = await GatewayManagerService.upsertPriceMapping(
      adminUser.id,
      body,
      clientContext.ipAddress
    );

    return NextResponse.json({
      success: true,
      message: "Mapeamento entre plano e preço externo salvo com sucesso.",
      mapping: saved,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao salvar mapeamento de preço." },
      { status: 400 }
    );
  }
}
