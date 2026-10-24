import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspace, AuthorizationError } from "@/lib/auth";
import { PromptEngineService } from "@/modules/prompt-engine/prompt-engine.service";
import { generatePromptRequestSchema } from "@/modules/prompt-engine/prompt-engine.schema";
import { GeminiAuthError, GeminiQuotaError, GeminiTimeoutError, GeminiInvalidJsonError, GeminiValidationError, GeminiUnavailableError } from "@/modules/ai/gemini-provider";
import { ZodError } from "zod";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId } = await params;
    const { workspace } = await getCurrentWorkspace();
    const body = await request.json();

    const validatedInput = generatePromptRequestSchema.parse(body);

    const result = await PromptEngineService.generate(
      projectId,
      workspace.id,
      validatedInput
    );

    return NextResponse.json(
      {
        message: "Prompt cinematográfico gerado com sucesso pelo Gemini.",
        data: result,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Parâmetros de geração inválidos.", details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    if (error instanceof GeminiAuthError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 401 }
      );
    }
    if (error instanceof GeminiQuotaError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 429 }
      );
    }
    if (error instanceof GeminiUnavailableError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 503 }
      );
    }
    if (error instanceof GeminiTimeoutError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 504 }
      );
    }
    if (error instanceof GeminiInvalidJsonError) {
      return NextResponse.json(
        { error: error.message, code: error.code, raw: error.rawResponse },
        { status: 502 }
      );
    }
    if (error instanceof GeminiValidationError) {
      return NextResponse.json(
        { error: error.message, code: error.code, details: error.validationErrors },
        { status: 422 }
      );
    }

    console.error("Erro na geração do prompt:", error);
    return NextResponse.json(
      { error: error?.message || "Falha ao processar solicitação de prompt." },
      { status: error?.statusCode || 500 }
    );
  }
}
