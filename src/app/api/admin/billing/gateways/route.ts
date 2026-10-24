import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError, getClientContext } from "@/lib/auth";
import { GatewayManagerService } from "@/modules/billing/gateways/gateway-manager.service";

export async function GET(request: NextRequest) {
  try {
    await requirePlatformAdmin("gateways:manage");
    const { searchParams } = new URL(request.url);
    const environment = searchParams.get("environment") || undefined;
    const status = searchParams.get("status") || undefined;

    const gateways = await GatewayManagerService.listGateways({ environment, status });
    return NextResponse.json({ gateways });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao consultar gateways." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const hasCredentials = body.credentials && Object.keys(body.credentials).length > 0;
    const requiredPerm = hasCredentials ? "credentials:manage" : "gateways:manage";
    const adminUser = await requirePlatformAdmin(requiredPerm);
    const clientContext = await getClientContext();

    if (!body.name || !body.identifier || !body.provider) {
      return NextResponse.json(
        { error: "Dados incompletos. Informe name, identifier e provider." },
        { status: 400 }
      );
    }

    const saved = await GatewayManagerService.upsertGateway(
      adminUser.id,
      body,
      clientContext.ipAddress
    );

    return NextResponse.json({
      success: true,
      message: "Gateway configurado com sucesso com credenciais criptografadas.",
      gateway: saved,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao salvar configuração do gateway." },
      { status: 400 }
    );
  }
}
