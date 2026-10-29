import { describe, it, expect, vi } from "vitest";
import {
  AdminDatabaseService,
  EXPECTED_SCHEMA_MODELS,
} from "@/modules/admin/admin-database.service";
import { db } from "@/lib/db";

describe("Console Administrativo — Gestão de Bancos de Dados & Infraestrutura", () => {
  it("1. Sanitização de Parâmetros de Conexão", () => {
    const info = AdminDatabaseService.getCurrentConnectionDetails();

    expect(info.provider).toBe("postgresql");
    expect(info.engine).toBe("PostgreSQL");
    expect(info.database).toBeDefined();
    expect(info.hostMasked).not.toContain("password");
    expect(info.userMasked).not.toContain("password");
    // Garante que a senha não está exposta nos metadados
    expect((info as any).password).toBeUndefined();
    expect((info as any).passwordHash).toBeUndefined();
  });

  it("2. Construção Normalizada de Connection Strings", () => {
    // Caso 1: Supabase com Pooler
    const supabaseConn = AdminDatabaseService.buildConnectionString({
      connectionType: "supabase",
      host: "aws-0-us-east-2.pooler.supabase.com",
      port: 6543,
      database: "postgres",
      user: "postgres.myproject",
      password: "secret_password",
      sslMode: "require",
    });

    expect(supabaseConn.url).toContain("postgresql://postgres.myproject:secret_password@aws-0-us-east-2.pooler.supabase.com:6543/postgres");
    expect(supabaseConn.url).toContain("sslmode=require");
    expect(supabaseConn.url).toContain("pgbouncer=true");

    // Caso 2: PostgreSQL Local
    const localConn = AdminDatabaseService.buildConnectionString({
      connectionType: "postgres_local",
      host: "localhost",
      port: 5432,
      database: "tomadix_dev",
      user: "postgres",
      password: "123",
      sslMode: "disable",
    });

    expect(localConn.url).toContain("postgresql://postgres:123@localhost:5432/tomadix_dev?sslmode=disable");

    // Caso 3: String Direta
    const directConn = AdminDatabaseService.buildConnectionString({
      url: "postgresql://user:pass@remote.db.com:5432/mydb?sslmode=prefer",
    });

    expect(directConn.url).toBe("postgresql://user:pass@remote.db.com:5432/mydb?sslmode=prefer");
  });

  it("3. Teste da Conexão Ativa com o Banco de Dados", async () => {
    const result = await AdminDatabaseService.testConnection();

    expect(result.success).toBe(true);
    expect(result.status).toBe("CONNECTED");
    expect(result.totalLatencyMs).toBeGreaterThan(0);
    expect(result.tableCount).toBeGreaterThanOrEqual(10);
    expect(result.version).toBeDefined();
    expect(result.databaseName).toBeDefined();
    expect(result.hostMasked).toBeDefined();
    // Confidencialidade
    expect((result as any).password).toBeUndefined();
  }, 30000);

  it("4. Diagnóstico de Falha em Conexão Temporária Inválida", async () => {
    const invalidResult = await AdminDatabaseService.testConnection({
      host: "127.0.0.1",
      port: 54399, // Porta fechada
      database: "non_existent_db",
      user: "invalid_user",
      password: "wrong_password",
      sslMode: "disable",
    });

    expect(invalidResult.success).toBe(false);
    expect(["UNREACHABLE", "AUTH_FAILED", "TIMEOUT", "ERROR"]).toContain(invalidResult.status);
    expect(invalidResult.error).toBeDefined();
    expect(invalidResult.suggestions).toBeDefined();
    expect(invalidResult.suggestions!.length).toBeGreaterThan(0);
  }, 15000);

  it("5. Diagnóstico de Schema e Verificação de 35 Modelos Prisma", async () => {
    const diag = await AdminDatabaseService.diagnoseDatabase();

    expect(diag.totalExpectedTables).toBe(EXPECTED_SCHEMA_MODELS.length);
    expect(diag.existingTablesCount).toBeGreaterThan(0);
    expect(diag.status).not.toBe("EMPTY");
    expect(diag.hasSuperAdmin).toBe(true);
    expect(diag.plansCount).toBeGreaterThanOrEqual(4);
    expect(diag.parametersCount).toBeGreaterThanOrEqual(1);
    expect(diag.isReadyForProduction).toBe(true);
  }, 30000);

  it("6. Inicialização Idempotente da Plataforma (Preserva Admin e Dados Existentes)", async () => {
    const initialAdminsCount = await db.user.count({
      where: { platformRole: { in: ["ADMIN", "SUPER_ADMIN"] } },
    });

    const report = await AdminDatabaseService.initializeDatabase({
      seedDemoProject: false,
    });

    expect(report.success).toBe(true);
    expect(report.phase).toBe("COMPLETED");
    expect(report.stepResults.adminPreserved).toBe(true);
    expect(report.stepResults.adminCreated).toBe(false);
    expect(report.stepResults.plansSyncedCount).toBeGreaterThanOrEqual(4);

    const postAdminsCount = await db.user.count({
      where: { platformRole: { in: ["ADMIN", "SUPER_ADMIN"] } },
    });

    // Garante que nenhum admin duplicado foi criado
    expect(postAdminsCount).toBe(initialAdminsCount);
  }, 120000);
});
