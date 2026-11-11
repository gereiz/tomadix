import { describe, it, expect } from "vitest";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  AdminDatabaseDumpService,
  DUMP_FORMAT,
  DUMP_VERSION,
  dumpToSql,
  getDumpModelOrder,
  isSameDatabase,
  reviveRow,
} from "@/modules/admin/admin-database-dump.service";

describe("Dump e importação do banco (migração entre bancos)", () => {
  it("ordem de inserção: cada tabela vem depois das que ela referencia, e Session fica de fora", () => {
    const order = getDumpModelOrder();
    expect(order).not.toContain("Session");
    expect(new Set(order).size).toBe(order.length);

    for (const model of Prisma.dmmf.datamodel.models) {
      if (!order.includes(model.name)) continue;
      for (const f of model.fields) {
        const isForeignKey = f.kind === "object" && (f.relationFromFields?.length ?? 0) > 0 && f.type !== "Session";
        if (isForeignKey) {
          expect(order.indexOf(f.type), `${model.name} depende de ${f.type}`).toBeLessThan(order.indexOf(model.name));
        }
      }
    }
  });

  it("reviveRow volta datas e NULL de Json, e descarta colunas que o destino não tem", () => {
    const row = reviveRow("PromptVersion", {
      id: "v1",
      projectId: "p1",
      createdAt: "2026-11-10T12:00:00.000Z",
      outputText: null,
      inputSnapshot: { a: 1 },
      colunaInexistente: "x",
    });
    expect(row.createdAt).toBeInstanceOf(Date);
    expect((row.createdAt as Date).toISOString()).toBe("2026-11-10T12:00:00.000Z");
    expect(row.inputSnapshot).toEqual({ a: 1 });
    expect(row.outputText).toBeNull();
    expect("colunaInexistente" in row).toBe(false);

    // Coluna Json nula (DB NULL) precisa de Prisma.DbNull para o createMany aceitar
    const withNullJson = reviveRow("GenerationJob", { id: "j1", result: null });
    expect(withNullJson.result).toBe(Prisma.DbNull);
  });

  it("recusa arquivo que não é dump do Tomadix", () => {
    expect(() => AdminDatabaseDumpService.validateDump(null)).toThrow(/não é um dump do Tomadix/);
    expect(() => AdminDatabaseDumpService.validateDump({ format: "outro", version: 1, tables: {} })).toThrow();
    expect(() => AdminDatabaseDumpService.validateDump({ format: DUMP_FORMAT, version: 99, tables: {} })).toThrow();
    expect(AdminDatabaseDumpService.validateDump({ format: DUMP_FORMAT, version: DUMP_VERSION, tables: {} }).tables).toEqual({});
  });

  it("dumpToSql gera INSERTs escapados, na ordem das dependências, dentro de BEGIN/COMMIT", () => {
    const dump = {
      format: DUMP_FORMAT,
      version: DUMP_VERSION,
      exportedAt: "2026-11-10T12:00:00.000Z",
      tables: {
        // GeminiApiKey tem lista de texto (allowedModels); o apóstrofo precisa ser duplicado
        GeminiApiKey: [{ id: "k1", name: "Chave do O'Brien", allowedModels: ["a", "b"], isActive: true, createdAt: "2026-11-10T12:00:00.000Z", priority: 1 }],
        PromptVersion: [{ id: "v1", projectId: "p1", outputText: null, inputSnapshot: { frase: "it's" }, createdAt: "2026-11-10T12:00:00.000Z", templateVersion: 2 }],
        User: [{ id: "u1", email: "a@b.com" }],
      },
    } as unknown as Parameters<typeof dumpToSql>[0];

    const sql = dumpToSql(dump);
    expect(sql).toContain("BEGIN;");
    expect(sql.trimEnd().endsWith("COMMIT;")).toBe(true);
    expect(sql).toContain("'Chave do O''Brien'");
    expect(sql).toContain("ARRAY['a', 'b']::text[]");
    expect(sql).toContain(`'{"frase":"it''s"}'::jsonb`);
    expect(sql).toContain("'2026-11-10T12:00:00.000Z'");
    expect(sql).toContain("NULL");
    expect(sql).toMatch(/INSERT INTO "PromptVersion" \(.*"inputSnapshot".*\) VALUES/);
    // User (sem dependências) vem antes de PromptVersion, que referencia o projeto
    expect(sql.indexOf('INSERT INTO "User"')).toBeLessThan(sql.indexOf('INSERT INTO "PromptVersion"'));
    expect(sql).not.toContain("INSERT INTO \"Session\"");
  });

  it("isSameDatabase: mesmo servidor e banco com portas diferentes é o mesmo; outro banco ou URL inválida não", () => {
    expect(isSameDatabase("postgresql://u:p@Host.com:6543/postgres?pgbouncer=true", "postgresql://u:p@host.com:5432/postgres")).toBe(true);
    expect(isSameDatabase("postgresql://u:p@host.com:5432/postgres", "postgresql://u:p@host.com:5432/tomadix")).toBe(false);
    expect(isSameDatabase("postgresql://u:p@a.com:5432/x", "postgresql://u:p@b.com:5432/x")).toBe(false);
    expect(isSameDatabase("não é url", "postgresql://u:p@a.com:5432/x")).toBe(false);
  });

  it("copyToConnection recusa o próprio banco ativo e conexão que não passa no teste (sem copiar nada)", async () => {
    const active = process.env.DATABASE_URL as string;
    await expect(AdminDatabaseDumpService.copyToConnection({ url: active }, "admin-test")).rejects.toThrow(/próprio banco ativo/);

    await expect(
      AdminDatabaseDumpService.copyToConnection({ url: "postgresql://u:p@127.0.0.1:1/inexistente?connect_timeout=3" }, "admin-test")
    ).rejects.toThrow(/Falha ao testar a conexão de destino/);
  }, 60000);

  it("exporta o banco ativo (todas as tabelas, sem sessões) e recusa importar em banco que já tem dados", async () => {
    const admin = await db.user.findFirst({ select: { id: true } });
    const adminId = admin?.id ?? "sem-admin";

    const { dump, tables } = await AdminDatabaseDumpService.exportDump(undefined, adminId);
    expect(dump.format).toBe(DUMP_FORMAT);
    expect(Object.keys(dump.tables)).toEqual(expect.arrayContaining(getDumpModelOrder()));
    expect("Session" in dump.tables).toBe(false);
    expect(tables.length).toBe(getDumpModelOrder().length);
    expect(JSON.parse(JSON.stringify(dump)).tables.User.length).toBe(dump.tables.User.length);

    // O banco ativo dos testes tem dados: a importação nele precisa ser recusada, sem alterar nada.
    const before = await db.user.count();
    await expect(AdminDatabaseDumpService.importDump(dump, undefined, adminId)).rejects.toThrow(/não está vazio/);
    expect(await db.user.count()).toBe(before);
  }, 120000);
});
