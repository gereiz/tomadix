import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspace, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { ParameterService } from "@/modules/parameters/parameter.service";
import { saveParameterValuesSchema } from "@/modules/parameters/parameter.schema";
import { TargetContext, ParameterValidationError } from "@/modules/parameters/parameter-resolver.service";
import { ZodError } from "zod";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId } = await params;
    const { workspace } = await getCurrentWorkspace();
    const { searchParams } = new URL(request.url);

    const targetType = (searchParams.get("targetType") || "PROJECT") as TargetContext["type"];
    const targetId = searchParams.get("targetId") ?? undefined;

    const resolution = await ParameterService.resolveForProject(projectId, workspace.id, {
      type: targetType,
      id: targetId,
    });

    return NextResponse.json({
      data: resolution,
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof ParameterValidationError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    console.error("Erro ao resolver parâmetros do projeto:", error);
    return NextResponse.json({ error: "Erro ao resolver parâmetros." }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId } = await params;
    const { workspace } = await getCurrentWorkspace();
    const body = await request.json();

    const validated = saveParameterValuesSchema.parse({
      ...body,
      projectId,
    });

    const saved = await ParameterService.saveValues(
      projectId,
      workspace.id,
      validated.values.map((v) => ({
        parameterDefinitionId: v.parameterDefinitionId,
        targetType: v.targetType,
        targetId: v.targetId ?? null,
        value: v.value ?? null,
      }))
    );

    return NextResponse.json({
      message: "Valores de parâmetros salvos com sucesso.",
      data: saved,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Dados de valores inválidos.",
          issues: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        },
        { status: 422 }
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Erro ao salvar valores de parâmetros:", error);
    return NextResponse.json({ error: "Erro interno ao salvar parâmetros." }, { status: 500 });
  }
}
