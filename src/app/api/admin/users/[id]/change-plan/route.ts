import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { AdminUsersService } from "@/modules/admin/admin-users.service";
import { AdminBillingService } from "@/modules/admin/admin-billing.service";
import { PlanTier } from "@prisma/client";
import { db } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requirePlatformAdmin("plans:manage");
    const { id: userId } = await params;
    const body = await request.json().catch(() => ({}));

    const { workspaceId, planTier, grantCredits = true, reason } = body;

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId é obrigatório." }, { status: 400 });
    }

    if (!planTier || !Object.values(PlanTier).includes(planTier)) {
      return NextResponse.json({ error: "Plano selecionado é inválido." }, { status: 400 });
    }

    if (!reason || reason.trim().length < 3) {
      return NextResponse.json({ error: "Justificativa formal é obrigatória para alteração de plano." }, { status: 400 });
    }

    // 1. Validar se o workspace pertence ao usuário indicado
    const membership = await db.membership.findFirst({
      where: { userId, workspaceId },
      include: { workspace: { include: { subscription: true } } },
    });

    if (!membership) {
      return NextResponse.json({ error: "Workspace não pertence ao usuário especificado." }, { status: 404 });
    }

    const clientContext = request.headers.get("x-forwarded-for") || undefined;
    const userAgent = request.headers.get("user-agent") || undefined;

    // 2. Obter ou criar a assinatura do workspace
    let subscription = membership.workspace.subscription;
    if (!subscription) {
      subscription = await db.subscription.create({
        data: {
          workspaceId,
          planTier: PlanTier.FREE,
          status: "ACTIVE",
          currentPeriodStart: new Date(),
        },
      });
    }

    const previousTier = subscription.planTier;

    // 3. Atualizar formalmente o plano e limites através do AdminBillingService
    const updatedSub = await AdminBillingService.updateSubscription(
      adminUser.id,
      subscription.id,
      {
        planTier,
        grantCredits: Boolean(grantCredits),
        notes: `Troca de plano via painel do usuário [${userId}]: ${reason.trim()} (Plano anterior: ${previousTier})`,
      },
      { ip: clientContext, ua: userAgent }
    );

    // 4. Buscar os limites atualizados do novo plano
    const targetPlan = await db.plan.findUnique({
      where: { tier: planTier },
    });

    return NextResponse.json({
      success: true,
      message: `Plano alterado com sucesso de ${previousTier} para ${planTier}.`,
      data: {
        workspaceId,
        previousTier,
        newTier: planTier,
        planName: targetPlan?.name || planTier,
        maxProjects: targetPlan?.maxProjects,
        maxMembers: targetPlan?.maxMembers,
        monthlyCredits: targetPlan?.monthlyCredits,
        creditsBalance: updatedSub.workspace.creditsBalance,
        subscription: updatedSub,
      },
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Erro ao alterar plano do usuário:", error);
    return NextResponse.json(
      { error: error?.message || "Falha ao alterar plano do workspace do usuário." },
      { status: 400 }
    );
  }
}

