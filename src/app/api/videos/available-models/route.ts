import { NextResponse } from "next/server";
import { getCurrentWorkspace, AuthenticationError, AuthorizationError } from "@/lib/auth";
import { PlatformSettingsService } from "@/modules/admin/platform-settings.service";
import { VideoGenerationService } from "@/modules/video-generation/video-generation.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { workspace } = await getCurrentWorkspace();

    // Chave global do administrador: desligada, nem sincroniza modelos
    if (!(await PlatformSettingsService.isMediaGenerationEnabled())) {
      return NextResponse.json({
        success: true,
        enabled: false,
        message: "A geração de vídeos está desativada nesta plataforma.",
        models: [],
        creditsBalance: workspace.creditsBalance,
      });
    }

    const result = await VideoGenerationService.getAvailableModelsForWorkspace(workspace.id);

    return NextResponse.json({
      success: true,
      enabled: true,
      ...result,
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
