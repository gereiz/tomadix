import { NextResponse } from "next/server";
import { z } from "zod";

export type ParsedBody<T> =
  | { data: T; response?: undefined }
  | { data?: undefined; response: NextResponse };

/**
 * Lê o corpo JSON da requisição e valida com Zod.
 * Em caso de corpo ausente/inválido devolve uma resposta 400 padronizada.
 */
export async function parseJsonBody<S extends z.ZodTypeAny>(
  request: Request,
  schema: S
): Promise<ParsedBody<z.output<S>>> {
  const raw = await request.json().catch(() => undefined);
  const result = schema.safeParse(raw ?? {});

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    const field = firstIssue?.path?.join(".");
    return {
      response: NextResponse.json(
        {
          error: field
            ? `Parâmetro inválido (${field}): ${firstIssue.message}`
            : firstIssue?.message || "Corpo da requisição inválido.",
          details: result.error.flatten().fieldErrors,
        },
        { status: 400 }
      ),
    };
  }

  return { data: result.data };
}

const secret = z.string().min(1, "Obrigatório.").max(200, "Muito longo.");

export const checkoutBodySchema = z.object({
  workspaceId: z.string().min(1, "Obrigatório."),
  planTier: z.enum(["FREE", "PRO", "TEAM", "ENTERPRISE"], { message: "Plano inválido." }),
  interval: z.enum(["MONTHLY", "YEARLY"]).optional(),
});

export const cancelBodySchema = z.object({
  workspaceId: z.string().min(1, "Obrigatório."),
  atPeriodEnd: z.boolean().optional().default(true),
});

export const changePasswordBodySchema = z.object({
  currentPassword: secret,
  newPassword: secret,
});

export const deleteAccountBodySchema = z.object({
  passwordConfirmation: secret,
});

export const updateProfileBodySchema = z.object({
  displayName: z.string().trim().min(1, "Obrigatório.").max(100, "Muito longo.").optional(),
  preferences: z.record(z.string(), z.unknown()).optional(),
});

export const transferOwnershipBodySchema = z.object({
  newOwnerMembershipId: z.string().min(1, "Obrigatório."),
});

export const createInviteBodySchema = z.object({
  email: z.string().trim().email("E-mail inválido.").max(254, "Muito longo."),
  role: z.enum(["ADMIN", "MEMBER", "VIEWER"]).optional().default("MEMBER"),
});

export const transferProjectBodySchema = z.object({
  targetWorkspaceId: z.string().min(1, "Obrigatório."),
});

export const onboardingStepBodySchema = z.object({
  step: z.coerce.number().int().min(1).max(10).optional().default(1),
  completed: z.boolean().optional().default(false),
});

export const adjustCreditsBodySchema = z.object({
  workspaceId: z.string().min(1, "Obrigatório."),
  amount: z
    .number()
    .int("Use um número inteiro.")
    .refine((v) => v !== 0, "O ajuste não pode ser zero.")
    .refine((v) => Math.abs(v) <= 1_000_000, "Ajuste acima do limite permitido."),
  reason: z.string().trim().min(3, "Informe o motivo.").max(500, "Muito longo."),
});

// ---------------------------------------------------------------------------
// Administração: banco de dados e chaves Gemini
// ---------------------------------------------------------------------------

// Inteiro opcional que tolera null (campo vazio/NaN no formulário) e vira undefined.
const optionalInt = (min: number, max: number) =>
  z
    .number()
    .int()
    .min(min)
    .max(max)
    .nullish()
    .transform((v) => v ?? undefined);

const postgresUrl = z
  .string()
  .max(2000, "Muito longo.")
  .refine((v) => v.trim() === "" || /^postgres(ql)?:\/\//i.test(v.trim()), "Use uma URL postgresql://");

export const connectionInputBodySchema = z.object({
  url: postgresUrl.optional(),
  host: z.string().trim().max(255).optional(),
  port: optionalInt(1, 65535),
  database: z.string().trim().max(128).optional(),
  user: z.string().trim().max(128).optional(),
  password: z.string().max(500).optional(),
  sslMode: z.enum(["disable", "require", "prefer"]).optional(),
  directUrl: postgresUrl.optional(),
  connectionType: z.enum(["supabase", "postgres_local", "postgres_remote"]).optional(),
});

export const changeConnectionBodySchema = connectionInputBodySchema.refine(
  (v) => Boolean(v.url?.trim()) || Boolean(v.host?.trim()),
  { message: "É necessário fornecer a URL de conexão ou o host e credenciais." }
);

export const diagnoseBodySchema = z.object({
  targetUrl: postgresUrl.optional(),
});

export const initializeDatabaseBodySchema = z.object({
  adminUser: z
    .object({
      name: z.string().trim().min(1, "Obrigatório.").max(100),
      email: z.string().trim().email("E-mail inválido.").max(254),
      password: z.string().min(8, "Mínimo de 8 caracteres.").max(200),
    })
    .optional(),
  seedDemoProject: z.boolean().optional(),
  targetUrl: postgresUrl.optional(),
  targetDirectUrl: postgresUrl.optional(),
});

const allowedModels = z.array(z.string().trim().min(1).max(100)).max(50);

export const createGeminiKeyBodySchema = z.object({
  name: z.string().trim().min(1, "O nome identificador da chave é obrigatório.").max(100),
  apiKey: z.string().trim().min(10, "A API Key fornecida é inválida ou muito curta.").max(500),
  priority: optionalInt(0, 10000),
  isActive: z.boolean().optional().default(true),
  allowedModels: allowedModels.optional().default([]),
  notes: z.string().max(1000).optional(),
});

export const updateGeminiKeyBodySchema = z.object({
  name: z.string().trim().max(100).optional(),
  apiKey: z.string().max(500).optional(),
  priority: optionalInt(0, 10000),
  isActive: z.boolean().optional(),
  allowedModels: allowedModels.optional(),
  notes: z.string().max(1000).optional(),
});

export const geminiPrioritiesBodySchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1, "A lista orderedIds é obrigatória.").max(200),
});

export const geminiSettingsBodySchema = z.object({
  selectionStrategy: z.enum(["SEQUENTIAL_PRIORITY", "BALANCED", "LEAST_USED"]).optional(),
  maxConsecutiveFailures: z.number().int().min(1).max(1000).optional(),
  cooldownSeconds: z.number().int().min(0).max(86400).optional(),
  requestTimeoutMs: z.number().int().min(1000).max(600000).optional(),
  maxAttemptsPerOperation: z.number().int().min(1).max(50).optional(),
  envKeyFallbackAllowed: z.boolean().optional(),
});
