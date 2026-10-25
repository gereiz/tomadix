import { db } from "@/lib/db";
import { PlanTier, SubscriptionStatus, Prisma } from "@prisma/client";
import { AdminAuditService } from "@/modules/admin/admin-audit.service";

export interface CreateRenewalPolicyInput {
  name: string;
  description?: string;
  planTier?: PlanTier | null;
  creditsAmount: number;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY" | "ONCE" | "CYCLE";
  moment?: string;
  accumulate?: boolean;
  maxAccumulated?: number | null;
  expirationDays?: number | null;
  priority?: number;
  isActive?: boolean;
  startsAt?: string | Date | null;
  endsAt?: string | Date | null;
}

export class CreditRenewalService {
  /**
   * Garante a criação de políticas padrão de renovação caso a tabela esteja vazia.
   */
  static async seedDefaultPolicies() {
    const count = await db.creditRenewalPolicy.count();
    if (count > 0) return;

    const defaultPolicies: CreateRenewalPolicyInput[] = [
      {
        name: "Renovação Mensal - Plano FREE",
        description: "Concessão mensal de 20 créditos para contas gratuitas com teto acumulável de 60 créditos.",
        planTier: PlanTier.FREE,
        creditsAmount: 20,
        frequency: "MONTHLY",
        moment: "CYCLE_RENEWAL",
        accumulate: true,
        maxAccumulated: 60,
        expirationDays: 30,
        priority: 1,
        isActive: true,
      },
      {
        name: "Renovação Mensal - Plano PRO",
        description: "Recarga de 150 créditos mensais para assinantes PRO com renovação a cada ciclo.",
        planTier: PlanTier.PRO,
        creditsAmount: 150,
        frequency: "MONTHLY",
        moment: "CYCLE_RENEWAL",
        accumulate: false,
        priority: 2,
        isActive: true,
      },
      {
        name: "Renovação Mensal - Plano TEAM",
        description: "Recarga de 600 créditos mensais para estúdios e equipes colaborativas.",
        planTier: PlanTier.TEAM,
        creditsAmount: 600,
        frequency: "MONTHLY",
        moment: "CYCLE_RENEWAL",
        accumulate: false,
        priority: 3,
        isActive: true,
      },
      {
        name: "Renovação Mensal - Plano ENTERPRISE",
        description: "Concessão corporativa de 2.000 créditos com rollover acumulável ilimitado.",
        planTier: PlanTier.ENTERPRISE,
        creditsAmount: 2000,
        frequency: "MONTHLY",
        moment: "CYCLE_RENEWAL",
        accumulate: true,
        priority: 4,
        isActive: true,
      },
    ];

    for (const p of defaultPolicies) {
      await db.creditRenewalPolicy.create({
        data: {
          name: p.name,
          description: p.description,
          planTier: p.planTier || null,
          creditsAmount: p.creditsAmount,
          frequency: p.frequency,
          moment: p.moment || "CYCLE_RENEWAL",
          accumulate: p.accumulate || false,
          maxAccumulated: p.maxAccumulated || null,
          expirationDays: p.expirationDays || null,
          priority: p.priority || 1,
          isActive: p.isActive !== undefined ? p.isActive : true,
          startsAt: new Date(),
        },
      });
    }
  }

  /**
   * Lista todas as políticas de renovação cadastradas.
   */
  static async listPolicies(params?: { planTier?: PlanTier; onlyActive?: boolean }) {
    await this.seedDefaultPolicies();

    const where: Prisma.CreditRenewalPolicyWhereInput = {};
    if (params?.planTier) {
      where.planTier = params.planTier;
    }
    if (params?.onlyActive) {
      where.isActive = true;
    }

    return db.creditRenewalPolicy.findMany({
      where,
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });
  }

  /**
   * Cria uma nova política de renovação de créditos.
   */
  static async createPolicy(
    adminUserId: string,
    data: CreateRenewalPolicyInput,
    context?: { ip?: string; ua?: string }
  ) {
    if (data.creditsAmount <= 0) {
      throw new Error("A quantidade de créditos a conceder deve ser maior que zero.");
    }

    const policy = await db.creditRenewalPolicy.create({
      data: {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        planTier: data.planTier || null,
        creditsAmount: data.creditsAmount,
        frequency: data.frequency,
        moment: data.moment || "CYCLE_RENEWAL",
        accumulate: Boolean(data.accumulate),
        maxAccumulated: data.maxAccumulated ? Math.max(0, data.maxAccumulated) : null,
        expirationDays: data.expirationDays ? Math.max(1, data.expirationDays) : null,
        priority: data.priority ?? 1,
        isActive: data.isActive !== undefined ? data.isActive : true,
        startsAt: data.startsAt ? new Date(data.startsAt) : new Date(),
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
      },
    });

    await AdminAuditService.logAction({
      adminUserId,
      action: "RENEWAL_POLICY_CREATE",
      targetType: "CreditRenewalPolicy",
      targetId: policy.id,
      result: "SUCCESS",
      details: {
        name: policy.name,
        planTier: policy.planTier,
        creditsAmount: policy.creditsAmount,
        frequency: policy.frequency,
      },
      ipAddress: context?.ip,
      userAgent: context?.ua,
    });

    return policy;
  }

  /**
   * Atualiza uma política de renovação existente.
   */
  static async updatePolicy(
    adminUserId: string,
    policyId: string,
    data: Partial<CreateRenewalPolicyInput>,
    context?: { ip?: string; ua?: string }
  ) {
    const existing = await db.creditRenewalPolicy.findUnique({
      where: { id: policyId },
    });

    if (!existing) {
      throw new Error("Política de renovação não encontrada.");
    }

    const payload: Prisma.CreditRenewalPolicyUpdateInput = {};
    if (data.name !== undefined) payload.name = data.name.trim();
    if (data.description !== undefined) payload.description = data.description?.trim() || null;
    if (data.planTier !== undefined) payload.planTier = data.planTier;
    if (data.creditsAmount !== undefined) payload.creditsAmount = data.creditsAmount;
    if (data.frequency !== undefined) payload.frequency = data.frequency;
    if (data.moment !== undefined) payload.moment = data.moment;
    if (data.accumulate !== undefined) payload.accumulate = Boolean(data.accumulate);
    if (data.maxAccumulated !== undefined) payload.maxAccumulated = data.maxAccumulated;
    if (data.expirationDays !== undefined) payload.expirationDays = data.expirationDays;
    if (data.priority !== undefined) payload.priority = data.priority;
    if (data.isActive !== undefined) payload.isActive = Boolean(data.isActive);
    if (data.startsAt !== undefined) payload.startsAt = data.startsAt ? new Date(data.startsAt) : new Date();
    if (data.endsAt !== undefined) payload.endsAt = data.endsAt ? new Date(data.endsAt) : null;

    const updated = await db.creditRenewalPolicy.update({
      where: { id: policyId },
      data: payload,
    });

    await AdminAuditService.logAction({
      adminUserId,
      action: "RENEWAL_POLICY_UPDATE",
      targetType: "CreditRenewalPolicy",
      targetId: policyId,
      result: "SUCCESS",
      details: {
        name: updated.name,
        changes: data,
      },
      ipAddress: context?.ip,
      userAgent: context?.ua,
    });

    return updated;
  }

  /**
   * Exclui uma política de renovação.
   */
  static async deletePolicy(
    adminUserId: string,
    policyId: string,
    context?: { ip?: string; ua?: string }
  ) {
    const policy = await db.creditRenewalPolicy.findUnique({
      where: { id: policyId },
    });

    if (!policy) {
      throw new Error("Política de renovação não encontrada.");
    }

    await db.creditRenewalPolicy.delete({ where: { id: policyId } });

    await AdminAuditService.logAction({
      adminUserId,
      action: "RENEWAL_POLICY_DELETE",
      targetType: "CreditRenewalPolicy",
      targetId: policyId,
      result: "SUCCESS",
      details: { name: policy.name, planTier: policy.planTier },
      ipAddress: context?.ip,
      userAgent: context?.ua,
    });

    return { success: true, deletedId: policyId };
  }

  /**
   * Executa a rotina de renovação automática (Job) com idempotência garantida.
   * Não renova duas vezes no mesmo ciclo e registra chaves de idempotência.
   */
  static async executeRenewalJob(options?: {
    frequency?: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY" | "CYCLE";
    targetWorkspaceId?: string;
    dryRun?: boolean;
    adminUserId?: string;
  }) {
    await this.seedDefaultPolicies();

    const now = new Date();
    const periodKey = `${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, "0")}_${now.getDate()}`;

    // 1. Carregar políticas ativas
    const policies = await db.creditRenewalPolicy.findMany({
      where: {
        isActive: true,
        frequency: options?.frequency || undefined,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      },
      orderBy: { priority: "desc" },
    });

    const report = {
      timestamp: now.toISOString(),
      periodKey,
      dryRun: Boolean(options?.dryRun),
      processedWorkspaces: 0,
      renewedCount: 0,
      skippedCount: 0,
      totalCreditsGranted: 0,
      errors: [] as { workspaceId: string; error: string }[],
    };

    // 2. Carregar workspaces elegíveis
    const workspaceWhere: Prisma.WorkspaceWhereInput = {
      isArchived: false,
    };
    if (options?.targetWorkspaceId) {
      workspaceWhere.id = options.targetWorkspaceId;
    }

    const workspaces = await db.workspace.findMany({
      where: workspaceWhere,
      include: {
        subscription: true,
      },
    });

    report.processedWorkspaces = workspaces.length;

    for (const ws of workspaces) {
      try {
        const subStatus = ws.subscription?.status;
        const currentTier = ws.subscription?.planTier || PlanTier.FREE;

        // Se assinatura estiver suspensa, cancelada ou inadimplente, não renova
        if (
          subStatus === SubscriptionStatus.CANCELED ||
          subStatus === SubscriptionStatus.PAST_DUE ||
          subStatus === SubscriptionStatus.UNPAID
        ) {
          report.skippedCount++;
          continue;
        }

        // Encontrar a política mais prioritária para este plano
        const applicablePolicy =
          policies.find((p) => p.planTier === currentTier) ||
          policies.find((p) => p.planTier === null);

        if (!applicablePolicy) {
          report.skippedCount++;
          continue;
        }

        // Chave de idempotência: garante que nunca conceda duas vezes no mesmo período/ciclo
        const cycleMarker =
          applicablePolicy.frequency === "DAILY"
            ? periodKey
            : `${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, "0")}`;
        const idempotencyKey = `renewal_${applicablePolicy.id}_${ws.id}_${cycleMarker}`;

        // Verificar se já houve concessão para este período no ledger
        const alreadyRenewed = await db.creditLedger.findFirst({
          where: {
            workspaceId: ws.id,
            reason: { contains: idempotencyKey },
          },
        });

        if (alreadyRenewed) {
          report.skippedCount++;
          continue;
        }

        if (options?.dryRun) {
          report.renewedCount++;
          report.totalCreditsGranted += applicablePolicy.creditsAmount;
          continue;
        }

        // Calcular novo saldo respeitando regras de acúmulo (accumulate)
        let amountToGrant = applicablePolicy.creditsAmount;
        let newBalance = ws.creditsBalance + amountToGrant;

        if (!applicablePolicy.accumulate) {
          // Saldo não acumulativo: substitui ou ajusta até o limite do plano
          amountToGrant = Math.max(0, applicablePolicy.creditsAmount - ws.creditsBalance);
          newBalance = Math.max(ws.creditsBalance, applicablePolicy.creditsAmount);
        } else if (applicablePolicy.maxAccumulated && newBalance > applicablePolicy.maxAccumulated) {
          // Teto de acúmulo atingido
          newBalance = applicablePolicy.maxAccumulated;
          amountToGrant = Math.max(0, newBalance - ws.creditsBalance);
        }

        if (amountToGrant <= 0) {
          report.skippedCount++;
          continue;
        }

        // Atualizar saldo e registrar no livro-razão (ledger)
        await db.$transaction([
          db.workspace.update({
            where: { id: ws.id },
            data: { creditsBalance: newBalance },
          }),
          db.creditLedger.create({
            data: {
              workspaceId: ws.id,
              amount: amountToGrant,
              balanceAfter: newBalance,
              reason: `Renovação de créditos [${applicablePolicy.name}] (${idempotencyKey})`,
              metadata: {
                idempotencyKey,
                policyId: applicablePolicy.id,
                planTier: currentTier,
                periodKey: cycleMarker,
                previousBalance: ws.creditsBalance,
                newBalance,
              },
            },
          }),
        ]);

        report.renewedCount++;
        report.totalCreditsGranted += amountToGrant;
      } catch (err: any) {
        report.errors.push({
          workspaceId: ws.id,
          error: err.message || "Erro desconhecido durante renovação.",
        });
      }
    }

    if (options?.adminUserId && !options.dryRun) {
      await AdminAuditService.logAction({
        adminUserId: options.adminUserId,
        action: "CREDIT_RENEWAL_JOB_EXECUTE",
        targetType: "System",
        targetId: periodKey,
        result: report.errors.length === 0 ? "SUCCESS" : "FAILURE",
        details: {
          periodKey,
          renewedCount: report.renewedCount,
          skippedCount: report.skippedCount,
          totalCreditsGranted: report.totalCreditsGranted,
          errorsCount: report.errors.length,
        },
      });
    }

    return report;
  }
}
