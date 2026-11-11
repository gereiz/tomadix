import { exec, spawn } from "child_process";
import util from "util";
import { Prisma, PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { AdminAuditService } from "@/modules/admin/admin-audit.service";
import { AdminDatabaseService, type ConnectionInput } from "@/modules/admin/admin-database.service";

const execAsync = util.promisify(exec);

export const DUMP_FORMAT = "tomadix-dump";
export const DUMP_VERSION = 1;

/** Sessões de login não migram (tokens ligados ao banco antigo): os usuários entram de novo. */
const EXCLUDED_MODELS = new Set(["Session"]);
/** Limite de parâmetros por comando no PostgreSQL é 32767; ficamos abaixo com folga. */
const MAX_PARAMS_PER_INSERT = 30000;

type Row = Record<string, unknown>;

export interface TomadixDump {
  format: typeof DUMP_FORMAT;
  version: typeof DUMP_VERSION;
  exportedAt: string;
  tables: Record<string, Row[]>;
}

export interface DumpTableReport {
  table: string;
  rows: number;
}

interface Delegate {
  findMany(args?: object): Promise<Row[]>;
  count(): Promise<number>;
  createMany(args: { data: Row[] }): Prisma.PrismaPromise<unknown>;
}

const MODELS = Prisma.dmmf.datamodel.models;
const delegateOf = (client: PrismaClient, model: string): Delegate =>
  (client as unknown as Record<string, Delegate>)[model.charAt(0).toLowerCase() + model.slice(1)];

/** Ordem segura para inserir: cada tabela depois das que ela referencia (o schema não tem ciclos). */
export function getDumpModelOrder(): string[] {
  const deps = new Map<string, string[]>();
  for (const m of MODELS) {
    deps.set(
      m.name,
      m.fields.filter((f) => f.kind === "object" && (f.relationFromFields?.length ?? 0) > 0 && f.type !== m.name).map((f) => f.type)
    );
  }
  const order: string[] = [];
  const seen = new Set<string>();
  const visit = (name: string) => {
    if (seen.has(name)) return;
    seen.add(name);
    for (const d of deps.get(name) ?? []) visit(d);
    order.push(name);
  };
  for (const m of MODELS) visit(m.name);
  return order.filter((n) => !EXCLUDED_MODELS.has(n));
}

function scalarFields(model: string) {
  return MODELS.find((m) => m.name === model)?.fields.filter((f) => f.kind === "scalar" || f.kind === "enum") ?? [];
}

/** Volta datas (ISO → Date) e NULL de colunas Json (→ Prisma.DbNull); descarta colunas que o destino não tem. */
export function reviveRow(model: string, row: Row): Row {
  const out: Row = {};
  for (const f of scalarFields(model)) {
    if (!(f.name in row)) continue;
    const v = row[f.name];
    if (f.type === "DateTime" && typeof v === "string") out[f.name] = new Date(v);
    else if (f.type === "Json" && v === null) out[f.name] = Prisma.DbNull;
    else out[f.name] = v;
  }
  return out;
}

/** Consultas simultâneas ao banco: abaixo do pool padrão (connection_limit) para não estourar o tempo de espera. */
const MAX_CONCURRENT_QUERIES = 6;

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await fn(items[i]);
      }
    })
  );
  return results;
}

const SQL_ROWS_PER_INSERT = 500;
const sqlString = (s: string) => `'${s.replace(/'/g, "''")}'`;

type ScalarField = ReturnType<typeof scalarFields>[number];

/** Literal SQL de um valor da coluna (senhas/credenciais já vêm criptografadas ou com hash no banco). */
function sqlLiteral(field: ScalarField, value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (field.isList) return `ARRAY[${(value as unknown[]).map((x) => sqlString(String(x))).join(", ")}]::text[]`;
  if (field.type === "Json") return `${sqlString(JSON.stringify(value))}::jsonb`;
  if (field.type === "Boolean") return value ? "true" : "false";
  if (field.type === "Int" || field.type === "Float") return Number.isFinite(value as number) ? String(value) : "NULL";
  if (field.type === "DateTime") return sqlString(new Date(String(value)).toISOString());
  return sqlString(String(value)); // String e enums (o PostgreSQL converte o literal para o tipo da coluna)
}

/**
 * Converte o dump em SQL de dados (INSERTs em lote, na ordem das dependências, dentro de BEGIN/COMMIT).
 * Pré-requisito no destino: tabelas criadas (`npx prisma migrate deploy`) e banco vazio.
 */
export function dumpToSql(dump: TomadixDump): string {
  const lines: string[] = [
    `-- Tomadix: dump de dados gerado em ${dump.exportedAt}`,
    "-- Pré-requisito: banco de destino vazio e com as tabelas criadas (npx prisma migrate deploy).",
    '-- Uso: psql "<string de conexão>" -v ON_ERROR_STOP=1 -f este-arquivo.sql',
    "SET client_encoding = 'UTF8';",
    "BEGIN;",
  ];
  for (const name of getDumpModelOrder()) {
    const rows = dump.tables[name];
    if (!Array.isArray(rows) || rows.length === 0) continue;
    const fields = scalarFields(name);
    const columns = fields.map((f) => `"${f.name}"`).join(", ");
    lines.push("", `-- ${name}: ${rows.length} registro(s)`);
    for (let i = 0; i < rows.length; i += SQL_ROWS_PER_INSERT) {
      const values = rows
        .slice(i, i + SQL_ROWS_PER_INSERT)
        .map((r) => `(${fields.map((f) => sqlLiteral(f, r[f.name])).join(", ")})`)
        .join(",\n");
      lines.push(`INSERT INTO "${name}" (${columns}) VALUES\n${values};`);
    }
  }
  lines.push("", "COMMIT;", "");
  return lines.join("\n");
}

/** Mesmo servidor e mesmo banco (a porta pode mudar entre pooler e conexão direta). */
export function isSameDatabase(a: string, b: string): boolean {
  try {
    const ua = new URL(a);
    const ub = new URL(b);
    return ua.hostname.toLowerCase() === ub.hostname.toLowerCase() && ua.pathname === ub.pathname;
  } catch {
    return false;
  }
}

function clientFor(url?: string): { client: PrismaClient; temporary: boolean } {
  if (!url?.trim()) return { client: db, temporary: false };
  return { client: new PrismaClient({ datasources: { db: { url: url.trim() } }, log: ["error"] }), temporary: true };
}

/** Variáveis PG* a partir da URL (a senha não vai na linha de comando); remove parâmetros do Prisma que o libpq não entende. */
export function pgEnvFromUrl(raw: string): Record<string, string> {
  const u = new URL(raw);
  const pooled = u.searchParams.get("pgbouncer") === "true" || u.port === "6543";
  const env: Record<string, string> = {
    PGHOST: u.hostname,
    // pg_dump usa recursos de sessão: no pooler do Supabase (6543, modo transação) vai pela porta de sessão 5432
    PGPORT: pooled ? "5432" : u.port || "5432",
    PGUSER: decodeURIComponent(u.username),
    PGPASSWORD: decodeURIComponent(u.password),
    PGDATABASE: decodeURIComponent(u.pathname.replace(/^\//, "")) || "postgres",
  };
  const ssl = u.searchParams.get("sslmode");
  if (ssl) env.PGSSLMODE = ssl;
  return env;
}

const isMissingTable = (e: unknown) =>
  e instanceof Prisma.PrismaClientKnownRequestError && (e.code === "P2021" || e.code === "P2022");

async function auditSafely(adminUserId: string, action: string, details: Record<string, unknown>) {
  try {
    await AdminAuditService.logAction({
      adminUserId,
      action,
      targetType: "DATABASE_INFRASTRUCTURE",
      targetId: "DUMP",
      details,
    });
  } catch (err) {
    // O destino pode ser o banco ativo ainda sem o administrador: a auditoria nunca bloqueia a migração.
    console.warn("[AdminDatabaseDump] Auditoria não registrada:", err);
  }
}

export class AdminDatabaseDumpService {
  /**
   * Dump completo (estrutura + dados) em SQL pelo `pg_dump`, pronto para rodar com psql no banco novo.
   * Sem donos nem permissões (os papéis do destino são outros); sessões de login ficam sem dados.
   * Precisa do `pg_dump` no servidor (no Docker: postgresql-client; versão >= a do banco de origem).
   * shortcut: o resultado inteiro fica em memória; para bancos de vários GB trocar por stream em arquivo.
   */
  static async pgDump(sourceUrl: string | undefined, adminUserId: string): Promise<Buffer> {
    const url = sourceUrl?.trim() || process.env.DIRECT_URL || process.env.DATABASE_URL;
    if (!url) throw new Error("Sem conexão de origem: informe a URL do banco ou configure DATABASE_URL.");

    const bin = process.env.PG_DUMP_PATH || "pg_dump";
    const args = ["--no-owner", "--no-privileges", "--schema=public", '--exclude-table-data="Session"'];

    const sql = await new Promise<Buffer>((resolve, reject) => {
      const child = spawn(bin, args, { env: { ...process.env, ...pgEnvFromUrl(url) } });
      const out: Buffer[] = [];
      let err = "";
      const timer = setTimeout(() => {
        child.kill();
        reject(new Error("pg_dump excedeu 5 minutos e foi cancelado."));
      }, 300000);
      child.stdout.on("data", (c: Buffer) => out.push(c));
      child.stderr.on("data", (c: Buffer) => (err += c.toString()));
      child.on("error", (e: NodeJS.ErrnoException) => {
        clearTimeout(timer);
        reject(
          e.code === "ENOENT"
            ? new Error("pg_dump não está instalado no servidor. No Docker, instale o postgresql-client na imagem (já incluído no Dockerfile do projeto) e faça um novo deploy.")
            : e
        );
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        if (code === 0) resolve(Buffer.concat(out));
        else reject(new Error(`pg_dump falhou (código ${code}): ${err.trim().slice(0, 800)}`));
      });
    });

    await auditSafely(adminUserId, "DATABASE_PGDUMP_EXPORTED", { fromActiveDatabase: !sourceUrl?.trim(), sizeKb: Math.round(sql.length / 1024) });
    return sql;
  }

  /**
   * Exporta todas as tabelas (exceto sessões) do banco informado, ou do banco ativo se vazio.
   * shortcut: cada tabela inteira em memória, para bases com centenas de milhares de linhas trocar por streaming.
   */
  static async exportDump(
    sourceUrl: string | undefined,
    adminUserId: string
  ): Promise<{ dump: TomadixDump; tables: DumpTableReport[]; warnings: string[] }> {
    const { client, temporary } = clientFor(sourceUrl);
    try {
      const tables: Record<string, Row[]> = {};
      const warnings: string[] = [];
      // Em paralelo (limitado): com banco remoto lento, 55 leituras em sequência levariam minutos.
      await mapLimit(getDumpModelOrder(), MAX_CONCURRENT_QUERIES, async (name) => {
        try {
          tables[name] = await delegateOf(client, name).findMany();
        } catch (err) {
          if (!isMissingTable(err)) throw err;
          tables[name] = [];
          warnings.push(`Tabela ou coluna ausente no banco de origem: ${name} (exportada vazia).`);
        }
      });

      const report = Object.entries(tables).map(([table, rows]) => ({ table, rows: rows.length }));
      await auditSafely(adminUserId, "DATABASE_DUMP_EXPORTED", {
        fromActiveDatabase: !sourceUrl?.trim(),
        tablesWithData: report.filter((r) => r.rows > 0).length,
        totalRows: report.reduce((s, r) => s + r.rows, 0),
      });

      return {
        dump: { format: DUMP_FORMAT, version: DUMP_VERSION, exportedAt: new Date().toISOString(), tables },
        tables: report,
        warnings,
      };
    } finally {
      if (temporary) await client.$disconnect().catch(() => {});
    }
  }

  static validateDump(value: unknown): TomadixDump {
    const d = value as Partial<TomadixDump> | null;
    if (!d || d.format !== DUMP_FORMAT || d.version !== DUMP_VERSION || !d.tables || typeof d.tables !== "object") {
      throw new Error("Arquivo inválido: não é um dump do Tomadix (formato ou versão não reconhecidos).");
    }
    return d as TomadixDump;
  }

  /** Insere as linhas do dump na ordem das dependências, em uma transação única (tudo ou nada). */
  static async insertDump(client: PrismaClient, dump: TomadixDump): Promise<DumpTableReport[]> {
    const operations: Prisma.PrismaPromise<unknown>[] = [];
    const report: DumpTableReport[] = [];
    for (const name of getDumpModelOrder()) {
      const rows = dump.tables[name];
      if (!Array.isArray(rows) || rows.length === 0) continue;
      const data = rows.map((r) => reviveRow(name, r));
      const chunk = Math.max(1, Math.floor(MAX_PARAMS_PER_INSERT / Math.max(1, scalarFields(name).length)));
      for (let i = 0; i < data.length; i += chunk) {
        operations.push(delegateOf(client, name).createMany({ data: data.slice(i, i + chunk) }));
      }
      report.push({ table: name, rows: data.length });
    }
    await client.$transaction(operations);
    return report;
  }

  /**
   * Importa o dump no banco informado (ou no ativo). O destino precisa ter as tabelas e estar vazio;
   * a inserção é uma transação única: ou entra tudo ou nada.
   */
  static async importDump(
    dumpInput: unknown,
    targetUrl: string | undefined,
    adminUserId: string,
    schemaUrl?: string // conexão direta para criar as tabelas (o `prisma db push` não funciona em pooler)
  ): Promise<{ tables: DumpTableReport[]; totalRows: number; schemaCreated: boolean }> {
    const dump = this.validateDump(dumpInput);
    const { client, temporary } = clientFor(targetUrl);
    try {
      let schemaCreated = false;
      let diagnosis = await AdminDatabaseService.diagnoseDatabase(targetUrl?.trim() || undefined);
      if (diagnosis.missingTablesCount > 0) {
        try {
          await execAsync("npx prisma db push --skip-generate --accept-data-loss=false", {
            env: {
              ...process.env,
              ...(targetUrl?.trim() ? { DATABASE_URL: schemaUrl?.trim() || targetUrl.trim(), DIRECT_URL: schemaUrl?.trim() || targetUrl.trim() } : {}),
            },
            timeout: 120000,
          });
        } catch {
          // segue para a checagem abaixo, que explica o que fazer
        }
        diagnosis = await AdminDatabaseService.diagnoseDatabase(targetUrl?.trim() || undefined);
        schemaCreated = diagnosis.missingTablesCount === 0;
      }
      if (diagnosis.missingTablesCount > 0) {
        throw new Error(
          `O banco de destino não tem as tabelas do Tomadix (${diagnosis.missingTablesCount} ausentes) e não foi possível criá-las daqui. Rode "npx prisma migrate deploy" apontando para esse banco e importe de novo.`
        );
      }

      const order = getDumpModelOrder();
      const counts = await mapLimit(order, MAX_CONCURRENT_QUERIES, (name) => delegateOf(client, name).count());
      const nonEmpty = order.filter((_, i) => counts[i] > 0);
      if (nonEmpty.length > 0) {
        throw new Error(
          `O banco de destino não está vazio (${nonEmpty.slice(0, 6).join(", ")}${nonEmpty.length > 6 ? "…" : ""}). Para não misturar dados, a importação só roda em banco vazio.`
        );
      }

      const report = await this.insertDump(client, dump);

      const totalRows = report.reduce((s, r) => s + r.rows, 0);
      await auditSafely(adminUserId, "DATABASE_DUMP_IMPORTED", {
        intoActiveDatabase: !targetUrl?.trim(),
        tablesWithData: report.length,
        totalRows,
        schemaCreated,
      });
      return { tables: report, totalRows, schemaCreated };
    } finally {
      if (temporary) await client.$disconnect().catch(() => {});
    }
  }

  /**
   * Copia todo o banco ativo (menos sessões) para a conexão informada, sem arquivo no meio.
   * O destino precisa estar vazio; as tabelas são criadas se der. A conexão do app NÃO é trocada.
   */
  static async copyToConnection(
    input: ConnectionInput,
    adminUserId: string
  ): Promise<{ tables: DumpTableReport[]; totalRows: number; schemaCreated: boolean }> {
    const { databaseUrl, directUrl } = AdminDatabaseService.buildEnvValues(input);
    if ([process.env.DATABASE_URL, process.env.DIRECT_URL].some((active) => active && isSameDatabase(active, databaseUrl))) {
      throw new Error("A conexão informada é o próprio banco ativo: não há o que copiar. Informe o banco de destino.");
    }

    const test = await AdminDatabaseService.testConnection(input);
    if (!test.success) {
      throw new Error(`Falha ao testar a conexão de destino: ${test.error || "servidor inacessível"}. Nada foi copiado.`);
    }

    const { dump } = await this.exportDump(undefined, adminUserId);
    return this.importDump(dump, databaseUrl, adminUserId, directUrl);
  }
}
