import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventEmitter } from "events";

const spawnMock = vi.hoisted(() => vi.fn());
vi.mock("child_process", () => ({ exec: vi.fn(), spawn: spawnMock }));

import { AdminDatabaseDumpService, pgEnvFromUrl } from "@/modules/admin/admin-database-dump.service";

/** Processo falso: emite stdout/stderr e depois `close` com o código pedido. */
function fakeProcess(opts: { stdout?: string; stderr?: string; code?: number; error?: NodeJS.ErrnoException }) {
  const child = new EventEmitter() as EventEmitter & { stdout: EventEmitter; stderr: EventEmitter; kill: () => void };
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.kill = vi.fn();
  setImmediate(() => {
    if (opts.error) return child.emit("error", opts.error);
    if (opts.stdout) child.stdout.emit("data", Buffer.from(opts.stdout));
    if (opts.stderr) child.stderr.emit("data", Buffer.from(opts.stderr));
    child.emit("close", opts.code ?? 0);
  });
  return child;
}

describe("Exportação com pg_dump", () => {
  beforeEach(() => spawnMock.mockReset());

  it("pgEnvFromUrl: variáveis PG*, senha decodificada, sslmode e pooler 6543 vira porta de sessão 5432", () => {
    const direct = pgEnvFromUrl("postgresql://tomadix_gereiz:s3cr%26t%40!@ibitweb_postgres_tomadix:5432/tomadix?sslmode=disable");
    expect(direct).toEqual({
      PGHOST: "ibitweb_postgres_tomadix",
      PGPORT: "5432",
      PGUSER: "tomadix_gereiz",
      PGPASSWORD: "s3cr&t@!",
      PGDATABASE: "tomadix",
      PGSSLMODE: "disable",
    });

    const pooled = pgEnvFromUrl("postgresql://postgres.abc:x@aws-0.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=15");
    expect(pooled.PGPORT).toBe("5432");
    expect(pooled.PGSSLMODE).toBeUndefined();
  });

  it("chama o pg_dump sem a senha nos argumentos e devolve o SQL", async () => {
    spawnMock.mockReturnValue(fakeProcess({ stdout: "-- PostgreSQL database dump\nCREATE TABLE x();\n" }));

    const sql = await AdminDatabaseDumpService.pgDump("postgresql://u:SENHA-SECRETA@host:5432/db", "admin-1");

    expect(sql.toString()).toContain("CREATE TABLE x();");
    const [bin, args, options] = spawnMock.mock.calls[0];
    expect(bin).toBe("pg_dump");
    expect(args).toEqual(expect.arrayContaining(["--no-owner", "--no-privileges", "--schema=public", '--exclude-table-data="Session"']));
    expect(args.join(" ")).not.toContain("SENHA-SECRETA");
    expect(options.env.PGPASSWORD).toBe("SENHA-SECRETA");
    expect(options.env.PGHOST).toBe("host");
  });

  it("falha do pg_dump vira erro com a mensagem dele", async () => {
    spawnMock.mockReturnValue(fakeProcess({ stderr: "pg_dump: error: aborting because of server version mismatch", code: 1 }));
    await expect(AdminDatabaseDumpService.pgDump("postgresql://u:p@host:5432/db", "admin-1")).rejects.toThrow(/server version mismatch/);
  });

  it("pg_dump não instalado: mensagem explica como instalar", async () => {
    spawnMock.mockReturnValue(fakeProcess({ error: Object.assign(new Error("spawn pg_dump ENOENT"), { code: "ENOENT" }) }));
    await expect(AdminDatabaseDumpService.pgDump("postgresql://u:p@host:5432/db", "admin-1")).rejects.toThrow(/postgresql-client/);
  });
});
