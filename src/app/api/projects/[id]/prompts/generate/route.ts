import { aiRateLimitResponse } from "@/lib/ai-rate-limit";
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
    const rateLimited = aiRateLimitResponse(workspace.id);
    if (rateLimited) return rateLimited;
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
        { error: error.message, code: error.code },
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
    const message = String(error?.message ?? "");
    const isNotFound = /não encontrad/i.test(message);
    const isClientRule = /créditos|saldo|obrigatóri|parâmetro|selecione|informe/i.test(message);
    if (isNotFound) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (isClientRule) {
      return NextResponse.json({ error: message }, { status: error?.statusCode || 400 });
    }
    return NextResponse.json(
      { error: "Falha ao processar solicitação de prompt." },
      { status: 500 }
    );
  }
}
