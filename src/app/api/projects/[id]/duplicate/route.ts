import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspace, AuthorizationError } from "@/lib/auth";
import { ProjectService } from "@/modules/projects/project.service";
import { duplicateProjectSchema } from "@/lib/schemas/project";
import { EntitlementError } from "@/modules/billing/entitlement.service";
import { ZodError } from "zod";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { workspace } = await getCurrentWorkspace();

    const existing = await ProjectService.getProjectById(id, workspace.id);
    if (!existing) {
      return NextResponse.json({ error: "Projeto original não encontrado." }, { status: 404 });
    }

    let customTitle: string | undefined;
    try {
      const body = await request.json();
      const parsed = duplicateProjectSchema.parse(body);
      customTitle = parsed.title;
    } catch {
      // Body vazio é aceitável, usará o nome padrão
    }

    const duplicated = await ProjectService.duplicateProject(id, workspace.id, customTitle);

    return NextResponse.json(
      {
        message: "Projeto duplicado com sucesso.",
        data: duplicated,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof EntitlementError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode || 403 }
      );
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Parâmetros inválidos.", issues: error.issues }, { status: 400 });
    }
    console.error("Erro ao duplicar projeto:", error);
    return NextResponse.json({ error: "Erro interno ao duplicar projeto." }, { status: 500 });
  }
}
