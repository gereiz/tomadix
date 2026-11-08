import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspace, AuthenticationError, AuthorizationError } from "@/lib/auth";
import { CinematicAnalysisService } from "@/modules/cinematic-analysis/cinematic-analysis.service";
import { z } from "zod";

const ApplyInputSchema = z.object({
  projectId: z.string().min(1, "projectId é obrigatório"),
  parameterSettings: z.record(z.string(), z.unknown()).optional().default({}),
  technicalData: z.record(z.string(), z.unknown()).optional(),
  prompts: z.record(z.string(), z.unknown()).optional(),
  analysisId: z.string().optional(),
  isFallback: z.boolean().optional(),
});

const FALLBACK_MESSAGE =
  "Este resultado é genérico (a IA não respondeu) e não reflete a imagem enviada. Refaça a análise antes de aplicar ao projeto.";

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

    if (parsed.data.isFallback) {
      return NextResponse.json({ error: FALLBACK_MESSAGE, code: "FALLBACK_ANALYSIS" }, { status: 409 });
    }

    // Não confia só no cliente: consulta o registro salvo da análise, quando existir.
    if (
      parsed.data.analysisId &&
      (await CinematicAnalysisService.isFallbackAnalysis(parsed.data.projectId, workspace.id, parsed.data.analysisId))
    ) {
      return NextResponse.json({ error: FALLBACK_MESSAGE, code: "FALLBACK_ANALYSIS" }, { status: 409 });
    }

    const result = await CinematicAnalysisService.applyToProject(
      parsed.data.projectId,
      workspace.id,
      parsed.data.parameterSettings,
      parsed.data.technicalData,
      parsed.data.prompts,
      parsed.data.analysisId
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
