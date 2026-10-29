import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspace, requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { ParameterService } from "@/modules/parameters/parameter.service";
import { updateParameterDefinitionSchema } from "@/modules/parameters/parameter.schema";
import { ZodError } from "zod";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { workspace } = await getCurrentWorkspace(null, "parameters:read");

    const parameter = await ParameterService.getParameterById(id, workspace.id);
    if (!parameter) {
      return NextResponse.json({ error: "Parâmetro não encontrado." }, { status: 404 });
    }

    return NextResponse.json({ data: parameter });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Erro ao obter parâmetro:", error);
    return NextResponse.json({ error: "Erro interno ao buscar parâmetro." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    await requirePlatformAdmin();
    const { id } = await params;
    const { workspace } = await getCurrentWorkspace(null, "parameters:read");

    const body = await request.json();
    const validatedData = updateParameterDefinitionSchema.parse(body);

    const updated = await ParameterService.updateParameter(id, workspace.id, validatedData);

    return NextResponse.json({
      message: "Parâmetro atualizado com sucesso.",
      data: updated,
    });
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
          error: "Dados inválidos.",
          issues: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        },
        { status: 422 }
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Erro ao atualizar parâmetro:", error);
    return NextResponse.json({ error: "Erro interno ao atualizar parâmetro." }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    await requirePlatformAdmin();
    const { id } = await params;
    const { workspace } = await getCurrentWorkspace(null, "parameters:read");

    await ParameterService.deleteParameter(id, workspace.id);

    return NextResponse.json({ message: "Parâmetro excluído com sucesso." });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Erro ao excluir parâmetro:", error);
    return NextResponse.json({ error: "Erro interno ao excluir parâmetro." }, { status: 500 });
  }
}
