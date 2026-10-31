import { db } from "@/lib/db";
import { CreditLot, CreditLotStatus, CreditOrigin, PlanTier, Prisma } from "@prisma/client";

export interface GrantCreditLotParams {
  workspaceId: string;
  userId?: string;
  origin: CreditOrigin;
  amount: number;
  planTier?: PlanTier;
  subscriptionId?: string;
  isAccumulative?: boolean;
  expiresAt?: Date | null;
  eventId?: string;
  reason: string;
  metadata?: Record<string, any>;
}

export interface CreditLotFilters {
  workspaceId?: string;
  status?: CreditLotStatus;
  origin?: CreditOrigin;
  page?: number;
  limit?: number;
}

export class CreditLotService {
  /**
   * Concede um novo lote individual de créditos com garantia de idempotência e registro no ledger.
   */
  static async grantLot(params: GrantCreditLotParams, externalTx?: Prisma.TransactionClient): Promise<CreditLot> {
    const {
      workspaceId,
      userId,
      origin,
      amount,
      planTier,
      subscriptionId,
      isAccumulative = true,
      expiresAt = null,
      eventId,
      reason,
      metadata = {},
    } = params;

    if (amount <= 0) {
      throw new Error("A quantidade de créditos concedida no lote deve ser estritamente positiva.");
    }

    const executeGrant = async (tx: Prisma.TransactionClient) => {
      // 1. Verificação de idempotência por eventId
      if (eventId) {
        const existingByEvent = await tx.creditLot.findFirst({
          where: { eventId },
        });
        if (existingByEvent) {
          return existingByEvent;
        }
      }

      // 2. Regra especial para Créditos de Adesão: uma única vez por plano/workspace
      if (origin === CreditOrigin.ADHESION && planTier) {
        const existingAdhesion = await tx.creditLot.findFirst({
          where: {
            workspaceId,
            origin: CreditOrigin.ADHESION,
            planTier,
          },
        });
        if (existingAdhesion) {
          return existingAdhesion;
        }
      }

      // 3. Validação da existência do workspace
      const workspace = await tx.workspace.findUnique({
        where: { id: workspaceId },
        select: { id: true, creditsBalance: true },
      });

      if (!workspace) {
        throw new Error(`Workspace [${workspaceId}] não encontrado para concessão de créditos.`);
      }

      const newBalance = workspace.creditsBalance + amount;

      // 4. Criação do Lote no banco
      const lot = await tx.creditLot.create({
        data: {
          workspaceId,
          userId: userId || null,
          origin,
          amountGranted: amount,
          amountAvailable: amount,
          amountConsumed: 0,
          status: CreditLotStatus.ACTIVE,
          isAccumulative,
          validFrom: new Date(),
          expiresAt: expiresAt || null,
          planTier: planTier || null,
          subscriptionId: subscriptionId || null,
          eventId: eventId || null,
          reason,
          metadata: metadata || null,
        },
      });

      // 5. Atualização do saldo agregado em cache no workspace
      await tx.workspace.update({
        where: { id: workspaceId },
        data: { creditsBalance: newBalance },
      });

      // 6. Registro no razão imutável (CreditLedger)
      await tx.creditLedger.create({
        data: {
          workspaceId,
          amount,
          balanceAfter: newBalance,
          lotId: lot.id,
          origin,
          reason,
          userId: userId || null,
          idempotencyKey: eventId || null,
          metadata: {
            ...metadata,
            lotId: lot.id,
            origin,
            amountGranted: amount,
            isAccumulative,
            expiresAt: expiresAt?.toISOString() || null,
          },
        },
      });

      return lot;
    };

    if (externalTx) {
      return executeGrant(externalTx);
    }

    return await db.$transaction(executeGrant);
  }

  /**
   * Consulta os lotes de um workspace com suporte a filtros e ordenação determinística.
   */
  static async listWorkspaceLots(filters: CreditLotFilters) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.CreditLotWhereInput = {};
    if (filters.workspaceId) where.workspaceId = filters.workspaceId;
    if (filters.status) where.status = filters.status;
    if (filters.origin) where.origin = filters.origin;

    const [total, items] = await Promise.all([
      db.creditLot.count({ where }),
      db.creditLot.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ validFrom: "desc" }, { id: "desc" }],
        include: {
          workspace: { select: { id: true, name: true, slug: true } },
          user: { select: { id: true, displayName: true, email: true } },
        },
      }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Consulta os lotes válidos e disponíveis para consumo no workspace, ordenados de forma determinística (FEFO).
   */
  static async getEligibleLotsForConsumption(workspaceId: string, tx?: Prisma.TransactionClient): Promise<CreditLot[]> {
    const client = tx || db;
    const now = new Date();

    return client.creditLot.findMany({
      where: {
        workspaceId,
        status: CreditLotStatus.ACTIVE,
        amountAvailable: { gt: 0 },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: [
        // FEFO: lotes com vencimento mais próximo primeiro
        { expiresAt: "asc" },
        // Lotes mais antigos de criação primeiro
        { validFrom: "asc" },
        { id: "asc" },
      ],
    });
  }

  /**
   * Executa a expiração de lotes vencidos e debita o saldo correspondente com lançamento no ledger.
   */
  static async expireOverdueLots(targetWorkspaceId?: string): Promise<{ expiredLotsCount: number; expiredCreditsTotal: number }> {
    const now = new Date();

    return await db.$transaction(async (tx) => {
      const where: Prisma.CreditLotWhereInput = {
        status: CreditLotStatus.ACTIVE,
        amountAvailable: { gt: 0 },
        expiresAt: { lte: now },
      };

      if (targetWorkspaceId) {
        where.workspaceId = targetWorkspaceId;
      }

      const expiredLots = await tx.creditLot.findMany({
        where,
        include: { workspace: true },
      });

      let expiredCreditsTotal = 0;

      for (const lot of expiredLots) {
        const expiredAmount = lot.amountAvailable;
        expiredCreditsTotal += expiredAmount;

        // Atualizar status do lote para EXPIRED e zerar saldo disponível
        await tx.creditLot.update({
          where: { id: lot.id },
          data: {
            status: CreditLotStatus.EXPIRED,
            amountAvailable: 0,
          },
        });

        // Deduzir do saldo do workspace
        const currentBalance = lot.workspace.creditsBalance;
        const newBalance = Math.max(0, currentBalance - expiredAmount);

        await tx.workspace.update({
          where: { id: lot.workspaceId },
          data: { creditsBalance: newBalance },
        });

        // Registrar no ledger
        await tx.creditLedger.create({
          data: {
            workspaceId: lot.workspaceId,
            amount: -expiredAmount,
            balanceAfter: newBalance,
            lotId: lot.id,
            origin: lot.origin,
            reason: `Expiração automática de lote [${lot.origin}] vencido em ${lot.expiresAt?.toISOString()}`,
            metadata: {
              lotId: lot.id,
              origin: lot.origin,
              expiredAmount,
              originalGranted: lot.amountGranted,
              expiresAt: lot.expiresAt,
            },
          },
        });
      }

      return {
        expiredLotsCount: expiredLots.length,
        expiredCreditsTotal,
      };
    });
  }

  /**
   * Migração de saldos legados para lotes (Etapa 11):
   * Converte o creditsBalance atual de qualquer workspace sem lotes em um lote LEGACY com ledger.
   */
  static async migrateLegacyBalances(): Promise<{ migratedCount: number; totalCreditsMigrated: number }> {
    const workspacesWithoutLots = await db.workspace.findMany({
      where: {
        creditsBalance: { gt: 0 },
        creditLots: { none: {} },
      },
      select: { id: true, name: true, creditsBalance: true },
    });

    let migratedCount = 0;
    let totalCreditsMigrated = 0;

    for (const ws of workspacesWithoutLots) {
      await db.$transaction(async (tx) => {
        const lot = await tx.creditLot.create({
          data: {
            workspaceId: ws.id,
            origin: CreditOrigin.LEGACY,
            amountGranted: ws.creditsBalance,
            amountAvailable: ws.creditsBalance,
            amountConsumed: 0,
            status: CreditLotStatus.ACTIVE,
            isAccumulative: true,
            validFrom: new Date(),
            reason: "Migração de saldo legado pré-existente para a nova arquitetura de lotes",
            metadata: {
              migratedFromLegacyBalance: true,
              originalBalance: ws.creditsBalance,
            },
          },
        });

        await tx.creditLedger.create({
          data: {
            workspaceId: ws.id,
            amount: ws.creditsBalance,
            balanceAfter: ws.creditsBalance,
            lotId: lot.id,
            origin: CreditOrigin.LEGACY,
            reason: "Registro de lote inicial correspondente ao saldo migrado da plataforma",
            metadata: {
              lotId: lot.id,
              migratedBalance: ws.creditsBalance,
            },
          },
        });
      });

      migratedCount++;
      totalCreditsMigrated += ws.creditsBalance;
    }

    return { migratedCount, totalCreditsMigrated };
  }

  /**
   * Realiza auditoria e conciliação (Etapa 12) entre saldo em cache do workspace, soma dos lotes e ledger.
   */
  static async reconcileWorkspace(workspaceId: string) {
    const workspace = await db.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, name: true, creditsBalance: true },
    });

    if (!workspace) {
      throw new Error(`Workspace [${workspaceId}] não encontrado.`);
    }

    const now = new Date();

    // 1. Soma dos créditos disponíveis em lotes ativos e válidos
    const activeLots = await db.creditLot.findMany({
      where: {
        workspaceId,
        status: CreditLotStatus.ACTIVE,
        amountAvailable: { gt: 0 },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    });

    const sumActiveLots = activeLots.reduce((acc, lot) => acc + lot.amountAvailable, 0);

    // 2. Lotes que estão marcados como ACTIVE mas já expiraram
    const overdueActiveLots = await db.creditLot.findMany({
      where: {
        workspaceId,
        status: CreditLotStatus.ACTIVE,
        expiresAt: { lte: now },
      },
    });

    // 3. Soma histórica de entradas e saídas no Ledger
    const ledgerAggregate = await db.creditLedger.aggregate({
      where: { workspaceId },
      _sum: { amount: true },
    });

    const ledgerNetSum = ledgerAggregate._sum.amount ?? 0;

    const discrepancyCachedVsLots = workspace.creditsBalance - sumActiveLots;
    const isConsistent = discrepancyCachedVsLots === 0 && overdueActiveLots.length === 0;

    return {
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      cachedBalance: workspace.creditsBalance,
      sumActiveLots,
      ledgerNetSum,
      discrepancy: discrepancyCachedVsLots,
      overdueActiveLotsCount: overdueActiveLots.length,
      isConsistent,
      activeLotsCount: activeLots.length,
    };
  }
}

