import { db } from "@/lib/db";
import { AdminAuditService } from "@/modules/admin/admin-audit.service";

export interface PolicyDefinition {
  key: string;
  category: "CREDITS" | "SUBSCRIPTIONS" | "USAGE_LIMITS" | "COMMERCIALIZATION" | "GENERAL";
  label: string;
  description: string;
  dataType: "string" | "number" | "boolean" | "json";
  defaultValue: any;
  validation?: {
    min?: number;
    max?: number;
    options?: any[];
  };
}

export const DEFAULT_COMMERCIAL_POLICIES: PolicyDefinition[] = [
  // 1. CRÉDITOS
  {
    key: "CREDIT_MONTHLY_RESET_MODE",
    category: "CREDITS",
    label: "Política de Saldo Acumulado de Créditos",
    description: "Determina se os créditos da assinatura expiram no fim do ciclo ou acumulam.",
    dataType: "string",
    defaultValue: "ROLLOVER_NEVER",
    validation: {
      options: ["ROLLOVER_NEVER", "ROLLOVER_30_DAYS", "ACCUMULATE_CAPPED"],
    },
  },
  {
    key: "CREDIT_PURCHASE_ALLOWED",
    category: "CREDITS",
    label: "Permitir Compra de Créditos Adicionais",
    description: "Permite que estúdios comprem pacotes avulsos de créditos de IA fora da assinatura.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "CREDIT_REFUND_ON_FAILURE",
    category: "CREDITS",
    label: "Estorno Automático em Falhas de Geração",
    description: "Restaura os créditos reservados imediatamente se o provedor de IA falhar ou der timeout.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "CREDIT_ADMIN_MAX_GRANT",
    category: "CREDITS",
    label: "Limite Máximo de Concessão Manual Administrativa",
    description: "Número máximo de créditos de cortesia que um operador admin pode creditar por vez.",
    dataType: "number",
    defaultValue: 5000,
    validation: { min: 10, max: 100000 },
  },
  {
    key: "CREDIT_CONSUMPTION_ORDER",
    category: "CREDITS",
    label: "Ordem de Prioridade no Consumo de Créditos",
    description: "Define a sequência de dedução: créditos promocionais, da assinatura ou avulsos.",
    dataType: "json",
    defaultValue: ["PROMOTIONAL", "SUBSCRIPTION", "PURCHASED"],
  },
  {
    key: "PROMPT_DEFAULT_CREDIT_COST",
    category: "CREDITS",
    label: "Custo por Geração de Prompt (Créditos)",
    description: "Quantidade de créditos consumidos por cada geração padrão de prompt no motor de IA.",
    dataType: "number",
    defaultValue: 1,
    validation: { min: 0, max: 50 },
  },
  {
    key: "PROMPT_CINEMATIC_CREDIT_COST",
    category: "CREDITS",
    label: "Custo por Prompt Cinematográfico / Vídeo (Créditos)",
    description: "Custo em créditos para prompts de alta densidade técnica cinematográfica ou ferramentas de vídeo.",
    dataType: "number",
    defaultValue: 2,
    validation: { min: 0, max: 100 },
  },
  {
    key: "PROMPT_CONTINUITY_CREDIT_COST",
    category: "CREDITS",
    label: "Custo por Análise de Continuidade (Créditos)",
    description: "Custo em créditos para análise automatizada de continuidade e inconsistências entre cenas.",
    dataType: "number",
    defaultValue: 1,
    validation: { min: 0, max: 50 },
  },

  // 2. ASSINATURAS
  {
    key: "SUB_DEFAULT_TRIAL_DAYS",
    category: "SUBSCRIPTIONS",
    label: "Período de Teste Padrão (Dias)",
    description: "Duração padrão em dias de teste para novos planos pagos quando habilitado.",
    dataType: "number",
    defaultValue: 7,
    validation: { min: 0, max: 60 },
  },
  {
    key: "SUB_CANCEL_EFFECT",
    category: "SUBSCRIPTIONS",
    label: "Efeito do Cancelamento Solicitado",
    description: "Define se o cancelamento encerra o acesso no fim do período pago ou imediatamente.",
    dataType: "string",
    defaultValue: "PERIOD_END",
    validation: { options: ["PERIOD_END", "IMMEDIATE"] },
  },
  {
    key: "SUB_GRACE_PERIOD_DAYS",
    category: "SUBSCRIPTIONS",
    label: "Tolerância de Inadimplência (Dias de Carência)",
    description: "Prazo concedido para regularização do pagamento antes de restringir recursos.",
    dataType: "number",
    defaultValue: 3,
    validation: { min: 0, max: 30 },
  },
  {
    key: "SUB_DOWNGRADE_RESTRICTION_MODE",
    category: "SUBSCRIPTIONS",
    label: "Momento da Aplicação de Downgrade",
    description: "Se os limites inferiores passam a valer imediatamente ou na próxima renovação.",
    dataType: "string",
    defaultValue: "NEXT_CYCLE",
    validation: { options: ["NEXT_CYCLE", "IMMEDIATE"] },
  },
  {
    key: "SUB_GRANDFATHERING_DEFAULT",
    category: "SUBSCRIPTIONS",
    label: "Preservação de Preço para Assinantes Atuais (Grandfathering)",
    description: "Mantém os valores antigos para quem já assina quando o catálogo de planos for editado.",
    dataType: "boolean",
    defaultValue: true,
  },

  // 3. USO E LIMITES
  {
    key: "GLOBAL_MAX_CONCURRENT_JOBS",
    category: "USAGE_LIMITS",
    label: "Gerações Simultâneas Máximas por Workspace",
    description: "Teto global de concorrência para evitar saturação da API Gemini e custos abusivos.",
    dataType: "number",
    defaultValue: 5,
    validation: { min: 1, max: 20 },
  },
  {
    key: "GLOBAL_RATE_LIMIT_PER_MIN",
    category: "USAGE_LIMITS",
    label: "Limite Máximo de Requisições por Minuto",
    description: "Política global de rate limiting para chamadas de IA e renderização de prompts.",
    dataType: "number",
    defaultValue: 60,
    validation: { min: 5, max: 300 },
  },
  {
    key: "GLOBAL_MAX_INPUT_CHARS",
    category: "USAGE_LIMITS",
    label: "Tamanho Máximo de Contexto de Entrada (Caracteres)",
    description: "Limite de caracteres para descrições de bíblias visuais e roteiros enviados ao modelo.",
    dataType: "number",
    defaultValue: 25000,
    validation: { min: 1000, max: 100000 },
  },
  {
    key: "AI_MONTHLY_BUDGET_CAP_USD",
    category: "USAGE_LIMITS",
    label: "Teto Orçamentário de Segurança de IA ($ USD)",
    description: "Alerta administrativo caso o consumo global estimado ultrapasse este montante.",
    dataType: "number",
    defaultValue: 500,
    validation: { min: 50, max: 50000 },
  },

  // 4. COMERCIALIZAÇÃO
  {
    key: "DEFAULT_NEW_USER_PLAN",
    category: "COMMERCIALIZATION",
    label: "Plano Padrão para Novos Cadastros",
    description: "Plano atribuído automaticamente ao criar o primeiro workspace.",
    dataType: "string",
    defaultValue: "FREE",
    validation: { options: ["FREE", "PRO"] },
  },
  {
    key: "FREE_PLAN_ENABLED",
    category: "COMMERCIALIZATION",
    label: "Disponibilidade de Plano Gratuito",
    description: "Se novas contas podem utilizar a plataforma sem cadastrar cartão de crédito.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "ANNUAL_DISCOUNT_DEFAULT_PERCENT",
    category: "COMMERCIALIZATION",
    label: "Desconto Padrão no Ciclo Anual (%)",
    description: "Percentual de desconto visual sugerido para faturamento anual antecipado.",
    dataType: "number",
    defaultValue: 17,
    validation: { min: 0, max: 50 },
  },
  {
    key: "LIMIT_REACHED_UPGRADE_BANNER",
    category: "COMMERCIALIZATION",
    label: "Mensagem Padrão de Limite Atingido",
    description: "Texto exibido em modais e avisos quando o cliente atinge o teto do plano contratado.",
    dataType: "string",
    defaultValue: "Você atingiu o limite do seu plano. Faça upgrade para desbloquear mais estúdios, cenas e membros.",
  },
];

// Cache em memória com TTL de 60 segundos
let policiesCache: Record<string, any> | null = null;
let cacheExpiresAt = 0;
let isPoliciesSeeded = false;

export class BillingPolicyService {
  /**
   * Garante que todas as políticas padrão existam no banco de dados com uma única operação eficiente.
   */
  static async seedDefaultPolicies(): Promise<void> {
    if (isPoliciesSeeded) return;

    try {
      const existing = await db.commercialPolicy.findMany({
        select: { key: true },
      });
      const existingKeys = new Set(existing.map((e) => e.key));
      const toCreate = DEFAULT_COMMERCIAL_POLICIES.filter((p) => !existingKeys.has(p.key));

      if (toCreate.length > 0) {
        await db.commercialPolicy.createMany({
          data: toCreate.map((def) => ({
            key: def.key,
            category: def.category,
            label: def.label,
            description: def.description,
            dataType: def.dataType,
            value: def.defaultValue,
            defaultValue: def.defaultValue,
            validation: def.validation ? (def.validation as any) : undefined,
            isSystem: true,
          })),
          skipDuplicates: true,
        });
      }

      isPoliciesSeeded = true;
    } catch {
      // Falha não impeditiva se já estiver semeado
    }
  }

  /**
   * Limpa o cache local em memória.
   */
  static invalidateCache(): void {
    policiesCache = null;
    cacheExpiresAt = 0;
    isPoliciesSeeded = false;
  }

  /**
   * Retorna todas as políticas comerciais organizadas por categoria.
   */
  static async listAllPolicies() {
    await this.seedDefaultPolicies();

    const policies = await db.commercialPolicy.findMany({
      orderBy: [{ category: "asc" }, { key: "asc" }],
    });

    return policies;
  }

  /**
   * Retorna um mapa chave -> valor com cache de alto desempenho.
   */
  static async getPoliciesMap(): Promise<Record<string, any>> {
    const now = Date.now();
    if (policiesCache && cacheExpiresAt > now) {
      return policiesCache;
    }

    await this.seedDefaultPolicies();

    const policies = await db.commercialPolicy.findMany();
    const map: Record<string, any> = {};

    for (const p of policies) {
      map[p.key] = p.value;
    }

    policiesCache = map;
    cacheExpiresAt = now + 60000; // 60 segundos de TTL
    return map;
  }

  /**
   * Obtém o valor de uma política específica com valor de fallback seguro.
   */
  static async getPolicyValue<T>(key: string, fallback?: T): Promise<T> {
    const map = await this.getPoliciesMap();
    if (map[key] !== undefined) {
      return map[key] as T;
    }

    const defaultDef = DEFAULT_COMMERCIAL_POLICIES.find((p) => p.key === key);
    if (defaultDef) {
      return defaultDef.defaultValue as T;
    }

    return fallback as T;
  }

  /**
   * Atualiza o valor de uma política comercial declarativa com auditoria rigorosa.
   */
  static async updatePolicy(
    adminUserId: string,
    key: string,
    newValue: any,
    justification?: string,
    context?: { ip?: string; ua?: string }
  ) {
    const existing = await db.commercialPolicy.findUnique({
      where: { key },
    });

    if (!existing) {
      throw new Error(`Política comercial '${key}' não encontrada.`);
    }

    // Validações básicas de tipo
    if (existing.dataType === "number" && typeof newValue !== "number") {
      throw new Error(`O valor para ${key} deve ser um número.`);
    }
    if (existing.dataType === "boolean" && typeof newValue !== "boolean") {
      throw new Error(`O valor para ${key} deve ser verdadeiro ou falso.`);
    }

    const validation = existing.validation as any;
    if (validation) {
      if (typeof validation.min === "number" && newValue < validation.min) {
        throw new Error(`O valor mínimo permitido para ${key} é ${validation.min}.`);
      }
      if (typeof validation.max === "number" && newValue > validation.max) {
        throw new Error(`O valor máximo permitido para ${key} é ${validation.max}.`);
      }
      if (Array.isArray(validation.options) && !validation.options.includes(newValue)) {
        throw new Error(`O valor deve ser uma das opções: ${validation.options.join(", ")}`);
      }
    }

    const oldValue = existing.value;

    const updated = await db.commercialPolicy.update({
      where: { key },
      data: {
        value: newValue,
        updatedBy: adminUserId,
      },
    });

    this.invalidateCache();

    // Registra na trilha de auditoria administrativa
    await AdminAuditService.logAction({
      adminUserId,
      action: "COMMERCIAL_POLICY_UPDATE",
      targetType: "CommercialPolicy",
      targetId: key,
      result: "SUCCESS",
      details: {
        key,
        oldValue,
        newValue,
        justification: justification || "Ajuste operacional de regras comerciais.",
      },
      ipAddress: context?.ip,
      userAgent: context?.ua,
    });

    return updated;
  }
}
