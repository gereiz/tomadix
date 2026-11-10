import { describe, it, expect, vi, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
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
  describe("prévia do .env (previewEnv)", () => {
    it("Postgres sem pooler: DIRECT_URL é a própria DATABASE_URL e a senha sai mascarada na exibição", () => {
      const { envText, envMasked } = AdminDatabaseService.previewEnv({
        connectionType: "postgres_local", host: "ibitweb_postgres_tomadix", port: 5432, database: "tomadix", user: "tomadix_gereiz", password: "s3cr&t@!", sslMode: "disable",
      });
      const [dbLine, directLine] = envText.split("\n");
      expect(dbLine.replace("DATABASE_URL=", "")).toBe(directLine.replace("DIRECT_URL=", ""));
      expect(envText).toContain("s3cr%26t%40!");
      expect(envMasked).not.toContain("s3cr");
      expect(envMasked).toContain("tomadix_gereiz:********@ibitweb_postgres_tomadix:5432/tomadix");
    });

    it("Supabase pooler (6543): DIRECT_URL usa a porta 5432 e sem pgbouncer", () => {
      const { envText } = AdminDatabaseService.previewEnv({
        connectionType: "supabase", host: "aws-0.pooler.supabase.com", port: 6543, database: "postgres", user: "postgres.abc", password: "x",
      });
      const direct = envText.split("\n")[1];
      expect(envText.split("\n")[0]).toContain(":6543/");
      expect(envText.split("\n")[0]).toContain("pgbouncer=true");
      expect(direct).toContain(":5432/");
      expect(direct).not.toContain("pgbouncer");
    });
  });

  describe("changeConnection com .env somente leitura", () => {
    afterEach(() => vi.restoreAllMocks());

    it("devolve mensagem clara (não EACCES cru) e não altera o ambiente ativo", async () => {
      // cwd em pasta temporária: mesmo que o spy falhe, o .env real do projeto nunca é tocado
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "tomadix-env-"));
      fs.writeFileSync(path.join(tmp, ".env"), 'DATABASE_URL="postgresql://velho"');
      vi.spyOn(process, "cwd").mockReturnValue(tmp);
      vi.spyOn(AdminDatabaseService, "testConnection").mockResolvedValue({ success: true } as any);
      vi.spyOn(fs, "writeFileSync").mockImplementation(() => {
        throw Object.assign(new Error("EACCES: permission denied, open '/app/.env.backup.1'"), { code: "EACCES" });
      });
      const before = process.env.DATABASE_URL;

      await expect(
        AdminDatabaseService.changeConnection(
          { url: "postgresql://u:p@host:5432/db" },
          "admin-test"
        )
      ).rejects.toThrow(/variáveis de ambiente do serviço/);

      expect(process.env.DATABASE_URL).toBe(before);
      vi.restoreAllMocks();
      expect(fs.readFileSync(path.join(tmp, ".env"), "utf-8")).toContain("postgresql://velho");
      fs.rmSync(tmp, { recursive: true, force: true });
    });
  });
});
