import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { PlatformRole, PlanTier, SubscriptionStatus } from "@prisma/client";
import { AdminUsersService } from "@/modules/admin/admin-users.service";
import { AdminProjectsService } from "@/modules/admin/admin-projects.service";
import { CreditPricingService } from "@/modules/billing/credit-pricing.service";
import { CreditRenewalService } from "@/modules/billing/credit-renewal.service";

describe("Admin Full Expansion - Pricing, Renewal, Users & Projects Transfer", () => {
  const testPrefix = `exp_${Date.now()}`;
  let superAdmin: any;
  let regularAdmin: any;
  let testUserA: any;
  let testUserB: any;
  let workspaceA: any;
  let workspaceB: any;
  let project1: any;
  let project2: any;
  let testOpCode = (`OP_TEST_${testPrefix}`).toUpperCase();
  let testOpId: string;

  beforeAll(async () => {
    // 1. Criar Super Admin e Admin regular
    superAdmin = await db.user.create({
      data: {
        authSubject: `${testPrefix}_superadmin`,
        email: `${testPrefix}_superadmin@test.com`,
        displayName: "Super Admin Exp",
        platformRole: PlatformRole.SUPER_ADMIN,
        emailConfirmed: true,
      },
    });

    regularAdmin = await db.user.create({
      data: {
        authSubject: `${testPrefix}_regularadmin`,
        email: `${testPrefix}_regularadmin@test.com`,
        displayName: "Regular Admin Exp",
        platformRole: PlatformRole.ADMIN,
        emailConfirmed: true,
      },
    });

    // 2. Criar Usuários A e B
    testUserA = await db.user.create({
      data: {
        authSubject: `${testPrefix}_usera`,
        email: `${testPrefix}_usera@test.com`,
        displayName: "User A Exp",
        platformRole: PlatformRole.USER,
        emailConfirmed: false,
      },
    });

    testUserB = await db.user.create({
      data: {
        authSubject: `${testPrefix}_userb`,
        email: `${testPrefix}_userb@test.com`,
        displayName: "User B Exp",
        platformRole: PlatformRole.USER,
        emailConfirmed: true,
      },
    });

    // 3. Criar Workspaces
    workspaceA = await db.workspace.create({
      data: {
        name: `Studio A ${testPrefix}`,
        slug: `studio-a-${testPrefix}`,
        creditsBalance: 50,
        memberships: {
          create: {
            userId: testUserA.id,
            role: "OWNER",
          },
        },
        subscription: {
          create: {
            planTier: PlanTier.FREE,
            status: SubscriptionStatus.ACTIVE,
          },
        },
      },
    });

    workspaceB = await db.workspace.create({
      data: {
        name: `Studio B ${testPrefix}`,
        slug: `studio-b-${testPrefix}`,
        creditsBalance: 10,
        memberships: {
          create: {
            userId: testUserB.id,
            role: "OWNER",
          },
        },
        subscription: {
          create: {
            planTier: PlanTier.PRO,
            status: SubscriptionStatus.ACTIVE,
          },
        },
      },
    });

    // 4. Criar Projetos no Workspace A
    project1 = await db.project.create({
      data: {
        title: `Projeto Exp 1 ${testPrefix}`,
        description: "Projeto 1 para teste de transferência",
        genre: "Cyberpunk",
        workspaceId: workspaceA.id,
      },
    });

    project2 = await db.project.create({
      data: {
        title: `Projeto Exp 2 ${testPrefix}`,
        description: "Projeto 2 para teste em lote",
        genre: "Noir",
        workspaceId: workspaceA.id,
      },
    });
  });

  afterAll(async () => {
    try {
      // Limpar transfers
      await db.projectOwnershipTransfer.deleteMany({
        where: {
          OR: [
            { fromWorkspaceId: { in: [workspaceA.id, workspaceB.id] } },
            { toWorkspaceId: { in: [workspaceA.id, workspaceB.id] } },
          ],
        },
      });

      // Limpar projetos
      if (project1?.id || project2?.id) {
        await db.project.deleteMany({
          where: { id: { in: [project1.id, project2.id] } },
        });
      }

      // Limpar entitlements
      await db.userEntitlementOverride.deleteMany({
        where: { userId: { in: [testUserA.id, testUserB.id] } },
      });

      // Limpar regras de preço de teste
      if (testOpId) {
        await db.creditPricingRule.deleteMany({ where: { operationId: testOpId } });
        await db.creditOperation.deleteMany({ where: { id: testOpId } });
      }

      // Limpar políticas de renovação de teste
      await db.creditRenewalPolicy.deleteMany({
        where: { name: { contains: testPrefix } },
      });

      // Limpar subscriptions, ledger e memberships dos workspaces
      await db.creditLedger.deleteMany({
        where: { workspaceId: { in: [workspaceA.id, workspaceB.id] } },
      });
      await db.subscription.deleteMany({
        where: { workspaceId: { in: [workspaceA.id, workspaceB.id] } },
      });
      await db.membership.deleteMany({
        where: { workspaceId: { in: [workspaceA.id, workspaceB.id] } },
      });
      await db.workspace.deleteMany({
        where: { id: { in: [workspaceA.id, workspaceB.id] } },
      });

      // Limpar logs de auditoria e usuários
      const allUserIds = [superAdmin.id, regularAdmin.id, testUserA.id, testUserB.id];
      await db.platformAuditLog.deleteMany({
        where: {
          OR: [
            { adminUserId: { in: allUserIds } },
            { targetId: { in: allUserIds } },
          ],
        },
      });
      await db.user.deleteMany({
        where: { id: { in: allUserIds } },
      });
    } catch (e) {
      console.error("Erro na limpeza do teste de expansão:", e);
    }
  });

  // ==========================================
  // SEÇÃO 7: CATÁLOGO DE PREÇOS E RESOLUÇÃO HIERÁRQUICA
  // ==========================================
  describe("7. Central de Limites, Recursos e Custos em Créditos", () => {
    it("deve criar uma nova operação no catálogo com custo padrão", async () => {
      const op = await CreditPricingService.upsertOperation(superAdmin.id, {
        code: testOpCode,
        name: "Geração Cinematográfica Especial",
        description: "Operação de teste",
        category: "TESTES",
        defaultCreditCost: 7,
        isFree: false,
      });

      expect(op).toBeDefined();
      expect(op.code).toBe(testOpCode);
      expect(op.defaultCreditCost).toBe(7);
      testOpId = op.id;
    });

    it("deve resolver o custo padrão quando não há regra específica para o plano", async () => {
      const resolution = await CreditPricingService.resolveCost(testOpCode, PlanTier.FREE);
      expect(resolution.creditCost).toBe(7);
      expect(resolution.isFree).toBe(false);
      expect(resolution.appliedRule).toBe("OPERATION_DEFAULT");
    });

    it("deve definir regra específica para o plano PRO tornando a operação com desconto", async () => {
      const rule = await CreditPricingService.setPricingRule(superAdmin.id, {
        operationId: testOpId,
        planTier: PlanTier.PRO,
        creditCost: 2,
        isFree: false,
      });

      expect(rule).toBeDefined();
      expect(rule.creditCost).toBe(2);
      expect(rule.planTier).toBe(PlanTier.PRO);

      // Agora deve resolver 2 créditos para PRO
      const resolutionPro = await CreditPricingService.resolveCost(testOpCode, PlanTier.PRO);
      expect(resolutionPro.creditCost).toBe(2);
      expect(resolutionPro.appliedRule).toBe("PLAN_SPECIFIC");

      // E continuar resolvendo 7 créditos para FREE
      const resolutionFree = await CreditPricingService.resolveCost(testOpCode, PlanTier.FREE);
      expect(resolutionFree.creditCost).toBe(7);
      expect(resolutionFree.appliedRule).toBe("OPERATION_DEFAULT");
    });

    it("deve simular custos com metadados de versão e regra", async () => {
      const simulation = await CreditPricingService.simulateCost(testOpCode, PlanTier.PRO);
      expect(simulation.creditCost).toBe(2);
      expect(simulation.isFree).toBe(false);
      expect(simulation.appliedRule).toBe("PLAN_SPECIFIC");
      expect(simulation.version).toBeGreaterThanOrEqual(1);
    });

    it("deve retornar fallback seguro quando operação não existe no catálogo", async () => {
      const fallback = await CreditPricingService.resolveCost("OP_INEXISTENTE_XYZ", PlanTier.FREE);
      expect(fallback.creditCost).toBe(1);
      expect(fallback.appliedRule).toBe("SYSTEM_FALLBACK");
    });
  });

  // ==========================================
  // SEÇÃO 8: SISTEMA CONFIGURÁVEL DE RENOVAÇÃO DE CRÉDITOS
  // ==========================================
  describe("8. Sistema Configurável de Renovação de Créditos", () => {
    it("deve criar uma política de renovação para o plano PRO", async () => {
      const policy = await CreditRenewalService.createPolicy(superAdmin.id, {
        name: `Renovação PRO ${testPrefix}`,
        planTier: "PRO",
        creditsAmount: 25,
        frequency: "MONTHLY",
        accumulate: true,
        isActive: true,
        priority: 100,
      });

      expect(policy).toBeDefined();
      expect(policy.creditsAmount).toBe(25);
      expect(policy.planTier).toBe("PRO");
    });

    it("deve executar o job de renovação de créditos de forma idempotente", async () => {
      const initialWsB = await db.workspace.findUnique({ where: { id: workspaceB.id } });
      const currentBalance = initialWsB?.creditsBalance || 0;

      // 1ª Execução do job direcionada ao workspace B
      const run1 = await CreditRenewalService.executeRenewalJob({
        targetWorkspaceId: workspaceB.id,
      });
      expect(run1.renewedCount).toBe(1);

      // Workspace B deve ter recebido +25 créditos
      const afterRun1 = await db.workspace.findUnique({ where: { id: workspaceB.id } });
      expect(afterRun1?.creditsBalance).toBe(currentBalance + 25);

      // 2ª Execução do job no mesmo período (Idempotência)
      const run2 = await CreditRenewalService.executeRenewalJob({
        targetWorkspaceId: workspaceB.id,
      });
      // Deve ter ignorado pois já foi renovado neste ciclo
      expect(run2.skippedCount).toBe(1);

      // Saldo deve permanecer inalterado (não duplicou créditos!)
      const afterRun2 = await db.workspace.findUnique({ where: { id: workspaceB.id } });
      expect(afterRun2?.creditsBalance).toBe(currentBalance + 25);
    });
  });

  // ==========================================
  // SEÇÃO 3: GESTÃO COMPLETA DE USUÁRIOS E SEGURANÇA
  // ==========================================
  describe("3. Gestão Completa de Usuários e Segurança", () => {
    it("deve permitir que o administrador confirme manualmente o e-mail com justificativa auditada", async () => {
      expect(testUserA.emailConfirmed).toBe(false);

      const confirmed = await AdminUsersService.confirmEmailManually(
        superAdmin.id,
        testUserA.id,
        "Confirmação manual solicitada via chamado de suporte #412"
      );

      expect(confirmed.emailConfirmed).toBe(true);

      // Verificar registro de auditoria
      const audit = await db.platformAuditLog.findFirst({
        where: {
          adminUserId: superAdmin.id,
          targetId: testUserA.id,
          action: "USER_EMAIL_MANUAL_CONFIRM",
        },
      });
      expect(audit).toBeDefined();
      const details = audit?.details as any;
      expect(details?.justification).toContain("#412");
    });

    it("deve impedir que um usuário tente alterar seu próprio papel administrativo", async () => {
      await expect(
        AdminUsersService.updatePlatformRole(
          superAdmin.id,
          superAdmin.id,
          PlatformRole.USER
        )
      ).rejects.toThrow("Um administrador não pode alterar o próprio papel administrativo.");
    });

    it("deve conceder e revogar concessão administrativa temporária de plano (Entitlement Override)", async () => {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias

      const grant = await AdminUsersService.grantEntitlementOverride(superAdmin.id, {
        userId: testUserA.id,
        grantedPlanTier: PlanTier.ENTERPRISE,
        reason: "Concessão de teste VIP para diretor de cinema",
        expiresAt,
      });

      expect(grant.grantedPlanTier).toBe(PlanTier.ENTERPRISE);
      expect(grant.isActive).toBe(true);

      // Revogação da concessão
      const revoked = await AdminUsersService.revokeEntitlementOverride(
        superAdmin.id,
        grant.id
      );
      expect(revoked.isActive).toBe(false);
    });

    it("deve permitir adicionar créditos e impedir retirada que deixe o saldo negativo", async () => {
      const currentWsA = await db.workspace.findUnique({ where: { id: workspaceA.id } });
      const baseBalance = currentWsA?.creditsBalance || 0;

      // 1. Adicionar 20 créditos
      const added = await AdminUsersService.adjustCredits(
        superAdmin.id,
        workspaceA.id,
        20,
        "Bônus administrativo de compensação"
      );
      expect(added.newBalance).toBe(baseBalance + 20);

      // 2. Retirar 15 créditos (válido)
      const withdrawn = await AdminUsersService.adjustCredits(
        superAdmin.id,
        workspaceA.id,
        -15,
        "Ajuste de estorno acordado"
      );
      expect(withdrawn.newBalance).toBe(baseBalance + 20 - 15);

      // 3. Tentar retirar mais créditos do que o saldo atual
      const currentBalance = withdrawn.newBalance;
      await expect(
        AdminUsersService.adjustCredits(
          superAdmin.id,
          workspaceA.id,
          -(currentBalance + 50),
          "Tentativa de retirada excessiva"
        )
      ).rejects.toThrow("Saldo insuficiente");
    });
  });

  // ==========================================
  // SEÇÃO 4: TRANSFERÊNCIA E ADMINISTRAÇÃO DE PROJETOS
  // ==========================================
  describe("4. Transferência e Administração de Projetos", () => {
    let transferRecordId: string;

    it("deve transferir um projeto entre workspaces preservando integridade e registrando histórico", async () => {
      expect(project1.workspaceId).toBe(workspaceA.id);

      const transferred = await AdminProjectsService.transferProject(
        superAdmin.id,
        project1.id,
        workspaceB.id,
        "Transferência de propriedade solicitada pelo produtor"
      );

      expect(transferred.workspaceId).toBe(workspaceB.id);

      // Verificar registro de transferência no histórico
      const history = await AdminProjectsService.listOwnershipTransfers({ projectId: project1.id });
      expect(history.transfers.length).toBeGreaterThanOrEqual(1);
      const latest = history.transfers[0];
      expect(latest.fromWorkspaceId).toBe(workspaceA.id);
      expect(latest.toWorkspaceId).toBe(workspaceB.id);
      expect(latest.reason).toContain("produtor");
      transferRecordId = latest.id;
    });

    it("deve permitir restaurar a propriedade anterior do projeto", async () => {
      const restored = await AdminProjectsService.restorePreviousOwnership(
        superAdmin.id,
        transferRecordId,
        "Restauração por reversão de contrato"
      );

      expect(restored.workspaceId).toBe(workspaceA.id);

      const checkProject = await db.project.findUnique({ where: { id: project1.id } });
      expect(checkProject?.workspaceId).toBe(workspaceA.id);
    });

    it("deve transferir múltiplos projetos em lote atomicamente", async () => {
      // Como project1 foi restaurado para workspaceA e project2 já está em workspaceA:
      const batchResult = await AdminProjectsService.transferProjectsBatch(
        superAdmin.id,
        [project1.id, project2.id],
        workspaceB.id,
        "Transferência em lote de acervo cinematográfico"
      );

      expect(batchResult.transferredCount).toBe(2);

      const p1 = await db.project.findUnique({ where: { id: project1.id } });
      const p2 = await db.project.findUnique({ where: { id: project2.id } });
      expect(p1?.workspaceId).toBe(workspaceB.id);
      expect(p2?.workspaceId).toBe(workspaceB.id);
    });
  });
});
