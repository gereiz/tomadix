import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspace, AuthorizationError } from "@/lib/auth";
import { CinematicCreationService } from "@/modules/cinematic-creation/cinematic-creation.service";
import { enhancePromptSchema } from "@/modules/cinematic-creation/cinematic-creation.schema";
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

    const validatedInput = enhancePromptSchema.parse(body);

    const result = await CinematicCreationService.enhancePrompt(
      projectId,
      workspace.id,
      validatedInput,
      user.id
    );

    return NextResponse.json(
      {
        message: "Prompt otimizado e aprimorado com sucesso pela IA.",
        data: result.result,
        creditCost: result.creditCost,
        newBalance: result.newBalance,
      },
      { status: 200 }
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
        { error: "Parâmetros do prompt inválidos.", details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    if (error instanceof GeminiError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    console.error("Erro no aprimoramento de prompt:", error);
    return NextResponse.json(
      { error: error?.message || "Falha ao aprimorar prompt com IA." },
      { status: 500 }
    );
  }
}

