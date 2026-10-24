import { NextResponse } from "next/server";
import { BillingService } from "@/modules/billing/billing.service";

export async function GET() {
  try {
    const plans = await BillingService.listPlans();
    return NextResponse.json({ data: plans });
  } catch (error: any) {
    console.error("Erro ao listar catálogo de planos:", error);
    return NextResponse.json(
      { error: "Erro ao consultar planos comerciais." },
      { status: 500 }
    );
  }
}
