import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspace, requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { ParameterService } from "@/modules/parameters/parameter.service";
import { parameterDefinitionSchema } from "@/modules/parameters/parameter.schema";
import { ZodError } from "zod";

export async function GET(request: NextRequest) {
  try {
    const { workspace } = await getCurrentWorkspace(null, "parameters:read");
    const { searchParams } = new URL(request.url);

    const scope = searchParams.get("scope") ?? undefined;
    const type = searchParams.get("type") ?? undefined;
    const search = searchParams.get("search") ?? undefined;
    const enabledParam = searchParams.get("enabled");

    let enabled: boolean | "all" = "all";
    if (enabledParam === "true") enabled = true;
    if (enabledParam === "false") enabled = false;

    const parameters = await ParameterService.listParameters(workspace.id, {
      scope,
      type,
      search,
      enabled,
    });

    return NextResponse.json({
      data: parameters,
      total: parameters.length,
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Erro ao listar parâmetros:", error);
    return NextResponse.json({ error: "Erro interno ao listar parâmetros." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requirePlatformAdmin();
    const { workspace } = await getCurrentWorkspace(null, "parameters:read");
    const body = await request.json();

    const validatedInput = parameterDefinitionSchema.parse(body);

    const created = await ParameterService.createParameter(workspace.id, validatedInput);

    return NextResponse.json(
      {
        message: "Definição de parâmetro criada com sucesso.",
        data: created,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Dados do parâmetro inválidos.",
          issues: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        },
        { status: 422 }
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Erro ao criar parâmetro:", error);
    return NextResponse.json({ error: "Erro interno ao salvar parâmetro." }, { status: 500 });
  }
}
