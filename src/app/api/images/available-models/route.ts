import { NextResponse } from "next/server";
import { getCurrentWorkspace, AuthenticationError, AuthorizationError } from "@/lib/auth";
import { PlatformSettingsService } from "@/modules/admin/platform-settings.service";
import { ImageEntitlementService } from "@/modules/image-generation/image-entitlement.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { workspace } = await getCurrentWorkspace();
    // Chave global do administrador
    if (!(await PlatformSettingsService.isImageGenerationEnabled())) {
      return NextResponse.json({
        success: true,
        enabled: false,
        message: "A geração de imagens está desativada nesta plataforma.",
        models: [],
        creditsBalance: workspace.creditsBalance,
      });
    }

    const result = await ImageEntitlementService.getAvailableModelsForWorkspace(workspace.id);

    return NextResponse.json({
      success: true,
      ...result,
      creditsBalance: workspace.creditsBalance,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao consultar modelos disponíveis." },
      { status: 500 }
    );
  }
}

