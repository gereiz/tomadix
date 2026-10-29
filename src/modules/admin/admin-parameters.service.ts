import { db } from "@/lib/db";
import { Prisma, ParameterType, ParameterScope } from "@prisma/client";
import { AdminAuditService } from "./admin-audit.service";
import { ParameterService } from "@/modules/parameters/parameter.service";
import { AuthorizationError, AuthenticationError } from "@/lib/auth";
import {
  CINEMATIC_CATEGORIES,
  CINEMATIC_PARAM_DEFINITIONS,
} from "@/modules/projects/project-parameter-config.service";
import {
  ProjectCinematicCategoryKey,
  ProjectCinematicCategory,
} from "@/modules/projects/project-parameter-config.types";
import { VISUAL_REFERENCE_OPTIONS } from "@/modules/visual-library/visual-reference.catalog";

export interface AdminParameterMetrics {
  totalParameters: number;
  activeParameters: number;
  inactiveParameters: number;
  systemParameters: number;
  customParameters: number;
  categoriesCount: number;
  visualCoverageCount: number;
  visualCoveragePercent: number;
  totalValuesInProjects: number;
}

export interface AdminParameterListItem {
  id: string;
  workspaceId: string | null;
  key: string;
  label: string;
  description: string | null;
  type: ParameterType;
  scope: ParameterScope;
  scopes: string[] | null;
  required: boolean;
  defaultValue: unknown;
  options: Array<{
    value: string;
    label: string;
    description?: string;
    imageUrl?: string | null;
    whatToLookFor?: string | null;
    comparisonNotes?: string | null;
  }> | null;
  category: ProjectCinematicCategoryKey;
  categoryName: string;
  categoryIcon: string;
  isSystem: boolean;
  enabled: boolean;
  order: number;
  usageCount: number;
  hasVisualRef: boolean;
  promptMapping: any;
  validationRules: any;
  visibilityRules: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAdminParameterInput {
  key: string;
  label: string;
  description?: string;
  type: ParameterType;
  category: ProjectCinematicCategoryKey;
  scope?: ParameterScope;
  scopes?: string[];
  required?: boolean;
  defaultValue?: unknown;
  options?: Array<{
    value: string;
    label: string;
    description?: string;
    imageUrl?: string | null;
    whatToLookFor?: string | null;
    comparisonNotes?: string | null;
  }>;
  validationRules?: any;
  visibilityRules?: any;
  promptMapping?: {
    target?: string;
    instruction?: string;
    category?: string;
    prefix?: string;
    suffix?: string;
  };
  order?: number;
  enabled?: boolean;
}

export interface UpdateAdminParameterInput {
  label?: string;
  description?: string;
  type?: ParameterType;
  category?: ProjectCinematicCategoryKey;
  scope?: ParameterScope;
  scopes?: string[];
  required?: boolean;
  defaultValue?: unknown;
  options?: Array<{
    value: string;
    label: string;
    description?: string;
    imageUrl?: string | null;
    whatToLookFor?: string | null;
    comparisonNotes?: string | null;
  }>;
  validationRules?: any;
  visibilityRules?: any;
  promptMapping?: {
    target?: string;
    instruction?: string;
    category?: string;
    prefix?: string;
    suffix?: string;
  };
  order?: number;
  enabled?: boolean;
}

export interface RequestMetadata {
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Resolve a categoria cinematográfica canônica de um parâmetro.
 */
export function resolveParameterCategory(param: {
  key: string;
  promptMapping?: any;
}): ProjectCinematicCategory {
  const pm = param.promptMapping as any;
  const declaredCatKey = pm?.category as ProjectCinematicCategoryKey | undefined;

  if (declaredCatKey) {
    const found = CINEMATIC_CATEGORIES.find((c) => c.id === declaredCatKey);
    if (found) return found;
  }

  // Fallback por mapeamento de chaves conhecidas
  for (const cat of CINEMATIC_CATEGORIES) {
    if (cat.parameterKeys.includes(param.key)) {
      return cat;
    }
  }

  // Fallback padrão se não catalogado
  return {
    id: "AESTHETICS",
    name: "Estética & Visual Style",
    icon: "🎨",
    description: "Parâmetros estéticos e direcionamento visual complementar.",
    order: 6,
    parameterKeys: [],
  };
}

export class AdminParametersService {
  /**
   * Obtém métricas globais sobre os parâmetros da plataforma.
   */
  static async getGlobalMetrics(): Promise<AdminParameterMetrics> {
    const [allParams, totalValues] = await Promise.all([
      db.parameterDefinition.findMany({
        select: {
          id: true,
          key: true,
          isSystem: true,
          enabled: true,
          options: true,
          promptMapping: true,
        },
      }),
      db.parameterValue.count(),
    ]);

    // Deduplica por key para contar o catálogo de conceitos únicos da plataforma
    const uniqueKeysMap = new Map<string, (typeof allParams)[0]>();
    for (const p of allParams) {
      if (!uniqueKeysMap.has(p.key) || p.isSystem) {
        uniqueKeysMap.set(p.key, p);
      }
    }

    const uniqueParams = Array.from(uniqueKeysMap.values());
    const totalParameters = uniqueParams.length;
    const activeParameters = uniqueParams.filter((p) => p.enabled).length;
    const inactiveParameters = totalParameters - activeParameters;
    const systemParameters = uniqueParams.filter((p) => p.isSystem).length;
    const customParameters = totalParameters - systemParameters;

    // Categorias com parâmetros
    const categoriesWithParams = new Set<string>();
    let visualCoverageCount = 0;

    for (const p of uniqueParams) {
      const cat = resolveParameterCategory(p);
      categoriesWithParams.add(cat.id);

      const opts = (p.options as any[]) || [];
      const hasVisual = opts.some(
        (o) => o?.imageUrl || o?.whatToLookFor || o?.comparisonNotes
      );
      if (hasVisual) {
        visualCoverageCount++;
      }
    }

    const visualCoveragePercent =
      totalParameters > 0
        ? Math.round((visualCoverageCount / totalParameters) * 100)
        : 0;

    return {
      totalParameters,
      activeParameters,
      inactiveParameters,
      systemParameters,
      customParameters,
      categoriesCount: categoriesWithParams.size || CINEMATIC_CATEGORIES.length,
      visualCoverageCount,
      visualCoveragePercent,
      totalValuesInProjects: totalValues,
    };
  }

  /**
   * Lista todos os parâmetros para a visão administrativa da plataforma,
   * com suporte a filtros, busca e enriquecimento contextual.
   */
  static async listGlobalParameters(filters?: {
    category?: string;
    scope?: string;
    type?: string;
    status?: "all" | "active" | "inactive";
    isSystem?: "all" | "system" | "custom";
    search?: string;
  }): Promise<{
    parameters: AdminParameterListItem[];
    total: number;
    categories: ProjectCinematicCategory[];
  }> {
    const where: Prisma.ParameterDefinitionWhereInput = {};

    if (filters?.type && filters.type !== "ALL") {
      where.type = filters.type as ParameterType;
    }

    if (filters?.status === "active") {
      where.enabled = true;
    } else if (filters?.status === "inactive") {
      where.enabled = false;
    }

    if (filters?.isSystem === "system") {
      where.isSystem = true;
    } else if (filters?.isSystem === "custom") {
      where.isSystem = false;
    }

    if (filters?.search && filters.search.trim()) {
      const term = filters.search.trim();
      where.OR = [
        { label: { contains: term, mode: "insensitive" } },
        { key: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
      ];
    }

    const rawParams = await db.parameterDefinition.findMany({
      where,
      orderBy: [{ order: "asc" }, { key: "asc" }],
      include: {
        _count: {
          select: { values: true },
        },
      },
    });

    // Deduplica por chave se houver cópias em workspaces diferentes, priorizando parâmetros globais (workspaceId: null)
    // ou com maior número de usos
    const deduplicatedMap = new Map<string, (typeof rawParams)[0]>();
    for (const p of rawParams) {
      const existing = deduplicatedMap.get(p.key);
      if (!existing) {
        deduplicatedMap.set(p.key, p);
      } else {
        // Prioriza global (workspaceId === null) ou isSystem === true
        if (!p.workspaceId || (!existing.isSystem && p.isSystem)) {
          deduplicatedMap.set(p.key, p);
        }
      }
    }

    let items: AdminParameterListItem[] = Array.from(
      deduplicatedMap.values()
    ).map((p) => {
      const cat = resolveParameterCategory(p);
      const options = (p.options as any[]) || [];
      const hasVisualRef = options.some(
        (o) => o?.imageUrl || o?.whatToLookFor || o?.comparisonNotes
      );

      return {
        id: p.id,
        workspaceId: p.workspaceId,
        key: p.key,
        label: p.label,
        description: p.description,
        type: p.type,
        scope: p.scope,
        scopes: (p.scopes as string[]) || [p.scope],
        required: p.required,
        defaultValue: p.defaultValue,
        options,
        category: cat.id,
        categoryName: cat.name,
        categoryIcon: cat.icon,
        isSystem: p.isSystem,
        enabled: p.enabled,
        order: p.order,
        usageCount: p._count.values,
        hasVisualRef,
        promptMapping: p.promptMapping,
        validationRules: p.validationRules,
        visibilityRules: p.visibilityRules,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      };
    });

    // Filtro por escopo pós-processado para suportar múltiplos escopos em JSON
    if (filters?.scope && filters.scope !== "ALL") {
      items = items.filter((p) => {
        if (p.scope === filters.scope) return true;
        if (Array.isArray(p.scopes)) {
          return p.scopes.includes(filters.scope!) || p.scopes.includes("ALL");
        }
        return false;
      });
    }

    // Filtro por categoria cinematográfica
    if (filters?.category && filters.category !== "ALL") {
      items = items.filter((p) => p.category === filters.category);
    }

    return {
      parameters: items,
      total: items.length,
      categories: CINEMATIC_CATEGORIES,
    };
  }

  /**
   * Valida se o usuário executor possui papel administrativo na plataforma.
   */
  private static async assertAdmin(userId: string) {
    if (!userId) {
      throw new AuthenticationError("ID do usuário executor não fornecido.");
    }
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { platformRole: true, email: true },
    });
    if (!user) {
      throw new AuthenticationError("Usuário executor não encontrado no banco de dados.");
    }
    const envAdminEmails = (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    const isRoleAdmin = user.platformRole === "ADMIN" || user.platformRole === "SUPER_ADMIN";
    const isEnvAdmin = Boolean(user.email && envAdminEmails.includes(user.email.toLowerCase()));

    if (!isRoleAdmin && !isEnvAdmin) {
      throw new AuthorizationError(
        "Acesso restrito. Este recurso requer privilégios de administrador da plataforma."
      );
    }
  }

  /**
   * Cria um novo parâmetro no catálogo global da plataforma.
   */
  static async createGlobalParameter(
    input: CreateAdminParameterInput,
    adminUserId: string,
    metadata?: RequestMetadata
  ): Promise<AdminParameterListItem> {
    await this.assertAdmin(adminUserId);

    // 1. Validação de chave snake_case
    const cleanKey = input.key.trim().toLowerCase();
    if (!/^[a-z][a-z0-9_]{1,63}$/.test(cleanKey)) {
      throw new Error(
        "A chave deve conter apenas letras minúsculas, números e sublinhados (snake_case), começando por letra."
      );
    }

    // 2. Verificar se a chave já existe no catálogo
    const existing = await db.parameterDefinition.findFirst({
      where: { key: cleanKey },
    });
    if (existing) {
      throw new Error(`A chave '${cleanKey}' já está em uso por outro parâmetro na plataforma.`);
    }

    // 3. Ordem automática
    let order = input.order;
    if (order === undefined || order <= 0) {
      const maxOrder = await db.parameterDefinition.aggregate({
        _max: { order: true },
      });
      order = (maxOrder._max.order ?? 0) + 1;
    }

    // 4. Preparar promptMapping com categoria
    const promptMapping = {
      ...(input.promptMapping || {}),
      category: input.category,
      target: input.promptMapping?.target || "visual_bible",
      instruction:
        input.promptMapping?.instruction ||
        `Aplicar parâmetro ${input.label} no estilo visual.`,
    };

    // 5. Enriquecer opções com referências visuais se disponíveis
    const enrichedOptions = (input.options || []).map((opt) => {
      const visualMatch = VISUAL_REFERENCE_OPTIONS.find((v) => v.value === opt.value);
      return {
        value: opt.value,
        label: opt.label,
        description: opt.description || visualMatch?.description || "",
        imageUrl: opt.imageUrl || visualMatch?.imageUrl || null,
        whatToLookFor: opt.whatToLookFor || visualMatch?.whatToLookFor || null,
        comparisonNotes: opt.comparisonNotes || visualMatch?.comparisonNotes || null,
      };
    });

    const primaryScope = input.scope || "GLOBAL";
    const scopesList =
      input.scopes && input.scopes.length > 0 ? input.scopes : [primaryScope];

    // 6. Criar como parâmetro global (workspaceId: null)
    const created = await db.parameterDefinition.create({
      data: {
        workspaceId: null,
        key: cleanKey,
        label: input.label.trim(),
        description: input.description?.trim() || null,
        type: input.type,
        scope: primaryScope,
        scopes: scopesList as Prisma.InputJsonValue,
        required: Boolean(input.required),
        defaultValue:
          input.defaultValue !== undefined
            ? (input.defaultValue as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        options:
          enrichedOptions.length > 0
            ? (enrichedOptions as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        validationRules: input.validationRules
          ? (input.validationRules as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        visibilityRules: input.visibilityRules
          ? (input.visibilityRules as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        promptMapping: promptMapping as Prisma.InputJsonValue,
        order,
        isSystem: false,
        enabled: input.enabled ?? true,
      },
    });

    // 7. Auditoria administrativa
    await AdminAuditService.logAction({
      adminUserId,
      action: "CREATE_GLOBAL_PARAMETER",
      targetType: "PARAMETER_DEFINITION",
      targetId: created.id,
      details: {
        key: created.key,
        label: created.label,
        category: input.category,
        type: created.type,
      },
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    });

    ParameterService.invalidateCache();

    const cat = resolveParameterCategory(created);
    return {
      id: created.id,
      workspaceId: created.workspaceId,
      key: created.key,
      label: created.label,
      description: created.description,
      type: created.type,
      scope: created.scope,
      scopes: scopesList,
      required: created.required,
      defaultValue: created.defaultValue,
      options: enrichedOptions,
      category: cat.id,
      categoryName: cat.name,
      categoryIcon: cat.icon,
      isSystem: created.isSystem,
      enabled: created.enabled,
      order: created.order,
      usageCount: 0,
      hasVisualRef: enrichedOptions.some((o) => o.imageUrl),
      promptMapping: created.promptMapping,
      validationRules: created.validationRules,
      visibilityRules: created.visibilityRules,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };
  }

  /**
   * Atualiza uma definição de parâmetro existente.
   */
  static async updateGlobalParameter(
    id: string,
    input: UpdateAdminParameterInput,
    adminUserId: string,
    metadata?: RequestMetadata
  ): Promise<AdminParameterListItem> {
    await this.assertAdmin(adminUserId);

    const existing = await db.parameterDefinition.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new Error("Parâmetro não encontrado no catálogo da plataforma.");
    }

    const data: Prisma.ParameterDefinitionUpdateInput = {};

    if (input.label !== undefined) data.label = input.label.trim();
    if (input.description !== undefined) data.description = input.description?.trim() || null;
    if (input.type !== undefined) data.type = input.type;
    if (input.scope !== undefined) data.scope = input.scope;
    if (input.scopes !== undefined) {
      data.scopes = input.scopes as Prisma.InputJsonValue;
    }
    if (input.required !== undefined) data.required = input.required;
    if (input.defaultValue !== undefined) {
      data.defaultValue =
        input.defaultValue !== null
          ? (input.defaultValue as Prisma.InputJsonValue)
          : Prisma.JsonNull;
    }
    if (input.options !== undefined) {
      data.options =
        input.options && input.options.length > 0
          ? (input.options as Prisma.InputJsonValue)
          : Prisma.JsonNull;
    }
    if (input.validationRules !== undefined) {
      data.validationRules =
        input.validationRules !== null
          ? (input.validationRules as Prisma.InputJsonValue)
          : Prisma.JsonNull;
    }
    if (input.visibilityRules !== undefined) {
      data.visibilityRules =
        input.visibilityRules !== null
          ? (input.visibilityRules as Prisma.InputJsonValue)
          : Prisma.JsonNull;
    }

    // Atualização de categoria e promptMapping
    if (input.promptMapping !== undefined || input.category !== undefined) {
      const existingPm = (existing.promptMapping as any) || {};
      const newPm = {
        ...existingPm,
        ...(input.promptMapping || {}),
      };
      if (input.category) {
        newPm.category = input.category;
      }
      data.promptMapping = newPm as Prisma.InputJsonValue;
    }

    if (input.order !== undefined) data.order = input.order;
    if (input.enabled !== undefined) data.enabled = input.enabled;

    const updated = await db.parameterDefinition.update({
      where: { id },
      data,
      include: {
        _count: {
          select: { values: true },
        },
      },
    });

    // Auditoria
    await AdminAuditService.logAction({
      adminUserId,
      action: "UPDATE_GLOBAL_PARAMETER",
      targetType: "PARAMETER_DEFINITION",
      targetId: id,
      details: {
        key: updated.key,
        updatedFields: Object.keys(data),
      },
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    });

    ParameterService.invalidateCache();

    const cat = resolveParameterCategory(updated);
    const options = (updated.options as any[]) || [];

    return {
      id: updated.id,
      workspaceId: updated.workspaceId,
      key: updated.key,
      label: updated.label,
      description: updated.description,
      type: updated.type,
      scope: updated.scope,
      scopes: (updated.scopes as string[]) || [updated.scope],
      required: updated.required,
      defaultValue: updated.defaultValue,
      options,
      category: cat.id,
      categoryName: cat.name,
      categoryIcon: cat.icon,
      isSystem: updated.isSystem,
      enabled: updated.enabled,
      order: updated.order,
      usageCount: updated._count.values,
      hasVisualRef: options.some((o) => o?.imageUrl),
      promptMapping: updated.promptMapping,
      validationRules: updated.validationRules,
      visibilityRules: updated.visibilityRules,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Alterna rapidamente a ativação global de um parâmetro.
   */
  static async toggleGlobalParameter(
    id: string,
    enabledStateOrAdminUserId?: boolean | string,
    adminUserIdMaybe?: string,
    metadata?: RequestMetadata
  ): Promise<{ id: string; key: string; enabled: boolean }> {
    let effectiveEnabled: boolean | undefined = undefined;
    let effectiveAdminUserId = "";

    if (typeof enabledStateOrAdminUserId === "string") {
      effectiveAdminUserId = enabledStateOrAdminUserId;
      effectiveEnabled = undefined;
    } else {
      effectiveEnabled = enabledStateOrAdminUserId;
      effectiveAdminUserId = adminUserIdMaybe || "";
    }

    await this.assertAdmin(effectiveAdminUserId);

    const existing = await db.parameterDefinition.findUnique({
      where: { id },
      select: { id: true, key: true, enabled: true },
    });
    if (!existing) {
      throw new Error("Parâmetro não encontrado.");
    }

    const nextState = effectiveEnabled !== undefined ? effectiveEnabled : !existing.enabled;

    const updated = await db.parameterDefinition.update({
      where: { id },
      data: { enabled: nextState },
    });

    await AdminAuditService.logAction({
      adminUserId: effectiveAdminUserId,
      action: "TOGGLE_GLOBAL_PARAMETER",
      targetType: "PARAMETER_DEFINITION",
      targetId: id,
      details: { key: existing.key, enabled: nextState },
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    });

    ParameterService.invalidateCache();

    return {
      id: updated.id,
      key: updated.key,
      enabled: updated.enabled,
    };
  }

  /**
   * Exclusão segura de parâmetro:
   * 1. Bloqueia parâmetros de sistema (isSystem: true).
   * 2. Bloqueia se houver projetos usando o parâmetro (ParameterValue count > 0) para evitar quebrar snapshots.
   */
  static async deleteGlobalParameter(
    id: string,
    adminUserId: string,
    metadata?: RequestMetadata
  ): Promise<{ deleted: boolean; message: string }> {
    await this.assertAdmin(adminUserId);

    const existing = await db.parameterDefinition.findUnique({
      where: { id },
      include: {
        _count: {
          select: { values: true },
        },
      },
    });

    if (!existing) {
      throw new Error("Parâmetro não encontrado para exclusão.");
    }

    if (existing.isSystem) {
      throw new Error(
        "Parâmetros nativos do sistema são protegidos contra exclusão física. Você pode desativá-los com segurança para ocultá-los de novos projetos."
      );
    }

    if (existing._count.values > 0) {
      throw new Error(
        `Não é permitido excluir este parâmetro pois ele está em uso por ${existing._count.values} projeto(s). Desative-o para preservar a integridade histórica dos projetos cinematográficos.`
      );
    }

    await db.parameterDefinition.delete({
      where: { id },
    });

    await AdminAuditService.logAction({
      adminUserId,
      action: "DELETE_GLOBAL_PARAMETER",
      targetType: "PARAMETER_DEFINITION",
      targetId: id,
      details: { key: existing.key, label: existing.label },
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    });

    ParameterService.invalidateCache();

    return {
      deleted: true,
      message: `Parâmetro '${existing.label}' removido com sucesso.`,
    };
  }

  /**
   * Sincroniza e repara as 9 categorias cinematográficas mestre no catálogo da plataforma.
   */
  static async syncDefaultCinematicParameters(
    adminUserId: string,
    metadata?: RequestMetadata
  ): Promise<{ syncedCount: number; message: string }> {
    let syncedCount = 0;
    const keys = CINEMATIC_PARAM_DEFINITIONS.map((d) => d.key);
    const existingList = await db.parameterDefinition.findMany({
      where: {
        key: { in: keys },
        workspaceId: null,
      },
      select: { id: true, key: true },
    });
    const existingMap = new Map(existingList.map((e) => [e.key, e.id]));

    const toCreate: Prisma.ParameterDefinitionCreateManyInput[] = [];
    const updatePromises: Promise<any>[] = [];

    for (const def of CINEMATIC_PARAM_DEFINITIONS) {
      // Enriquecer opções com catálogo de referências visuais
      const enrichedOptions = (def.options || []).map((opt) => {
        const visualMatch = VISUAL_REFERENCE_OPTIONS.find((v) => v.value === opt.value);
        return {
          value: opt.value,
          label: opt.label,
          description: opt.description || visualMatch?.description || "",
          imageUrl: visualMatch?.imageUrl || null,
          whatToLookFor: visualMatch?.whatToLookFor || null,
          comparisonNotes: visualMatch?.comparisonNotes || null,
        };
      });

      const promptMapping = {
        ...(def.promptMapping || {}),
        category: def.category,
      };

      const existingId = existingMap.get(def.key);

      if (!existingId) {
        toCreate.push({
          workspaceId: null,
          key: def.key,
          label: def.label,
          description: def.description,
          type: def.type,
          scope: def.scope,
          scopes: [def.scope] as Prisma.InputJsonValue,
          required: def.required,
          defaultValue: def.defaultValue as Prisma.InputJsonValue,
          options: enrichedOptions as Prisma.InputJsonValue,
          order: def.order,
          promptMapping: promptMapping as Prisma.InputJsonValue,
          isSystem: true,
          enabled: true,
        });
      } else {
        updatePromises.push(
          db.parameterDefinition.update({
            where: { id: existingId },
            data: {
              label: def.label,
              description: def.description,
              isSystem: true,
              options: enrichedOptions as Prisma.InputJsonValue,
              promptMapping: promptMapping as Prisma.InputJsonValue,
            },
          })
        );
      }
    }

    if (toCreate.length > 0) {
      await db.parameterDefinition.createMany({
        data: toCreate,
        skipDuplicates: true,
      });
      syncedCount += toCreate.length;
    }

    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
      syncedCount += updatePromises.length;
    }

    await AdminAuditService.logAction({
      adminUserId,
      action: "SYNC_SYSTEM_PARAMETERS",
      targetType: "PARAMETER_DEFINITION",
      targetId: "GLOBAL_CATALOG",
      details: { syncedCount },
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    });

    ParameterService.invalidateCache();

    return {
      syncedCount,
      message: `${syncedCount} parâmetros cinematográficos sincronizados com sucesso nas 9 categorias mestre.`,
    };
  }
}
