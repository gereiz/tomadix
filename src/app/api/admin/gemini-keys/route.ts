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
    const body = await request.json().catch(() => ({}));

    const { name, apiKey, priority, isActive, allowedModels, notes } = body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json({ error: "O nome identificador da chave é obrigatório." }, { status: 400 });
    }

    if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length < 10) {
      return NextResponse.json({ error: "A API Key fornecida é inválida ou muito curta." }, { status: 400 });
    }

    const created = await GeminiKeyManagerService.createKey(
      {
        name: name.trim(),
        apiKey: apiKey.trim(),
        priority: typeof priority === "number" ? priority : undefined,
        isActive: isActive !== false,
        allowedModels: Array.isArray(allowedModels) ? allowedModels : [],
        notes: typeof notes === "string" ? notes : undefined,
      },
      adminUser.id
    );

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

