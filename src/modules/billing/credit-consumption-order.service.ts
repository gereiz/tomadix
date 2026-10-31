import { db } from "@/lib/db";
import { CreditLot, CreditOrigin } from "@prisma/client";

export type ConsumptionCategory =
  | "DAILY_NON_ACCUMULATIVE"
  | "PROMOTIONAL"
  | "DAILY_ACCUMULATIVE"
  | "MONTHLY_RENEWAL"
  | "ADHESION"
  | "PURCHASED"
  | "ADMIN_OVERRIDE"
  | "REFUND"
  | "LEGACY";

export const DEFAULT_CONSUMPTION_ORDER: ConsumptionCategory[] = [
  "DAILY_NON_ACCUMULATIVE",
  "PROMOTIONAL",
  "DAILY_ACCUMULATIVE",
  "MONTHLY_RENEWAL",
  "ADHESION",
  "PURCHASED",
  "ADMIN_OVERRIDE",
  "REFUND",
  "LEGACY",
];

export interface ConsumptionCategoryInfo {
  category: ConsumptionCategory;
  label: string;
  description: string;
  isProtected: boolean;
}

export const CONSUMPTION_CATEGORIES_METADATA: Record<ConsumptionCategory, { label: string; description: string }> = {
  DAILY_NON_ACCUMULATIVE: {
    label: "Créditos Diários Não-Acumulativos",
    description: "Créditos diários com expiração no final do ciclo diário. Consumidos primeiro para evitar perda.",
  },
  PROMOTIONAL: {
    label: "Créditos Promocionais / Bônus",
    description: "Créditos concedidos em campanhas, vouchers ou ações promocionais temporárias.",
  },
  DAILY_ACCUMULATIVE: {
    label: "Créditos Diários Acumulativos",
    description: "Créditos concedidos diariamente que permanecem disponíveis até uso ou validade do plano.",
  },
  MONTHLY_RENEWAL: {
    label: "Créditos Mensais de Ciclo",
    description: "Créditos recorrentes concedidos na data de renovação da assinatura mensal.",
  },
  ADHESION: {
    label: "Créditos de Adesão",
    description: "Créditos de boas-vindas creditados uma única vez na contratação do plano.",
  },
  PURCHASED: {
    label: "Créditos Avulsos Adquiridos",
    description: "Créditos pagos avulsos comprados pelo usuário fora do plano mensal.",
  },
  ADMIN_OVERRIDE: {
    label: "Créditos Administrativos / Cortesia",
    description: "Créditos inseridos manualmente por administradores da plataforma com justificativa.",
  },
  REFUND: {
    label: "Créditos de Estorno",
    description: "Créditos devolvidos por falha operacional de IA ou cancelamento de lote anterior.",
  },
  LEGACY: {
    label: "Créditos Migrados (Legado)",
    description: "Saldos pré-existentes na plataforma antes da implantação da arquitetura de lotes.",
  },
};

export class CreditConsumptionOrderService {
  /**
   * Identifica a categoria de consumo de um lote considerando sua origem e acumulação.
   */
  static categorizeLot(lot: CreditLot): ConsumptionCategory {
    if (lot.origin === CreditOrigin.DAILY_RENEWAL) {
      return lot.isAccumulative ? "DAILY_ACCUMULATIVE" : "DAILY_NON_ACCUMULATIVE";
    }
    return lot.origin as ConsumptionCategory;
  }

  /**
   * Obtém a configuração global ativa de ordem de consumo. Se não existir, inicializa com o padrão oficial.
   */
  static async getActiveConfig() {
    let config = await db.creditConsumptionConfig.findFirst({
      orderBy: { version: "desc" },
    });

    if (!config) {
      config = await db.creditConsumptionConfig.create({
        data: {
          version: 1,
          categoryPriorities: DEFAULT_CONSUMPTION_ORDER,
          protectedCategories: [],
          description: "Configuração padrão inicial do sistema de prioridade de consumo",
        },
      });
    }

    const categoryPriorities = (config.categoryPriorities as ConsumptionCategory[]) || DEFAULT_CONSUMPTION_ORDER;
    const protectedCategories = (config.protectedCategories as ConsumptionCategory[]) || [];

    return {
      id: config.id,
      version: config.version,
      categoryPriorities,
      protectedCategories,
      updatedAt: config.updatedAt,
      updatedByUserId: config.updatedByUserId,
    };
  }

  /**
   * Atualiza a ordem global de consumo e categorias protegidas pelo administrador com versionamento.
   */
  static async updateConfig(params: {
    categoryPriorities: ConsumptionCategory[];
    protectedCategories?: ConsumptionCategory[];
    description?: string;
    adminUserId?: string;
  }) {
    const current = await this.getActiveConfig();
    const newVersion = current.version + 1;

    // Garantir que todas as categorias válidas estejam presentes na lista sem duplicidades
    const incomingSet = new Set(params.categoryPriorities);
    const completeList: ConsumptionCategory[] = [...params.categoryPriorities];

    for (const cat of DEFAULT_CONSUMPTION_ORDER) {
      if (!incomingSet.has(cat)) {
        completeList.push(cat);
      }
    }

    const created = await db.creditConsumptionConfig.create({
      data: {
        version: newVersion,
        categoryPriorities: completeList,
        protectedCategories: params.protectedCategories || [],
        description: params.description || `Atualização administrativa de prioridades v${newVersion}`,
        updatedByUserId: params.adminUserId || null,
      },
    });

    return {
      version: created.version,
      categoryPriorities: created.categoryPriorities as ConsumptionCategory[],
      protectedCategories: (created.protectedCategories as ConsumptionCategory[]) || [],
      updatedAt: created.updatedAt,
    };
  }

  /**
   * Restaura a ordem padrão oficial recomendada.
   */
  static async resetToDefault(adminUserId?: string) {
    return this.updateConfig({
      categoryPriorities: DEFAULT_CONSUMPTION_ORDER,
      protectedCategories: [],
      description: "Restauração da ordem padrão oficial de consumo",
      adminUserId,
    });
  }

  /**
   * Ordena uma lista de lotes segundo a ordem de categorias configurada e o critério interno FEFO.
   */
  static sortLotsForConsumption(
    lots: CreditLot[],
    categoryPriorities: ConsumptionCategory[],
    protectedCategories: ConsumptionCategory[] = []
  ): CreditLot[] {
    const protectedSet = new Set(protectedCategories);
    const priorityMap = new Map<ConsumptionCategory, number>();

    categoryPriorities.forEach((cat, index) => {
      priorityMap.set(cat, index);
    });

    // 1. Filtrar lotes de categorias protegidas
    const eligibleLots = lots.filter((lot) => {
      const cat = this.categorizeLot(lot);
      return !protectedSet.has(cat);
    });

    // 2. Ordenação composta:
    //    1º: Prioridade da categoria definida pelo administrador (menor índice = maior prioridade)
    //    2º: FEFO interno (lotes com vencimento mais próximo primeiro)
    //    3º: Lotes sem vencimento após os lotes com vencimento
    //    4º: Lotes mais antigos de criação primeiro
    //    5º: Desempate por ID
    return eligibleLots.sort((a, b) => {
      const catA = this.categorizeLot(a);
      const catB = this.categorizeLot(b);

      const prioA = priorityMap.get(catA) ?? 999;
      const prioB = priorityMap.get(catB) ?? 999;

      if (prioA !== prioB) {
        return prioA - prioB;
      }

      // Critério FEFO dentro da mesma categoria:
      if (a.expiresAt && b.expiresAt) {
        const timeDiff = a.expiresAt.getTime() - b.expiresAt.getTime();
        if (timeDiff !== 0) return timeDiff;
      } else if (a.expiresAt && !b.expiresAt) {
        return -1; // lotes com expiração têm prioridade sobre lotes sem expiração
      } else if (!a.expiresAt && b.expiresAt) {
        return 1;
      }

      // Lote mais antigo de criação primeiro
      const createdDiff = a.validFrom.getTime() - b.validFrom.getTime();
      if (createdDiff !== 0) return createdDiff;

      // Desempate estável por ID
      return a.id.localeCompare(b.id);
    });
  }
}

