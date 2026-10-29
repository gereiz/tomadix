import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { AdminParametersService } from "@/modules/admin/admin-parameters.service";
import { z } from "zod";

const updateParameterSchema = z.object({
  label: z.string().trim().min(1).optional(),
  description: z.string().optional().nullable(),
  type: z
    .enum([
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
    ])
    .optional(),
  category: z
    .enum([
      "CAMERA",
      "LENS",
      "FRAMING",
      "MOVEMENT",
      "LIGHTING",
      "AESTHETICS",
      "ART_ATMOSPHERE",
      "AUDIO",
      "CONTINUITY",
    ])
    .optional(),
  scope: z
    .enum(["GLOBAL", "CHARACTER", "ENVIRONMENT", "SCENE", "OUTPUT"])
    .optional(),
  scopes: z.array(z.string()).optional(),
  required: z.boolean().optional(),
  defaultValue: z.unknown().optional(),
  options: z
    .array(
      z.object({
        value: z.string().min(1),
        label: z.string().min(1),
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
  enabled: z.boolean().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requirePlatformAdmin();
    const { id } = await params;

    const body = await request.json();
    const parsed = updateParameterSchema.safeParse(body);

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return NextResponse.json(
        { error: firstIssue?.message || "Dados inválidos para atualização do parâmetro." },
        { status: 400 }
      );
    }

    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
    const userAgent = request.headers.get("user-agent") || undefined;

    const updated = await AdminParametersService.updateGlobalParameter(
      id,
      parsed.data as any,
      adminUser.id,
      { ipAddress, userAgent }
    );

    return NextResponse.json({
      parameter: updated,
      message: `Parâmetro '${updated.label}' atualizado com sucesso.`,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro interno ao atualizar parâmetro." },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requirePlatformAdmin();
    const { id } = await params;

    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
    const userAgent = request.headers.get("user-agent") || undefined;

    const result = await AdminParametersService.deleteGlobalParameter(
      id,
      adminUser.id,
      { ipAddress, userAgent }
    );

    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro interno ao excluir parâmetro." },
      { status: 400 }
    );
  }
}
