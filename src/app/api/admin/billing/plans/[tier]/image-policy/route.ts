import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { db } from "@/lib/db";
import { PlanTier } from "@prisma/client";
import { AdminAuditService } from "@/modules/admin/admin-audit.service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tier: string }> }
) {
  try {
    const adminUser = await requirePlatformAdmin("plans:manage");
    const { tier } = await params;
    const body = await request.json().catch(() => ({}));

    const upperTier = tier.toUpperCase() as PlanTier;
    const existingPlan = await db.plan.findUnique({
      where: { tier: upperTier },
    });

    if (!existingPlan) {
      return NextResponse.json({ error: `Plano "${tier}" não encontrado.` }, { status: 404 });
    }

    const {
      hasImageGeneration,
      imageDailyLimit,
      imageMonthlyLimit,
      imageTotalLimit,
      imageDefaultCost,
      imageAllowedModels,
      imageMaxBatchSize,
      imageAllowedResolutions,
      imageAllowReferenceImages,
      imageRetentionDays,
      unlimitedImageRetention,
    } = body;

    const updated = await db.plan.update({
      where: { tier: upperTier },
      data: {
        ...(hasImageGeneration !== undefined ? { hasImageGeneration: Boolean(hasImageGeneration) } : {}),
        ...(imageDailyLimit !== undefined ? { imageDailyLimit: imageDailyLimit !== null ? Number(imageDailyLimit) : null } : {}),
        ...(imageMonthlyLimit !== undefined ? { imageMonthlyLimit: imageMonthlyLimit !== null ? Number(imageMonthlyLimit) : null } : {}),
        ...(imageTotalLimit !== undefined ? { imageTotalLimit: imageTotalLimit !== null ? Number(imageTotalLimit) : null } : {}),
        ...(imageDefaultCost !== undefined ? { imageDefaultCost: Number(imageDefaultCost) } : {}),
        ...(imageAllowedModels !== undefined ? { imageAllowedModels } : {}),
        ...(imageMaxBatchSize !== undefined ? { imageMaxBatchSize: Number(imageMaxBatchSize) } : {}),
        ...(imageAllowedResolutions !== undefined ? { imageAllowedResolutions } : {}),
        ...(imageAllowReferenceImages !== undefined ? { imageAllowReferenceImages: Boolean(imageAllowReferenceImages) } : {}),
        ...(imageRetentionDays !== undefined ? { imageRetentionDays: Math.max(0, Number(imageRetentionDays)) } : {}),
        ...(unlimitedImageRetention !== undefined ? { unlimitedImageRetention: Boolean(unlimitedImageRetention) } : {}),
      },
    });

    await AdminAuditService.logAction({
      adminUserId: adminUser.id,
      action: "PLAN_IMAGE_POLICY_UPDATE",
      targetType: "Plan",
      targetId: upperTier,
      result: "SUCCESS",
      details: {
        tier: upperTier,
        hasImageGeneration: updated.hasImageGeneration,
        imageDailyLimit: updated.imageDailyLimit,
        imageMonthlyLimit: updated.imageMonthlyLimit,
        imageDefaultCost: updated.imageDefaultCost,
        imageAllowedModels: updated.imageAllowedModels,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Políticas de geração de imagem do plano ${existingPlan.name} atualizadas.`,
      plan: updated,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao atualizar política de geração de imagem do plano." },
      { status: 500 }
    );
  }
}

