import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspace, AuthenticationError, AuthorizationError } from "@/lib/auth";
import { CinematicAnalysisService } from "@/modules/cinematic-analysis/cinematic-analysis.service";
import { CinematicAnalysisInputSchema } from "@/modules/cinematic-analysis/cinematic-analysis.schema";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { workspace } = await getCurrentWorkspace(null, "projects:read");
    const body = await request.json();

    const parsed = CinematicAnalysisInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos para análise cinematográfica.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await CinematicAnalysisService.analyze(parsed.data, workspace.id);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Erro na análise cinematográfica:", error);
    return NextResponse.json(
      { error: error?.message || "Erro interno ao processar a análise cinematográfica com IA." },
      { status: error?.statusCode || 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { workspace } = await getCurrentWorkspace(null, "projects:read");
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId") || undefined;

    const defaultReferences = CinematicAnalysisService.getDefaultStudioReferences();

    // Buscar histórico de análises no banco
    const whereClause: any = projectId
      ? { projectId, status: "SUCCEEDED" }
      : { project: { workspaceId: workspace.id }, status: "SUCCEEDED" };

    const recentJobs = await db.generationJob.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        projectId: true,
        createdAt: true,
        result: true,
      },
    });

    const history = recentJobs
      .map((j) => j.result as any)
      .filter((r) => r && r.id && r.technicalData);

    return NextResponse.json({
      defaultReferences,
      history,
    });
  } catch (error: any) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Erro ao carregar referências do estúdio." },
      { status: 500 }
    );
  }
}
