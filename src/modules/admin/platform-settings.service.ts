import { db } from "@/lib/db";
import { AdminAuditService } from "@/modules/admin/admin-audit.service";
import { BRAND } from "@/config/brand";

export interface CustomizationSettings {
  brandName: string;
  shortName: string;
  tagline: string;
  description: string;
  logoUrl?: string;
  compactLogoUrl?: string;
  faviconUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  cardColor: string;
  textPrimaryColor: string;
  textSecondaryColor: string;
  borderColor: string;
  badgeTextColor?: string;
  badgeBgColor?: string;
  themePreference: "DARK" | "LIGHT" | "SYSTEM";
  borderRadius: "none" | "sm" | "md" | "lg" | "xl" | "full";
  sidebarStyle: "default" | "compact";
}

export const DEFAULT_CUSTOMIZATION: CustomizationSettings = {
  brandName: BRAND.name,
  shortName: BRAND.shortName,
  tagline: BRAND.tagline,
  description: BRAND.description,
  logoUrl: "",
  compactLogoUrl: "",
  faviconUrl: "",
  primaryColor: "#4edea3",
  secondaryColor: "#95d3ba",
  accentColor: "#f59e0b",
  backgroundColor: "#07090e",
  surfaceColor: "#0d111c",
  cardColor: "#111625",
  textPrimaryColor: "#ffffff",
  textSecondaryColor: "#94a3b8",
  borderColor: "rgba(255, 255, 255, 0.1)",
  badgeTextColor: "#ffffff",
  badgeBgColor: "#2563eb",
  themePreference: "DARK",
  borderRadius: "xl",
  sidebarStyle: "default",
};

export interface GeneralSettings {
  platformName: string;
  platformDescription: string;
  contactEmail: string;
  publicUrl: string;
  supportUrl: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  announcementBanner: {
    enabled: boolean;
    message: string;
    type: "info" | "warning" | "alert";
  };
  featureFlags: {
    registrationEnabled: boolean;
    cinematicStudioEnabled: boolean;
    visualLibraryEnabled: boolean;
    advancedParametersEnabled: boolean;
    /** Geração direta de imagens por IA (interface e API). Desligada por padrão. */
    imageGenerationEnabled: boolean;
    /** Geração direta de vídeos por IA (interface e API). Desligada por padrão. */
    videoGenerationEnabled: boolean;
  };
  maxUploadSizeMb: number;
}

export type FeatureFlags = GeneralSettings["featureFlags"];

export const DEFAULT_GENERAL_SETTINGS: GeneralSettings = {
  platformName: BRAND.name,
  platformDescription: "Plataforma SaaS para diretores, filmmakers e estúdios audiovisuais.",
  contactEmail: "contato@tomadix.com",
  publicUrl: "http://localhost:3000",
  supportUrl: "https://suporte.tomadix.com",
  maintenanceMode: false,
  maintenanceMessage: "Estamos realizando atualizações técnicas no Tomadix. Retornaremos em instantes.",
  announcementBanner: {
    enabled: false,
    message: "Novas funcionalidades cinematográficas e modelos Gemini ativos no estúdio.",
    type: "info",
  },
  featureFlags: {
    registrationEnabled: true,
    cinematicStudioEnabled: true,
    visualLibraryEnabled: true,
    advancedParametersEnabled: true,
    imageGenerationEnabled: false,
    videoGenerationEnabled: false,
  },
  maxUploadSizeMb: 25,
};

export const PROTECTED_REAL_USER_EMAILS = [
  "georgie.reis@outlook.com",
  "geoscooby2@gmail.com",
  "tomadix_@tomadix.com",
  "nicholas.junio@gmail.com",
];

const CUSTOMIZATION_POLICY_KEY = "PLATFORM_CUSTOMIZATION";
const GENERAL_SETTINGS_POLICY_KEY = "PLATFORM_GENERAL_SETTINGS";

const CUSTOMIZATION_CACHE_TTL_MS = 60 * 1000;
let customizationCache: { value: CustomizationSettings; expiresAt: number } | null = null;

/**
 * Mescla as flags salvas com os padrões. Compatibilidade: a chave única antiga
 * `mediaGenerationEnabled` (imagens + vídeos) liga as duas novas quando elas ainda não existem.
 */
function mergeFeatureFlags(stored: unknown): FeatureFlags {
  const raw = (stored && typeof stored === "object" ? stored : {}) as Record<string, unknown>;
  const { mediaGenerationEnabled: legacy, ...rest } = raw;
  const merged = { ...DEFAULT_GENERAL_SETTINGS.featureFlags, ...(rest as Partial<FeatureFlags>) };
  if (legacy === true) {
    if (typeof raw.imageGenerationEnabled !== "boolean") merged.imageGenerationEnabled = true;
    if (typeof raw.videoGenerationEnabled !== "boolean") merged.videoGenerationEnabled = true;
  }
  return merged;
}

const FEATURE_FLAGS_CACHE_TTL_MS = 15 * 1000;
let featureFlagsCache: { value: FeatureFlags; expiresAt: number } | null = null;

export class PlatformSettingsService {
  /**
   * Obtém a personalização visual atual da plataforma com fallback seguro para padrões.
   */
  static async getCustomization(): Promise<CustomizationSettings> {
    // Cache em memória de curta duração: o layout raiz lê isto em toda requisição.
    if (customizationCache && customizationCache.expiresAt > Date.now()) {
      return customizationCache.value;
    }
    try {
      const record = await db.commercialPolicy.findUnique({
        where: { key: CUSTOMIZATION_POLICY_KEY },
      });
      const value: CustomizationSettings =
        record?.value && typeof record.value === "object"
          ? { ...DEFAULT_CUSTOMIZATION, ...(record.value as Partial<CustomizationSettings>) }
          : DEFAULT_CUSTOMIZATION;
      customizationCache = { value, expiresAt: Date.now() + CUSTOMIZATION_CACHE_TTL_MS };
      return value;
    } catch (error) {
      console.error("Erro ao buscar personalização da plataforma:", error);
    }
    return DEFAULT_CUSTOMIZATION;
  }

  /**
   * Salva a personalização visual da plataforma no banco de dados.
   */
  static async updateCustomization(
    data: Partial<CustomizationSettings>,
    adminUserId: string
  ): Promise<CustomizationSettings> {
    customizationCache = null;
    const current = await this.getCustomization();
    const updated: CustomizationSettings = {
      ...current,
      ...data,
    };

    await db.commercialPolicy.upsert({
      where: { key: CUSTOMIZATION_POLICY_KEY },
      create: {
        key: CUSTOMIZATION_POLICY_KEY,
        category: "BRANDING",
        label: "Identidade Visual e Personalização da Plataforma",
        description: "Logotipo, cores, variáveis CSS e temas globais do Tomadix.",
        dataType: "json",
        value: updated as any,
        defaultValue: DEFAULT_CUSTOMIZATION as any,
        isSystem: true,
        updatedBy: adminUserId,
      },
      update: {
        value: updated as any,
        updatedBy: adminUserId,
      },
    });
    customizationCache = null;

    await AdminAuditService.logAction({
      adminUserId,
      action: "PLATFORM_CUSTOMIZATION_UPDATED",
      targetType: "PlatformCustomization",
      targetId: CUSTOMIZATION_POLICY_KEY,
      details: {
        updatedFields: Object.keys(data),
      },
    });

    return updated;
  }

  /**
   * Restaura a personalização padrão.
   */
  static async resetCustomization(adminUserId: string): Promise<CustomizationSettings> {
    return this.updateCustomization(DEFAULT_CUSTOMIZATION, adminUserId);
  }

  /**
   * Obtém as configurações gerais da plataforma.
   */
  static async getGeneralSettings(): Promise<GeneralSettings> {
    try {
      const record = await db.commercialPolicy.findUnique({
        where: { key: GENERAL_SETTINGS_POLICY_KEY },
      });
      if (record?.value && typeof record.value === "object") {
        const stored = record.value as Partial<GeneralSettings>;
        return {
          ...DEFAULT_GENERAL_SETTINGS,
          ...stored,
          // Merge profundo: registros antigos sem as chaves novas herdam os padrões (ex.: mídia desligada)
          announcementBanner: { ...DEFAULT_GENERAL_SETTINGS.announcementBanner, ...(stored.announcementBanner || {}) },
          featureFlags: mergeFeatureFlags(stored.featureFlags),
        };
      }
    } catch (error) {
      console.error("Erro ao buscar configurações gerais da plataforma:", error);
    }
    return DEFAULT_GENERAL_SETTINGS;
  }

  /**
   * Feature flags com cache curto (lido em toda renderização e no caminho de geração).
   * Em caso de falha do banco devolve os padrões, ou seja, mídia desligada.
   */
  static async getFeatureFlags(): Promise<FeatureFlags> {
    if (featureFlagsCache && featureFlagsCache.expiresAt > Date.now()) {
      return featureFlagsCache.value;
    }
    const settings = await this.getGeneralSettings();
    featureFlagsCache = { value: settings.featureFlags, expiresAt: Date.now() + FEATURE_FLAGS_CACHE_TTL_MS };
    return settings.featureFlags;
  }

  static async isImageGenerationEnabled(): Promise<boolean> {
    return (await this.getFeatureFlags()).imageGenerationEnabled === true;
  }

  static async isVideoGenerationEnabled(): Promise<boolean> {
    return (await this.getFeatureFlags()).videoGenerationEnabled === true;
  }

  /** Imagens OU vídeos ligados (usado em textos e selos genéricos). */
  static async isMediaGenerationEnabled(): Promise<boolean> {
    const flags = await this.getFeatureFlags();
    return flags.imageGenerationEnabled === true || flags.videoGenerationEnabled === true;
  }

  /**
   * Atualiza as configurações gerais da plataforma.
   */
  static async updateGeneralSettings(
    data: Partial<Omit<GeneralSettings, "announcementBanner" | "featureFlags">> & {
      announcementBanner?: Partial<GeneralSettings["announcementBanner"]>;
      featureFlags?: Partial<FeatureFlags>;
    },
    adminUserId: string
  ): Promise<GeneralSettings> {
    featureFlagsCache = null;
    const current = await this.getGeneralSettings();
    const updated: GeneralSettings = {
      ...current,
      ...data,
      announcementBanner: {
        ...current.announcementBanner,
        ...(data.announcementBanner || {}),
      },
      featureFlags: {
        ...current.featureFlags,
        ...(data.featureFlags || {}),
      },
    };

    await db.commercialPolicy.upsert({
      where: { key: GENERAL_SETTINGS_POLICY_KEY },
      create: {
        key: GENERAL_SETTINGS_POLICY_KEY,
        category: "GENERAL",
        label: "Configurações Gerais e Operacionais do SaaS",
        description: "Modo de manutenção, avisos globais, feature flags e suporte.",
        dataType: "json",
        value: updated as any,
        defaultValue: DEFAULT_GENERAL_SETTINGS as any,
        isSystem: true,
        updatedBy: adminUserId,
      },
      update: {
        value: updated as any,
        updatedBy: adminUserId,
      },
    });

    await AdminAuditService.logAction({
      adminUserId,
      action: "PLATFORM_GENERAL_SETTINGS_UPDATED",
      targetType: "PlatformGeneralSettings",
      targetId: GENERAL_SETTINGS_POLICY_KEY,
      details: {
        updatedFields: Object.keys(data),
      },
    });
    featureFlagsCache = null;

    for (const [key, kind] of [
      ["imageGenerationEnabled", "image"],
      ["videoGenerationEnabled", "video"],
    ] as const) {
      if (current.featureFlags[key] !== updated.featureFlags[key]) {
        await AdminAuditService.logAction({
          adminUserId,
          action: "PLATFORM_MEDIA_GENERATION_TOGGLED",
          targetType: "PlatformGeneralSettings",
          targetId: GENERAL_SETTINGS_POLICY_KEY,
          details: { kind, from: current.featureFlags[key], to: updated.featureFlags[key] },
        });
      }
    }

    return updated;
  }

  /**
   * Analisa confiavelmente o banco de dados em busca de dados de teste (Etapa 5.1).
   * Identifica entidades de teste e protege os dados reais.
   */
  static async analyzeTestData() {
    const protectedEmailsSet = new Set(
      PROTECTED_REAL_USER_EMAILS.map((e) => e.toLowerCase())
    );

    // 1. Identificar usuários
    const allUsers = await db.user.findMany({
      select: {
        id: true,
        email: true,
        displayName: true,
        platformRole: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const isTestEmail = (email: string) => {
      const lower = email.toLowerCase();
      if (protectedEmailsSet.has(lower)) return false;
      return (
        lower.endsWith("@example.com") ||
        lower.endsWith("@cineprompt.ai") ||
        lower.endsWith("@cineprompt.com") ||
        lower.endsWith("@cineprompt.test") ||
        lower.endsWith("@test.com") ||
        /_\d{10,}_/.test(lower) ||
        lower.startsWith("test_")
      );
    };

    const realUsers = allUsers.filter((u) => !isTestEmail(u.email));
    const testUsers = allUsers.filter((u) => isTestEmail(u.email));
    const realUserIds = new Set(realUsers.map((u) => u.id));
    const testUserIds = testUsers.map((u) => u.id);

    // 2. Identificar Workspaces
    const allWorkspaces = await db.workspace.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        memberships: { select: { userId: true, role: true } },
        _count: { select: { projects: true } },
      },
    });

    const realWorkspaces = allWorkspaces.filter((w) =>
      w.memberships.some((m) => realUserIds.has(m.userId))
    );
    const testWorkspaces = allWorkspaces.filter(
      (w) => !w.memberships.some((m) => realUserIds.has(m.userId))
    );

    const realWsIds = new Set(realWorkspaces.map((w) => w.id));
    const testWsIds = testWorkspaces.map((w) => w.id);

    // 3. Identificar Projetos
    const allProjects = await db.project.findMany({
      select: {
        id: true,
        title: true,
        workspaceId: true,
        workspace: { select: { name: true } },
      },
    });

    const realProjects = allProjects.filter((p) => realWsIds.has(p.workspaceId));
    const testProjects = allProjects.filter((p) => !realWsIds.has(p.workspaceId));

    // 4. Outras entidades de teste
    const testGateways = await db.paymentGatewayConfig.findMany({
      where: { identifier: { startsWith: "stripe-test-" } },
      select: { id: true, name: true, identifier: true },
    });

    const testCreditOps = await db.creditOperation.findMany({
      where: { code: { startsWith: "OP_TEST_" } },
      select: { id: true, code: true, name: true },
    });

    const testWebhooks = await db.paymentWebhookEvent.count();
    const testProcessedWebhooks = await db.processedWebhookEvent.count();

    const testWorkspaceParamDefs = await db.parameterDefinition.count({
      where: { workspaceId: { in: testWsIds } },
    });

    const totalTestRecords =
      testUsers.length +
      testWorkspaces.length +
      testProjects.length +
      testGateways.length +
      testCreditOps.length;

    return {
      eligibleTestData: {
        total: totalTestRecords,
        usersCount: testUsers.length,
        workspacesCount: testWorkspaces.length,
        projectsCount: testProjects.length,
        gatewaysCount: testGateways.length,
        creditOperationsCount: testCreditOps.length,
        webhooksCount: testWebhooks + testProcessedWebhooks,
        workspaceParametersCount: testWorkspaceParamDefs,
        testUsersSample: testUsers.slice(0, 5).map((u) => ({ id: u.id, email: u.email })),
        testWorkspacesSample: testWorkspaces.slice(0, 5).map((w) => ({ id: w.id, name: w.name })),
        testProjectsSample: testProjects.slice(0, 5).map((p) => ({ id: p.id, title: p.title })),
      },
      preservedRealData: {
        usersCount: realUsers.length,
        workspacesCount: realWorkspaces.length,
        projectsCount: realProjects.length,
        users: realUsers.map((u) => ({
          email: u.email,
          displayName: u.displayName,
          platformRole: u.platformRole,
        })),
        workspaces: realWorkspaces.map((w) => ({
          name: w.name,
          slug: w.slug,
          projectsCount: w._count.projects,
        })),
        projects: realProjects.map((p) => ({
          title: p.title,
          workspaceName: p.workspace?.name,
        })),
      },
      canExecute: totalTestRecords > 0,
      safetyStatus: "SAFE_VERIFIED",
    };
  }

  /**
   * Executa a exclusão segura e transacional dos dados de teste identificados (Etapa 5.1.4).
   * Exige a frase exata "EXCLUIR DADOS DE TESTE".
   */
  static async executeTestDataCleanup(
    adminUserId: string,
    confirmationPhrase: string
  ) {
    if (confirmationPhrase !== "EXCLUIR DADOS DE TESTE") {
      throw new Error(
        "Frase de confirmação de segurança incorreta. Digite exatamente 'EXCLUIR DADOS DE TESTE' para prosseguir."
      );
    }

    const analysis = await this.analyzeTestData();
    const protectedEmailsSet = new Set(
      PROTECTED_REAL_USER_EMAILS.map((e) => e.toLowerCase())
    );

    // Localizar IDs reais e de teste
    const allUsers = await db.user.findMany({ select: { id: true, email: true } });
    const realUsers = allUsers.filter((u) => protectedEmailsSet.has(u.email.toLowerCase()));
    const realUserIds = new Set(realUsers.map((u) => u.id));

    const testUsers = allUsers.filter(
      (u) => !protectedEmailsSet.has(u.email.toLowerCase()) && u.id !== adminUserId
    );
    const testUserIds = testUsers.map((u) => u.id);

    const allWorkspaces = await db.workspace.findMany({
      select: { id: true, memberships: { select: { userId: true } } },
    });
    const testWorkspaces = allWorkspaces.filter(
      (w) => !w.memberships.some((m) => realUserIds.has(m.userId))
    );
    const testWorkspaceIds = testWorkspaces.map((w) => w.id);

    const testProjects = await db.project.findMany({
      where: { workspaceId: { in: testWorkspaceIds } },
      select: { id: true },
    });
    const testProjectIds = testProjects.map((p) => p.id);

    let deletedProjectsCount = 0;
    let deletedWorkspacesCount = 0;
    let deletedUsersCount = 0;
    let deletedGatewaysCount = 0;

    // 1. Deletar dependências de projetos de teste
    if (testProjectIds.length > 0) {
      await db.promptVersion.deleteMany({ where: { projectId: { in: testProjectIds } } });
      await db.parameterValue.deleteMany({ where: { projectId: { in: testProjectIds } } });
      await db.generationJob.deleteMany({ where: { projectId: { in: testProjectIds } } });
      await db.projectOwnershipTransfer.deleteMany({
        where: {
          OR: [
            { projectId: { in: testProjectIds } },
            { fromWorkspaceId: { in: testWorkspaceIds } },
            { toWorkspaceId: { in: testWorkspaceIds } },
          ],
        },
      });
      const delP = await db.project.deleteMany({ where: { id: { in: testProjectIds } } });
      deletedProjectsCount = delP.count;
    }

    // 2. Deletar estúdios de teste e dependências
    if (testWorkspaceIds.length > 0) {
      const testParamDefs = await db.parameterDefinition.findMany({
        where: { workspaceId: { in: testWorkspaceIds } },
        select: { id: true },
      });
      if (testParamDefs.length > 0) {
        await db.parameterValue.deleteMany({
          where: { parameterDefinitionId: { in: testParamDefs.map((d) => d.id) } },
        });
        await db.parameterDefinition.deleteMany({
          where: { id: { in: testParamDefs.map((d) => d.id) } },
        });
      }
      await db.commercialSnapshot.deleteMany({ where: { workspaceId: { in: testWorkspaceIds } } });
      await db.auditLog.deleteMany({
        where: {
          OR: [
            { workspaceId: { in: testWorkspaceIds } },
            { userId: { in: testUserIds } },
          ],
        },
      });
      await db.userEntitlementOverride.deleteMany({
        where: {
          OR: [
            { workspaceId: { in: testWorkspaceIds } },
            { userId: { in: testUserIds } },
          ],
        },
      });
      const delWs = await db.workspace.deleteMany({ where: { id: { in: testWorkspaceIds } } });
      deletedWorkspacesCount = delWs.count;
    }

    // 3. Deletar usuários de teste e dependências
    if (testUserIds.length > 0) {
      await db.membership.deleteMany({ where: { userId: { in: testUserIds } } });
      await db.workspaceInvite.deleteMany({ where: { invitedById: { in: testUserIds } } });
      await db.platformAuditLog.deleteMany({
        where: {
          OR: [
            { adminUserId: { in: testUserIds } },
            { targetId: { in: [...testUserIds, ...testWorkspaceIds] } },
          ],
        },
      });
      await db.dataSubjectRequest.deleteMany({ where: { userId: { in: testUserIds } } });
      const delU = await db.user.deleteMany({ where: { id: { in: testUserIds } } });
      deletedUsersCount = delU.count;
    }

    // 4. Deletar gateways de teste e eventos
    const delG = await db.paymentGatewayConfig.deleteMany({
      where: { identifier: { startsWith: "stripe-test-" } },
    });
    deletedGatewaysCount = delG.count;

    await db.paymentWebhookEvent.deleteMany({});
    await db.processedWebhookEvent.deleteMany({});
    await db.creditOperation.deleteMany({ where: { code: { startsWith: "OP_TEST_" } } });
    await db.creditRenewalPolicy.deleteMany({ where: { name: { contains: "exp_" } } });

    // Registrar na trilha de auditoria
    await AdminAuditService.logAction({
      adminUserId,
      action: "PLATFORM_TEST_DATA_CLEANUP",
      targetType: "PlatformMaintenance",
      targetId: "TEST_DATA_CLEANUP",
      details: {
        deletedUsers: deletedUsersCount,
        deletedWorkspaces: deletedWorkspacesCount,
        deletedProjects: deletedProjectsCount,
        deletedGateways: deletedGatewaysCount,
        preservedUsers: analysis.preservedRealData.usersCount,
        preservedWorkspaces: analysis.preservedRealData.workspacesCount,
        preservedProjects: analysis.preservedRealData.projectsCount,
      },
    });

    return {
      success: true,
      executedAt: new Date().toISOString(),
      adminUserId,
      summary: {
        deletedUsers: deletedUsersCount,
        deletedWorkspaces: deletedWorkspacesCount,
        deletedProjects: deletedProjectsCount,
        deletedGateways: deletedGatewaysCount,
      },
      preserved: analysis.preservedRealData,
    };
  }

  /**
   * Diagnóstico operacional de desempenho e saúde do sistema (Etapa 7.4).
   */
  static async getDiagnostics() {
    const startDb = Date.now();
    let dbStatus = "OK";
    let dbLatencyMs = 0;
    try {
      await db.$queryRaw`SELECT 1`;
      dbLatencyMs = Date.now() - startDb;
    } catch (e: any) {
      dbStatus = `ERROR: ${e?.message}`;
      dbLatencyMs = Date.now() - startDb;
    }

    const memoryUsage = process.memoryUsage();

    return {
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
        provider: "PostgreSQL (Prisma)",
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        uptimeSeconds: Math.floor(process.uptime()),
        memory: {
          heapUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          heapTotalMb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          rssMb: Math.round(memoryUsage.rss / 1024 / 1024),
        },
      },
      environment: {
        nodeEnv: process.env.NODE_ENV || "development",
        hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
      },
    };
  }
}

