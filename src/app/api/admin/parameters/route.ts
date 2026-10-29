import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { AdminParametersService } from "@/modules/admin/admin-parameters.service";
import { z } from "zod";

const createParameterSchema = z.object({
  key: z
    .string()
    .trim()
    .min(2, "A chave deve ter no mínimo 2 caracteres.")
    .max(64, "A chave deve ter no máximo 64 caracteres.")
    .regex(/^[a-z][a-z0-9_]*$/, "A chave deve estar em formato snake_case minúsculo."),
  label: z.string().trim().min(1, "O rótulo do parâmetro é obrigatório."),
  description: z.string().optional().nullable(),
  type: z.enum([
    "TEXT",
    "TEXTAREA",
    "SELECT",
    "MULTISELECT",
    "NUMBER",
    "RANGE",
    "BOOLEAN",
    "DURATION",
    "JSON",
    "DATE",
  ]),
  category: z.enum([
    "CAMERA",
    "LENS",
    "FRAMING",
    "MOVEMENT",
    "LIGHTING",
    "AESTHETICS",
    "ART_ATMOSPHERE",
    "AUDIO",
    "CONTINUITY",
  ]),
  scope: z.enum(["GLOBAL", "CHARACTER", "ENVIRONMENT", "SCENE", "OUTPUT"]).default("GLOBAL"),
  scopes: z.array(z.string()).optional(),
  required: z.boolean().default(false),
  defaultValue: z.unknown().optional(),
  options: z
    .array(
      z.object({
        value: z.string().min(1, "O valor da opção não pode ser vazio."),
        label: z.string().min(1, "O rótulo da opção não pode ser vazio."),
        description: z.string().optional(),
        imageUrl: z.string().optional().nullable(),
        whatToLookFor: z.string().optional().nullable(),
        comparisonNotes: z.string().optional().nullable(),
      })
    )
    .optional(),
  validationRules: z.any().optional(),
  visibilityRules: z.any().optional(),
  promptMapping: z
    .object({
      target: z.string().optional(),
      instruction: z.string().optional(),
      category: z.string().optional(),
      prefix: z.string().optional(),
      suffix: z.string().optional(),
    })
    .optional(),
  order: z.number().int().optional(),
  enabled: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  try {
    await requirePlatformAdmin();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || undefined;
    const scope = searchParams.get("scope") || undefined;
    const type = searchParams.get("type") || undefined;
    const status = (searchParams.get("status") as any) || undefined;
    const isSystem = (searchParams.get("isSystem") as any) || undefined;
    const search = searchParams.get("search") || undefined;

    const [metrics, result] = await Promise.all([
      AdminParametersService.getGlobalMetrics(),
      AdminParametersService.listGlobalParameters({
        category,
        scope,
        type,
        status,
        isSystem,
        search,
      }),
    ]);

    return NextResponse.json({
      metrics,
      parameters: result.parameters,
      total: result.total,
      categories: result.categories,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro interno ao listar parâmetros administrativos." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminUser = await requirePlatformAdmin();

    const body = await request.json();
    const parsed = createParameterSchema.safeParse(body);

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return NextResponse.json(
        { error: firstIssue?.message || "Dados inválidos para criação do parâmetro." },
        { status: 400 }
      );
    }

    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
    const userAgent = request.headers.get("user-agent") || undefined;

    const created = await AdminParametersService.createGlobalParameter(
      parsed.data as any,
      adminUser.id,
      { ipAddress, userAgent }
    );

    return NextResponse.json(
      {
        parameter: created,
        message: `Parâmetro '${created.label}' criado com sucesso na categoria ${created.categoryName}.`,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro interno ao criar parâmetro global." },
      { status: 400 }
    );
  }
}
