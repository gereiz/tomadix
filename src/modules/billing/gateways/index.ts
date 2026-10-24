import { PaymentGatewayProvider } from "./gateway.interface";
import { StripeGateway } from "./stripe.gateway";
import { SandboxGateway } from "./sandbox.gateway";
import { MercadoPagoGateway } from "./mercadopago.gateway";

export * from "./gateway.interface";
export * from "./stripe.gateway";
export * from "./sandbox.gateway";
export * from "./mercadopago.gateway";
export * from "./gateway-manager.service";

let cachedGateway: PaymentGatewayProvider | null = null;

export function getPaymentGateway(
  forceGateway?: "stripe" | "mercadopago" | "sandbox"
): PaymentGatewayProvider {
  if (forceGateway === "sandbox") {
    return new SandboxGateway();
  }
  if (forceGateway === "stripe") {
    return new StripeGateway();
  }
  if (forceGateway === "mercadopago") {
    return new MercadoPagoGateway();
  }

  if (cachedGateway) {
    return cachedGateway;
  }

  const chosen = process.env.BILLING_GATEWAY?.toLowerCase();

  if (chosen === "sandbox") {
    cachedGateway = new SandboxGateway();
  } else if (chosen === "mercadopago" || (!process.env.STRIPE_SECRET_KEY && process.env.MERCADOPAGO_ACCESS_TOKEN)) {
    cachedGateway = new MercadoPagoGateway();
  } else if (chosen === "stripe" || process.env.STRIPE_SECRET_KEY) {
    cachedGateway = new StripeGateway();
  } else {
    // Modo sandbox padrão para desenvolvimento local ou testes sem chave Stripe
    cachedGateway = new SandboxGateway();
  }

  return cachedGateway;
}
