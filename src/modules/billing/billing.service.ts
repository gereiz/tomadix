import { db } from "@/lib/db";
import { getPaymentGateway } from "./gateways";
import { GatewayManagerService } from "./gateways/gateway-manager.service";
import { getPlanConfig, DEFAULT_PLANS } from "./plans.config";
import { EntitlementService, EntitlementError } from "./entitlement.service";
import { PricingService } from "./pricing.service";
import { BillingPolicyService } from "./billing-policy.service";
import {
  PlanTier,
  SubscriptionStatus,
  BillingInterval,
} from "./billing.types";
import { WorkspaceRole } from "@prisma/client";

export class BillingService {
  /**
   * Retorna os planos disponíveis e ativos no catálogo público.
   */
  static async listPlans() {
    const dbPlans = await db.plan.findMany({
      where: {
        isActive: true,
        isPublic: true,
        commercialStatus: "ACTIVE",
      },
      orderBy: [{ displayOrder: "asc" }, { priceMonthly: "asc" }],
    });

    if (dbPlans.length > 0) {
      return dbPlans;
    }

    return Object.values(DEFAULT_PLANS);
  }

  /**
   * Obtém os detalhes de assinatura e uso do workspace.
   */
  static async getWorkspaceBillingStatus(workspaceId: string) {
    return EntitlementService.getWorkspaceUsageSummary(workspaceId);
  }

  /**
   * Cria uma sessão de checkout segura para upgrade ou contratação.
   */
  static async createCheckout(params: {
    workspaceId: string;
    userId: string;
    planTier: PlanTier;
    interval: BillingInterval;
    originUrl: string;
  }) {
    // 1. Validar autorização do usuário no workspace (apenas OWNER ou ADMIN)
    const membership = await db.membership.findUnique({
      where: {
        userId_workspaceId: {
          userId: params.userId,
          workspaceId: params.workspaceId,
        },
      },
      include: {
        workspace: true,
        user: true,
      },
    });

    if (!membership) {
      throw new EntitlementError("Usuário não tem acesso a este workspace.", "UNAUTHORIZED", 401);
    }

    if (membership.role !== WorkspaceRole.OWNER && membership.role !== WorkspaceRole.ADMIN) {
      throw new EntitlementError(
        "Apenas proprietários e administradores podem gerenciar assinaturas e cobrança.",
        "FORBIDDEN",
        403
      );
    }

    const { workspace, user } = membership;

    // 2. Validar assinatura existente do workspace e políticas de alteração
    const currentSub = await db.subscription.findUnique({
      where: { workspaceId: params.workspaceId },
    });

    if (currentSub && (currentSub.status === SubscriptionStatus.ACTIVE || currentSub.status === SubscriptionStatus.TRIALING)) {
      // Bloquear checkout idêntico redundante
      if (currentSub.planTier === params.planTier && currentSub.interval === params.interval) {
        throw new EntitlementError(
          "O workspace já possui uma assinatura ativa para este plano e periodicidade.",
          "ALREADY_SUBSCRIBED",
          400
        );
      }

      // Validar política de downgrade
      const tierRank: Record<PlanTier, number> = {
        [PlanTier.FREE]: 0,
        [PlanTier.PRO]: 1,
        [PlanTier.TEAM]: 2,
        [PlanTier.ENTERPRISE]: 3,
      };

      if ((tierRank[params.planTier] || 0) < (tierRank[currentSub.planTier] || 0)) {
        const allowDowngrade = await BillingPolicyService.getPolicyValue<boolean>("ALLOW_DIRECT_DOWNGRADE", true);
        if (!allowDowngrade) {
          throw new EntitlementError(
            "A política comercial vigente não permite alteração de plano para uma modalidade inferior pelo checkout.",
            "DOWNGRADE_NOT_ALLOWED",
            400
          );
        }
      }
    }

    // 3. Se o plano for FREE (Downgrade para plano gratuito)
    if (params.planTier === PlanTier.FREE) {
      const activeSub = currentSub || (await EntitlementService.getWorkspaceSubscription(params.workspaceId));

      // Cancelar assinatura no gateway se houver
      if (activeSub.gatewaySubscriptionId) {
        const gateway = getPaymentGateway();
        await gateway.cancelSubscription(activeSub.gatewaySubscriptionId, true);
      }

      const updatedSub = await db.subscription.update({
        where: { workspaceId: params.workspaceId },
        data: {
          planTier: PlanTier.FREE,
          status: SubscriptionStatus.ACTIVE,
          interval: BillingInterval.MONTHLY,
          cancelAtPeriodEnd: false,
          gatewaySubscriptionId: null,
          currentPeriodStart: new Date(),
          currentPeriodEnd: null,
        },
      });

      await db.auditLog.create({
        data: {
          userId: params.userId,
          workspaceId: params.workspaceId,
          action: "billing.downgraded_to_free",
          details: { previousTier: activeSub.planTier },
        },
      });

      return {
        direct: true,
        planTier: PlanTier.FREE,
        subscription: updatedSub,
      };
    }

    // 4. Validar se o plano pago está publicado e ativo
    const plan = await db.plan.findUnique({
      where: { tier: params.planTier },
    });

    if (!plan || !plan.isActive || !plan.isPublic || plan.commercialStatus === "ARCHIVED" || plan.commercialStatus === "DRAFT") {
      throw new EntitlementError(
        "O plano selecionado não está disponível para contratação.",
        "PLAN_NOT_AVAILABLE",
        400
      );
    }

    // 5. Cálculo autoritativo de preço e moeda pelo servidor
    const planConfig = plan || getPlanConfig(params.planTier);
    const calculatedPricing = PricingService.calculatePlanPricing(planConfig, params.interval);
    const authorizedPriceInCents = calculatedPricing.finalPriceInCents;
    const currency = calculatedPricing.currency || "BRL";

    // 6. Seleção e validação do gateway de pagamento ativo
    const targetEnv = (process.env.BILLING_ENVIRONMENT as any) || "SANDBOX";
    const { gateway, config, mapping } = await GatewayManagerService.resolveCheckoutGateway({
      country: "BR",
      currency,
      planTier: params.planTier,
      environment: targetEnv,
    });

    if (!gateway || !config || config.status === "INACTIVE" || config.connectionStatus === "FAILED") {
      throw new EntitlementError(
        "Nenhum gateway de pagamento ativo disponível no momento.",
        "GATEWAY_INACTIVE",
        400
      );
    }

    // 7. Validação de mapeamento de preço externo quando exigido
    let externalPriceId: string | undefined = undefined;
    if (mapping) {
      externalPriceId =
        params.interval === BillingInterval.YEARLY
          ? mapping.externalPriceIdYearly || undefined
          : mapping.externalPriceIdMonthly || undefined;
    }

    const requirePriceMapping =
      process.env.REQUIRE_PRICE_MAPPING === "true" ||
      (config.environment === "PRODUCTION" && config.provider !== "SANDBOX");

    if (requirePriceMapping && !externalPriceId) {
      throw new EntitlementError(
        "Preço do plano não possui associação homologada com o gateway configurado.",
        "PRICE_NOT_MAPPED",
        400
      );
    }

    const successUrl = `${params.originUrl}/billing/success?workspaceId=${params.workspaceId}`;
    const cancelUrl = `${params.originUrl}/pricing?canceled=true`;

    const checkout = await gateway.createCheckout({
      workspaceId: params.workspaceId,
      workspaceName: workspace.name,
      userEmail: user.email,
      userName: user.displayName || undefined,
      billingUserId: params.userId,
      planTier: params.planTier,
      interval: params.interval,
      successUrl,
      cancelUrl,
      externalPriceId,
      authorizedPriceInCents,
      currency,
    });

    // 8. Registrar auditoria completa com termos autorizados
    await db.auditLog.create({
      data: {
        userId: params.userId,
        workspaceId: params.workspaceId,
        action: "billing.checkout_session_created",
        details: {
          planTier: params.planTier,
          interval: params.interval,
          gateway: checkout.gateway,
          sessionId: checkout.sessionId,
          authorizedPriceInCents,
          currency,
          externalPriceId,
          environment: config.environment,
        },
      },
    });

    return {
      direct: false,
      checkoutUrl: checkout.checkoutUrl,
      sessionId: checkout.sessionId,
      gateway: checkout.gateway,
      authorizedPriceInCents,
      currency,
    };
  }

  /**
   * Processa webhooks do gateway com garantia criptográfica e idempotência rigorosa.
   */
  static async processWebhook(
    rawBody: string,
    headers: Headers,
    forceGateway?: "stripe" | "sandbox"
  ) {
    const gateway = getPaymentGateway(forceGateway);

    // 1. Validar assinatura criptográfica (HMAC-SHA256)
    const validation = await gateway.validateWebhook(rawBody, headers);
    if (!validation.isValid || !validation.event) {
      throw new Error(`Webhook validation failed: ${validation.error || "Invalid payload"}`);
    }

    const event = validation.event;

    // Registrar no histórico operacional do painel administrativo
    let parsedPayload = event.rawPayload;
    if (!parsedPayload) {
      try {
        parsedPayload = JSON.parse(rawBody);
      } catch {
        parsedPayload = { raw: rawBody.substring(0, 1000) };
      }
    }

    await GatewayManagerService.recordIncomingWebhook({
      eventId: event.id,
      gateway: gateway.name,
      environment: (gateway as any).environment || "SANDBOX",
      eventType: event.type,
      rawPayload: parsedPayload,
    }).catch((err) => console.error("Erro ao registrar incoming webhook:", err));

    // 2. Proteção contra processamento duplicado (Idempotência por identificador)
    const existingEvent = await db.processedWebhookEvent.findUnique({
      where: { id: event.id },
    });

    if (existingEvent) {
      await GatewayManagerService.updateWebhookStatus({
        eventId: event.id,
        status: "PROCESSED",
      }).catch(() => {});

      return {
        processed: true,
        duplicate: true,
        eventId: event.id,
      };
    }

    // 3. Execução em transação atômica com rastreamento de status
    try {
      const result = await db.$transaction(async (tx) => {
      // Registrar evento processado
      await tx.processedWebhookEvent.create({
        data: {
          id: event.id,
          gateway: gateway.name,
          eventType: event.type,
          payload: event.rawPayload,
          status: "PROCESSED",
        },
      });

      // Tentar resolver o workspaceId
      let workspaceId = event.workspaceId;
      if (!workspaceId && event.subscriptionId) {
        const found = await tx.subscription.findUnique({
          where: { gatewaySubscriptionId: event.subscriptionId },
          select: { workspaceId: true },
        });
        if (found) workspaceId = found.workspaceId;
      }

      if (!workspaceId && event.customerId) {
        const found = await tx.subscription.findFirst({
          where: { customerId: event.customerId },
          select: { workspaceId: true },
        });
        if (found) workspaceId = found.workspaceId;
      }

      if (!workspaceId) {
        // Evento não associado a um workspace conhecido (ex: teste ou evento global)
        return {
          processed: true,
          orphan: true,
          eventId: event.id,
          duplicate: false,
        };
      }

      // Tratamento por tipo de evento normalizado
      switch (event.type) {
        case "checkout.completed": {
          const newTier = event.planTier || PlanTier.PRO;
          const dbPlan = await tx.plan.findUnique({ where: { tier: newTier } });
          const targetConfig = dbPlan || getPlanConfig(newTier);

          const createdSub = await tx.subscription.upsert({
            where: { workspaceId },
            create: {
              workspaceId,
              planTier: newTier,
              status: SubscriptionStatus.ACTIVE,
              interval: event.interval || BillingInterval.MONTHLY,
              customerId: event.customerId,
              gatewaySubscriptionId: event.subscriptionId,
              billingUserId: event.billingUserId,
              currentPeriodStart: event.currentPeriodStart || new Date(),
              currentPeriodEnd: event.currentPeriodEnd,
              cancelAtPeriodEnd: false,
            },
            update: {
              planTier: newTier,
              status: SubscriptionStatus.ACTIVE,
              interval: event.interval || BillingInterval.MONTHLY,
              customerId: event.customerId || undefined,
              gatewaySubscriptionId: event.subscriptionId || undefined,
              billingUserId: event.billingUserId || undefined,
              currentPeriodStart: event.currentPeriodStart || new Date(),
              currentPeriodEnd: event.currentPeriodEnd,
              cancelAtPeriodEnd: false,
              canceledAt: null,
            },
          });

          // Registrar Snapshot Contratual (Grandfathering e imutabilidade dos termos)
          await tx.commercialSnapshot.create({
            data: {
              subscriptionId: createdSub.id,
              workspaceId,
              planTier: newTier,
              snapshotData: {
                tier: newTier,
                name: targetConfig.name,
                priceMonthly: targetConfig.priceMonthly,
                priceYearly: targetConfig.priceYearly,
                monthlyCredits: targetConfig.monthlyCredits,
                maxProjects: targetConfig.maxProjects,
                unlimitedProjects: (targetConfig as any).unlimitedProjects ?? (targetConfig.maxProjects === -1),
                maxMembers: targetConfig.maxMembers,
                unlimitedMembers: (targetConfig as any).unlimitedMembers ?? (targetConfig.maxMembers === -1),
                interval: event.interval || BillingInterval.MONTHLY,
                gateway: gateway.name,
                subscriptionId: event.subscriptionId,
                acceptedAt: new Date().toISOString(),
              },
              reason: "NEW_CONTRACT",
              acceptedBy: event.billingUserId || null,
            },
          });

          // Conceder créditos do plano de forma atômica
          const workspace = await tx.workspace.findUnique({
            where: { id: workspaceId },
            select: { creditsBalance: true },
          });

          if (!workspace) {
            throw new Error(`Workspace ${workspaceId} não encontrado para conceder créditos.`);
          }

          const newBalance = (workspace.creditsBalance || 0) + targetConfig.monthlyCredits;
          await tx.workspace.update({
            where: { id: workspaceId },
            data: { creditsBalance: newBalance },
          });

          await tx.creditLedger.create({
            data: {
              workspaceId,
              amount: targetConfig.monthlyCredits,
              balanceAfter: newBalance,
              reason: `Assinatura iniciada: Plano ${targetConfig.name}`,
              metadata: { eventId: event.id, tier: newTier },
            },
          });

          await tx.auditLog.create({
            data: {
              workspaceId,
              action: "billing.subscription_activated",
              details: {
                tier: newTier,
                gatewaySubscriptionId: event.subscriptionId,
                customerId: event.customerId,
              },
            },
          });
          break;
        }

        case "subscription.updated": {
          const updateData: any = {};
          if (event.status) updateData.status = event.status;
          if (event.planTier) updateData.planTier = event.planTier;
          if (event.interval) updateData.interval = event.interval;
          if (event.currentPeriodStart) updateData.currentPeriodStart = event.currentPeriodStart;
          if (event.currentPeriodEnd) updateData.currentPeriodEnd = event.currentPeriodEnd;
          if (event.cancelAtPeriodEnd !== undefined) updateData.cancelAtPeriodEnd = event.cancelAtPeriodEnd;

          await tx.subscription.update({
            where: { workspaceId },
            data: updateData,
          });

          await tx.auditLog.create({
            data: {
              workspaceId,
              action: "billing.subscription_updated",
              details: { eventId: event.id, status: event.status },
            },
          });
          break;
        }

        case "subscription.canceled": {
          await tx.subscription.update({
            where: { workspaceId },
            data: {
              status: SubscriptionStatus.CANCELED,
              canceledAt: new Date(),
              cancelAtPeriodEnd: false,
            },
          });

          await tx.auditLog.create({
            data: {
              workspaceId,
              action: "billing.subscription_canceled",
              details: { eventId: event.id },
            },
          });
          break;
        }

        case "invoice.paid": {
          // Registrar fatura paga
          if (event.invoiceId) {
            await tx.invoice.upsert({
              where: { gatewayInvoiceId: event.invoiceId },
              create: {
                workspaceId,
                gatewayInvoiceId: event.invoiceId,
                amountDue: event.amountPaid || 0,
                amountPaid: event.amountPaid || 0,
                currency: event.currency || "BRL",
                status: "paid",
                hostedInvoiceUrl: event.hostedInvoiceUrl,
                paidAt: new Date(),
              },
              update: {
                status: "paid",
                amountPaid: event.amountPaid || 0,
                paidAt: new Date(),
                hostedInvoiceUrl: event.hostedInvoiceUrl,
              },
            });
          }

          // Se a assinatura estiver em PAST_DUE, normalizar para ACTIVE
          const currentSub = await tx.subscription.findUnique({
            where: { workspaceId },
          });

          if (currentSub && currentSub.status === SubscriptionStatus.PAST_DUE) {
            await tx.subscription.update({
              where: { workspaceId },
              data: { status: SubscriptionStatus.ACTIVE },
            });
          }

          await tx.auditLog.create({
            data: {
              workspaceId,
              action: "billing.invoice_paid",
              details: { invoiceId: event.invoiceId, amountPaid: event.amountPaid },
            },
          });
          break;
        }

        case "invoice.payment_failed": {
          // Marcar assinatura como PAST_DUE
          await tx.subscription.update({
            where: { workspaceId },
            data: { status: SubscriptionStatus.PAST_DUE },
          });

          if (event.invoiceId) {
            await tx.invoice.upsert({
              where: { gatewayInvoiceId: event.invoiceId },
              create: {
                workspaceId,
                gatewayInvoiceId: event.invoiceId,
                amountDue: event.amountPaid || 0,
                amountPaid: 0,
                currency: event.currency || "BRL",
                status: "payment_failed",
                hostedInvoiceUrl: event.hostedInvoiceUrl,
              },
              update: {
                status: "payment_failed",
              },
            });
          }

          await tx.auditLog.create({
            data: {
              workspaceId,
              action: "billing.payment_failed",
              details: { invoiceId: event.invoiceId },
            },
          });
          break;
        }
      }

      return {
        processed: true,
        workspaceId,
        eventType: event.type,
        duplicate: false,
      };
    });

    await GatewayManagerService.updateWebhookStatus({
      eventId: event.id,
      status: "PROCESSED",
    }).catch(() => {});

    return result;
  } catch (error: any) {
    await GatewayManagerService.updateWebhookStatus({
      eventId: event.id,
      status: "FAILED",
      error: error.message || "Erro desconhecido no processamento do webhook.",
    }).catch(() => {});

    throw error;
  }
}

  /**
   * Solicita o cancelamento da assinatura.
   */
  static async requestCancellation(workspaceId: string, userId: string, atPeriodEnd = true) {
    const membership = await db.membership.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        },
      },
    });

    if (!membership || (membership.role !== WorkspaceRole.OWNER && membership.role !== WorkspaceRole.ADMIN)) {
      throw new EntitlementError(
        "Apenas proprietários e administradores podem cancelar a assinatura.",
        "FORBIDDEN",
        403
      );
    }

    const sub = await EntitlementService.getWorkspaceSubscription(workspaceId);

    if (sub.planTier === PlanTier.FREE) {
      throw new EntitlementError("O plano gratuito não requer cancelamento.", "INVALID_REQUEST", 400);
    }

    if (sub.gatewaySubscriptionId) {
      const gateway = getPaymentGateway();
      await gateway.cancelSubscription(sub.gatewaySubscriptionId, atPeriodEnd);
    }

    const updated = await db.subscription.update({
      where: { workspaceId },
      data: atPeriodEnd
        ? {
            cancelAtPeriodEnd: true,
            status: SubscriptionStatus.CANCELING,
          }
        : {
            status: SubscriptionStatus.CANCELED,
            canceledAt: new Date(),
            cancelAtPeriodEnd: false,
          },
    });

    await db.auditLog.create({
      data: {
        userId,
        workspaceId,
        action: "billing.subscription_cancellation_requested",
        details: { atPeriodEnd, previousStatus: sub.status },
      },
    });

    return updated;
  }

  /**
   * Lista as faturas e histórico de pagamentos do workspace.
   */
  static async listInvoices(workspaceId: string, userId: string) {
    const membership = await db.membership.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        },
      },
    });

    if (!membership) {
      throw new EntitlementError("Usuário sem acesso a este workspace.", "UNAUTHORIZED", 401);
    }

    return db.invoice.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
    });
  }
}
