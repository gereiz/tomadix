import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspace, AuthorizationError } from "@/lib/auth";
import { CinematicCreationService } from "@/modules/cinematic-creation/cinematic-creation.service";
import { generateEnvironmentSchema } from "@/modules/cinematic-creation/cinematic-creation.schema";
import { CreditConsumptionError } from "@/modules/billing/credit-execution.service";
import { GeminiError } from "@/modules/ai/gemini-provider";
import { ZodError } from "zod";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId } = await params;
    const { workspace, user } = await getCurrentWorkspace();
    const body = await request.json();

    const validatedInput = generateEnvironmentSchema.parse(body);

    const result = await CinematicCreationService.generateEnvironment(
      projectId,
      workspace.id,
      validatedInput,
      user.id
    );

    return NextResponse.json(
      {
        message: "Ambiente cênico gerado com sucesso pela IA.",
        data: result.result,
        creditCost: result.creditCost,
        newBalance: result.newBalance,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof CreditConsumptionError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Parâmetros do ambiente inválidos.", details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    if (error instanceof GeminiError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    console.error("Erro na geração de ambiente:", error);
    return NextResponse.json(
      { error: error?.message || "Falha ao gerar ambiente com IA." },
      { status: 500 }
    );
  }
}

