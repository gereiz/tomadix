import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspace, AuthorizationError } from "@/lib/auth";
import { EnvironmentService } from "@/modules/environments/environment.service";
import { createEnvironmentSchema } from "@/modules/environments/environment.schema";
import { ZodError } from "zod";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId } = await params;
    const { workspace } = await getCurrentWorkspace();
    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search") ?? undefined;
    const status = (searchParams.get("status") || "active") as "active" | "archived" | "all";

    const environments = await EnvironmentService.listEnvironments(projectId, workspace.id, {
      search,
      status,
    });

    return NextResponse.json({
      data: environments,
      total: environments.length,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Erro ao buscar ambientes." }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId } = await params;
    const { workspace } = await getCurrentWorkspace();
    const body = await request.json();

    const validatedInput = createEnvironmentSchema.parse(body);

    const created = await EnvironmentService.createEnvironment(
      projectId,
      workspace.id,
      validatedInput
    );

    return NextResponse.json(
      {
        message: "Ambiente criado com sucesso.",
        data: created,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Dados do ambiente inválidos.",
          issues: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        },
        { status: 422 }
      );
    }
    return NextResponse.json({ error: "Erro ao criar ambiente." }, { status: 500 });
  }
}
