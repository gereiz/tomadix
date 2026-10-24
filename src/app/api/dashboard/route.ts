import { NextResponse } from "next/server";
import { getCurrentWorkspace, AuthenticationError } from "@/lib/auth";
import { DashboardService } from "@/modules/dashboard/dashboard.service";

export async function GET() {
  try {
    const { user, workspace } = await getCurrentWorkspace();
    const data = await DashboardService.getDashboardData(user.id, workspace.id);

    return NextResponse.json({
      data,
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Erro ao carregar dados do dashboard:", error);
    return NextResponse.json(
      { error: "Erro interno ao processar dados do dashboard." },
      { status: 500 }
    );
  }
}
