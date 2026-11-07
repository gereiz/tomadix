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
