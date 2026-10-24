import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const startTime = Date.now();
  let dbStatus = "UP";
  let dbLatencyMs = 0;
  let dbError: string | null = null;

  try {
    const dbStart = Date.now();
    await db.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - dbStart;
  } catch (err: any) {
    dbStatus = "DOWN";
    dbError = err?.message || "Erro de conexão ao banco de dados";
  }

  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);
  const memory = process.memoryUsage();

  const isHealthy = dbStatus === "UP";
  const statusCode = isHealthy ? 200 : 503;

  return NextResponse.json(
    {
      status: isHealthy ? "HEALTHY" : "UNHEALTHY",
      application: "Tomadix",
      environment: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      responseTimeMs: Date.now() - startTime,
      services: {
        database: {
          status: dbStatus,
          latencyMs: dbLatencyMs,
          error: dbError,
        },
        aiEngine: {
          status: hasGeminiKey ? "CONFIGURED" : "MISSING_API_KEY",
          provider: "Google Gemini API",
          defaultModel: process.env.GEMINI_DEFAULT_MODEL || "gemini-3.5-flash",
        },
      },
      system: {
        nodeVersion: process.version,
        memoryUsageMb: {
          rss: Math.round(memory.rss / 1024 / 1024),
          heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memory.heapTotal / 1024 / 1024),
        },
      },
    },
    { status: statusCode }
  );
}
