import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { PollinationsAccountService } from "@/modules/pollinations/pollinations-account.service";
import { ImageProviderRegistryService } from "@/modules/image-generation/image-provider-registry.service";
import { db } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requirePlatformAdmin("settings:manage");
    const { searchParams } = new URL(request.url);
    const refresh = searchParams.get("refresh") === "true";

    const overview = await PollinationsAccountService.getAccountOverview(refresh);

    return NextResponse.json({
      success: true,
      ...overview,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao consultar dados da conta Pollinations." },
      { status: 500 }
    );
  }
}

const updateKeySchema = z.object({
  apiKey: z.string().min(1, "A chave não pode ser vazia"),
});

export async function POST(request: NextRequest) {
  try {
    await requirePlatformAdmin("settings:manage");
    const body = await request.json().catch(() => ({}));
    const { apiKey } = updateKeySchema.parse(body);

    const cleanKey = apiKey.trim();

    // 1. Atualiza ImageProviderConfig
    await ImageProviderRegistryService.saveProviderConfig({
      providerId: "pollinations",
      apiKey: cleanKey,
    });

    // 2. Atualiza VideoProviderConfig
    await db.videoProviderConfig.updateMany({
      where: { providerId: "pollinations" },
      data: {
        apiKeyEncrypted: cleanKey,
      },
    });

    // 3. Limpa o cache para nova consulta
    PollinationsAccountService.clearCache();

    // 4. Obtém o overview atualizado
    const overview = await PollinationsAccountService.getAccountOverview(true);

    return NextResponse.json({
      success: true,
      message: "Chave da Pollinations atualizada com sucesso em todos os módulos!",
      ...overview,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Dados inválidos." }, { status: 400 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao atualizar chave da Pollinations." },
      { status: 500 }
    );
  }
}

