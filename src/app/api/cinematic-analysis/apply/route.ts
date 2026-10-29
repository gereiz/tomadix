import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspace, AuthenticationError, AuthorizationError } from "@/lib/auth";
import { CinematicAnalysisService } from "@/modules/cinematic-analysis/cinematic-analysis.service";
import { z } from "zod";

const ApplyInputSchema = z.object({
  projectId: z.string().min(1, "projectId é obrigatório"),
  parameterSettings: z.record(z.string(), z.unknown()),
});

export async function POST(request: NextRequest) {
  try {
    const { workspace } = await getCurrentWorkspace(null, "projects:update");
    const body = await request.json();

    const parsed = ApplyInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos para aplicação de parâmetros.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await CinematicAnalysisService.applyToProject(
      parsed.data.projectId,
      workspace.id,
      parsed.data.parameterSettings
    );

    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Erro ao aplicar parâmetros ao projeto:", error);
    return NextResponse.json(
      { error: error?.message || "Erro interno ao aplicar parâmetros ao projeto." },
      { status: 500 }
    );
  }
}
