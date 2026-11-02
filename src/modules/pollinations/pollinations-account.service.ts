import { ImageProviderRegistryService } from "@/modules/image-generation/image-provider-registry.service";

export interface PollinationsBalanceInfo {
  balance: number;
  pollen: number;
  paidPollen?: number;
  rewardsPollen?: number;
  currency?: string;
  hasSufficientBalance: boolean;
  raw?: any;
}

export interface PollinationsQuestItem {
  id: string;
  title: string;
  description: string;
  status: "AVAILABLE" | "IN_PROGRESS" | "COMPLETED" | "CLAIMED";
  rewardPollen: number;
  actionUrl?: string;
  category?: string;
  expiresAt?: string | null;
  progressPercent?: number;
}

export interface PollinationsAccountData {
  balance: PollinationsBalanceInfo;
  quests: PollinationsQuestItem[];
  usage: any;
  lastUpdated: string;
  isCached: boolean;
  apiKeyMasked: string;
  warning?: {
    code: string;
    message: string;
    fixUrl?: string;
  };
}

class PollinationsAccountServiceClass {
  private cache: {
    data: PollinationsAccountData | null;
    timestamp: number;
  } = {
    data: null,
    timestamp: 0,
  };

  private CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos de cache

  /**
   * Limpa o cache para forçar nova consulta.
   */
  clearCache(): void {
    this.cache = {
      data: null,
      timestamp: 0,
    };
  }

  /**
   * Obtém a chave da Pollinations ativa no sistema.
   */
  async getApiKey(): Promise<{ apiKey: string; maskedKey: string }> {
    try {
      const config = await ImageProviderRegistryService.getProviderConfig("pollinations");
      const key = (config?.apiKey || process.env.POLLINATIONS_API_KEY || "").trim();
      const masked = config?.maskedKey || (key ? "••••" + key.slice(-4) : "(não configurada)");
      return { apiKey: key, maskedKey: masked };
    } catch {
      const envKey = (process.env.POLLINATIONS_API_KEY || "").trim();
      return {
        apiKey: envKey,
        maskedKey: envKey ? "••••" + envKey.slice(-4) : "(não configurada)",
      };
    }
  }

  /**
   * Consulta os dados completos da conta Pollinations (saldo, quests, consumo).
   */
  async getAccountOverview(forceRefresh = false): Promise<PollinationsAccountData> {
    const now = Date.now();
    if (!forceRefresh && this.cache.data && now - this.cache.timestamp < this.CACHE_TTL_MS) {
      return {
        ...this.cache.data,
        isCached: true,
      };
    }

    const { apiKey, maskedKey } = await this.getApiKey();

    if (!apiKey) {
      const emptyResult: PollinationsAccountData = {
        balance: {
          balance: 0,
          pollen: 0,
          paidPollen: 0,
          rewardsPollen: 0,
          hasSufficientBalance: false,
        },
        quests: [],
        usage: { totalRequests: 0, totalPollen: 0 },
        lastUpdated: new Date().toISOString(),
        isCached: false,
        apiKeyMasked: "(não configurada)",
        warning: {
          code: "NO_API_KEY",
          message: "Nenhuma API Key da Pollinations configurada. Cadastre sua chave para consultar saldo.",
        },
      };
      return emptyResult;
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
    };

    let warning: PollinationsAccountData["warning"] = undefined;

    // 1. Consultar Saldo (Balance)
    let balanceInfo: PollinationsBalanceInfo = {
      balance: 0,
      pollen: 0,
      paidPollen: 0,
      rewardsPollen: 0,
      hasSufficientBalance: false,
    };

    try {
      const res = await fetch("https://gen.pollinations.ai/account/balance", {
        headers,
        signal: AbortSignal.timeout(10000),
      });

      if (res.ok) {
        const json = await res.json();
        const total = typeof json.pollen === "number" ? json.pollen : typeof json.balance === "number" ? json.balance : 0;
        const paid = typeof json.paid === "number" ? json.paid : typeof json.paidPollen === "number" ? json.paidPollen : total;
        const rewards = typeof json.rewards === "number" ? json.rewards : typeof json.rewardPollen === "number" ? json.rewardPollen : 0;

        balanceInfo = {
          balance: total,
          pollen: total,
          paidPollen: paid,
          rewardsPollen: rewards,
          currency: json.currency || "pollen",
          hasSufficientBalance: total > 0.05,
          raw: json,
        };
      } else {
        const errJson = await res.json().catch(() => null);
        if (res.status === 403) {
          warning = {
            code: "PERMISSION_REQUIRED",
            message:
              errJson?.error?.message ||
              "A sua API Key da Pollinations precisa da permissão 'account:usage' para consultar saldo e telemetria.",
            fixUrl:
              errJson?.error?.fixUrl ||
              errJson?.fixUrl ||
              errJson?.error?.message?.match(/https:\/\/[^\s"']+/)?.[0],
          };
        } else if (res.status === 401) {
          warning = {
            code: "INVALID_KEY",
            message:
              errJson?.error?.message ||
              "A chave da Pollinations é inválida ou expirou. Por favor, atualize sua chave.",
          };
        }
      }
    } catch (err: any) {
      console.warn("[PollinationsAccountService] Falha ao consultar /account/balance:", err.message);
    }

    // 2. Consultar Quests e Recompensas
    const questsList: PollinationsQuestItem[] = [];
    try {
      const res = await fetch("https://gen.pollinations.ai/account/quests", {
        headers,
        signal: AbortSignal.timeout(10000),
      });

      if (res.ok) {
        const json = await res.json();
        const items = Array.isArray(json) ? json : Array.isArray(json.quests) ? json.quests : Array.isArray(json.data) ? json.data : [];

        for (const q of items) {
          const rawStatus = (q.status || "").toUpperCase();
          let status: PollinationsQuestItem["status"] = "AVAILABLE";
          if (rawStatus.includes("PROGRESS")) status = "IN_PROGRESS";
          else if (rawStatus.includes("CLAIMED") || rawStatus.includes("DONE")) status = "CLAIMED";
          else if (rawStatus.includes("COMPLETE")) status = "COMPLETED";

          questsList.push({
            id: q.id || q.slug || String(Math.random()),
            title: q.title || q.name || "Quest Pollinations",
            description: q.description || q.details || "Conclua tarefas na comunidade ou participe de integrações para ganhar pólen.",
            status,
            rewardPollen: Number(q.reward || q.pollen || q.rewardPollen || 0),
            actionUrl: q.url || q.actionUrl || q.link || "https://pollinations.ai",
            category: q.category || "Comunidade",
            expiresAt: q.expiresAt || null,
            progressPercent: q.progress || (status === "CLAIMED" ? 100 : 0),
          });
        }
      } else {
        const errJson = await res.json().catch(() => null);
        if (res.status === 403 && !warning?.fixUrl) {
          const extractedUrl =
            errJson?.error?.fixUrl ||
            errJson?.fixUrl ||
            errJson?.error?.message?.match(/https:\/\/[^\s"']+/)?.[0];
          if (extractedUrl) {
            warning = {
              code: "PERMISSION_REQUIRED",
              message:
                errJson?.error?.message ||
                "A API Key precisa da permissão 'account:usage' para sincronizar saldo.",
              fixUrl: extractedUrl,
            };
          }
        }
      }
    } catch (err: any) {
      console.warn("[PollinationsAccountService] Falha ao consultar /account/quests:", err.message);
    }

    // Se nenhuma quest dinâmica individual for retornada, fornece o catálogo oficial de quests da Pollinations
    if (questsList.length === 0) {
      if (warning?.fixUrl) {
        questsList.push({
          id: "quest-permission",
          title: "Ativar Permissão 'account:usage' na Chave",
          description: "Conceda permissão de leitura de saldo e uso na sua API Key oficial para sincronização em tempo real.",
          status: "IN_PROGRESS",
          rewardPollen: 0,
          actionUrl: warning.fixUrl,
          category: "Configuração",
          progressPercent: 50,
        });
      }

      questsList.push(
        {
          id: "quest-badge",
          title: "Selo 'Made with pollinations.ai'",
          description: "Adicione o selo oficial da Pollinations no rodapé do sistema ou no README para recompensas.",
          status: "COMPLETED",
          rewardPollen: 50,
          actionUrl: "https://pollinations.ai/?ref=badge",
          category: "Branding",
          progressPercent: 100,
        },
        {
          id: "quest-discord",
          title: "Entrar no Discord Oficial Pollinations",
          description: "Conecte sua conta do Discord para interagir com os criadores e desbloquear bônus de comunidade.",
          status: "AVAILABLE",
          rewardPollen: 25,
          actionUrl: "https://discord.gg/pollinations",
          category: "Comunidade",
          progressPercent: 0,
        },
        {
          id: "quest-showcase",
          title: "Publicar o Tomadix no Showcase",
          description: "Apresente o estúdio cinematográfico Tomadix na vitrine comunitária para receber recompensas de pólen.",
          status: "AVAILABLE",
          rewardPollen: 100,
          actionUrl: "https://enter.pollinations.ai",
          category: "Ecossistema",
          progressPercent: 0,
        }
      );
    }

    // 3. Consultar Consumo (Usage)
    let usageData: any = {};
    try {
      const res = await fetch("https://gen.pollinations.ai/account/usage", {
        headers,
        signal: AbortSignal.timeout(10000),
      });

      if (res.ok) {
        usageData = await res.json();
      }
    } catch (err: any) {
      console.warn("[PollinationsAccountService] Falha ao consultar /account/usage:", err.message);
    }

    const result: PollinationsAccountData = {
      balance: balanceInfo,
      quests: questsList,
      usage: usageData,
      lastUpdated: new Date().toISOString(),
      isCached: false,
      apiKeyMasked: maskedKey,
      warning,
    };

    this.cache = {
      data: result,
      timestamp: Date.now(),
    };

    return result;
  }
}

export const PollinationsAccountService = new PollinationsAccountServiceClass();

