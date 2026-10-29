import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspace, AuthenticationError, AuthorizationError } from "@/lib/auth";
import { ProjectParameterConfigService } from "@/modules/projects/project-parameter-config.service";
import { z } from "zod";

type RouteParams = {
  params: Promise<{ id: string }>;
};

const updateSettingsSchema = z.object({
  enabledCategories: z.array(z.string()).optional(),
  enabledParameterKeys: z.array(z.string()),
  defaultValues: z.record(z.unknown()).default({}),
});

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId } = await params;
    const { workspace } = await getCurrentWorkspace();

    const data = await ProjectParameterConfigService.getProjectParameterSettings(
      projectId,
      workspace.id
    );

    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Erro ao carregar configurações de parâmetros do projeto:", error);
    return NextResponse.json(
      { error: "Erro ao carregar configurações de parâmetros do projeto." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId } = await params;
    const { workspace } = await getCurrentWorkspace();
    const body = await request.json();

    const validated = updateSettingsSchema.parse(body);

    const updated = await ProjectParameterConfigService.updateProjectParameterSettings(
      projectId,
      workspace.id,
      {
        enabledCategories: validated.enabledCategories as any,
        enabledParameterKeys: validated.enabledParameterKeys,
        defaultValues: validated.defaultValues,
      }
    );

    return NextResponse.json({
      message: "Configuração cinematográfica salva com sucesso.",
      data: updated,
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Dados inválidos.",
          issues: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        },
        { status: 422 }
      );
    }
    console.error("Erro ao salvar configurações de parâmetros do projeto:", error);
    return NextResponse.json(
      { error: "Erro interno ao salvar configurações de parâmetros." },
      { status: 500 }
    );
  }
}
