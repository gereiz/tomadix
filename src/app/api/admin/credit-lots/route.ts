import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { CreditLotService } from "@/modules/billing/credit-lot.service";
import { CreditLotStatus, CreditOrigin } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    await requirePlatformAdmin("users:manage");

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId") || undefined;
    const status = (searchParams.get("status") as CreditLotStatus) || undefined;
    const origin = (searchParams.get("origin") as CreditOrigin) || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const result = await CreditLotService.listWorkspaceLots({
      workspaceId,
      status,
      origin,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao consultar lotes de créditos." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminUser = await requirePlatformAdmin("users:manage");
    const body = await request.json().catch(() => ({}));

    const { workspaceId, amount, origin, reason, isAccumulative, expiresAt } = body;

    if (!workspaceId) {
      return NextResponse.json({ error: "O campo 'workspaceId' é obrigatório." }, { status: 400 });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json(
        { error: "A quantidade de créditos concedida deve ser um número positivo maior que zero." },
        { status: 400 }
      );
    }

    if (!reason || typeof reason !== "string" || reason.trim().length < 4) {
      return NextResponse.json(
        { error: "A justificativa administrativa ('reason') é obrigatória e deve ter pelo menos 4 caracteres." },
        { status: 400 }
      );
    }

    const validOrigin = Object.values(CreditOrigin).includes(origin)
      ? (origin as CreditOrigin)
      : CreditOrigin.ADMIN_OVERRIDE;

    const lot = await CreditLotService.grantLot({
      workspaceId,
      userId: adminUser.id,
      origin: validOrigin,
      amount: numAmount,
      isAccumulative: isAccumulative !== false,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      reason: reason.trim(),
      metadata: {
        grantedByAdminId: adminUser.id,
        grantedByAdminEmail: adminUser.email,
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Lote de ${numAmount} créditos concedido com sucesso ao workspace.`,
      lot,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao conceder lote de créditos administrativo." },
      { status: 500 }
    );
  }
}

