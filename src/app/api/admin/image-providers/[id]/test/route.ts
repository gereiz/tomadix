import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { ImageProviderRegistryService } from "@/modules/image-generation/image-provider-registry.service";
import { AdminAuditService } from "@/modules/admin/admin-audit.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requirePlatformAdmin("settings:manage");
    const { id } = await params;

    const result = await ImageProviderRegistryService.testProviderConnection(id);

    await AdminAuditService.logAction({
      adminUserId: adminUser.id,
      action: "IMAGE_PROVIDER_TEST_CONNECTION",
      targetType: "ImageProviderConfig",
      targetId: id,
      result: result.success ? "SUCCESS" : "FAILURE",
      details: {
        status: result.status,
        message: result.message,
        modelsCount: result.modelsCount,
      },
    });

    return NextResponse.json({
      success: result.success,
      status: result.status,
      message: result.message,
      modelsCount: result.modelsCount,
      eligibleModels: result.eligibleModels,
      rawError: result.rawError,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao testar conexão com o provedor." },
      { status: 500 }
    );
  }
}

