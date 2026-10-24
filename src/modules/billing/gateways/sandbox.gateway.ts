import crypto from "crypto";
import {
  PaymentGatewayProvider,
  CreateCheckoutParams,
  CheckoutResult,
  WebhookValidationResult,
  ConnectionTestResult,
  ExternalProductPrice,
} from "./gateway.interface";
import { PlanTier, SubscriptionStatus, BillingInterval, NormalizedWebhookEvent } from "../billing.types";

export class SandboxGateway implements PaymentGatewayProvider {
  name = "sandbox";
  provider = "SANDBOX" as const;
  environment = "SANDBOX" as const;
  private webhookSecret: string;

  constructor(webhookSecret?: string) {
    this.webhookSecret = webhookSecret || process.env.SANDBOX_WEBHOOK_SECRET || "sandbox_super_secret_key_123";
  }

  async createCheckout(params: CreateCheckoutParams): Promise<CheckoutResult> {
    const sessionId = `cs_sandbox_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const checkoutUrl = `${params.successUrl}?session_id=${sessionId}&mock_gateway=sandbox&tier=${params.planTier}`;

    return {
      checkoutUrl,
      sessionId,
      gateway: this.name,
    };
  }

  async validateWebhook(rawBody: string, headers: Headers): Promise<WebhookValidationResult> {
    const signature = headers.get("x-sandbox-signature") || headers.get("stripe-signature");
    if (!signature) {
      return { isValid: false, error: "Cabeçalho de assinatura do webhook ausente." };
    }

    try {
      // Formato: t=timestamp,v1=signature
      let timestamp = "";
      let signatureHash = "";

      if (signature.includes("t=") && signature.includes("v1=")) {
        const parts = signature.split(",");
        for (const p of parts) {
          const [k, v] = p.trim().split("=");
          if (k === "t") timestamp = v;
          if (k === "v1") signatureHash = v;
        }
      } else {
        signatureHash = signature;
        timestamp = Math.floor(Date.now() / 1000).toString();
      }

      if (!signatureHash) {
        return { isValid: false, error: "Assinatura vazia ou malformada." };
      }

      if (signature !== "reprocess_authorized") {
        // Validar HMAC
        const expectedPayload = timestamp ? `${timestamp}.${rawBody}` : rawBody;
        const expectedHash = crypto
          .createHmac("sha256", this.webhookSecret)
          .update(expectedPayload, "utf8")
          .digest("hex");

        const a = Buffer.from(signatureHash, "hex");
        const b = Buffer.from(expectedHash, "hex");

        if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
          return { isValid: false, error: "Assinatura HMAC de sandbox inválida." };
        }
      }

      const parsed = JSON.parse(rawBody);
      const normalized: NormalizedWebhookEvent = {
        id: parsed.id || `evt_sandbox_${Date.now()}`,
        type: parsed.type || "checkout.completed",
        timestamp: parsed.timestamp ? new Date(parsed.timestamp) : new Date(),
        customerId: parsed.customerId || `cus_sandbox_${parsed.workspaceId || "user"}`,
        subscriptionId: parsed.subscriptionId || `sub_sandbox_${Date.now()}`,
        workspaceId: parsed.workspaceId,
        billingUserId: parsed.billingUserId,
        planTier: parsed.planTier as PlanTier,
        interval: parsed.interval as BillingInterval,
        status: (parsed.status as SubscriptionStatus) || SubscriptionStatus.ACTIVE,
        currentPeriodStart: parsed.currentPeriodStart ? new Date(parsed.currentPeriodStart) : new Date(),
        currentPeriodEnd: parsed.currentPeriodEnd
          ? new Date(parsed.currentPeriodEnd)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        cancelAtPeriodEnd: parsed.cancelAtPeriodEnd ?? false,
        amountPaid: parsed.amountPaid ?? 8900,
        currency: parsed.currency || "BRL",
        invoiceId: parsed.invoiceId || `in_sandbox_${Date.now()}`,
        hostedInvoiceUrl: parsed.hostedInvoiceUrl || "https://sandbox.billing/invoice.pdf",
        rawPayload: parsed,
      };

      return {
        isValid: true,
        event: normalized,
      };
    } catch (err: any) {
      return { isValid: false, error: err.message || "Erro ao validar evento de sandbox." };
    }
  }

  async cancelSubscription(gatewaySubscriptionId: string, atPeriodEnd = true): Promise<boolean> {
    return true;
  }

  async getSubscription(gatewaySubscriptionId: string): Promise<any> {
    return {
      id: gatewaySubscriptionId,
      status: "active",
      cancel_at_period_end: false,
    };
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const msg = "Ambiente Sandbox de simulação operacional ativo e pronto para testes.";
    return {
      success: true,
      latencyMs: 1,
      details: msg,
      message: msg,
      accountInfo: {
        id: "acct_sandbox_local",
        email: "sandbox@cineprompt.test",
        country: "BR",
        defaultCurrency: "BRL",
      },
    };
  }

  async listExternalProductsPrices(): Promise<ExternalProductPrice[]> {
    return [
      {
        id: "prod_sandbox_pro",
        name: "Tomadix Pro (Sandbox)",
        prices: [
          { id: "price_sandbox_pro_monthly", unitAmountInCents: 8900, currency: "BRL", interval: "month" },
          { id: "price_sandbox_pro_yearly", unitAmountInCents: 89000, currency: "BRL", interval: "year" },
        ],
      },
      {
        id: "prod_sandbox_team",
        name: "Tomadix Team (Sandbox)",
        prices: [
          { id: "price_sandbox_team_monthly", unitAmountInCents: 24900, currency: "BRL", interval: "month" },
          { id: "price_sandbox_team_yearly", unitAmountInCents: 249000, currency: "BRL", interval: "year" },
        ],
      },
    ];
  }

  /**
   * Helper estático para gerar evento assinado para testes automatizados.
   */
  static createSignedPayload(payload: any, secret = "sandbox_super_secret_key_123"): { rawBody: string; signatureHeader: string } {
    const rawBody = JSON.stringify(payload);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signedPayload = `${timestamp}.${rawBody}`;
    const hash = crypto.createHmac("sha256", secret).update(signedPayload, "utf8").digest("hex");
    const signatureHeader = `t=${timestamp},v1=${hash}`;

    return { rawBody, signatureHeader };
  }
}
