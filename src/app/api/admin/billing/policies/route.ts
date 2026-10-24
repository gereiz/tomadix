import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError, getClientContext } from "@/lib/auth";
import { BillingPolicyService } from "@/modules/billing/billing-policy.service";

export async function GET() {
  try {
    await requirePlatformAdmin("policies:manage");
    const policies = await BillingPolicyService.listAllPolicies();
    return NextResponse.json({ policies });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao consultar políticas comerciais." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const adminUser = await requirePlatformAdmin("policies:manage");
    const body = await request.json().catch(() => ({}));
    const clientContext = await getClientContext();

    if (!body.key || body.value === undefined) {
      return NextResponse.json(
        { error: "Informe a chave da política (key) e o novo valor (value)." },
        { status: 400 }
      );
    }

    const updated = await BillingPolicyService.updatePolicy(
      adminUser.id,
      body.key,
      body.value,
      body.justification,
      {
        ip: clientContext.ipAddress,
        ua: clientContext.userAgent,
      }
    );

    return NextResponse.json({
      success: true,
      message: `Política '${body.key}' atualizada com sucesso.`,
      policy: updated,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao atualizar política comercial." },
      { status: 400 }
    );
  }
}
