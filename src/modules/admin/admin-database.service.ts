import { db, withDbRetry } from "@/lib/db";
import { PrismaClient, PlatformRole, WorkspaceRole, PlanTier } from "@prisma/client";
import { AdminAuditService } from "@/modules/admin/admin-audit.service";
import { hashPassword } from "@/lib/security";
import { DEFAULT_PLANS } from "@/modules/billing/plans.config";
import { AdminParametersService } from "@/modules/admin/admin-parameters.service";
import { BillingPolicyService } from "@/modules/billing/billing-policy.service";
import { CreditPricingService } from "@/modules/billing/credit-pricing.service";
import { CreditRenewalService } from "@/modules/billing/credit-renewal.service";
import { GatewayManagerService } from "@/modules/billing/gateways/gateway-manager.service";
import {
  DEFAULT_CUSTOMIZATION,
  DEFAULT_GENERAL_SETTINGS,
} from "@/modules/admin/platform-settings.service";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import util from "util";

const execAsync = util.promisify(exec);

/** .env somente leitura (Docker/Easypanel, usuário sem permissão): erro claro em vez de EACCES cru. */
function writeEnvFile(file: string, content: string) {
  try {
    fs.writeFileSync(file, content, "utf-8");
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "EACCES" || code === "EPERM" || code === "EROFS") {
      throw new Error(
        "Esta instalação não pode gravar o arquivo .env (somente leitura, comum em Docker/Easypanel). A conexão testada está OK, mas nada foi alterado. Defina DATABASE_URL e DIRECT_URL nas variáveis de ambiente do serviço e reinicie o aplicativo."
      );
    }
    throw err;
  }
}

export interface SanitizedConnectionInfo {
  provider: "postgresql";
  engine: string;
  hostMasked: string;
  port: number;
  database: string;
  userMasked: string;
  isSupabase: boolean;
  isPooler: boolean;
  hasDirectUrl: boolean;
  directPort?: number;
  sslMode: string;
  environmentType: "local" | "remote" | "supabase";
}

export interface ConnectionTestResult {
  success: boolean;
  status: "CONNECTED" | "ERROR" | "TIMEOUT" | "AUTH_FAILED" | "UNREACHABLE";
  totalLatencyMs: number;
  queryLatencyMs: number;
  version?: string;
  databaseName?: string;
  serverTime?: string;
  tableCount?: number;
  sslUsed?: boolean;
  hostMasked?: string;
  port?: number;
  isSupabase?: boolean;
  testedAt: string;
  error?: string;
  errorCode?: string;
  suggestions?: string[];
}

export interface ConnectionInput {
  url?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  sslMode?: "disable" | "require" | "prefer";
  directUrl?: string;
  connectionType?: "supabase" | "postgres_local" | "postgres_remote";
}

export interface DatabaseDiagnosis {
  status: "EMPTY" | "PARTIAL" | "READY";
  totalExpectedTables: number;
  existingTablesCount: number;
  missingTablesCount: number;
  existingTables: string[];
  missingTables: string[];
  hasSuperAdmin: boolean;
  superAdminCount: number;
  superAdminEmailMasked?: string;
  plansCount: number;
  parametersCount: number;
  policiesCount: number;
  projectsCount: number;
  isReadyForProduction: boolean;
  analyzedAt: string;
}

export interface InitializeDatabaseOptions {
  adminUser?: {
    name: string;
    email: string;
    password: string;
  };
  seedDemoProject?: boolean;
  targetUrl?: string;
  targetDirectUrl?: string;
}

export interface InitializeDatabaseReport {
  success: boolean;
  phase: "COMPLETED" | "FAILED";
  stepResults: {
    schemaCreated: boolean;
    schemaMessage: string;
    adminCreated: boolean;
    adminPreserved: boolean;
    adminEmail?: string;
    plansSyncedCount: number;
    parametersSyncedCount: number;
    policiesSyncedCount: number;
    demoProjectCreated: boolean;
  };
  durationMs: number;
  message: string;
  executedAt: string;
}

/**
 * Lista dos 35 modelos essenciais do schema Prisma do Tomadix.
 */
export const EXPECTED_SCHEMA_MODELS = [
  "User",
  "ConsentRecord",
  "DataSubjectRequest",
  "PlatformAuditLog",
  "Session",
  "AuditLog",
  "Workspace",
  "Plan",
  "Subscription",
  "Invoice",
  "CreditLedger",
  "ProcessedWebhookEvent",
  "Membership",
  "WorkspaceInvite",
  "Project",
  "ParameterDefinition",
  "ParameterValue",
  "Character",
  "Environment",
  "Scene",
  "SceneCharacter",
  "SceneEnvironment",
  "PromptTemplate",
  "PromptVersion",
  "GenerationJob",
  "CommercialPolicy",
  "CommercialSnapshot",
  "PaymentGatewayConfig",
  "GatewayPlanPriceMapping",
  "PaymentWebhookEvent",
  "CreditOperation",
  "CreditPricingRule",
  "CreditRenewalPolicy",
  "UserEntitlementOverride",
  "ProjectOwnershipTransfer",
];

export class AdminDatabaseService {
  /**
   * Mascara strings confidenciais como usuários e hosts para proteção contra vazamento.
   */
  private static maskString(str: string): string {
    if (!str || str.length <= 4) return "***";
    const start = str.substring(0, 2);
    const end = str.substring(str.length - 2);
    return `${start}***${end}`;
  }

  /**
   * Constrói uma string de conexão PostgreSQL normalizada a partir de inputs.
   */
  static buildConnectionString(input: ConnectionInput): { url: string; directUrl?: string } {
    if (input.url && input.url.trim() !== "") {
      const trimmed = input.url.trim();
      return { url: trimmed, directUrl: input.directUrl?.trim() || undefined };
    }

    const host = input.host?.trim() || "localhost";
    const port = input.port || 5432;
    const database = input.database?.trim() || "postgres";
    const user = encodeURIComponent(input.user?.trim() || "postgres");
    const password = encodeURIComponent(input.password || "");
    const sslMode = input.sslMode || (host === "localhost" || host === "127.0.0.1" ? "disable" : "require");

    let url = `postgresql://${user}:${password}@${host}:${port}/${database}`;
    const params: string[] = [];

    if (sslMode) {
      params.push(`sslmode=${sslMode}`);
    }

    if (input.connectionType === "supabase" || host.includes("supabase.com")) {
      if (port === 6543) {
        params.push("pgbouncer=true");
      }
    }

    if (params.length > 0) {
      url += `?${params.join("&")}`;
    }

    return {
      url,
      directUrl: input.directUrl?.trim() || undefined,
    };
  }

  /**
   * Extrai e sanitiza os parâmetros da conexão atual em uso no .env / process.env.
   */
  static getCurrentConnectionDetails(): SanitizedConnectionInfo {
    const rawUrl = process.env.DATABASE_URL || "";
    const rawDirectUrl = process.env.DIRECT_URL || "";

    try {
      const u = new URL(rawUrl);
      const isSupabase = u.hostname.includes("supabase");
      const port = parseInt(u.port, 10) || 5432;
      const isPooler = port === 6543 || u.searchParams.get("pgbouncer") === "true";
      const isLocal = u.hostname === "localhost" || u.hostname === "127.0.0.1";

      let directPort: number | undefined;
      if (rawDirectUrl) {
        try {
          const directU = new URL(rawDirectUrl);
          directPort = parseInt(directU.port, 10) || 5432;
        } catch {}
      }

      return {
        provider: "postgresql",
        engine: "PostgreSQL",
        hostMasked: isLocal ? u.hostname : this.maskString(u.hostname),
        port,
        database: u.pathname.replace(/^\//, ""),
        userMasked: this.maskString(decodeURIComponent(u.username || "postgres")),
        isSupabase,
        isPooler,
        hasDirectUrl: !!rawDirectUrl,
        directPort,
        sslMode: u.searchParams.get("sslmode") || (isLocal ? "disable" : "require"),
        environmentType: isSupabase ? "supabase" : isLocal ? "local" : "remote",
      };
    } catch {
      return {
        provider: "postgresql",
        engine: "PostgreSQL",
        hostMasked: "Indisponível",
        port: 5432,
        database: "postgres",
        userMasked: "***",
        isSupabase: false,
        isPooler: false,
        hasDirectUrl: false,
        sslMode: "require",
        environmentType: "remote",
      };
    }
  }

  /**
   * Testa a conectividade e latência com o banco atual ou com uma nova conexão temporária.
   */
  static async testConnection(target?: ConnectionInput): Promise<ConnectionTestResult> {
    const startTime = Date.now();
    let client: PrismaClient | null = null;
    let isTemporary = false;

    try {
      let targetUrl: string | undefined;

      if (target) {
        const built = this.buildConnectionString(target);
        targetUrl = built.url;
        isTemporary = true;
        client = new PrismaClient({
          datasources: {
            db: { url: targetUrl },
          },
          log: ["error"],
        });
      } else {
        client = db;
      }

      // 1. Tentar conectar e executar consulta leve
      const queryStart = Date.now();
      const rawResult: any = await withDbRetry(
        () =>
          client!.$queryRawUnsafe(
            "SELECT 1 as connected, version() as version, current_database() as database_name, NOW() as server_time"
          ),
        2,
        1000
      );
      const queryLatencyMs = Date.now() - queryStart;
      const totalLatencyMs = Date.now() - startTime;

      // 2. Consulta de metadados adicionais (tabelas e SSL)
      let tableCount = 0;
      let sslUsed = false;

      try {
        const tableCountResult: any = await client.$queryRawUnsafe(
          "SELECT count(*)::int as count FROM information_schema.tables WHERE table_schema = 'public'"
        );
        if (Array.isArray(tableCountResult) && tableCountResult[0]?.count !== undefined) {
          tableCount = Number(tableCountResult[0].count);
        }
      } catch {}

      try {
        const sslResult: any = await client.$queryRawUnsafe("SHOW ssl");
        if (Array.isArray(sslResult) && sslResult[0]?.ssl) {
          sslUsed = String(sslResult[0].ssl).toLowerCase() === "on";
        }
      } catch {}

      const row = Array.isArray(rawResult) ? rawResult[0] : rawResult;
      const parsedVersion = typeof row?.version === "string" ? row.version.split(" on ")[0] : "PostgreSQL";

      // Extrai host mascarado
      let hostMasked = "database.server";
      let port = 5432;
      let isSupabase = false;

      const urlToParse = targetUrl || process.env.DATABASE_URL;
      if (urlToParse) {
        try {
          const u = new URL(urlToParse);
          hostMasked = u.hostname === "localhost" ? "localhost" : this.maskString(u.hostname);
          port = parseInt(u.port, 10) || 5432;
          isSupabase = u.hostname.includes("supabase");
        } catch {}
      }

      return {
        success: true,
        status: "CONNECTED",
        totalLatencyMs,
        queryLatencyMs,
        version: parsedVersion,
        databaseName: row?.database_name || "postgres",
        serverTime: row?.server_time ? new Date(row.server_time).toISOString() : new Date().toISOString(),
        tableCount,
        sslUsed,
        hostMasked,
        port,
        isSupabase,
        testedAt: new Date().toISOString(),
      };
    } catch (err: any) {
      const totalLatencyMs = Date.now() - startTime;
      const errorMessage = err?.message || String(err);
      let status: ConnectionTestResult["status"] = "ERROR";
      const suggestions: string[] = [];

      if (errorMessage.includes("P1000") || errorMessage.includes("Authentication failed") || errorMessage.includes("password")) {
        status = "AUTH_FAILED";
        suggestions.push("Verifique se o usuário e a senha informados estão corretos.");
        suggestions.push("No Supabase, certifique-se de usar a senha do banco definida no painel de Database.");
      } else if (errorMessage.includes("P1001") || errorMessage.includes("Can't reach database server") || errorMessage.includes("ECONNREFUSED") || errorMessage.includes("ENOTFOUND")) {
        status = "UNREACHABLE";
        suggestions.push("Verifique se o host e a porta estão corretos e acessíveis.");
        suggestions.push("Verifique se a porta (5432 ou 6543) não está bloqueada por firewall corporativo ou antivírus.");
        suggestions.push("Se estiver usando Supabase na rede pública, confirme se a região e o pooler estão corretos.");
      } else if (errorMessage.includes("timed out") || errorMessage.includes("ETIMEDOUT")) {
        status = "TIMEOUT";
        suggestions.push("A conexão excedeu o tempo limite. Verifique a estabilidade da sua rede.");
        suggestions.push("Se o banco de dados estava pausado (como no tier gratuito do Supabase), aguarde 30s para que ele seja reativado.");
      } else {
        suggestions.push("Verifique a string de conexão e os certificados SSL/TLS.");
      }

      return {
        success: false,
        status,
        totalLatencyMs,
        queryLatencyMs: 0,
        testedAt: new Date().toISOString(),
        error: errorMessage.replace(/postgresql:\/\/[^@]+@/, "postgresql://***:***@"),
        errorCode: err?.code || "DB_TEST_FAILED",
        suggestions,
      };
    } finally {
      if (isTemporary && client) {
        await client.$disconnect().catch(() => {});
      }
    }
  }

  /**
   * Valores que vão para o .env. DIRECT_URL sempre é definida: a informada, a porta direta do Supabase
   * ou, em Postgres comum (sem pooler), a própria DATABASE_URL (senão ficaria apontando para o banco antigo).
   */
  static buildEnvValues(input: ConnectionInput): { databaseUrl: string; directUrl: string } {
    const { url, directUrl } = this.buildConnectionString(input);
    if (directUrl) return { databaseUrl: url, directUrl };
    const isSupabase = input.connectionType === "supabase" || url.includes("supabase.com");
    const direct = url.replace(":6543", ":5432").replace("?pgbouncer=true", "").replace("&pgbouncer=true", "");
    return { databaseUrl: url, directUrl: isSupabase ? direct : url };
  }

  /** Prévia do .env: `envText` tem os valores reais (para copiar); `envMasked` esconde a senha (para exibir). */
  static previewEnv(input: ConnectionInput): { envText: string; envMasked: string } {
    const { databaseUrl, directUrl } = this.buildEnvValues(input);
    const toText = (db: string, direct: string) => `DATABASE_URL="${db}"\nDIRECT_URL="${direct}"`;
    const mask = (v: string) => v.replace(/(\/\/[^:/@]*:)[^@]*(@)/, "$1********$2");
    return { envText: toText(databaseUrl, directUrl), envMasked: toText(mask(databaseUrl), mask(directUrl)) };
  }

  /**
   * Altera a conexão com o banco de dados no .env após validação obrigatória.
   */
  static async changeConnection(
    input: ConnectionInput,
    adminUserId: string
  ): Promise<{
    success: boolean;
    message: string;
    backupFile?: string;
    connectionInfo: SanitizedConnectionInfo;
    requiresRestart: boolean;
  }> {
    // 1. Validar e testar obrigatoriamente a nova conexão antes de alterar qualquer arquivo
    const testResult = await this.testConnection(input);
    if (!testResult.success) {
      throw new Error(
        `Falha ao testar a nova conexão com o banco de dados: ${testResult.error || "Servidor inacessível"}. Nenhuma alteração foi realizada na configuração ativa.`
      );
    }

    const { databaseUrl: url, directUrl } = this.buildEnvValues(input);

    // 2. Realizar backup seguro do arquivo .env
    const envPath = path.resolve(process.cwd(), ".env");
    let envContent = "";
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, "utf-8");
    }

    const timestamp = Date.now();
    const backupFileName = `.env.backup.${timestamp}`;
    const backupPath = path.resolve(process.cwd(), backupFileName);

    if (envContent) {
      writeEnvFile(backupPath, envContent);
    }

    // 3. Atualizar DATABASE_URL e DIRECT_URL no conteúdo do .env
    let updatedEnv = envContent;

    if (/^DATABASE_URL=.*$/m.test(updatedEnv)) {
      updatedEnv = updatedEnv.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL="${url}"`);
    } else {
      updatedEnv += `\nDATABASE_URL="${url}"`;
    }

    if (/^DIRECT_URL=.*$/m.test(updatedEnv)) {
      updatedEnv = updatedEnv.replace(/^DIRECT_URL=.*$/m, `DIRECT_URL="${directUrl}"`);
    } else {
      updatedEnv += `\nDIRECT_URL="${directUrl}"`;
    }

    writeEnvFile(envPath, updatedEnv);

    // 4. Atualizar processo ativo em memória
    process.env.DATABASE_URL = url;
    process.env.DIRECT_URL = directUrl;

    // 5. Registrar auditoria administrativa (sem registrar senhas)
    await AdminAuditService.logAction({
      adminUserId,
      action: "DATABASE_CONNECTION_CHANGED",
      targetType: "DATABASE_INFRASTRUCTURE",
      targetId: "ENV_CONFIG",
      details: {
        hostMasked: testResult.hostMasked,
        port: testResult.port,
        database: testResult.databaseName,
        isSupabase: testResult.isSupabase,
        tableCount: testResult.tableCount,
        backupFile: backupFileName,
      },
    });

    return {
      success: true,
      message: "Nova conexão com o banco de dados configurada e validada com sucesso!",
      backupFile: backupFileName,
      connectionInfo: this.getCurrentConnectionDetails(),
      requiresRestart: true,
    };
  }

  /**
   * Diagnostica a estrutura do banco de dados (tabelas existentes vs ausentes, admin, dados).
   */
  static async diagnoseDatabase(targetUrl?: string): Promise<DatabaseDiagnosis> {
    let client = db;
    let isTemporary = false;

    if (targetUrl) {
      isTemporary = true;
      client = new PrismaClient({
        datasources: { db: { url: targetUrl } },
        log: ["error"],
      });
    }

    try {
      // 1. Obter tabelas do schema public
      const tablesRaw: any = await client.$queryRawUnsafe(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"
      );

      const existingTableNames = new Set(
        Array.isArray(tablesRaw)
          ? tablesRaw.map((r: any) => String(r.table_name || "").toLowerCase().replace(/"/g, ""))
          : []
      );

      const existingTables: string[] = [];
      const missingTables: string[] = [];

      for (const expectedModel of EXPECTED_SCHEMA_MODELS) {
        if (existingTableNames.has(expectedModel.toLowerCase())) {
          existingTables.push(expectedModel);
        } else {
          missingTables.push(expectedModel);
        }
      }

      // 2. Verificar Administradores
      let hasSuperAdmin = false;
      let superAdminCount = 0;
      let superAdminEmailMasked: string | undefined;

      const hasUserTable = existingTables.includes("User");
      if (hasUserTable) {
        try {
          const admins = await client.user.findMany({
            where: {
              platformRole: { in: [PlatformRole.ADMIN, PlatformRole.SUPER_ADMIN] },
            },
            select: { email: true, platformRole: true },
          });

          superAdminCount = admins.length;
          hasSuperAdmin = admins.length > 0;
          if (admins[0]?.email) {
            superAdminEmailMasked = this.maskString(admins[0].email);
          }
        } catch {}
      }

      // 3. Contagem de Planos, Parâmetros e Políticas
      let plansCount = 0;
      let parametersCount = 0;
      let policiesCount = 0;
      let projectsCount = 0;

      if (existingTables.includes("Plan")) {
        try {
          plansCount = await client.plan.count();
        } catch {}
      }

      if (existingTables.includes("ParameterDefinition")) {
        try {
          parametersCount = await client.parameterDefinition.count();
        } catch {}
      }

      if (existingTables.includes("CommercialPolicy")) {
        try {
          policiesCount = await client.commercialPolicy.count();
        } catch {}
      }

      if (existingTables.includes("Project")) {
        try {
          projectsCount = await client.project.count();
        } catch {}
      }

      const totalExpected = EXPECTED_SCHEMA_MODELS.length;
      let status: DatabaseDiagnosis["status"] = "EMPTY";

      if (existingTables.length === totalExpected) {
        status = "READY";
      } else if (existingTables.length > 0) {
        status = "PARTIAL";
      }

      const isReadyForProduction =
        status === "READY" && hasSuperAdmin && plansCount >= 4 && parametersCount > 0;

      return {
        status,
        totalExpectedTables: totalExpected,
        existingTablesCount: existingTables.length,
        missingTablesCount: missingTables.length,
        existingTables,
        missingTables,
        hasSuperAdmin,
        superAdminCount,
        superAdminEmailMasked,
        plansCount,
        parametersCount,
        policiesCount,
        projectsCount,
        isReadyForProduction,
        analyzedAt: new Date().toISOString(),
      };
    } finally {
      if (isTemporary && client) {
        await client.$disconnect().catch(() => {});
      }
    }
  }

  /**
   * Inicializa de forma idempotente e segura o banco de dados:
   * 1. Cria tabelas ausentes (Prisma schema sync).
   * 2. Provisiona o administrador inicial (caso não exista).
   * 3. Sincroniza planos, parâmetros dinâmicos, políticas de cobrança e gateways.
   * 4. Gera projeto de demonstração cinematográfico para o administrador.
   */
  static async initializeDatabase(
    options: InitializeDatabaseOptions = {},
    adminUserId?: string
  ): Promise<InitializeDatabaseReport> {
    const startTime = Date.now();
    let schemaCreated = false;
    let schemaMessage = "";
    let adminCreated = false;
    let adminPreserved = false;
    let createdAdminEmail: string | undefined;
    let plansSyncedCount = 0;
    let parametersSyncedCount = 0;
    let policiesSyncedCount = 0;
    let demoProjectCreated = false;

    // FASE 1: Sincronização do Schema e Criação das Tabelas Ausentes
    const initialDiagnosis = await this.diagnoseDatabase(options.targetUrl);

    if (initialDiagnosis.missingTablesCount > 0) {
      try {
        const targetEnv: NodeJS.ProcessEnv = {
          ...process.env,
        };

        if (options.targetUrl) {
          targetEnv.DATABASE_URL = options.targetUrl;
          targetEnv.DIRECT_URL = options.targetDirectUrl || options.targetUrl;
        }

        // Executa prisma db push sem geração de client e sem aceitar data loss destrutivo
        await execAsync("npx prisma db push --skip-generate --accept-data-loss=false", {
          env: targetEnv,
          timeout: 60000,
        });

        schemaCreated = true;
        schemaMessage = "Tabelas e constraints sincronizadas com sucesso pelo Prisma.";
      } catch (err: any) {
        // Se prisma db push falhar (ex: pooler de transação sem suporte DDL direto),
        // registrar a mensagem mas permitir continuidade caso as tabelas básicas já existam
        schemaCreated = false;
        schemaMessage = `Aviso na sincronização de migrations: ${err?.message || "Comando excedeu timeout"}.`;
      }
    } else {
      schemaCreated = true;
      schemaMessage = "Todas as 35 tabelas do schema já existem no banco de dados.";
    }

    // FASE 2: Provisionamento do Administrador Inicial
    let effectiveAdminUserId = adminUserId;
    const existingAdmin = await db.user.findFirst({
      where: {
        platformRole: { in: [PlatformRole.ADMIN, PlatformRole.SUPER_ADMIN] },
      },
    });

    if (existingAdmin) {
      adminPreserved = true;
      effectiveAdminUserId = effectiveAdminUserId || existingAdmin.id;
      createdAdminEmail = existingAdmin.email;
    } else if (options.adminUser) {
      // Validar dados do administrador solicitado
      const { name, email, password } = options.adminUser;
      if (!email || !email.includes("@")) {
        throw new Error("E-mail inválido para o administrador inicial.");
      }
      if (!password || password.length < 8) {
        throw new Error("A senha do administrador deve conter no mínimo 8 caracteres.");
      }

      const passwordHash = await hashPassword(password);
      const cleanEmail = email.toLowerCase().trim();

      const newAdmin = await db.user.create({
        data: {
          displayName: name.trim() || "Administrador Geral",
          email: cleanEmail,
          authSubject: `admin_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          passwordHash,
          platformRole: PlatformRole.SUPER_ADMIN,
          emailConfirmed: true,
          onboardingCompleted: true,
        },
      });

      // Cria Workspace Principal para o novo Admin
      await db.workspace.create({
        data: {
          name: "Estúdio Principal",
          slug: `estudio-principal-${Date.now().toString(36)}`,
          isPersonal: true,
          memberships: {
            create: {
              userId: newAdmin.id,
              role: WorkspaceRole.OWNER,
            },
          },
        },
      });

      adminCreated = true;
      effectiveAdminUserId = newAdmin.id;
      createdAdminEmail = cleanEmail;
    }

    // FASE 3: Sincronização de Planos Comerciais Padrão
    for (const dp of Object.values(DEFAULT_PLANS)) {
      const isUnlimited = dp.maxProjects === -1;
      await db.plan.upsert({
        where: { tier: dp.tier as PlanTier },
        create: {
          tier: dp.tier as PlanTier,
          code: dp.tier.toLowerCase(),
          name: dp.name,
          description: dp.description,
          priceMonthly: dp.priceMonthly,
          priceYearly: dp.priceYearly,
          currency: dp.currency,
          maxProjects: isUnlimited ? 0 : dp.maxProjects,
          unlimitedProjects: isUnlimited,
          maxMembers: dp.maxMembers,
          unlimitedMembers: dp.maxMembers >= 50,
          monthlyCredits: dp.monthlyCredits,
          features: dp.features,
          enabledTemplates: dp.enabledTemplates,
          exportAllowed: dp.exportAllowed,
          visualBibleAdvanced: dp.visualBibleAdvanced,
          hasPremiumTemplates: dp.tier !== PlanTier.FREE,
          hasAdvancedParameters: dp.tier !== PlanTier.FREE,
          commercialStatus: "ACTIVE",
          isPublic: true,
          isActive: true,
        },
        update: {},
      });
      plansSyncedCount++;
    }

    // FASE 4: Sincronização de Parâmetros Cinematográficos Dinâmicos
    if (effectiveAdminUserId) {
      try {
        const paramResult = await AdminParametersService.syncDefaultCinematicParameters(effectiveAdminUserId);
        parametersSyncedCount = paramResult.syncedCount;
      } catch (err) {
        console.warn("Aviso ao sincronizar parâmetros:", err);
      }
    }

    // FASE 5: Sincronização de Políticas Comerciais e Gateways
    try {
      await BillingPolicyService.seedDefaultPolicies();
      await CreditPricingService.seedDefaultOperations();
      await CreditRenewalService.seedDefaultPolicies();
      await GatewayManagerService.seedDefaultGateways();
      policiesSyncedCount += 4;
    } catch (err) {
      console.warn("Aviso ao sincronizar políticas comerciais:", err);
    }

    // Garantir que as configurações padrão de personalização e sistema estejam persistidas
    try {
      await db.commercialPolicy.upsert({
        where: { key: "PLATFORM_CUSTOMIZATION" },
        create: {
          key: "PLATFORM_CUSTOMIZATION",
          category: "BRANDING",
          label: "Identidade Visual e Personalização da Plataforma",
          description: "Logotipo, cores e variáveis CSS do Tomadix.",
          dataType: "json",
          value: DEFAULT_CUSTOMIZATION as any,
          defaultValue: DEFAULT_CUSTOMIZATION as any,
          isSystem: true,
        },
        update: {},
      });

      await db.commercialPolicy.upsert({
        where: { key: "PLATFORM_GENERAL_SETTINGS" },
        create: {
          key: "PLATFORM_GENERAL_SETTINGS",
          category: "SYSTEM",
          label: "Configurações Gerais da Plataforma",
          description: "Nome, contato, modo de manutenção e flags globais.",
          dataType: "json",
          value: DEFAULT_GENERAL_SETTINGS as any,
          defaultValue: DEFAULT_GENERAL_SETTINGS as any,
          isSystem: true,
        },
        update: {},
      });
      policiesSyncedCount += 2;
    } catch (err) {
      console.warn("Aviso ao persistir políticas de personalização:", err);
    }

    // FASE 6: Criação do Projeto de Demonstração / Tutorial (Opcional)
    if (options.seedDemoProject !== false && effectiveAdminUserId) {
      try {
        // Encontra o workspace pessoal do admin
        const adminWs = await db.workspace.findFirst({
          where: {
            memberships: {
              some: { userId: effectiveAdminUserId, role: WorkspaceRole.OWNER },
            },
          },
          include: {
            projects: { select: { id: true } },
          },
        });

        if (adminWs && adminWs.projects.length === 0) {
          const demoProject = await db.project.create({
            data: {
              workspaceId: adminWs.id,
              title: "O Brasil em VHS • Cinema Noir",
              description: "Projeto tutorial oficial com estética vintage analógica anos 90, iluminação chiaroscuro e direção de arte completa.",
              genre: "Suspense / Noir",
              language: "pt-BR",
              durationSeconds: 30,
              configuration: {
                aspectRatio: "2.39:1",
                targetPlatform: "Midjourney v6",
                colorGrade: "Preto e Branco / Tons Terrosos Desbotados",
                pacing: "Lento / Contemplativo",
                isDemoTutorial: true,
              },
            },
          });

          // Adicionar personagem demonstrativo
          const char = await db.character.create({
            data: {
              projectId: demoProject.id,
              name: "Detetive Moura",
              description: "Homem de 45 anos, feições cansadas, sobretudo cinza escuro, cigarro apagado entre os dedos.",
              attributes: {
                role: "Protagonista",
                hair: "Grisalho despenteado",
                eyes: "Castanho escuro penetrante",
                clothing: "Trench coat escuro com gola levantada",
              },
            },
          });

          // Adicionar ambiente demonstrativo
          const env = await db.environment.create({
            data: {
              projectId: demoProject.id,
              name: "Gabinete Noturno com Persianas",
              description: "Escritório antigo no centro da cidade, chuva fina batendo na janela e sombras projetadas pelas persianas de madeira.",
              attributes: {
                type: "Interior",
                lightingStyle: "Chiaroscuro • Luz de Tungstênio Lateral",
              },
            },
          });

          // Adicionar cena demonstrativa
          await db.scene.create({
            data: {
              projectId: demoProject.id,
              order: 1,
              title: "Cena 1 • Confronto sob Luz de Tungstênio",
              description: "Moura analisa documentos sobre a escrivaninha de mogno enquanto a chuva escorre pela vidraça.",
              configuration: {
                shotType: "Plano Médio (Medium Shot)",
                cameraAngle: "Eye-level / Ligeiro contra-plongée",
                cameraMovement: "Estático com respiração orgânica de câmera na mão",
              },
              characters: {
                create: { characterId: char.id },
              },
              environments: {
                create: { environmentId: env.id },
              },
            },
          });

          demoProjectCreated = true;
        }
      } catch (err) {
        console.warn("Aviso ao criar projeto de demonstração:", err);
      }
    }

    // FASE 7: Auditoria
    if (effectiveAdminUserId) {
      await AdminAuditService.logAction({
        adminUserId: effectiveAdminUserId,
        action: "DATABASE_INITIALIZATION_EXECUTED",
        targetType: "DATABASE_INFRASTRUCTURE",
        targetId: "SCHEMA_AND_SEEDS",
        details: {
          schemaCreated,
          adminCreated,
          adminPreserved,
          plansSyncedCount,
          parametersSyncedCount,
          policiesSyncedCount,
          demoProjectCreated,
          durationMs: Date.now() - startTime,
        },
      });
    }

    const durationMs = Date.now() - startTime;
    return {
      success: true,
      phase: "COMPLETED",
      stepResults: {
        schemaCreated,
        schemaMessage,
        adminCreated,
        adminPreserved,
        adminEmail: createdAdminEmail,
        plansSyncedCount,
        parametersSyncedCount,
        policiesSyncedCount,
        demoProjectCreated,
      },
      durationMs,
      message: "Inicialização completa da plataforma executada com sucesso!",
      executedAt: new Date().toISOString(),
    };
  }
}
