import { parseJsonBody, createGeminiKeyBodySchema } from "@/lib/api-validation";
import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { GeminiKeyManagerService } from "@/modules/ai/gemini-key-manager.service";

export async function GET() {
  try {
    await requirePlatformAdmin("settings:manage");

    const keys = await GeminiKeyManagerService.listKeys();
    const settings = await GeminiKeyManagerService.getSettings();

    return NextResponse.json({
      success: true,
      keys,
      settings,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao consultar chaves Gemini." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminUser = await requirePlatformAdmin("settings:manage");
    const parsed = await parseJsonBody(request, createGeminiKeyBodySchema);
    if (parsed.response) return parsed.response;

    const created = await GeminiKeyManagerService.createKey(parsed.data, adminUser.id);

    return NextResponse.json({
      success: true,
      message: `Chave "${created.name}" cadastrada com sucesso!`,
      key: created,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao cadastrar chave Gemini." },
      { status: 500 }
    );
  }
}

