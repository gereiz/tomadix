import { PlanTier, BillingInterval, NormalizedWebhookEvent } from "../billing.types";

export interface CreateCheckoutParams {
  workspaceId: string;
  workspaceName: string;
  userEmail: string;
  userName?: string;
  billingUserId: string;
  planTier: PlanTier;
  interval: BillingInterval;
  successUrl: string;
  cancelUrl: string;
  externalPriceId?: string;
  authorizedPriceInCents?: number;
  currency?: string;
}

export interface CheckoutResult {
  checkoutUrl: string;
  sessionId: string;
  gateway: string;
}

export interface WebhookValidationResult {
  isValid: boolean;
  event?: NormalizedWebhookEvent;
  error?: string;
}

export interface ConnectionTestResult {
  success: boolean;
  latencyMs: number;
  details: string;
  message?: string;
  error?: string;
  accountInfo?: {
    id?: string;
    email?: string;
    country?: string;
    defaultCurrency?: string;
  };
}

export interface ExternalProductPrice {
  id: string;
  name: string;
  prices: Array<{
    id: string;
    unitAmountInCents: number;
    currency: string;
    interval: "month" | "year" | "one_time";
  }>;
}

export interface PaymentGatewayProvider {
  name: string;
  provider: "STRIPE" | "MERCADOPAGO" | "SANDBOX";
  environment: "SANDBOX" | "PRODUCTION";

  /**
   * Cria uma sessão de checkout segura no gateway.
   */
  createCheckout(params: CreateCheckoutParams): Promise<CheckoutResult>;

  /**
   * Valida a assinatura criptográfica e normaliza o payload do webhook.
   */
  validateWebhook(rawBody: string, headers: Headers): Promise<WebhookValidationResult>;

  /**
   * Solicita o cancelamento da assinatura no gateway.
   */
  cancelSubscription(gatewaySubscriptionId: string, atPeriodEnd: boolean): Promise<boolean>;

  /**
   * Consulta os dados atualizados de uma assinatura no gateway.
   */
  getSubscription(gatewaySubscriptionId: string): Promise<any>;

  /**
   * Executa teste de conexão de baixo risco sem criar cobranças ou transações reais.
   */
  testConnection(): Promise<ConnectionTestResult>;

  /**
   * Consulta lista de produtos e preços cadastrados no provedor externo.
   */
  listExternalProductsPrices?(): Promise<ExternalProductPrice[]>;
}
