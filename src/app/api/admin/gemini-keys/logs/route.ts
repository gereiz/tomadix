import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    await requirePlatformAdmin("settings:manage");

    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "30", 10)));
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const skip = (page - 1) * limit;

    const [total, successful, fallbackRecovered, failed, avgDurationAgg, recentLogs] = await Promise.all([
      db.geminiOperationLog.count(),
      db.geminiOperationLog.count({ where: { success: true } }),
      db.geminiOperationLog.count({ where: { success: true, usedFallback: true } }),
      db.geminiOperationLog.count({ where: { success: false } }),
      db.geminiOperationLog.aggregate({
        _avg: { durationMs: true },
      }),
      db.geminiOperationLog.findMany({
        take: limit,
        skip,
        orderBy: { createdAt: "desc" },
        include: {
          attempts: {
            orderBy: { attemptNumber: "asc" },
          },
        },
      }),
    ]);

    const successRate = total > 0 ? Math.round((successful / total) * 100) : 100;
    const avgDurationMs = Math.round(avgDurationAgg._avg.durationMs || 0);

    return NextResponse.json({
      success: true,
      metrics: {
        totalRequests: total,
        successfulRequests: successful,
        fallbackRecoveredRequests: fallbackRecovered,
        failedRequests: failed,
        successRate,
        avgDurationMs,
      },
      logs: recentLogs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao consultar logs de operações do Gemini." },
      { status: 500 }
    );
  }
}

