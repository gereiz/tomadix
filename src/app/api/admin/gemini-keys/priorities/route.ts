import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { GeminiKeyManagerService } from "@/modules/ai/gemini-key-manager.service";

export async function PUT(request: NextRequest) {
  try {
    await requirePlatformAdmin("settings:manage");
    const body = await request.json().catch(() => ({}));

    const { orderedIds } = body;
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return NextResponse.json({ error: "A lista orderedIds é obrigatória." }, { status: 400 });
    }

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

