import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import {
  CreditConsumptionOrderService,
  CONSUMPTION_CATEGORIES_METADATA,
  DEFAULT_CONSUMPTION_ORDER,
  ConsumptionCategory,
} from "@/modules/billing/credit-consumption-order.service";

export async function GET() {
  try {
    await requirePlatformAdmin("policies:manage");

    const config = await CreditConsumptionOrderService.getActiveConfig();

    return NextResponse.json({
      config,
      metadata: CONSUMPTION_CATEGORIES_METADATA,
      defaultOrder: DEFAULT_CONSUMPTION_ORDER,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao consultar configuração de ordem de consumo." },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const adminUser = await requirePlatformAdmin("policies:manage");
    const body = await request.json().catch(() => ({}));

    const { categoryPriorities, protectedCategories, description } = body;

    if (!Array.isArray(categoryPriorities) || categoryPriorities.length === 0) {
      return NextResponse.json(
        { error: "A lista 'categoryPriorities' é obrigatória e deve conter as categorias de consumo." },
        { status: 400 }
      );
    }

    const updated = await CreditConsumptionOrderService.updateConfig({
      categoryPriorities: categoryPriorities as ConsumptionCategory[],
      protectedCategories: Array.isArray(protectedCategories) ? (protectedCategories as ConsumptionCategory[]) : [],
      description: typeof description === "string" ? description : undefined,
      adminUserId: adminUser.id,
    });

    return NextResponse.json({
      success: true,
      message: "Ordem global de consumo atualizada com sucesso.",
      config: updated,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao atualizar ordem de consumo de créditos." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminUser = await requirePlatformAdmin("policies:manage");
    const body = await request.json().catch(() => ({}));

    if (body.action === "reset") {
      const resetConfig = await CreditConsumptionOrderService.resetToDefault(adminUser.id);
      return NextResponse.json({
        success: true,
        message: "Ordem global de consumo restaurada para o padrão oficial.",
        config: resetConfig,
      });
    }

    return NextResponse.json({ error: "Ação não suportada." }, { status: 400 });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao processar solicitação de ordem de consumo." },
      { status: 500 }
    );
  }
}

