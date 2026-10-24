import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { AdminUsageService } from "@/modules/admin/admin-usage.service";

export async function POST(request: NextRequest) {
  try {
    const adminUser = await requirePlatformAdmin();
    const body = await request.json().catch(() => ({}));

    const jobIds = Array.isArray(body.jobIds) ? body.jobIds : [];
    const result = await AdminUsageService.resolveStuckJobs(adminUser.id, jobIds);

    return NextResponse.json({
      success: true,
      message: `${result.resolved} jobs destravados com sucesso.`,
      resolved: result.resolved,
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao destravar jobs." },
      { status: 500 }
    );
  }
}
