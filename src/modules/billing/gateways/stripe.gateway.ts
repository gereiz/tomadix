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

export class StripeGateway implements PaymentGatewayProvider {
  name = "stripe";
  provider = "STRIPE" as const;
  environment: "SANDBOX" | "PRODUCTION";
  private apiKey: string;
  private webhookSecret: string;
  private baseUrl = "https://api.stripe.com/v1";

  constructor(apiKey?: string, webhookSecret?: string, environment: "SANDBOX" | "PRODUCTION" = "SANDBOX") {
    this.apiKey = apiKey || process.env.STRIPE_SECRET_KEY || "";
    this.webhookSecret = webhookSecret || process.env.STRIPE_WEBHOOK_SECRET || "";
    this.environment = environment;
  }

  async createCheckout(params: CreateCheckoutParams): Promise<CheckoutResult> {
    if (!this.apiKey) {
      throw new Error("Chave STRIPE_SECRET_KEY não configurada no servidor.");
    }

    const plan = getPlanConfig(params.planTier);
    const unitAmount =
      params.authorizedPriceInCents !== undefined
        ? params.authorizedPriceInCents
        : params.interval === "YEARLY"
        ? plan.priceYearly
        : plan.priceMonthly;
    const currency = (params.currency || "brl").toLowerCase();

    const payload = new URLSearchParams();
    payload.append("mode", "subscription");
    payload.append("success_url", `${params.successUrl}?session_id={CHECKOUT_SESSION_ID}`);
    payload.append("cancel_url", params.cancelUrl);
    payload.append("client_reference_id", params.workspaceId);
    payload.append("customer_email", params.userEmail);

    payload.append("metadata[workspaceId]", params.workspaceId);
    payload.append("metadata[billingUserId]", params.billingUserId);
    payload.append("metadata[planTier]", params.planTier);
    payload.append("metadata[interval]", params.interval);

    payload.append("subscription_data[metadata][workspaceId]", params.workspaceId);
    payload.append("subscription_data[metadata][billingUserId]", params.billingUserId);
    payload.append("subscription_data[metadata][planTier]", params.planTier);
    payload.append("subscription_data[metadata][interval]", params.interval);

    if (params.externalPriceId) {
      payload.append("line_items[0][price]", params.externalPriceId);
      payload.append("line_items[0][quantity]", "1");
    } else {
      payload.append("line_items[0][price_data][currency]", currency);
      payload.append(
        "line_items[0][price_data][product_data][name]",
        `${plan.name} (${params.interval === "YEARLY" ? "Anual" : "Mensal"})`
      );
      payload.append(
        "line_items[0][price_data][product_data][description]",
        plan.description
      );
      payload.append("line_items[0][price_data][unit_amount]", unitAmount.toString());
      payload.append(
        "line_items[0][price_data][recurring][interval]",
        params.interval === "YEARLY" ? "year" : "month"
      );
      payload.append("line_items[0][quantity]", "1");
    }

    const res = await fetch(`${this.baseUrl}/checkout/sessions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: payload.toString(),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(`Erro na API do Stripe: ${data.error?.message || res.statusText}`);
    }

    return {
      checkoutUrl: data.url,
      sessionId: data.id,
      gateway: this.name,
    };
  }

  async validateWebhook(
    rawBody: string,
    headers: Headers
  ): Promise<WebhookValidationResult> {
    const signature = headers.get("stripe-signature");
    if (!signature) {
      return { isValid: false, error: "Cabeçalho stripe-signature ausente." };
    }

    if (!this.webhookSecret) {
      return { isValid: false, error: "STRIPE_WEBHOOK_SECRET não configurado." };
    }

    try {
      // Extrair timestamp e assinaturas v1
      const elements = signature.split(",");
      let timestamp = "";
      const signatures: string[] = [];

      for (const element of elements) {
        const [key, value] = element.trim().split("=");
        if (key === "t") timestamp = value;
        if (key === "v1") signatures.push(value);
      }

      if (!timestamp || signatures.length === 0) {
        return { isValid: false, error: "Formato inválido de assinatura Stripe." };
      }

      // Validar tolerância a replay attacks (tolerância padrão de 300 segundos)
      const now = Math.floor(Date.now() / 1000);
      const eventTime = parseInt(timestamp, 10);
      if (Math.abs(now - eventTime) > 300) {
        return { isValid: false, error: "Timestamp do evento expirado ou fora da tolerância." };
      }

      // Calcular HMAC-SHA256: t + "." + rawBody
      const signedPayload = `${timestamp}.${rawBody}`;
      const expectedSignature = crypto
        .createHmac("sha256", this.webhookSecret)
        .update(signedPayload, "utf8")
        .digest("hex");

      const isValid = signatures.some((sig) => {
        try {
          const a = Buffer.from(sig, "hex");
          const b = Buffer.from(expectedSignature, "hex");
          return a.length === b.length && crypto.timingSafeEqual(a, b);
        } catch {
          return false;
        }
      });

      if (!isValid) {
        return { isValid: false, error: "Assinatura HMAC-SHA256 inválida." };
      }

      const parsedEvent = JSON.parse(rawBody);
      const normalized = this.normalizeEvent(parsedEvent);

      return {
        isValid: true,
        event: normalized,
      };
    } catch (err: any) {
      return { isValid: false, error: err.message || "Erro ao decodificar evento Stripe." };
    }
  }

  async cancelSubscription(
    gatewaySubscriptionId: string,
    atPeriodEnd = true
  ): Promise<boolean> {
    if (!this.apiKey) return false;

    if (atPeriodEnd) {
      const res = await fetch(`${this.baseUrl}/subscriptions/${gatewaySubscriptionId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ cancel_at_period_end: "true" }).toString(),
      });
      return res.ok;
    } else {
      const res = await fetch(`${this.baseUrl}/subscriptions/${gatewaySubscriptionId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });
      return res.ok;
    }
  }

  async getSubscription(gatewaySubscriptionId: string): Promise<any> {
    if (!this.apiKey) return null;
    const res = await fetch(`${this.baseUrl}/subscriptions/${gatewaySubscriptionId}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!res.ok) return null;
    return res.json();
  }

  private normalizeEvent(event: any) {
    const dataObj = event.data?.object || {};
    const type = event.type;

    let normalizedType: any = "unknown";
    if (type === "checkout.session.completed") normalizedType = "checkout.completed";
    else if (type === "customer.subscription.updated") normalizedType = "subscription.updated";
    else if (type === "customer.subscription.deleted") normalizedType = "subscription.canceled";
    else if (type === "invoice.payment_succeeded" || type === "invoice.paid") normalizedType = "invoice.paid";
    else if (type === "invoice.payment_failed") normalizedType = "invoice.payment_failed";

    const metadata = dataObj.metadata || dataObj.subscription_data?.metadata || {};
    const workspaceId =
      dataObj.client_reference_id ||
      metadata.workspaceId ||
      dataObj.subscription_details?.metadata?.workspaceId;

    let status: SubscriptionStatus | undefined;
    if (dataObj.status === "active") status = SubscriptionStatus.ACTIVE;
    else if (dataObj.status === "trialing") status = SubscriptionStatus.TRIALING;
    else if (dataObj.status === "past_due") status = SubscriptionStatus.PAST_DUE;
    else if (dataObj.status === "canceled") status = SubscriptionStatus.CANCELED;
    else if (dataObj.status === "unpaid") status = SubscriptionStatus.UNPAID;
    else if (dataObj.status === "incomplete") status = SubscriptionStatus.INCOMPLETE;

    return {
      id: event.id,
      type: normalizedType,
      timestamp: new Date(event.created ? event.created * 1000 : Date.now()),
      customerId: dataObj.customer,
      subscriptionId: dataObj.subscription || dataObj.id,
      workspaceId,
      billingUserId: metadata.billingUserId,
      planTier: (metadata.planTier as PlanTier) || undefined,
      interval: (metadata.interval as BillingInterval) || undefined,
      status,
      currentPeriodStart: dataObj.current_period_start
        ? new Date(dataObj.current_period_start * 1000)
        : undefined,
      currentPeriodEnd: dataObj.current_period_end
        ? new Date(dataObj.current_period_end * 1000)
        : undefined,
      cancelAtPeriodEnd: dataObj.cancel_at_period_end,
      amountPaid: dataObj.amount_paid ?? dataObj.amount_total,
      currency: dataObj.currency?.toUpperCase() || "BRL",
      invoiceId: dataObj.invoice || (type.startsWith("invoice.") ? dataObj.id : undefined),
      hostedInvoiceUrl: dataObj.hosted_invoice_url,
      rawPayload: event,
    };
  }

  /**
   * Executa teste de conexão de baixo risco sem gerar cobranças.
   */
  async testConnection(): Promise<ConnectionTestResult> {
    if (!this.apiKey) {
      const msg = "Chave de API do Stripe não configurada.";
      return {
        success: false,
        latencyMs: 0,
        details: msg,
        message: msg,
        error: "MISSING_CREDENTIALS",
      };
    }

    const start = Date.now();
    try {
      const res = await fetch(`${this.baseUrl}/balance`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      const latencyMs = Date.now() - start;
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        return {
          success: false,
          latencyMs,
          details: data.error?.message || `Falha de autenticação HTTP ${res.status}`,
          error: data.error?.code || "AUTH_FAILED",
        };
      }

      const defaultCurrency = data.available?.[0]?.currency?.toUpperCase() || "BRL";

      return {
        success: true,
        latencyMs,
        details: `Conexão autenticada com sucesso (${this.environment}). Moeda padrão da conta: ${defaultCurrency}.`,
        accountInfo: {
          defaultCurrency,
        },
      };
    } catch (err: any) {
      return {
        success: false,
        latencyMs: Date.now() - start,
        details: err.message || "Erro de rede ao conectar com a API do Stripe.",
        error: "NETWORK_ERROR",
      };
    }
  }

  /**
   * Consulta produtos e preços externos cadastrados no Stripe.
   */
  async listExternalProductsPrices(): Promise<ExternalProductPrice[]> {
    if (!this.apiKey) return [];

    try {
      const [prodRes, priceRes] = await Promise.all([
        fetch(`${this.baseUrl}/products?limit=20&active=true`, {
          headers: { Authorization: `Bearer ${this.apiKey}` },
        }),
        fetch(`${this.baseUrl}/prices?limit=50&active=true`, {
          headers: { Authorization: `Bearer ${this.apiKey}` },
        }),
      ]);

      if (!prodRes.ok || !priceRes.ok) return [];

      const prodsData = await prodRes.json();
      const pricesData = await priceRes.json();

      const products: any[] = prodsData.data || [];
      const prices: any[] = pricesData.data || [];

      return products.map((p) => {
        const prodPrices = prices
          .filter((pr) => pr.product === p.id)
          .map((pr) => ({
            id: pr.id,
            unitAmountInCents: pr.unit_amount || 0,
            currency: pr.currency?.toUpperCase() || "BRL",
            interval: (pr.recurring?.interval || "one_time") as any,
          }));

        return {
          id: p.id,
          name: p.name,
          prices: prodPrices,
        };
      });
    } catch (err) {
      console.error("Erro ao consultar catálogo do Stripe:", err);
      return [];
    }
  }
}
