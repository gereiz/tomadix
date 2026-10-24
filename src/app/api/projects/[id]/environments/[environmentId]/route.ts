import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspace, AuthorizationError } from "@/lib/auth";
import { EnvironmentService } from "@/modules/environments/environment.service";
import { updateEnvironmentSchema } from "@/modules/environments/environment.schema";
import { ZodError } from "zod";

type RouteParams = {
  params: Promise<{ id: string; environmentId: string }>;
};

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId, environmentId } = await params;
    const { workspace } = await getCurrentWorkspace();

    const env = await EnvironmentService.getEnvironmentById(environmentId, projectId, workspace.id);
    if (!env) {
      return NextResponse.json({ error: "Ambiente não encontrado." }, { status: 404 });
    }

    return NextResponse.json({ data: env });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Erro ao buscar ambiente." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId, environmentId } = await params;
    const { workspace } = await getCurrentWorkspace();
    const body = await request.json();

    const validatedInput = updateEnvironmentSchema.parse(body);

    const updated = await EnvironmentService.updateEnvironment(
      environmentId,
      projectId,
      workspace.id,
      validatedInput
    );

    return NextResponse.json({
      message: "Ambiente atualizado com sucesso.",
      data: updated,
    });
  } catch (error) {
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
    return NextResponse.json({ error: "Erro ao atualizar ambiente." }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId, environmentId } = await params;
    const { workspace } = await getCurrentWorkspace();

    await EnvironmentService.deleteEnvironment(environmentId, projectId, workspace.id);

    return NextResponse.json({ message: "Ambiente excluído com sucesso." });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Erro ao excluir ambiente." }, { status: 500 });
  }
}
