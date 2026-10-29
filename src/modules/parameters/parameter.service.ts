import { db } from "@/lib/db";
import { Prisma, ParameterType, ParameterScope } from "@prisma/client";
import {
  ParameterDefinitionInput,
  UpdateParameterDefinitionInput,
} from "./parameter.schema";
import { ParameterResolver, TargetContext } from "./parameter-resolver.service";
import { VisualReferenceService } from "@/modules/visual-library/visual-reference.service";

// Cache em memória de definições de parâmetros com TTL de 5 minutos
interface ParameterCacheEntry {
  data: any[];
  expiresAt: number;
}
const parametersCache = new Map<string, ParameterCacheEntry>();
const PARAMETERS_CACHE_TTL_MS = 5 * 60 * 1000;
const defaultParametersCheckedWorkspaces = new Set<string>();

export class ParameterService {
  /**
   * Invalida o cache de parâmetros para um workspace específico ou globalmente.
   */
  static invalidateCache(workspaceId?: string) {
    if (workspaceId) {
      defaultParametersCheckedWorkspaces.delete(workspaceId);
      for (const key of parametersCache.keys()) {
        if (key.startsWith(`${workspaceId}:`)) {
          parametersCache.delete(key);
        }
      }
    } else {
      defaultParametersCheckedWorkspaces.clear();
      parametersCache.clear();
    }
  }

  /**
   * Garante a existência de parâmetros cinematográficos padrão do estúdio para o workspace.
   */
  static async ensureDefaultParameters(workspaceId: string) {
    // Se o workspace já foi verificado na memória de execução, evita round-trip desnecessário ao Supabase
    if (defaultParametersCheckedWorkspaces.has(workspaceId)) {
      return;
    }

    // Se o workspace já possui parâmetros configurados, evita reprocessar dezenas de queries a cada requisição
    const existingCount = await db.parameterDefinition.count({
      where: { workspaceId },
    });
    if (existingCount >= 10) {
      defaultParametersCheckedWorkspaces.add(workspaceId);
      return;
    }

    const defaultParams: Array<{
      key: string;
      label: string;
      description: string;
      type: ParameterType;
      scope: ParameterScope;
      required: boolean;
      defaultValue: unknown;
      options?: Array<{ value: string; label: string }>;
      order: number;
      promptMapping?: { target: string; instruction: string };
    }> = [
      {
        key: "formato_sensor_camera",
        label: "Formato do Sensor / Câmera",
        description: "Emula a profundidade de campo e campo de visão do sensor ótico.",
        type: "SELECT",
        scope: "GLOBAL",
        required: true,
        defaultValue: "full_frame_35mm",
        options: [
          { value: "full_frame_35mm", label: "Full Frame 35mm (Padrão Cinema)" },
          { value: "anamorfico_65mm", label: "Anamórfico 65mm (Épico / Scope)" },
          { value: "super_35", label: "Super 35mm (Cinematografia Clássica)" },
          { value: "imax_70mm", label: "IMAX 70mm (Altíssima Definição)" },
          { value: "vintage_16mm", label: "16mm Vintage / Analógico" },
        ],
        order: 1,
        promptMapping: {
          target: "visual_bible",
          instruction: "Definir ótica, textura e profundidade de campo de acordo com o sensor.",
        },
      },
      {
        key: "estilo_iluminacao",
        label: "Estilo de Iluminação Primária",
        description: "Direcionamento da luz dominante nas composições.",
        type: "SELECT",
        scope: "GLOBAL",
        required: false,
        defaultValue: "luz_natural_suave",
        options: [
          { value: "luz_natural_suave", label: "Luz Natural Suave (Soft Daylight)" },
          { value: "chiaroscuro_dramatico", label: "Chiaroscuro Dramático (Alto Contraste / Noir)" },
          { value: "golden_hour", label: "Golden Hour (Luz Dourada de Fim de Tarde)" },
          { value: "neon_cyberpunk", label: "Neon / Luzes Artificiais Coloridas" },
          { value: "hard_sunlight", label: "Sol Escaldante Direto (Luz Dura)" },
        ],
        order: 2,
        promptMapping: {
          target: "lighting",
          instruction: "Especificar temperatura e direcionamento da fonte de iluminação.",
        },
      },
      {
        key: "tipo_de_plano",
        label: "Tipo de Enquadramento / Plano",
        description: "Distância focal e escala do sujeito em relação ao quadro.",
        type: "SELECT",
        scope: "SCENE",
        required: true,
        defaultValue: "plano_medio",
        options: [
          { value: "extreme_close_up", label: "Plano Detalhe / Extreme Close-Up" },
          { value: "close_up", label: "Primeiro Plano / Close-Up Intenso" },
          { value: "plano_medio", label: "Plano Médio (Cintura para Cima)" },
          { value: "plano_geral", label: "Plano Geral / Wide Shot Estabelecedor" },
          { value: "extreme_wide", label: "Plano Muito Aberto / Paisagem Épica" },
          { value: "dutch_angle", label: "Plano Holandês / Dutch Angle Inclinado" },
        ],
        order: 3,
        promptMapping: {
          target: "camera",
          instruction: "Compor o enquadramento e escala da cena.",
        },
      },
      {
        key: "movimento_camera",
        label: "Movimento de Câmera",
        description: "Dinâmica do suporte de câmera durante o take.",
        type: "SELECT",
        scope: "SCENE",
        required: false,
        defaultValue: "estatica",
        options: [
          { value: "estatica", label: "Câmera Estática / Tripé" },
          { value: "pan_suave", label: "Panorâmica Lenta (Pan / Tilt)" },
          { value: "dolly_in", label: "Dolly In / Aproximação Gradual" },
          { value: "tracking_shot", label: "Travelling / Acompanhamento Lateral" },
          { value: "handheld_nervoso", label: "Handheld Orgânico / Câmera na Mão" },
          { value: "drone_aereo", label: "Drone / Voo Suave em Mergulho" },
        ],
        order: 4,
        promptMapping: {
          target: "camera",
          instruction: "Definir o dinamismo e direção de movimento do ponto de vista.",
        },
      },
      {
        key: "consistencia_rosto_figurino",
        label: "Instruções Específicas de Consistência",
        description: "Detalhes anatômicos e elementos inegociáveis de vestimenta.",
        type: "TEXTAREA",
        scope: "CHARACTER",
        required: false,
        defaultValue: "",
        order: 5,
        promptMapping: {
          target: "character_prompt",
          instruction: "Reforçar elementos de continuidade do personagem.",
        },
      },
      {
        key: "nivel_granulacao_pelicula",
        label: "Granulação de Película (0 a 100)",
        description: "Intensidade do ruído analógico de filme na imagem final.",
        type: "RANGE",
        scope: "OUTPUT",
        required: false,
        defaultValue: 25,
        order: 6,
        promptMapping: {
          target: "texture",
          instruction: "Adicionar granulação de filme 35mm analógico.",
        },
      },
      {
        key: "proibir_elementos_negativos",
        label: "Elementos Proibidos (Prompt Negativo)",
        description: "Artefatos, defeitos de IA ou clichês que nunca devem aparecer.",
        type: "TEXTAREA",
        scope: "OUTPUT",
        required: false,
        defaultValue: "deformed hands, extra limbs, bad anatomy, low quality, oversaturated cartoon",
        order: 7,
      },
    ];

    const existingList = await db.parameterDefinition.findMany({
      where: {
        workspaceId,
        key: { in: defaultParams.map((d) => d.key) },
      },
      select: { key: true },
    });
    const existingKeys = new Set(existingList.map((e) => e.key));

    const toCreate = defaultParams.filter((def) => !existingKeys.has(def.key));
    if (toCreate.length > 0) {
      await db.parameterDefinition.createMany({
        data: toCreate.map((def) => ({
          workspaceId,
          key: def.key,
          label: def.label,
          description: def.description,
          type: def.type,
          scope: def.scope,
          required: def.required,
          defaultValue: def.defaultValue as Prisma.InputJsonValue,
          options: (def.options || []) as Prisma.InputJsonValue,
          order: def.order,
          promptMapping: def.promptMapping ? (def.promptMapping as Prisma.InputJsonValue) : undefined,
          isSystem: true,
          enabled: true,
        })),
        skipDuplicates: true,
      });
      this.invalidateCache(workspaceId);
    }

    defaultParametersCheckedWorkspaces.add(workspaceId);

    // Sincroniza parâmetros cinematográficos com catálogo visual de referências
    try {
      await VisualReferenceService.syncDefaultVisualParameters(workspaceId);
    } catch (err) {
      console.error("Erro ao sincronizar parâmetros visuais padrão:", err);
    }
  }

  /**
   * Lista parâmetros do workspace com suporte a filtros e busca.
   */
  static async listParameters(
    workspaceId: string,
    filters?: {
      scope?: string;
      type?: string;
      search?: string;
      enabled?: boolean | "all";
    }
  ) {
    const isSearch = Boolean(filters?.search && filters.search.trim() !== "");
    const cacheKey = `${workspaceId}:${filters?.scope || "ALL"}:${filters?.type || "ALL"}:${filters?.enabled ?? "all"}`;

    if (!isSearch) {
      const cached = parametersCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.data;
      }
    }

    // Garante parâmetros básicos
    await this.ensureDefaultParameters(workspaceId);

    const searchConditions =
      filters?.search && filters.search.trim() !== ""
        ? [
            { label: { contains: filters.search.trim(), mode: "insensitive" as const } },
            { key: { contains: filters.search.trim(), mode: "insensitive" as const } },
            { description: { contains: filters.search.trim(), mode: "insensitive" as const } },
          ]
        : undefined;

    const where: Prisma.ParameterDefinitionWhereInput = {
      AND: [
        {
          OR: [{ workspaceId }, { workspaceId: null }],
        },
        ...(searchConditions ? [{ OR: searchConditions }] : []),
      ],
    };

    if (filters?.type && filters.type !== "ALL") {
      where.type = filters.type as ParameterType;
    }

    if (filters?.enabled !== undefined && filters.enabled !== "all") {
      where.enabled = filters.enabled === true;
    }

    const params = await db.parameterDefinition.findMany({
      where,
      orderBy: [
        { order: "asc" },
        { createdAt: "asc" },
      ],
    });

    // Chaves legadas/duplicadas ou geradas por suítes de teste que não devem poluir a listagem
    const LEGACY_OR_TEST_KEYS = new Set([
      "lente_perspectiva",
      "cor_gradacao_cinematografica",
      "angulo_camera",
      "composicao_cinematografica",
      "foco_tratamento_optico",
      "dinamica_movimento_cena",
      "atmosfera_clima",
    ]);
    const isTestOrLegacyKey = (key: string) =>
      LEGACY_OR_TEST_KEYS.has(key) ||
      key.startsWith("anamorphic_flare_streak_") ||
      key.startsWith("lut_color_grading_") ||
      key.startsWith("texture_noise_custom_") ||
      key.startsWith("param_hack_");

    // Deduplica por chave (e por rótulo normalizado), preferindo parâmetros locais do workspace sobre globais
    const deduplicatedMap = new Map<string, (typeof params)[0]>();
    for (const p of params) {
      if (isTestOrLegacyKey(p.key)) continue;
      const existing = deduplicatedMap.get(p.key);
      if (!existing) {
        deduplicatedMap.set(p.key, p);
      } else if (p.workspaceId === workspaceId && existing.workspaceId !== workspaceId) {
        deduplicatedMap.set(p.key, p);
      }
    }

    const seenLabels = new Set<string>();
    const deduplicatedParams: typeof params = [];
    for (const p of deduplicatedMap.values()) {
      const normLabel = (p.label || "").trim().toLowerCase();
      if (normLabel && seenLabels.has(normLabel)) continue;
      if (normLabel) seenLabels.add(normLabel);
      deduplicatedParams.push(p);
    }

    let result = deduplicatedParams;
    if (filters?.scope && filters.scope !== "ALL") {
      result = deduplicatedParams.filter((p) => {
        if (p.scope === filters.scope) return true;
        if (Array.isArray(p.scopes)) {
          const list = p.scopes as string[];
          return list.includes(filters.scope!) || list.includes("ALL");
        }
        return false;
      });
    }

    if (!isSearch) {
      parametersCache.set(cacheKey, {
        data: result,
        expiresAt: Date.now() + PARAMETERS_CACHE_TTL_MS,
      });
    }

    return result;
  }

  /**
   * Obtém uma definição de parâmetro por ID.
   */
  static async getParameterById(id: string, workspaceId: string) {
    return db.parameterDefinition.findFirst({
      where: {
        id,
        workspaceId,
      },
    });
  }

  /**
   * Cria uma nova definição de parâmetro customizado no workspace.
   */
  static async createParameter(workspaceId: string, input: ParameterDefinitionInput) {
    // Verificar se a chave já existe no mesmo workspace
    const existing = await db.parameterDefinition.findFirst({
      where: {
        workspaceId,
        key: input.key,
      },
    });

    if (existing) {
      throw new Error(`Já existe um parâmetro com a chave '${input.key}' neste workspace.`);
    }

    // Definir ordem automática se não fornecida
    const maxOrder = await db.parameterDefinition.aggregate({
      where: { workspaceId },
      _max: { order: true },
    });
    const nextOrder = (maxOrder._max.order ?? 0) + 1;

    const created = await db.parameterDefinition.create({
      data: {
        workspaceId,
        key: input.key,
        label: input.label,
        description: input.description ?? "",
        type: input.type,
        scope: input.scope,
        scopes: input.scopes !== undefined && input.scopes !== null ? (input.scopes as Prisma.InputJsonValue) : Prisma.JsonNull,
        required: input.required,
        defaultValue: input.defaultValue !== undefined ? (input.defaultValue as Prisma.InputJsonValue) : Prisma.JsonNull,
        options: input.options ? (input.options as Prisma.InputJsonValue) : Prisma.JsonNull,
        validationRules: input.validationRules ? (input.validationRules as Prisma.InputJsonValue) : Prisma.JsonNull,
        visibilityRules: input.visibilityRules ? (input.visibilityRules as Prisma.InputJsonValue) : Prisma.JsonNull,
        promptMapping: input.promptMapping ? (input.promptMapping as Prisma.InputJsonValue) : Prisma.JsonNull,
        order: input.order !== undefined && input.order > 0 ? input.order : nextOrder,
        enabled: input.enabled ?? true,
      },
    });

    this.invalidateCache(workspaceId);
    return created;
  }

  /**
   * Atualiza uma definição de parâmetro existente.
   */
  static async updateParameter(
    id: string,
    workspaceId: string,
    input: UpdateParameterDefinitionInput
  ) {
    const existing = await this.getParameterById(id, workspaceId);
    if (!existing) {
      throw new Error("Parâmetro não encontrado ou acesso não permitido.");
    }

    const data: Prisma.ParameterDefinitionUpdateInput = {};

    if (input.label !== undefined) data.label = input.label;
    if (input.description !== undefined) data.description = input.description;
    if (input.type !== undefined) data.type = input.type;
    if (input.scope !== undefined) data.scope = input.scope;
    if (input.scopes !== undefined) {
      data.scopes = input.scopes !== null ? (input.scopes as Prisma.InputJsonValue) : Prisma.JsonNull;
    }
    if (input.required !== undefined) data.required = input.required;
    if (input.defaultValue !== undefined) {
      data.defaultValue = input.defaultValue as Prisma.InputJsonValue;
    }
    if (input.options !== undefined) {
      data.options = input.options as Prisma.InputJsonValue;
    }
    if (input.validationRules !== undefined) {
      data.validationRules = input.validationRules as Prisma.InputJsonValue;
    }
    if (input.visibilityRules !== undefined) {
      data.visibilityRules = input.visibilityRules as Prisma.InputJsonValue;
    }
    if (input.promptMapping !== undefined) {
      data.promptMapping = input.promptMapping as Prisma.InputJsonValue;
    }
    if (input.order !== undefined) data.order = input.order;
    if (input.enabled !== undefined) data.enabled = input.enabled;

    const updated = await db.parameterDefinition.update({
      where: { id },
      data,
    });

    this.invalidateCache(workspaceId);
    return updated;
  }

  /**
   * Alterna estado ativo/inativo de um parâmetro.
   */
  static async toggleParameter(id: string, workspaceId: string) {
    const existing = await this.getParameterById(id, workspaceId);
    if (!existing) {
      throw new Error("Parâmetro não encontrado.");
    }

    const updated = await db.parameterDefinition.update({
      where: { id },
      data: {
        enabled: !existing.enabled,
      },
    });

    this.invalidateCache(workspaceId);
    return updated;
  }

  /**
   * Reordena múltiplos parâmetros salvando suas posições.
   */
  static async reorderParameters(workspaceId: string, orderedIds: string[]) {
    await db.$transaction(
      orderedIds.map((id, index) =>
        db.parameterDefinition.updateMany({
          where: { id, workspaceId },
          data: { order: index + 1 },
        })
      )
    );

    this.invalidateCache(workspaceId);
  }

  /**
   * Exclui uma definição de parâmetro.
   */
  static async deleteParameter(id: string, workspaceId: string) {
    const existing = await this.getParameterById(id, workspaceId);
    if (!existing) {
      throw new Error("Parâmetro não encontrado.");
    }

    if (existing.isSystem) {
      throw new Error("Parâmetros do sistema são fixos e não podem ser excluídos, apenas alterados.");
    }

    // Excluir valores associados antes
    await db.parameterValue.deleteMany({
      where: { parameterDefinitionId: id },
    });

    const deleted = await db.parameterDefinition.delete({
      where: { id },
    });

    this.invalidateCache(workspaceId);
    return deleted;
  }

  /**
   * Salva ou atualiza os valores de parâmetros atribuídos a um alvo (projeto, personagem, cena, etc.).
   */
  static async saveValues(
    projectId: string,
    workspaceId: string,
    values: Array<{
      parameterDefinitionId: string;
      targetType: "PROJECT" | "CHARACTER" | "ENVIRONMENT" | "SCENE" | "OUTPUT";
      targetId?: string | null;
      value: unknown;
    }>
  ) {
    // Validar se o projeto pertence ao workspace
    const project = await db.project.findFirst({
      where: { id: projectId, workspaceId },
    });
    if (!project) throw new Error("Projeto não encontrado.");

    const results = [];
    for (const item of values) {
      const existing = await db.parameterValue.findFirst({
        where: {
          projectId,
          parameterDefinitionId: item.parameterDefinitionId,
          targetType: item.targetType,
          targetId: item.targetId ?? null,
        },
      });

      if (existing) {
        const updated = await db.parameterValue.update({
          where: { id: existing.id },
          data: { value: item.value as Prisma.InputJsonValue },
        });
        results.push(updated);
      } else {
        const created = await db.parameterValue.create({
          data: {
            projectId,
            parameterDefinitionId: item.parameterDefinitionId,
            targetType: item.targetType,
            targetId: item.targetId ?? null,
            value: item.value as Prisma.InputJsonValue,
          },
        });
        results.push(created);
      }
    }

    return results;
  }

  /**
   * Resolve e valida todos os parâmetros aplicáveis para um contexto no projeto.
   */
  static async resolveForProject(
    projectId: string,
    workspaceId: string,
    target: TargetContext
  ) {
    // 1. Obter definições ativas do workspace (utilizando cache em memória)
    const definitions = await this.listParameters(workspaceId, { enabled: true });

    // 2. Filtrar apenas os parâmetros habilitados na configuração do projeto (Etapas 3 e 4)
    const project = await db.project.findFirst({
      where: { id: projectId, workspaceId },
      select: { configuration: true },
    });
    const config = (project?.configuration as any) || {};
    const settings = config.parameterSettings;

    let activeDefs = definitions;
    if (settings && Array.isArray(settings.enabledParameterKeys)) {
      const allowedSet = new Set(settings.enabledParameterKeys);
      activeDefs = definitions.filter((d) => allowedSet.has(d.key));
    }

    // 3. Obter todos os valores gravados no projeto
    const allProjectValues = await db.parameterValue.findMany({
      where: { projectId },
    });

    // 4. Executar o motor de resolução com precedência estrita
    return ParameterResolver.resolveForTarget(activeDefs, allProjectValues, target);
  }
}
