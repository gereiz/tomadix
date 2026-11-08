import { parseJsonBody, geminiPrioritiesBodySchema } from "@/lib/api-validation";
import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { GeminiKeyManagerService } from "@/modules/ai/gemini-key-manager.service";

export async function PUT(request: NextRequest) {
  try {
    await requirePlatformAdmin("settings:manage");
    const parsed = await parseJsonBody(request, geminiPrioritiesBodySchema);
    if (parsed.response) return parsed.response;
    const { orderedIds } = parsed.data;

    const updatedKeys = await GeminiKeyManagerService.reorderPriorities(orderedIds);

    return NextResponse.json({
      success: true,
      message: "Prioridades de chaves atualizadas com sucesso.",
      keys: updatedKeys,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao atualizar prioridades de chaves." },
      { status: 500 }
    );
  }
}

