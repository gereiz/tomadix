import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspace, AuthenticationError, AuthorizationError, requirePlatformAdmin } from "@/lib/auth";
import { ImageProviderRegistryService } from "@/modules/image-generation/image-provider-registry.service";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requirePlatformAdmin("settings:manage");

    const { id: providerId } = await params;
    const config = await ImageProviderRegistryService.getProviderConfig(providerId);

    if (!config.apiKey || config.apiKey.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "API Key da Pollinations não está configurada no backend.",
          hasApiKey: false,
        },
        { status: 400 }
      );
    }

    const baseUrl = config.baseUrl || "https://gen.pollinations.ai";
    const headers = {
      Authorization: `Bearer ${config.apiKey.trim()}`,
      Accept: "application/json",
    };

    // Consultas paralelas aos endpoints oficiais de conta da Pollinations (https://gen.pollinations.ai/docs#tag/account)
    const [keyRes, usageRes, profileRes, balanceRes] = await Promise.all([
      fetch(`${baseUrl}/account/key`, { headers }).catch(() => null),
      fetch(`${baseUrl}/account/key/usage`, { headers }).catch(() => null),
      fetch(`${baseUrl}/account/profile`, { headers }).catch(() => null),
      fetch(`${baseUrl}/account/balance`, { headers }).catch(() => null),
    ]);

    let keyData: any = null;
    let usageData: any = null;
    let profileData: any = null;
    let balanceData: any = null;
    let balanceError: string | null = null;

    if (keyRes && keyRes.ok) {
      keyData = await keyRes.json().catch(() => null);
    }

    if (usageRes && usageRes.ok) {
      usageData = await usageRes.json().catch(() => null);
    }

    if (profileRes && profileRes.ok) {
      profileData = await profileRes.json().catch(() => null);
    }

    if (balanceRes) {
      if (balanceRes.ok) {
        balanceData = await balanceRes.json().catch(() => null);
      } else {
        const errJson = await balanceRes.json().catch(() => ({}));
        balanceError = errJson?.error?.message || `HTTP ${balanceRes.status} (permissão account:usage requerida para saldo da carteira)`;
      }
    }

    // Processamento e consolidação de métricas
    const rawUsageList: any[] = Array.isArray(usageData?.usage) ? usageData.usage : [];
    const totalRequests = usageData?.count ?? rawUsageList.length;

    let totalCostUsd = 0;
    let totalResponseTimeMs = 0;
    const modelDistribution: Record<string, { count: number; costUsd: number }> = {};

    for (const item of rawUsageList) {
      const cost = typeof item.cost_usd === "number" ? item.cost_usd : 0;
      totalCostUsd += cost;

      if (typeof item.response_time_ms === "number") {
        totalResponseTimeMs += item.response_time_ms;
      }

      const mod = item.model || "desconhecido";
      if (!modelDistribution[mod]) {
        modelDistribution[mod] = { count: 0, costUsd: 0 };
      }
      modelDistribution[mod].count += 1;
      modelDistribution[mod].costUsd += cost;
    }

    const avgResponseTimeMs = rawUsageList.length > 0 ? Math.round(totalResponseTimeMs / rawUsageList.length) : 0;

    return NextResponse.json({
      success: true,
      providerId,
      keyInfo: keyData
        ? {
            id: keyData.id,
            name: keyData.name || "Chave Tomadix",
            type: keyData.type,
            valid: keyData.valid,
            pollenBudget: keyData.pollenBudget,
            questPollenOnly: keyData.questPollenOnly,
            rateLimitEnabled: keyData.rateLimitEnabled,
            permissions: keyData.permissions,
          }
        : null,
      profile: profileData
        ? {
            githubUsername: profileData.githubUsername,
            image: profileData.image,
            name: profileData.name,
            email: profileData.email,
          }
        : null,
      balance: balanceData
        ? {
            balance: balanceData.balance,
            accountBalance: balanceData.accountBalance,
          }
        : null,
      balanceError,
      summary: {
        totalRequests,
        totalCostUsd: Number(totalCostUsd.toFixed(4)),
        avgResponseTimeMs,
        modelDistribution,
      },
      recentUsage: rawUsageList.slice(0, 20).map((u) => ({
        timestamp: u.timestamp,
        model: u.model,
        type: u.type,
        costUsd: u.cost_usd,
        responseTimeMs: u.response_time_ms,
      })),
      fetchedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[PollinationsAccountAPI] Erro ao consultar conta:", error);
    return NextResponse.json(
      { error: error?.message || "Falha ao obter métricas de consumo da Pollinations." },
      { status: 500 }
    );
  }
}
