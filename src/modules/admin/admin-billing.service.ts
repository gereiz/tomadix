import { db } from "@/lib/db";
import { PlanTier, SubscriptionStatus, BillingInterval, Prisma } from "@prisma/client";
import { DEFAULT_PLANS } from "@/modules/billing/plans.config";
import { AdminAuditService } from "./admin-audit.service";

export interface PlanInput {
  tier: PlanTier;
  code?: string;
  name: string;
  description: string;
  badge?: string | null;
  displayOrder?: number;
  isHighlighted?: boolean;
  targetAudience?: string | null;
  commercialStatus?: string;
  isPublic?: boolean;
  priceMonthly: number;
  priceYearly: number;
  currency?: string;
  annualDiscountPercent?: number;
  trialDays?: number;
  promoPriceMonthly?: number | null;
  promoPriceYearly?: number | null;
  promoStartsAt?: string | Date | null;
  promoEndsAt?: string | Date | null;
  isOfferAvailable?: boolean;
  externalGatewayIds?: Record<string, any>;

  // Limites e funcionalidades
  maxProjects: number;
  unlimitedProjects?: boolean;
  maxMembers: number;
  unlimitedMembers?: boolean;
  maxCharacters?: number | null;
  unlimitedCharacters?: boolean;
  maxEnvironments?: number | null;
  unlimitedEnvironments?: boolean;
  maxScenes?: number | null;
  unlimitedScenes?: boolean;
  monthlyCredits: number;
  adhesionCredits?: number;
  dailyCredits?: number;
  dailyCreditsAccumulative?: boolean;
  isFreePlan?: boolean;
  maxConcurrentJobs?: number;
  rateLimitPerMin?: number;
  maxInputChars?: number;
  generationTypes?: string[];
  hasPremiumTemplates?: boolean;
  hasAdvancedParameters?: boolean;
  historyRetentionDays?: number;
  unlimitedHistory?: boolean;
  exportFormats?: string[];
  priorityProcessing?: boolean;
  features?: string[];
  enabledTemplates?: string[];
  exportAllowed?: boolean;
  visualBibleAdvanced?: boolean;
  hasImageGeneration?: boolean;
  imageDailyLimit?: number | null;
  imageMonthlyLimit?: number | null;
  imageTotalLimit?: number | null;
  imageDefaultCost?: number;
  imageAllowedModels?: string[];
  imageMaxBatchSize?: number;
  imageAllowedResolutions?: string[];
  imageAllowReferenceImages?: boolean;
  imageRetentionDays?: number;
  unlimitedImageRetention?: boolean;
  customRules?: Record<string, any>;
  gatewayProductId?: string | null;
  gatewayPriceIdMonthly?: string | null;
  gatewayPriceIdYearly?: string | null;
  isActive?: boolean;
  preserveExistingContracts?: boolean;
}

export class AdminBillingService {
  /**
   * Garante que os planos padrão existam no banco de dados e retorna todos os planos.
   */
  static async listAllPlans(options?: { onlyActive?: boolean; onlyPublic?: boolean }) {
    const where: Prisma.PlanWhereInput = {};
    if (options?.onlyActive) {
      where.isActive = true;
      where.commercialStatus = "ACTIVE";
    }
    if (options?.onlyPublic) {
      where.isPublic = true;
    }

    let plans = await db.plan.findMany({
      where,
      orderBy: [{ displayOrder: "asc" }, { priceMonthly: "asc" }],
      include: {
        _count: {
          select: {
            subscriptions: true,
          },
        },
      },
    });

    const existingTiers = new Set(plans.map((p) => p.tier));
    const missingDefaults = Object.values(DEFAULT_PLANS).filter(
      (dp) => !existingTiers.has(dp.tier as PlanTier)
    );

    if (missingDefaults.length > 0 && !options?.onlyActive) {
      // Inicializa os planos padrão faltantes no catálogo
      for (const defaultPlan of missingDefaults) {
        const isUnlimited = defaultPlan.maxProjects === -1;
        await db.plan.upsert({
          where: { tier: defaultPlan.tier as PlanTier },
          create: {
            tier: defaultPlan.tier as PlanTier,
            code: defaultPlan.tier.toLowerCase(),
            name: defaultPlan.name,
            description: defaultPlan.description,
            priceMonthly: defaultPlan.priceMonthly,
            priceYearly: defaultPlan.priceYearly,
            currency: defaultPlan.currency,
            maxProjects: isUnlimited ? 0 : defaultPlan.maxProjects,
            unlimitedProjects: isUnlimited,
            maxMembers: defaultPlan.maxMembers,
            unlimitedMembers: defaultPlan.maxMembers >= 50,
            monthlyCredits: defaultPlan.monthlyCredits,
            adhesionCredits: defaultPlan.adhesionCredits || 0,
            dailyCredits: defaultPlan.dailyCredits || 0,
            dailyCreditsAccumulative: defaultPlan.dailyCreditsAccumulative || false,
            isFreePlan: defaultPlan.isFreePlan || defaultPlan.tier === PlanTier.FREE,
            features: defaultPlan.features,
            enabledTemplates: defaultPlan.enabledTemplates,
            exportAllowed: defaultPlan.exportAllowed,
            visualBibleAdvanced: defaultPlan.visualBibleAdvanced,
            hasPremiumTemplates: defaultPlan.tier !== PlanTier.FREE,
            hasAdvancedParameters: defaultPlan.tier !== PlanTier.FREE,
            commercialStatus: "ACTIVE",
            isPublic: true,
            isActive: true,
          },
          update: {},
        });
      }

      plans = await db.plan.findMany({
        where,
        orderBy: [{ displayOrder: "asc" }, { priceMonthly: "asc" }],
        include: {
          _count: {
            select: {
              subscriptions: true,
            },
          },
        },
      });
    }

    return plans;
  }

  /**
   * Cria ou atualiza um plano no catálogo com preservação de contratos existentes.
   */
  static async upsertPlan(
    adminUserId: string,
    data: PlanInput,
    context?: { ip?: string; ua?: string }
  ) {
    const existingPlan = await db.plan.findUnique({
      where: { tier: data.tier },
    });

    const isTermsChanged =
      existingPlan &&
      (existingPlan.priceMonthly !== data.priceMonthly ||
        existingPlan.priceYearly !== data.priceYearly ||
        existingPlan.monthlyCredits !== data.monthlyCredits ||
        existingPlan.maxProjects !== data.maxProjects ||
        existingPlan.maxMembers !== data.maxMembers);

    // Se o plano já existe, os termos mudaram e a política é de preservação de contratos existentes
    if (existingPlan && isTermsChanged && data.preserveExistingContracts !== false) {
      const activeSubs = await db.subscription.findMany({
        where: {
          planTier: data.tier,
          status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
        },
      });

      // Cria registros formais de CommercialSnapshot e anota nos metadados da assinatura
      for (const sub of activeSubs) {
        const existingGrandfathered = (sub.metadata as any)?.grandfatheredContract;

        await db.commercialSnapshot.create({
          data: {
            subscriptionId: sub.id,
            workspaceId: sub.workspaceId,
            planTier: data.tier,
            snapshotData: {
              previousPlanTier: existingPlan.tier,
              previousPriceMonthly: existingGrandfathered?.previousPriceMonthly ?? existingPlan.priceMonthly,
              previousPriceYearly: existingGrandfathered?.previousPriceYearly ?? existingPlan.priceYearly,
              previousMonthlyCredits: existingGrandfathered?.previousMonthlyCredits ?? existingPlan.monthlyCredits,
              previousMaxProjects: existingGrandfathered?.previousMaxProjects ?? existingPlan.maxProjects,
              unlimitedProjects: existingPlan.unlimitedProjects,
              previousMaxMembers: existingGrandfathered?.previousMaxMembers ?? existingPlan.maxMembers,
              snapshotDate: new Date().toISOString(),
              note: "Contrato preservado conforme política comercial (Grandfathering).",
            },
            reason: "POLICY_GRANDFATHERING",
            acceptedBy: sub.billingUserId || null,
          },
        });

        await db.subscription.update({
          where: { id: sub.id },
          data: {
            metadata: {
              ...((sub.metadata as any) || {}),
              grandfatheredContract: {
                previousPlanTier: existingPlan.tier,
                previousPriceMonthly: existingGrandfathered?.previousPriceMonthly ?? existingPlan.priceMonthly,
                previousPriceYearly: existingGrandfathered?.previousPriceYearly ?? existingPlan.priceYearly,
                previousMonthlyCredits: existingGrandfathered?.previousMonthlyCredits ?? existingPlan.monthlyCredits,
                previousMaxProjects: existingGrandfathered?.previousMaxProjects ?? existingPlan.maxProjects,
                previousMaxMembers: existingGrandfathered?.previousMaxMembers ?? existingPlan.maxMembers,
                unlimitedProjects: existingPlan.unlimitedProjects,
                snapshotDate: new Date().toISOString(),
                note: "Contrato preservado conforme política comercial (grandparenting).",
              },
            },
          },
        });
      }
    }

    const payload: any = {
      name: data.name,
      description: data.description ?? existingPlan?.description ?? "",
      code: data.code || data.tier.toLowerCase(),
      badge: data.badge || null,
      displayOrder: data.displayOrder !== undefined ? Number(data.displayOrder) : (existingPlan?.displayOrder ?? 0),
      isHighlighted: data.isHighlighted ?? false,
      targetAudience: data.targetAudience || null,
      commercialStatus: data.commercialStatus || "ACTIVE",
      isPublic: data.isPublic ?? true,
      priceMonthly: Math.round(data.priceMonthly),
      priceYearly: Math.round(data.priceYearly),
      currency: data.currency || "BRL",
      annualDiscountPercent: data.annualDiscountPercent ?? 0,
      trialDays: data.trialDays ?? 0,
      promoPriceMonthly: data.promoPriceMonthly !== undefined && data.promoPriceMonthly !== null ? Math.round(data.promoPriceMonthly) : null,
      promoPriceYearly: data.promoPriceYearly !== undefined && data.promoPriceYearly !== null ? Math.round(data.promoPriceYearly) : null,
      promoStartsAt: data.promoStartsAt ? new Date(data.promoStartsAt) : null,
      promoEndsAt: data.promoEndsAt ? new Date(data.promoEndsAt) : null,
      isOfferAvailable: data.isOfferAvailable ?? true,
      externalGatewayIds: (data.externalGatewayIds || {}) as Prisma.InputJsonValue,
      maxProjects: data.maxProjects,
      unlimitedProjects: data.unlimitedProjects ?? (data.maxProjects === -1),
      maxMembers: data.maxMembers,
      unlimitedMembers: data.unlimitedMembers ?? false,
      maxCharacters: data.maxCharacters || null,
      unlimitedCharacters: data.unlimitedCharacters ?? true,
      maxEnvironments: data.maxEnvironments || null,
      unlimitedEnvironments: data.unlimitedEnvironments ?? true,
      maxScenes: data.maxScenes || null,
      unlimitedScenes: data.unlimitedScenes ?? true,
      monthlyCredits: Math.max(0, data.monthlyCredits ?? 0),
      adhesionCredits: Math.max(0, data.adhesionCredits ?? existingPlan?.adhesionCredits ?? 0),
      dailyCredits: Math.max(0, data.dailyCredits ?? existingPlan?.dailyCredits ?? 0),
      dailyCreditsAccumulative: data.dailyCreditsAccumulative ?? existingPlan?.dailyCreditsAccumulative ?? false,
      isFreePlan: data.isFreePlan ?? (data.priceMonthly === 0 && data.tier === PlanTier.FREE),
      maxConcurrentJobs: data.maxConcurrentJobs ?? 1,
      rateLimitPerMin: data.rateLimitPerMin ?? 30,
      maxInputChars: data.maxInputChars ?? 10000,
      generationTypes: (data.generationTypes || ["TEXT", "DETAILED", "CINEMATIC"]) as Prisma.InputJsonValue,
      hasPremiumTemplates: data.hasPremiumTemplates ?? (data.tier !== PlanTier.FREE),
      hasAdvancedParameters: data.hasAdvancedParameters ?? (data.tier !== PlanTier.FREE),
      historyRetentionDays: data.historyRetentionDays ?? 30,
      unlimitedHistory: data.unlimitedHistory ?? false,
      exportFormats: (data.exportFormats || ["TXT", "JSON"]) as Prisma.InputJsonValue,
      priorityProcessing: data.priorityProcessing ?? false,
      features: (data.features || []) as Prisma.InputJsonValue,
      enabledTemplates: (data.enabledTemplates || ["*"]) as Prisma.InputJsonValue,
      exportAllowed: data.exportAllowed ?? true,
      visualBibleAdvanced: data.visualBibleAdvanced ?? false,
      hasImageGeneration: data.hasImageGeneration ?? existingPlan?.hasImageGeneration ?? false,
      imageDailyLimit: data.imageDailyLimit !== undefined ? data.imageDailyLimit : (existingPlan?.imageDailyLimit ?? null),
      imageMonthlyLimit: data.imageMonthlyLimit !== undefined ? data.imageMonthlyLimit : (existingPlan?.imageMonthlyLimit ?? null),
      imageTotalLimit: data.imageTotalLimit !== undefined ? data.imageTotalLimit : (existingPlan?.imageTotalLimit ?? null),
      imageDefaultCost: data.imageDefaultCost !== undefined ? Number(data.imageDefaultCost) : (existingPlan?.imageDefaultCost ?? 10),
      imageAllowedModels: (data.imageAllowedModels ?? existingPlan?.imageAllowedModels ?? []) as Prisma.InputJsonValue,
      imageMaxBatchSize: data.imageMaxBatchSize !== undefined ? Number(data.imageMaxBatchSize) : (existingPlan?.imageMaxBatchSize ?? 1),
      imageAllowedResolutions: (data.imageAllowedResolutions ?? existingPlan?.imageAllowedResolutions ?? ["1024x1024", "1280x720", "720x1280"]) as Prisma.InputJsonValue,
      imageAllowReferenceImages: data.imageAllowReferenceImages ?? existingPlan?.imageAllowReferenceImages ?? false,
      imageRetentionDays: data.imageRetentionDays !== undefined ? Math.max(0, Number(data.imageRetentionDays)) : (existingPlan?.imageRetentionDays ?? 15),
      unlimitedImageRetention: data.unlimitedImageRetention ?? existingPlan?.unlimitedImageRetention ?? false,
      customRules: (data.customRules || {}) as Prisma.InputJsonValue,
      gatewayProductId: data.gatewayProductId || null,
      gatewayPriceIdMonthly: data.gatewayPriceIdMonthly || null,
      gatewayPriceIdYearly: data.gatewayPriceIdYearly || null,
      isActive: data.isActive ?? true,
    };

    const updatedPlan = await db.plan.upsert({
      where: { tier: data.tier },
      create: {
        tier: data.tier,
        ...payload,
      },
      update: payload,
    });

    await AdminAuditService.logAction({
      adminUserId,
      action: existingPlan ? "PLAN_UPDATE" : "PLAN_CREATE",
      targetType: "Plan",
      targetId: data.tier,
      result: "SUCCESS",
      details: {
        tier: data.tier,
        name: data.name,
        priceMonthly: data.priceMonthly,
        priceYearly: data.priceYearly,
        monthlyCredits: Math.max(0, data.monthlyCredits ?? 0),
      adhesionCredits: Math.max(0, data.adhesionCredits ?? existingPlan?.adhesionCredits ?? 0),
      dailyCredits: Math.max(0, data.dailyCredits ?? existingPlan?.dailyCredits ?? 0),
      dailyCreditsAccumulative: data.dailyCreditsAccumulative ?? existingPlan?.dailyCreditsAccumulative ?? false,
      isFreePlan: data.isFreePlan ?? (data.priceMonthly === 0 && data.tier === PlanTier.FREE),
        isTermsChanged: !!isTermsChanged,
        preserveExistingContracts: data.preserveExistingContracts !== false,
      },
      ipAddress: context?.ip,
      userAgent: context?.ua,
    });

    return updatedPlan;
  }

  /**
   * Arquiva um plano comercial, removendo da oferta pública sem romper assinaturas ativas.
   */
  static async archivePlan(
    adminUserId: string,
    tier: PlanTier,
    context?: { ip?: string; ua?: string }
  ) {
    const updated = await db.plan.update({
      where: { tier },
      data: {
        commercialStatus: "ARCHIVED",
        isActive: false,
        isPublic: false,
      },
    });

    await AdminAuditService.logAction({
      adminUserId,
      action: "PLAN_ARCHIVE",
      targetType: "Plan",
      targetId: tier,
      result: "SUCCESS",
      details: { tier, status: "ARCHIVED" },
      ipAddress: context?.ip,
      userAgent: context?.ua,
    });

    return updated;
  }

  /**
   * Ativa ou desativa a disponibilidade de um plano comercial.
   */
  static async togglePlanStatus(
    adminUserId: string,
    tier: PlanTier,
    isActive: boolean,
    context?: { ip?: string; ua?: string }
  ) {
    const updatedPlan = await db.plan.update({
      where: { tier },
      data: {
        isActive,
        commercialStatus: isActive ? "ACTIVE" : "DRAFT",
      },
    });

    await AdminAuditService.logAction({
      adminUserId,
      action: "PLAN_TOGGLE_ACTIVE",
      targetType: "Plan",
      targetId: tier,
      result: "SUCCESS",
      details: {
        tier,
        isActive,
      },
      ipAddress: context?.ip,
      userAgent: context?.ua,
    });

    return updatedPlan;
  }

  /**
   * Duplica as configurações de um plano para criação rápida de variações.
   */
  static async duplicatePlan(
    adminUserId: string,
    sourceTier: PlanTier,
    targetTier: PlanTier,
    newName: string,
    context?: { ip?: string; ua?: string }
  ) {
    const source = await db.plan.findUnique({
      where: { tier: sourceTier },
    });

    if (!source) {
      throw new Error("Plano de origem não encontrado.");
    }

    const duplicated = await db.plan.create({
      data: {
        tier: targetTier,
        code: `${source.code || sourceTier.toLowerCase()}-copy-${Date.now()}`,
        name: newName,
        description: `Cópia baseada em ${source.name}`,
        badge: source.badge,
        displayOrder: source.displayOrder + 1,
        isHighlighted: false,
        targetAudience: source.targetAudience,
        commercialStatus: "DRAFT",
        isPublic: false,
        priceMonthly: source.priceMonthly,
        priceYearly: source.priceYearly,
        currency: source.currency,
        annualDiscountPercent: source.annualDiscountPercent,
        trialDays: source.trialDays,
        maxProjects: source.maxProjects,
        unlimitedProjects: source.unlimitedProjects,
        maxMembers: source.maxMembers,
        unlimitedMembers: source.unlimitedMembers,
        maxCharacters: source.maxCharacters,
        unlimitedCharacters: source.unlimitedCharacters,
        maxEnvironments: source.maxEnvironments,
        unlimitedEnvironments: source.unlimitedEnvironments,
        maxScenes: source.maxScenes,
        unlimitedScenes: source.unlimitedScenes,
        monthlyCredits: source.monthlyCredits,
        maxConcurrentJobs: source.maxConcurrentJobs,
        rateLimitPerMin: source.rateLimitPerMin,
        maxInputChars: source.maxInputChars,
        generationTypes: source.generationTypes as any,
        hasPremiumTemplates: source.hasPremiumTemplates,
        hasAdvancedParameters: source.hasAdvancedParameters,
        historyRetentionDays: source.historyRetentionDays,
        unlimitedHistory: source.unlimitedHistory,
        exportFormats: source.exportFormats as any,
        priorityProcessing: source.priorityProcessing,
        features: source.features as any,
        enabledTemplates: source.enabledTemplates as any,
        exportAllowed: source.exportAllowed,
        visualBibleAdvanced: source.visualBibleAdvanced,
        customRules: source.customRules as any,
        isActive: false,
      },
    });

    await AdminAuditService.logAction({
      adminUserId,
      action: "PLAN_DUPLICATE",
      targetType: "Plan",
      targetId: targetTier,
      result: "SUCCESS",
      details: { sourceTier, targetTier, newName },
      ipAddress: context?.ip,
      userAgent: context?.ua,
    });

    return duplicated;
  }

  /**
   * Reordena a ordem de exibição dos planos na vitrine pública (/pricing) e no console administrativo.
   */
  static async reorderPlans(
    adminUserId: string,
    orderedTiers: (PlanTier | string)[],
    context?: { ip?: string; ua?: string }
  ) {
    if (!Array.isArray(orderedTiers) || orderedTiers.length === 0) {
      throw new Error("Lista de planos inválida para reordenação.");
    }

    // Atualiza atomicamente a ordem de cada plano
    const updates = orderedTiers.map((tier, index) => {
      return db.plan.update({
        where: { tier: tier as PlanTier },
        data: { displayOrder: index + 1 },
      });
    });

    await db.$transaction(updates);

    await AdminAuditService.logAction({
      adminUserId,
      action: "PLAN_REORDER",
      targetType: "Plan",
      targetId: "all",
      result: "SUCCESS",
      details: {
        orderedTiers,
      },
      ipAddress: context?.ip,
      userAgent: context?.ua,
    });

    return await this.listAllPlans();
  }

  /**
   * Consulta os snapshots de condições comerciais contratadas.
   */
  static async listCommercialSnapshots(params: {
    workspaceId?: string;
    subscriptionId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.CommercialSnapshotWhereInput = {};
    if (params.workspaceId) where.workspaceId = params.workspaceId;
    if (params.subscriptionId) where.subscriptionId = params.subscriptionId;

    const [snapshots, total] = await Promise.all([
      db.commercialSnapshot.findMany({
        where,
        orderBy: { acceptedAt: "desc" },
        skip,
        take: limit,
      }),
      db.commercialSnapshot.count({ where }),
    ]);

    return {
      snapshots,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Consulta paginada de assinaturas da plataforma.
   */
  static async listSubscriptions(params: {
    status?: SubscriptionStatus;
    tier?: PlanTier;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.SubscriptionWhereInput = {};
    if (params.status) {
      where.status = params.status;
    }
    if (params.tier) {
      where.planTier = params.tier;
    }
    if (params.search) {
      where.OR = [
        { workspace: { name: { contains: params.search, mode: "insensitive" } } },
        { workspace: { slug: { contains: params.search, mode: "insensitive" } } },
        { customerId: { contains: params.search, mode: "insensitive" } },
        { gatewaySubscriptionId: { contains: params.search, mode: "insensitive" } },
      ];
    }

    const [subscriptions, total] = await Promise.all([
      db.subscription.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          workspace: {
            select: {
              id: true,
              name: true,
              slug: true,
              isPersonal: true,
              creditsBalance: true,
              memberships: {
                where: { role: "OWNER" },
                take: 1,
                include: {
                  user: {
                    select: {
                      id: true,
                      email: true,
                      displayName: true,
                    },
                  },
                },
              },
            },
          },
          plan: {
            select: {
              name: true,
              priceMonthly: true,
              priceYearly: true,
              monthlyCredits: true,
              maxProjects: true,
              unlimitedProjects: true,
            },
          },
        },
      }),
      db.subscription.count({ where }),
    ]);

    return {
      subscriptions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obtém detalhes de uma assinatura específica.
   */
  static async getSubscriptionDetails(subscriptionId: string) {
    const subscription = await db.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        workspace: {
          include: {
            memberships: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    displayName: true,
                    platformRole: true,
                  },
                },
              },
            },
            _count: {
              select: {
                projects: true,
                memberships: true,
              },
            },
          },
        },
        plan: true,
        invoices: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!subscription) {
      throw new Error("Assinatura não encontrada.");
    }

    const snapshots = await db.commercialSnapshot.findMany({
      where: { subscriptionId },
      orderBy: { acceptedAt: "desc" },
      take: 5,
    });

    return {
      subscription,
      snapshots,
    };
  }

  /**
   * Atualiza parâmetros administrativos de uma assinatura.
   */
  static async updateSubscription(
    adminUserId: string,
    subscriptionId: string,
    data: {
      planTier?: PlanTier;
      status?: SubscriptionStatus;
      interval?: BillingInterval;
      cancelAtPeriodEnd?: boolean;
      currentPeriodEnd?: string | Date | null;
      grantCredits?: boolean;
      notes?: string;
    },
    context?: { ip?: string; ua?: string }
  ) {
    const subscription = await db.subscription.findUnique({
      where: { id: subscriptionId },
      include: { workspace: true, plan: true },
    });

    if (!subscription) {
      throw new Error("Assinatura não encontrada.");
    }

    const updatePayload: Prisma.SubscriptionUpdateInput = {};
    const oldValues = {
      planTier: subscription.planTier,
      status: subscription.status,
      interval: subscription.interval,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    };

    if (data.planTier && data.planTier !== subscription.planTier) {
      updatePayload.plan = { connect: { tier: data.planTier } };

      // Limpar explicitamente qualquer snapshot anterior de grandfatheredContract
      const currentMeta = (subscription.metadata as any) || {};
      const { grandfatheredContract, ...cleanMeta } = currentMeta;
      updatePayload.metadata = {
        ...cleanMeta,
        planChangedAt: new Date().toISOString(),
        previousPlanTier: subscription.planTier,
      };

      // Se solicitado concessão de créditos do novo plano
      if (data.grantCredits) {
        const targetPlan = await db.plan.findUnique({ where: { tier: data.planTier } });
        if (targetPlan && targetPlan.monthlyCredits > 0) {
          const newBalance = subscription.workspace.creditsBalance + targetPlan.monthlyCredits;
          await db.workspace.update({
            where: { id: subscription.workspaceId },
            data: { creditsBalance: newBalance },
          });
          await db.creditLedger.create({
            data: {
              workspaceId: subscription.workspaceId,
              amount: targetPlan.monthlyCredits,
              balanceAfter: newBalance,
              reason: `Créditos de alteração para plano ${data.planTier} (Ação administrativa)`,
              metadata: { adminUserId, subscriptionId },
            },
          });
        }
      }
    }

    if (data.status) {
      updatePayload.status = data.status;
      if (data.status === SubscriptionStatus.CANCELED) {
        updatePayload.canceledAt = new Date();
      }
    }

    if (data.interval) {
      updatePayload.interval = data.interval;
    }

    if (data.cancelAtPeriodEnd !== undefined) {
      updatePayload.cancelAtPeriodEnd = data.cancelAtPeriodEnd;
    }

    if (data.currentPeriodEnd) {
      updatePayload.currentPeriodEnd = new Date(data.currentPeriodEnd);
    }

    const updated = await db.subscription.update({
      where: { id: subscriptionId },
      data: updatePayload,
      include: { workspace: true, plan: true },
    });

    await AdminAuditService.logAction({
      adminUserId,
      action: "SUBSCRIPTION_UPDATE",
      targetType: "Subscription",
      targetId: subscriptionId,
      result: "SUCCESS",
      details: {
        workspaceId: subscription.workspaceId,
        workspaceName: subscription.workspace.name,
        oldValues,
        newValues: data,
        notes: data.notes,
      },
      ipAddress: context?.ip,
      userAgent: context?.ua,
    });

    return updated;
  }

  /**
   * Estende o período de trial de uma assinatura.
   */
  static async extendTrial(
    adminUserId: string,
    subscriptionId: string,
    days: number,
    justification: string,
    context?: { ip?: string; ua?: string }
  ) {
    if (days <= 0) {
      throw new Error("A quantidade de dias deve ser maior que zero.");
    }
    if (!justification || justification.trim().length < 5) {
      throw new Error("É obrigatório fornecer uma justificativa para a extensão do trial.");
    }

    const subscription = await db.subscription.findUnique({
      where: { id: subscriptionId },
      include: { workspace: true },
    });

    if (!subscription) {
      throw new Error("Assinatura não encontrada.");
    }

    const currentBase = subscription.trialEnd && subscription.trialEnd > new Date()
      ? subscription.trialEnd
      : new Date();

    const newTrialEnd = new Date(currentBase.getTime() + days * 24 * 60 * 60 * 1000);

    const updated = await db.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: SubscriptionStatus.TRIALING,
        trialEnd: newTrialEnd,
        currentPeriodEnd: newTrialEnd,
      },
      include: { workspace: true, plan: true },
    });

    await AdminAuditService.logAction({
      adminUserId,
      action: "SUBSCRIPTION_EXTEND_TRIAL",
      targetType: "Subscription",
      targetId: subscriptionId,
      result: "SUCCESS",
      details: {
        workspaceId: subscription.workspaceId,
        workspaceName: subscription.workspace.name,
        daysAdded: days,
        previousTrialEnd: subscription.trialEnd,
        newTrialEnd,
        justification,
      },
      ipAddress: context?.ip,
      userAgent: context?.ua,
    });

    return updated;
  }

  /**
   * Cancela uma assinatura administrativamente (imediato ou no fim do ciclo).
   */
  static async cancelSubscription(
    adminUserId: string,
    subscriptionId: string,
    immediate: boolean,
    justification: string,
    context?: { ip?: string; ua?: string }
  ) {
    if (!justification || justification.trim().length < 5) {
      throw new Error("É obrigatório fornecer uma justificativa para o cancelamento administrativo.");
    }

    const subscription = await db.subscription.findUnique({
      where: { id: subscriptionId },
      include: { workspace: true },
    });

    if (!subscription) {
      throw new Error("Assinatura não encontrada.");
    }

    const updated = await db.subscription.update({
      where: { id: subscriptionId },
      data: immediate
        ? {
            status: SubscriptionStatus.CANCELED,
            canceledAt: new Date(),
            cancelAtPeriodEnd: false,
          }
        : {
            cancelAtPeriodEnd: true,
            status: SubscriptionStatus.CANCELING,
          },
      include: { workspace: true, plan: true },
    });

    await AdminAuditService.logAction({
      adminUserId,
      action: "SUBSCRIPTION_CANCEL",
      targetType: "Subscription",
      targetId: subscriptionId,
      result: "SUCCESS",
      details: {
        workspaceId: subscription.workspaceId,
        workspaceName: subscription.workspace.name,
        immediate,
        justification,
      },
      ipAddress: context?.ip,
      userAgent: context?.ua,
    });

    return updated;
  }

  /**
   * Consulta paginada de faturas e histórico de cobrança.
   */
  static async listInvoices(params: {
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.InvoiceWhereInput = {};
    if (params.status) {
      where.status = params.status;
    }

    const [invoices, total] = await Promise.all([
      db.invoice.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          workspace: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      }),
      db.invoice.count({ where }),
    ]);

    return {
      invoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Calcula métricas comerciais reais da plataforma (conversão, churn, MRR e créditos).
   */
  static async getCommercialMetrics() {
    const [
      totalWorkspaces,
      subscriptionsByTier,
      subscriptionsByStatus,
      paidInvoicesAgg,
      failedInvoicesCount,
      creditsConsumedAgg,
      creditsGrantedAgg,
      activePaidSubscriptions,
    ] = await Promise.all([
      db.workspace.count(),
      db.subscription.groupBy({
        by: ["planTier"],
        _count: { id: true },
      }),
      db.subscription.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
      db.invoice.aggregate({
        where: { status: "paid" },
        _sum: { amountPaid: true },
        _count: { id: true },
      }),
      db.invoice.count({
        where: { status: { in: ["payment_failed", "uncollectible", "open"] } },
      }),
      db.creditLedger.aggregate({
        where: { amount: { lt: 0 } },
        _sum: { amount: true },
      }),
      db.creditLedger.aggregate({
        where: { amount: { gt: 0 } },
        _sum: { amount: true },
      }),
      db.subscription.findMany({
        where: {
          status: SubscriptionStatus.ACTIVE,
          planTier: { not: PlanTier.FREE },
        },
        include: {
          plan: {
            select: {
              priceMonthly: true,
              priceYearly: true,
            },
          },
        },
      }),
    ]);

    // Cálculo do MRR (Monthly Recurring Revenue) em centavos de Real
    let estimatedMrrCents = 0;
    for (const sub of activePaidSubscriptions) {
      if (sub.interval === "YEARLY") {
        estimatedMrrCents += Math.round((sub.plan?.priceYearly || 0) / 12);
      } else {
        estimatedMrrCents += sub.plan?.priceMonthly || 0;
      }
    }

    // Contagem de assinaturas por status
    const statusCounts: Record<string, number> = {};
    for (const item of subscriptionsByStatus) {
      statusCounts[item.status] = item._count.id;
    }

    const activeCount = statusCounts[SubscriptionStatus.ACTIVE] || 0;
    const canceledCount = statusCounts[SubscriptionStatus.CANCELED] || 0;
    const pastDueCount = statusCounts[SubscriptionStatus.PAST_DUE] || 0;
    const trialingCount = statusCounts[SubscriptionStatus.TRIALING] || 0;

    // Métricas de conversão e churn
    const paidSubscriptionsCount = activePaidSubscriptions.length;
    const conversionRate = totalWorkspaces > 0
      ? Number(((paidSubscriptionsCount / totalWorkspaces) * 100).toFixed(1))
      : 0;

    const totalSubHistory = activeCount + canceledCount;
    const churnRate = totalSubHistory > 0
      ? Number(((canceledCount / totalSubHistory) * 100).toFixed(1))
      : 0;

    return {
      totalWorkspaces,
      mrr: {
        cents: estimatedMrrCents,
        formattedBrl: (estimatedMrrCents / 100).toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        }),
      },
      conversion: {
        ratePercent: conversionRate,
        paidWorkspaces: paidSubscriptionsCount,
        freeWorkspaces: totalWorkspaces - paidSubscriptionsCount,
      },
      churn: {
        ratePercent: churnRate,
        canceledCount,
        activeCount,
        pastDueCount,
        trialingCount,
      },
      invoices: {
        totalRevenueCents: paidInvoicesAgg._sum.amountPaid || 0,
        paidInvoicesCount: paidInvoicesAgg._count.id,
        failedInvoicesCount,
      },
      credits: {
        totalConsumed: Math.abs(creditsConsumedAgg._sum.amount || 0),
        totalGranted: creditsGrantedAgg._sum.amount || 0,
      },
      distributionByTier: subscriptionsByTier.map((t) => ({
        tier: t.planTier,
        count: t._count.id,
      })),
    };
  }
}
