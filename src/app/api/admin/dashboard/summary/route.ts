import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminBillingService } from "@/modules/admin/admin-billing.service";
import { AdminUsageService } from "@/modules/admin/admin-usage.service";
import { AdminAuditService } from "@/modules/admin/admin-audit.service";

// Métricas agregadas mudam devagar: cache em memória de 60s por período (após checagem de admin)
const SUMMARY_CACHE_TTL_MS = 60 * 1000;
const summaryCache = new Map<number, { payload: unknown; expiresAt: number }>();

export async function GET(request: NextRequest) {
  try {
    await requirePlatformAdmin();

    const { searchParams } = new URL(request.url);
    const periodParam = searchParams.get("period") || "30d";

    let periodDays = 30;
    if (periodParam === "today") periodDays = 1;
    else if (periodParam === "7d") periodDays = 7;
    else if (periodParam === "90d") periodDays = 90;

    const cached = summaryCache.get(periodDays);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json(cached.payload);
    }

    const [
      commercialMetrics,
      usageMetrics,
      totalUsers,
      suspendedUsers,
      totalProjects,
      recentUsers,
      recentAuditLogs,
    ] = await Promise.all([
      AdminBillingService.getCommercialMetrics().catch(() => null),
      AdminUsageService.getUsageAndCostMetrics(periodDays).catch(() => null),
      db.user.count(),
      db.user.count({ where: { isSuspended: true } }),
      db.project.count({ where: { isArchived: false } }),
      db.user.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          displayName: true,
          platformRole: true,
          isSuspended: true,
          createdAt: true,
        },
      }),
      AdminAuditService.listLogs({ page: 1, limit: 6 }).catch(() => ({ logs: [] })),
    ]);

    const payload = {
      periodDays,
      commercial: commercialMetrics,
      usage: usageMetrics,
      stats: {
        totalUsers,
        activeUsers: totalUsers - suspendedUsers,
        suspendedUsers,
        totalProjects,
        totalWorkspaces: commercialMetrics?.totalWorkspaces || 0,
      },
      recentUsers,
      recentAuditLogs: recentAuditLogs.logs,
    };
    summaryCache.set(periodDays, { payload, expiresAt: Date.now() + SUMMARY_CACHE_TTL_MS });
    return NextResponse.json(payload);
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao carregar resumo do dashboard." },
      { status: 500 }
    );
  }
}
