import { NextRequest, NextResponse } from "next/server";
import { BillingService } from "@/modules/billing/billing.service";

export async function POST(request: NextRequest) {
  try {
    // Obter payload bruto como string para validação de assinatura criptográfica HMAC
    const rawBody = await request.text();

    const { searchParams } = new URL(request.url);
    const gatewayParam = searchParams.get("gateway")?.toLowerCase() as "stripe" | "mercadopago" | "sandbox" | null;
    const isSandboxHeader = request.headers.has("x-sandbox-signature");
    const isMercadoPagoHeader = request.headers.has("x-signature") && !request.headers.has("stripe-signature");

    const forceGateway =
      gatewayParam === "sandbox" || isSandboxHeader
        ? "sandbox"
        : gatewayParam === "mercadopago" || isMercadoPagoHeader
        ? ("mercadopago" as any)
        : gatewayParam === "stripe"
        ? "stripe"
        : undefined;

    const result = await BillingService.processWebhook(rawBody, request.headers, forceGateway);

    return NextResponse.json({
      received: true,
      result,
    });
  } catch (error: any) {
    console.error("Erro no processamento do webhook comercial:", error);
    return NextResponse.json(
      {
        received: false,
        error: error.message || "Erro na validação do webhook.",
      },
      { status: 400 }
    );
  }
}
