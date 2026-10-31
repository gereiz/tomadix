import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { GeminiKeyManagerService } from "@/modules/ai/gemini-key-manager.service";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePlatformAdmin("settings:manage");
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const updated = await GeminiKeyManagerService.updateKey(id, body);

    return NextResponse.json({
      success: true,
      message: `Chave "${updated.name}" atualizada com sucesso.`,
      key: updated,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao atualizar chave Gemini." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePlatformAdmin("settings:manage");
    const { id } = await params;

    const result = await GeminiKeyManagerService.deleteKey(id);

    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao remover chave Gemini." },
      { status: 500 }
    );
  }
}

