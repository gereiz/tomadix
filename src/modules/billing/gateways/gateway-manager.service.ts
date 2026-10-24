import { db } from "@/lib/db";
import { encryptSecrets, decryptSecrets, maskSecrets } from "@/lib/encryption";
import { AdminAuditService } from "@/modules/admin/admin-audit.service";
import { StripeGateway } from "./stripe.gateway";
import { MercadoPagoGateway } from "./mercadopago.gateway";
import { SandboxGateway } from "./sandbox.gateway";
import { PaymentGatewayProvider, ConnectionTestResult, ExternalProductPrice } from "./gateway.interface";
import { PlanTier } from "../billing.types";
import { BillingService } from "../billing.service";

export interface UpsertGatewayInput {
  name: string;
  identifier: string;
  provider: "STRIPE" | "MERCADOPAGO" | "SANDBOX";
  environment: "SANDBOX" | "PRODUCTION";
  status?: "ACTIVE" | "INACTIVE" | "CONFIG_PENDING" | "ERROR";
  credentials?: Record<string, string>;
  supportedCurrencies?: string[];
  supportedCountries?: string[];
  paymentMethods?: string[];
  isCheckoutDefault?: boolean;
  priorityOrder?: number;
  selectionRules?: Record<string, any>;
}

export interface ResolveGatewayContext {
  country?: string;
  currency?: string;
  planTier: PlanTier;
  environment?: "SANDBOX" | "PRODUCTION";
  paymentMethod?: string;
}

export class GatewayManagerService {
  /**
   * Garante a existência das configurações padrão de gateways no banco de dados.
   */
  static async seedDefaultGateways() {
    const existingCount = await db.paymentGatewayConfig.count();
    if (existingCount > 0) return;

    const defaults: Array<{
      name: string;
      identifier: string;
      provider: string;
      environment: string;
      status: string;
      connectionStatus: string;
      supportedCurrencies: string[];
      supportedCountries: string[];
      paymentMethods: string[];
      isCheckoutDefault: boolean;
      priorityOrder: number;
    }> = [
      {
        name: "Modo Sandbox Interno (Desenvolvimento)",
        identifier: "sandbox-internal",
        provider: "SANDBOX",
        environment: "SANDBOX",
        status: "ACTIVE",
        connectionStatus: "CONNECTED",
        supportedCurrencies: ["BRL", "USD"],
        supportedCountries: ["*"],
        paymentMethods: ["CREDIT_CARD", "PIX"],
        isCheckoutDefault: true,
        priorityOrder: 1,
      },
      {
        name: "Stripe (Ambiente Sandbox)",
        identifier: "stripe-sandbox",
        provider: "STRIPE",
        environment: "SANDBOX",
        status: "ACTIVE",
        connectionStatus: "UNTESTED",
        supportedCurrencies: ["BRL", "USD"],
        supportedCountries: ["BR", "US"],
        paymentMethods: ["CREDIT_CARD", "BOLETO"],
        isCheckoutDefault: false,
        priorityOrder: 2,
      },
      {
        name: "Stripe (Ambiente de Produção)",
        identifier: "stripe-production",
        provider: "STRIPE",
        environment: "PRODUCTION",
        status: "CONFIG_PENDING",
        connectionStatus: "UNTESTED",
        supportedCurrencies: ["BRL", "USD"],
        supportedCountries: ["BR", "US"],
        paymentMethods: ["CREDIT_CARD", "BOLETO"],
        isCheckoutDefault: false,
        priorityOrder: 1,
      },
      {
        name: "Mercado Pago (Ambiente de Produção)",
        identifier: "mercadopago-production",
        provider: "MERCADOPAGO",
        environment: "PRODUCTION",
        status: "CONFIG_PENDING",
        connectionStatus: "UNTESTED",
        supportedCurrencies: ["BRL"],
        supportedCountries: ["BR"],
        paymentMethods: ["PIX", "CREDIT_CARD", "BOLETO"],
        isCheckoutDefault: false,
        priorityOrder: 2,
      },
    ];

    for (const item of defaults) {
      await db.paymentGatewayConfig.create({
        data: {
          name: item.name,
          identifier: item.identifier,
          provider: item.provider,
          environment: item.environment,
          status: item.status,
          connectionStatus: item.connectionStatus,
          supportedCurrencies: item.supportedCurrencies,
          supportedCountries: item.supportedCountries,
          paymentMethods: item.paymentMethods,
          isCheckoutDefault: item.isCheckoutDefault,
          priorityOrder: item.priorityOrder,
        },
      });
    }
  }

  /**
   * Lista gateways cadastrados com credenciais mascaradas e contagem de assinaturas ativas.
   */
  static async listGateways(filters?: { environment?: string; status?: string }) {
    await this.seedDefaultGateways();

    const where: any = {};
    if (filters?.environment) where.environment = filters.environment;
    if (filters?.status) where.status = filters.status;

    const configs = await db.paymentGatewayConfig.findMany({
      where,
      orderBy: [{ environment: "asc" }, { priorityOrder: "asc" }, { createdAt: "asc" }],
      include: {
        mappings: {
          include: {
            plan: {
              select: { name: true, tier: true },
            },
          },
        },
        _count: {
          select: {
            webhookEvents: true,
            mappings: true,
          },
        },
      },
    });

    // Contagem de assinaturas ativas por gateway
    const subscriptions = await db.subscription.findMany({
      where: {
        status: "ACTIVE",
        gatewaySubscriptionId: { not: null },
      },
      select: {
        gatewaySubscriptionId: true,
      },
    });

    return configs.map((config) => {
      const decrypted = decryptSecrets(config.encryptedCredentials);
      const maskedCreds = maskSecrets(decrypted);

      // Assinaturas ativas heurística
      let activeSubCount = 0;
      if (config.provider === "STRIPE") {
        activeSubCount = subscriptions.filter((s) => s.gatewaySubscriptionId?.startsWith("sub_")).length;
      } else if (config.provider === "MERCADOPAGO") {
        activeSubCount = subscriptions.filter((s) => s.gatewaySubscriptionId?.startsWith("mp_")).length;
      } else if (config.provider === "SANDBOX") {
        activeSubCount = subscriptions.filter((s) => s.gatewaySubscriptionId?.startsWith("sub_sandbox_")).length;
      }

      return {
        id: config.id,
        name: config.name,
        identifier: config.identifier,
        provider: config.provider,
        environment: config.environment,
        status: config.status,
        connectionStatus: config.connectionStatus,
        supportedCurrencies: config.supportedCurrencies,
        supportedCountries: config.supportedCountries,
        paymentMethods: config.paymentMethods,
        lastTestedAt: config.lastTestedAt,
        lastError: config.lastError,
        isCheckoutDefault: config.isCheckoutDefault,
        priorityOrder: config.priorityOrder,
        selectionRules: config.selectionRules,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
        maskedCredentials: maskedCreds,
        hasConfiguredCredentials: Object.keys(decrypted).length > 0,
        activeSubscriptionsCount: activeSubCount,
        mappingsCount: config._count.mappings,
        webhookEventsCount: config._count.webhookEvents,
        mappings: config.mappings,
      };
    });
  }

  /**
   * Obtém detalhes de um gateway específico com credenciais mascaradas.
   */
  static async getGatewayById(id: string) {
    const config = await db.paymentGatewayConfig.findUnique({
      where: { id },
      include: {
        mappings: {
          include: {
            plan: true,
          },
        },
      },
    });

    if (!config) return null;

    const decrypted = decryptSecrets(config.encryptedCredentials);
    const maskedCreds = maskSecrets(decrypted);

    return {
      ...config,
      encryptedCredentials: null, // Nunca expor a estrutura criptografada bruta
      maskedCredentials: maskedCreds,
      hasConfiguredCredentials: Object.keys(decrypted).length > 0,
    };
  }

  /**
   * Cadastra ou atualiza uma configuração de gateway com criptografia autenticada.
   */
  static async upsertGateway(
    adminUserId: string,
    input: UpsertGatewayInput,
    ipAddress?: string
  ) {
    const existing = await db.paymentGatewayConfig.findUnique({
      where: { identifier: input.identifier },
    });

    let encryptedData = existing?.encryptedCredentials;

    // Se novas credenciais foram fornecidas, mesclar e criptografar
    if (input.credentials && Object.keys(input.credentials).length > 0) {
      const currentDecrypted = existing ? decryptSecrets(existing.encryptedCredentials) : {};
      const newCreds: Record<string, string> = { ...currentDecrypted };

      for (const [key, val] of Object.entries(input.credentials)) {
        // Se o valor contiver marcador de máscara ('••••'), preserva a credencial existente
        if (typeof val === "string" && !val.includes("••••") && val.trim().length > 0) {
          newCreds[key] = val.trim();
        } else if (val === "") {
          delete newCreds[key];
        }
      }

      encryptedData = encryptSecrets(newCreds) as any;
    }

    // Se marcado como padrão de checkout, desmarcar outros do mesmo ambiente
    if (input.isCheckoutDefault) {
      await db.paymentGatewayConfig.updateMany({
        where: {
          environment: input.environment,
          identifier: { not: input.identifier },
        },
        data: { isCheckoutDefault: false },
      });
    }

    const payload: any = {
      name: input.name,
      provider: input.provider,
      environment: input.environment,
      status: input.status || (existing ? existing.status : "ACTIVE"),
      supportedCurrencies: input.supportedCurrencies || ["BRL", "USD"],
      supportedCountries: input.supportedCountries || ["BR"],
      paymentMethods: input.paymentMethods || ["CREDIT_CARD"],
      isCheckoutDefault: input.isCheckoutDefault ?? false,
      priorityOrder: input.priorityOrder ?? 0,
      selectionRules: input.selectionRules || {},
    };

    if (encryptedData !== undefined) {
      payload.encryptedCredentials = encryptedData;
    }

    const saved = await db.paymentGatewayConfig.upsert({
      where: { identifier: input.identifier },
      create: {
        identifier: input.identifier,
        ...payload,
      },
      update: payload,
    });

    // Auditoria sem dados sensíveis
    await AdminAuditService.logAction({
      adminUserId,
      action: existing ? "payment_gateway.updated" : "payment_gateway.created",
      targetType: "PaymentGatewayConfig",
      targetId: saved.id,
      details: {
        identifier: saved.identifier,
        name: saved.name,
        provider: saved.provider,
        environment: saved.environment,
        status: saved.status,
        isCheckoutDefault: saved.isCheckoutDefault,
        hasCredentials: !!saved.encryptedCredentials,
      },
      ipAddress,
    });

    return saved;
  }

  /**
   * Ativa ou desativa um gateway com aviso de assinaturas existentes.
   */
  static async toggleGatewayStatus(
    adminUserId: string,
    id: string,
    newStatus: "ACTIVE" | "INACTIVE",
    ipAddress?: string
  ) {
    const config = await db.paymentGatewayConfig.findUnique({
      where: { id },
    });

    if (!config) {
      throw new Error(`Gateway com ID ${id} não encontrado.`);
    }

    // Contar assinaturas ativas se for desativação
    let activeSubs = 0;
    if (newStatus === "INACTIVE") {
      const prefix =
        config.provider === "STRIPE"
          ? "sub_"
          : config.provider === "MERCADOPAGO"
          ? "mp_"
          : "sub_sandbox_";

      activeSubs = await db.subscription.count({
        where: {
          status: "ACTIVE",
          gatewaySubscriptionId: {
            startsWith: prefix,
          },
        },
      });
    }

    const updated = await db.paymentGatewayConfig.update({
      where: { id },
      data: { status: newStatus },
    });

    await AdminAuditService.logAction({
      adminUserId,
      action: "payment_gateway.status_toggled",
      targetType: "PaymentGatewayConfig",
      targetId: updated.id,
      details: {
        identifier: updated.identifier,
        previousStatus: config.status,
        newStatus,
        activeSubscriptionsWarning: activeSubs,
      },
      ipAddress,
    });

    return {
      gateway: updated,
      activeSubscriptionsCount: activeSubs,
      warning:
        newStatus === "INACTIVE" && activeSubs > 0
          ? `Atenção: Existem ${activeSubs} assinatura(s) ativa(s) processada(s) por este gateway. Novos checkouts serão bloqueados, mas assinaturas existentes continuarão válidas.`
          : null,
    };
  }

  /**
   * Instancia o adaptador do provedor com credenciais decriptografadas.
   */
  static instantiateGateway(config: any): PaymentGatewayProvider {
    const creds = decryptSecrets(config.encryptedCredentials);
    const env = config.environment as "SANDBOX" | "PRODUCTION";

    switch (config.provider) {
      case "STRIPE": {
        const apiKey = creds.apiKey || creds.secretKey || process.env.STRIPE_SECRET_KEY || "";
        const webhookSecret = creds.webhookSecret || process.env.STRIPE_WEBHOOK_SECRET || "";
        return new StripeGateway(apiKey, webhookSecret, env);
      }
      case "MERCADOPAGO": {
        const accessToken = creds.accessToken || process.env.MERCADOPAGO_ACCESS_TOKEN || "";
        const webhookSecret = creds.webhookSecret || process.env.MERCADOPAGO_WEBHOOK_SECRET || "";
        return new MercadoPagoGateway(accessToken, webhookSecret, env);
      }
      case "SANDBOX":
      default: {
        const webhookSecret = creds.webhookSecret || process.env.SANDBOX_WEBHOOK_SECRET || "";
        return new SandboxGateway(webhookSecret);
      }
    }
  }

  /**
   * Executa teste de conexão sem risco operacional.
   */
  static async testConnection(
    adminUserId: string,
    id: string,
    ipAddress?: string
  ): Promise<ConnectionTestResult> {
    const config = await db.paymentGatewayConfig.findUnique({
      where: { id },
    });

    if (!config) {
      throw new Error(`Gateway com ID ${id} não encontrado.`);
    }

    const adapter = this.instantiateGateway(config);
    const result = await adapter.testConnection();
    const testedAt = new Date();
    const message = result.details || result.message || (result.success ? "Conexão bem-sucedida" : "Falha na conexão");
    result.message = message;

    // Atualizar registro no banco
    await db.paymentGatewayConfig.update({
      where: { id },
      data: {
        connectionStatus: result.success ? "CONNECTED" : "FAILED",
        lastTestedAt: testedAt,
        lastError: result.success ? null : message.substring(0, 500),
      },
    });

    // Registrar auditoria
    await AdminAuditService.logAction({
      adminUserId,
      action: "payment_gateway.tested",
      targetType: "PaymentGatewayConfig",
      targetId: config.id,
      result: result.success ? "SUCCESS" : "FAILURE",
      details: {
        identifier: config.identifier,
        provider: config.provider,
        environment: config.environment,
        latencyMs: result.latencyMs,
        message,
      },
      ipAddress,
    });

    return result;
  }

  /**
   * Consulta produtos e preços externos disponíveis no provedor.
   */
  static async listExternalProductsPrices(id: string): Promise<ExternalProductPrice[]> {
    const config = await db.paymentGatewayConfig.findUnique({
      where: { id },
    });

    if (!config) {
      throw new Error(`Gateway com ID ${id} não encontrado.`);
    }

    const adapter = this.instantiateGateway(config);
    if (!adapter.listExternalProductsPrices) {
      return [];
    }

    return adapter.listExternalProductsPrices();
  }

  /**
   * Seleciona o gateway ideal no servidor para checkout com base em contexto operacional.
   */
  static async resolveCheckoutGateway(context: ResolveGatewayContext): Promise<{
    config: any;
    gateway: PaymentGatewayProvider;
    mapping: any | null;
  }> {
    const env = context.environment || "SANDBOX";
    const country = (context.country || "BR").toUpperCase();
    const currency = (context.currency || "BRL").toUpperCase();

    // Buscar gateways ativos para o ambiente ordenados por prioridade
    const activeGateways = await db.paymentGatewayConfig.findMany({
      where: {
        environment: env,
        status: "ACTIVE",
      },
      orderBy: [{ isCheckoutDefault: "desc" }, { priorityOrder: "asc" }],
      include: {
        mappings: {
          where: {
            planTier: context.planTier,
            environment: env,
          },
        },
      },
    });

    if (activeGateways.length === 0) {
      return {
        config: null,
        gateway: null as any,
        mapping: null,
      };
    }

    // Respeitar override explícito de variável de ambiente se configurado
    const forced = process.env.BILLING_GATEWAY?.toUpperCase();
    if (forced) {
      const foundForced = activeGateways.find((g) => g.provider === forced);
      if (foundForced) {
        return {
          config: foundForced,
          gateway: this.instantiateGateway(foundForced),
          mapping: foundForced.mappings[0] || null,
        };
      }
    }

    // Filtrar gateways que possuem credenciais configuradas e são operacionais
    const operationalGateways = activeGateways.filter((gw) => {
      if (gw.connectionStatus === "FAILED") return false;
      if (gw.provider === "SANDBOX") return true;
      const creds = decryptSecrets(gw.encryptedCredentials);
      if (gw.provider === "STRIPE") {
        return !!(creds.apiKey || creds.secretKey || process.env.STRIPE_SECRET_KEY);
      }
      if (gw.provider === "MERCADOPAGO") {
        return !!(creds.accessToken || process.env.MERCADOPAGO_ACCESS_TOKEN);
      }
      return true;
    });

    const candidates = operationalGateways.length > 0 ? operationalGateways : activeGateways;

    // Filtrar por moeda e país
    for (const gw of candidates) {
      const currencies = (gw.supportedCurrencies as string[]) || [];
      const countries = (gw.supportedCountries as string[]) || [];

      const currencyOk = currencies.includes(currency) || currencies.includes("*");
      const countryOk = countries.includes(country) || countries.includes("*");

      if (currencyOk && countryOk) {
        const mapping = gw.mappings.length > 0 ? gw.mappings[0] : null;
        return {
          config: gw,
          gateway: this.instantiateGateway(gw),
          mapping,
        };
      }
    }

    // Se nenhum casar perfeitamente, utilizar o primeiro candidato padrão
    const fallback = candidates[0];
    return {
      config: fallback,
      gateway: this.instantiateGateway(fallback),
      mapping: fallback.mappings[0] || null,
    };
  }

  /**
   * Lista mapeamentos de planos e preços externos.
   */
  static async listPriceMappings(environment?: string, gatewayConfigId?: string) {
    const where: any = {};
    if (environment) where.environment = environment;
    if (gatewayConfigId) where.gatewayConfigId = gatewayConfigId;

    return db.gatewayPlanPriceMapping.findMany({
      where,
      include: {
        gatewayConfig: {
          select: { id: true, name: true, identifier: true, provider: true, environment: true },
        },
        plan: true,
      },
      orderBy: [{ environment: "asc" }, { planTier: "asc" }],
    });
  }

  /**
   * Salva mapeamento entre plano interno e produtos/preços externos.
   */
  static async upsertPriceMapping(
    adminUserId: string,
    data: {
      gatewayConfigId: string;
      planTier: PlanTier;
      environment: "SANDBOX" | "PRODUCTION";
      externalProductId?: string;
      externalPriceIdMonthly?: string;
      externalPriceIdYearly?: string;
      currency?: string;
    },
    ipAddress?: string
  ) {
    const saved = await db.gatewayPlanPriceMapping.upsert({
      where: {
        gatewayConfigId_planTier_environment: {
          gatewayConfigId: data.gatewayConfigId,
          planTier: data.planTier,
          environment: data.environment,
        },
      },
      create: {
        gatewayConfigId: data.gatewayConfigId,
        planTier: data.planTier,
        environment: data.environment,
        externalProductId: data.externalProductId?.trim() || null,
        externalPriceIdMonthly: data.externalPriceIdMonthly?.trim() || null,
        externalPriceIdYearly: data.externalPriceIdYearly?.trim() || null,
        currency: data.currency || "BRL",
        syncStatus: "SYNCED",
        lastSyncedAt: new Date(),
      },
      update: {
        externalProductId: data.externalProductId?.trim() || null,
        externalPriceIdMonthly: data.externalPriceIdMonthly?.trim() || null,
        externalPriceIdYearly: data.externalPriceIdYearly?.trim() || null,
        currency: data.currency || "BRL",
        syncStatus: "SYNCED",
        lastSyncedAt: new Date(),
      },
    });

    await AdminAuditService.logAction({
      adminUserId,
      action: "payment_mapping.saved",
      targetType: "GatewayPlanPriceMapping",
      targetId: saved.id,
      details: {
        gatewayConfigId: data.gatewayConfigId,
        planTier: data.planTier,
        environment: data.environment,
        externalPriceIdMonthly: saved.externalPriceIdMonthly,
        externalPriceIdYearly: saved.externalPriceIdYearly,
      },
      ipAddress,
    });

    return saved;
  }

  /**
   * Lista eventos de webhook registrados com filtros e paginação.
   */
  static async listWebhookEvents(params?: {
    gateway?: string;
    environment?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(1, params?.page || 1);
    const pageSize = Math.min(100, Math.max(1, params?.pageSize || 20));
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (params?.gateway) where.gateway = params.gateway;
    if (params?.environment) where.environment = params.environment;
    if (params?.status) where.status = params.status;

    const [total, events] = await Promise.all([
      db.paymentWebhookEvent.count({ where }),
      db.paymentWebhookEvent.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          gatewayConfig: {
            select: { name: true, identifier: true, provider: true },
          },
        },
      }),
    ]);

    return {
      events,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Reprocessa manualmente um evento de webhook registrado.
   */
  static async reprocessWebhookEvent(
    adminUserId: string,
    eventId: string,
    ipAddress?: string
  ) {
    const event = await db.paymentWebhookEvent.findFirst({
      where: {
        OR: [{ id: eventId }, { eventId: eventId }],
      },
    });

    if (!event) {
      throw new Error(`Evento de webhook ${eventId} não encontrado.`);
    }

    if (!event.rawPayload) {
      throw new Error("Payload original do webhook não está disponível para reprocessamento.");
    }

    // Incrementar contagem de tentativas
    await db.paymentWebhookEvent.update({
      where: { id: event.id },
      data: {
        attempts: { increment: 1 },
        lastError: null,
      },
    });

    try {
      // Reprocessar através do BillingService com o gateway associado
      const rawBody =
        typeof event.rawPayload === "string"
          ? event.rawPayload
          : JSON.stringify(event.rawPayload);

      const fakeHeaders = new Headers();
      if (event.gateway === "sandbox") {
        fakeHeaders.set("x-sandbox-signature", "reprocess_authorized");
      }

      const result = await BillingService.processWebhook(
        rawBody,
        fakeHeaders,
        event.gateway as any
      );

      await db.paymentWebhookEvent.update({
        where: { id: event.id },
        data: {
          status: "PROCESSED",
          processedAt: new Date(),
          lastError: null,
        },
      });

      await AdminAuditService.logAction({
        adminUserId,
        action: "webhook_event.reprocessed",
        targetType: "PaymentWebhookEvent",
        targetId: event.id,
        result: "SUCCESS",
        details: {
          eventId: event.eventId,
          gateway: event.gateway,
          result,
        },
        ipAddress,
      });

      return {
        success: true,
        message: "Evento reprocessado com sucesso.",
        result,
      };
    } catch (error: any) {
      const errorMsg = error.message || "Erro desconhecido ao reprocessar webhook.";

      await db.paymentWebhookEvent.update({
        where: { id: event.id },
        data: {
          status: "FAILED",
          lastError: errorMsg.substring(0, 500),
        },
      });

      await AdminAuditService.logAction({
        adminUserId,
        action: "webhook_event.reprocessed",
        targetType: "PaymentWebhookEvent",
        targetId: event.id,
        result: "FAILURE",
        details: {
          eventId: event.eventId,
          gateway: event.gateway,
          error: errorMsg,
        },
        ipAddress,
      });

      throw new Error(`Falha no reprocessamento: ${errorMsg}`);
    }
  }

  /**
   * Registra recebimento de webhook no histórico operacional.
   */
  static async recordIncomingWebhook(params: {
    eventId: string;
    gateway: string;
    environment: "SANDBOX" | "PRODUCTION";
    eventType: string;
    rawPayload: any;
    gatewayConfigId?: string;
  }) {
    return db.paymentWebhookEvent.upsert({
      where: { eventId: params.eventId },
      create: {
        eventId: params.eventId,
        gateway: params.gateway,
        environment: params.environment,
        eventType: params.eventType,
        status: "RECEIVED",
        rawPayload: params.rawPayload,
        gatewayConfigId: params.gatewayConfigId,
      },
      update: {},
    });
  }

  /**
   * Atualiza status de processamento do evento de webhook.
   */
  static async updateWebhookStatus(params: {
    eventId: string;
    status: "PROCESSED" | "FAILED";
    error?: string;
  }) {
    return db.paymentWebhookEvent.updateMany({
      where: { eventId: params.eventId },
      data: {
        status: params.status,
        processedAt: params.status === "PROCESSED" ? new Date() : undefined,
        lastError: params.error ? params.error.substring(0, 500) : null,
      },
    });
  }
}
