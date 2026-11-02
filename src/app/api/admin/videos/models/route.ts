import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { VideoGenerationService } from "@/modules/video-generation/video-generation.service";
import { db } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requirePlatformAdmin("settings:manage");
    const config = await VideoGenerationService.getVideoProviderConfig();

    let models = await db.videoModelConfig.findMany({
      where: { providerConfigId: config.id },
      orderBy: [{ isDefault: "desc" }, { displayOrder: "asc" }, { name: "asc" }],
    });

    if (models.length === 0) {
      await VideoGenerationService.syncModels();
      models = await db.videoModelConfig.findMany({
        where: { providerConfigId: config.id },
        orderBy: [{ isDefault: "desc" }, { displayOrder: "asc" }, { name: "asc" }],
      });
    }

    return NextResponse.json({
      success: true,
      config,
      models,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao consultar modelos de vídeo." },
      { status: 500 }
    );
  }
}

const updateModelSchema = z.object({
  action: z.enum(["SYNC", "UPDATE_MODEL", "UPDATE_CONFIG"]),
  modelId: z.string().optional(),
  creditCost: z.number().int().min(1).optional(),
  isEnabled: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  apiKey: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    await requirePlatformAdmin("settings:manage");
    const body = await request.json().catch(() => ({}));
    const validated = updateModelSchema.parse(body);

    const config = await VideoGenerationService.getVideoProviderConfig();

    if (validated.action === "SYNC") {
      const syncResult = await VideoGenerationService.syncModels();
      return NextResponse.json({
        success: true,
        message: `Catálogo de modelos sincronizado com sucesso! ${syncResult.synced} modelos atualizados.`,
      });
    }

    if (validated.action === "UPDATE_CONFIG") {
      if (validated.apiKey !== undefined) {
        await db.videoProviderConfig.update({
          where: { id: config.id },
          data: {
            apiKeyEncrypted: validated.apiKey.trim(),
          },
        });
      }
      return NextResponse.json({ success: true, message: "Configuração atualizada com sucesso!" });
    }

    if (validated.action === "UPDATE_MODEL" && validated.modelId) {
      if (validated.isDefault) {
        await db.videoModelConfig.updateMany({
          where: { providerConfigId: config.id },
          data: { isDefault: false },
        });
      }

      const updated = await db.videoModelConfig.update({
        where: {
          providerConfigId_modelId: {
            providerConfigId: config.id,
            modelId: validated.modelId,
          },
        },
        data: {
          creditCost: validated.creditCost !== undefined ? validated.creditCost : undefined,
          isEnabled: validated.isEnabled !== undefined ? validated.isEnabled : undefined,
          isDefault: validated.isDefault !== undefined ? validated.isDefault : undefined,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Modelo ${updated.name} atualizado com sucesso!`,
        model: updated,
      });
    }

    return NextResponse.json({ error: "Ação não suportada." }, { status: 400 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || "Dados inválidos." },
        { status: 400 }
      );
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao atualizar modelo de vídeo." },
      { status: 500 }
    );
  }
}
