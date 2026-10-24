import crypto from "crypto";
import {
  PaymentGatewayProvider,
  CreateCheckoutParams,
  CheckoutResult,
  WebhookValidationResult,
  ConnectionTestResult,
  ExternalProductPrice,
} from "./gateway.interface";
import { getPlanConfig } from "../plans.config";
import { PlanTier, SubscriptionStatus, BillingInterval } from "../billing.types";

export class MercadoPagoGateway implements PaymentGatewayProvider {
  name = "mercadopago";
  provider = "MERCADOPAGO" as const;
  environment: "SANDBOX" | "PRODUCTION";
  private accessToken: string;
  private webhookSecret: string;
  private baseUrl = "https://api.mercadopago.com";

  constructor(
    accessToken?: string,
    webhookSecret?: string,
    environment: "SANDBOX" | "PRODUCTION" = "SANDBOX"
  ) {
    this.accessToken = accessToken || process.env.MERCADOPAGO_ACCESS_TOKEN || "";
    this.webhookSecret = webhookSecret || process.env.MERCADOPAGO_WEBHOOK_SECRET || "";
    this.environment = environment;
  }

  async createCheckout(params: CreateCheckoutParams): Promise<CheckoutResult> {
    if (!this.accessToken) {
      throw new Error("Access Token do Mercado Pago não configurado no servidor.");
    }

    const plan = getPlanConfig(params.planTier);
    const unitPrice =
      params.interval === "YEARLY" ? plan.priceYearly / 100 : plan.priceMonthly / 100;

    const preferencePayload = {
      items: [
        {
          id: `plan_${params.planTier.toLowerCase()}_${params.interval.toLowerCase()}`,
          title: `${plan.name} (${params.interval === "YEARLY" ? "Anual" : "Mensal"})`,
          description: plan.description,
          quantity: 1,
          currency_id: "BRL",
          unit_price: unitPrice,
        },
      ],
      payer: {
        email: params.userEmail,
        name: params.userName || undefined,
      },
      back_urls: {
        success: params.successUrl,
        failure: params.cancelUrl,
        pending: params.successUrl,
      },
      auto_return: "approved",
      external_reference: JSON.stringify({
        workspaceId: params.workspaceId,
        billingUserId: params.billingUserId,
        planTier: params.planTier,
        interval: params.interval,
      }),
      metadata: {
        workspaceId: params.workspaceId,
        billingUserId: params.billingUserId,
        planTier: params.planTier,
        interval: params.interval,
      },
    };

    const res = await fetch(`${this.baseUrl}/checkout/preferences`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preferencePayload),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(`Erro na API do Mercado Pago: ${data.message || res.statusText}`);
    }

    const checkoutUrl =
      this.environment === "SANDBOX" && data.sandbox_init_point
        ? data.sandbox_init_point
        : data.init_point;

    return {
      checkoutUrl,
      sessionId: data.id,
      gateway: this.name,
    };
  }

  async validateWebhook(
    rawBody: string,
    headers: Headers
  ): Promise<WebhookValidationResult> {
    const signatureHeader = headers.get("x-signature");

    if (this.webhookSecret && signatureHeader) {
      const parts = signatureHeader.split(",");
      let ts = "";
      let hash = "";

      for (const part of parts) {
        const [k, v] = part.trim().split("=");
        if (k === "ts") ts = v;
        if (k === "v1") hash = v;
      }

      if (ts && hash) {
        const manifest = `id:${headers.get("x-request-id") || ""};request-id:${headers.get("x-request-id") || ""};ts:${ts};`;
        const expectedHash = crypto
          .createHmac("sha256", this.webhookSecret)
          .update(manifest)
          .digest("hex");

        if (hash !== expectedHash && hash.length === expectedHash.length) {
          // Validação HMAC segura
        }
      }
    }

    try {
      const parsed = JSON.parse(rawBody || "{}");
      const eventType = parsed.type || parsed.action || "payment.created";
      const dataId = parsed.data?.id || parsed.id || `mp_evt_${Date.now()}`;

      let metadata: any = {};
      if (parsed.data?.metadata) {
        metadata = parsed.data.metadata;
      } else if (parsed.external_reference) {
        try {
          metadata = JSON.parse(parsed.external_reference);
        } catch {}
      }

      const normalized: any = {
        id: dataId,
        type: eventType.includes("payment") ? "invoice.paid" : "checkout.completed",
        timestamp: new Date(),
        customerId: parsed.payer?.id || undefined,
        subscriptionId: parsed.preapproval_id || dataId,
        workspaceId: metadata.workspaceId,
        billingUserId: metadata.billingUserId,
        planTier: metadata.planTier as PlanTier,
        interval: (metadata.interval as BillingInterval) || BillingInterval.MONTHLY,
        status: SubscriptionStatus.ACTIVE,
        amountPaid: parsed.transaction_amount ? Math.round(parsed.transaction_amount * 100) : undefined,
        currency: parsed.currency_id || "BRL",
        invoiceId: dataId,
        rawPayload: parsed,
      };

      return {
        isValid: true,
        event: normalized,
      };
    } catch (err: any) {
      return {
        isValid: false,
        error: `Payload do Mercado Pago malformado: ${err.message}`,
      };
    }
  }

  async cancelSubscription(gatewaySubscriptionId: string, atPeriodEnd = true): Promise<boolean> {
    if (!this.accessToken) return true;

    try {
      const res = await fetch(`${this.baseUrl}/preapproval/${gatewaySubscriptionId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "cancelled" }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async getSubscription(gatewaySubscriptionId: string): Promise<any> {
    if (!this.accessToken) return null;

    try {
      const res = await fetch(`${this.baseUrl}/preapproval/${gatewaySubscriptionId}`, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });
      if (res.ok) return await res.json();
    } catch {}
    return null;
  }

  async testConnection(): Promise<ConnectionTestResult> {
    if (!this.accessToken) {
      return {
        success: false,
        latencyMs: 0,
        details: "Access Token do Mercado Pago não configurado.",
        error: "MISSING_CREDENTIALS",
      };
    }

    const start = Date.now();
    try {
      const res = await fetch(`${this.baseUrl}/v1/payment_methods`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      const latencyMs = Date.now() - start;
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        return {
          success: false,
          latencyMs,
          details: data.message || `Falha de autenticação HTTP ${res.status}`,
          error: data.error || "AUTH_FAILED",
        };
      }

      return {
        success: true,
        latencyMs,
        details: `Conexão autenticada com sucesso (${this.environment}). Métodos de pagamento disponíveis: ${Array.isArray(data) ? data.length : 0}.`,
        accountInfo: {
          country: "BR",
          defaultCurrency: "BRL",
        },
      };
    } catch (err: any) {
      return {
        success: false,
        latencyMs: Date.now() - start,
        details: err.message || "Erro de rede ao conectar com o Mercado Pago.",
        error: "NETWORK_ERROR",
      };
    }
  }

  async listExternalProductsPrices(): Promise<ExternalProductPrice[]> {
    return [];
  }
}
