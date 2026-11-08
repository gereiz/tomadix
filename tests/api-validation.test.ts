import { describe, it, expect, beforeEach } from "vitest";
import {
  parseJsonBody,
  createInviteBodySchema,
  adjustCreditsBodySchema,
  checkoutBodySchema,
  onboardingStepBodySchema,
  changeConnectionBodySchema,
  connectionInputBodySchema,
  createGeminiKeyBodySchema,
  initializeDatabaseBodySchema,
  geminiPrioritiesBodySchema,
  geminiSettingsBodySchema,
} from "@/lib/api-validation";
import { aiRateLimitResponse } from "@/lib/ai-rate-limit";
import { resetRateLimiterStore, RATE_LIMIT_RULES } from "@/lib/rate-limiter";

function jsonRequest(body: unknown) {
  return new Request("http://localhost/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Validação Zod de corpos de API", () => {
  it("rejeita convite com e-mail inválido ou papel OWNER", async () => {
    const bad = await parseJsonBody(jsonRequest({ email: "nao-e-email" }), createInviteBodySchema);
    expect(bad.response?.status).toBe(400);

    const owner = await parseJsonBody(jsonRequest({ email: "a@b.com", role: "OWNER" }), createInviteBodySchema);
    expect(owner.response?.status).toBe(400);

    const ok = await parseJsonBody(jsonRequest({ email: "a@b.com" }), createInviteBodySchema);
    expect(ok.data?.role).toBe("MEMBER");
  });

  it("rejeita ajuste de créditos zero, fracionário ou sem motivo", async () => {
    for (const body of [
      { workspaceId: "w", amount: 0, reason: "teste" },
      { workspaceId: "w", amount: 1.5, reason: "teste" },
      { workspaceId: "w", amount: 10, reason: "" },
      { workspaceId: "w", amount: 99999999, reason: "teste" },
    ]) {
      const r = await parseJsonBody(jsonRequest(body), adjustCreditsBodySchema);
      expect(r.response?.status).toBe(400);
    }
    const ok = await parseJsonBody(jsonRequest({ workspaceId: "w", amount: -20, reason: "correção" }), adjustCreditsBodySchema);
    expect(ok.data?.amount).toBe(-20);
  });

  it("rejeita plano inexistente no checkout", async () => {
    const r = await parseJsonBody(jsonRequest({ workspaceId: "w", planTier: "ULTRA" }), checkoutBodySchema);
    expect(r.response?.status).toBe(400);
  });

  it("onboarding/step usa padrões seguros", async () => {
    const r = await parseJsonBody(jsonRequest({}), onboardingStepBodySchema);
    expect(r.data).toEqual({ step: 1, completed: false });
  });

  it("corpo que não é JSON vira 400 e não exceção", async () => {
    const req = new Request("http://localhost/test", { method: "POST", body: "{quebrado" });
    const r = await parseJsonBody(req, checkoutBodySchema);
    expect(r.response?.status).toBe(400);
  });
});

describe("Validação Zod das rotas de administração", () => {
  it("troca de banco exige URL postgresql ou host", async () => {
    const semNada = await parseJsonBody(jsonRequest({}), changeConnectionBodySchema);
    expect(semNada.response?.status).toBe(400);

    const urlInvalida = await parseJsonBody(jsonRequest({ url: "mysql://x" }), changeConnectionBodySchema);
    expect(urlInvalida.response?.status).toBe(400);

    const ok = await parseJsonBody(jsonRequest({ url: "postgresql://u:p@h:5432/db" }), changeConnectionBodySchema);
    expect(ok.data?.url).toContain("postgresql://");

    const porHost = await parseJsonBody(jsonRequest({ host: "db.local", port: 5432 }), changeConnectionBodySchema);
    expect(porHost.data?.port).toBe(5432);
  });

  it("tolera porta/prioridade nulas vindas do formulário (NaN vira null no JSON)", async () => {
    const conn = await parseJsonBody(jsonRequest({ host: "h", port: null }), connectionInputBodySchema);
    expect(conn.data?.port).toBeUndefined();

    const key = await parseJsonBody(
      jsonRequest({ name: "Chave 1", apiKey: "AIzaSyExemplo123456", priority: null }),
      createGeminiKeyBodySchema
    );
    expect(key.data?.priority).toBeUndefined();
    expect(key.data?.isActive).toBe(true);
    expect(key.data?.allowedModels).toEqual([]);
  });

  it("rejeita chave Gemini curta ou sem nome", async () => {
    const curta = await parseJsonBody(jsonRequest({ name: "A", apiKey: "123" }), createGeminiKeyBodySchema);
    expect(curta.response?.status).toBe(400);
    const semNome = await parseJsonBody(jsonRequest({ name: "  ", apiKey: "AIzaSyExemplo123456" }), createGeminiKeyBodySchema);
    expect(semNome.response?.status).toBe(400);
  });

  it("inicialização exige senha de 8+ caracteres para o admin inicial", async () => {
    const fraca = await parseJsonBody(
      jsonRequest({ adminUser: { name: "Admin", email: "a@b.com", password: "123" } }),
      initializeDatabaseBodySchema
    );
    expect(fraca.response?.status).toBe(400);

    const ok = await parseJsonBody(
      jsonRequest({ seedDemoProject: false, adminUser: { name: "Admin", email: "a@b.com", password: "senha-forte-123" } }),
      initializeDatabaseBodySchema
    );
    expect(ok.data?.adminUser?.email).toBe("a@b.com");
  });

  it("prioridades e configurações do Gemini validam tipos e limites", async () => {
    const vazia = await parseJsonBody(jsonRequest({ orderedIds: [] }), geminiPrioritiesBodySchema);
    expect(vazia.response?.status).toBe(400);

    const estrategia = await parseJsonBody(jsonRequest({ selectionStrategy: "ALEATORIA" }), geminiSettingsBodySchema);
    expect(estrategia.response?.status).toBe(400);

    const timeoutAbsurdo = await parseJsonBody(jsonRequest({ requestTimeoutMs: 5 }), geminiSettingsBodySchema);
    expect(timeoutAbsurdo.response?.status).toBe(400);

    const ok = await parseJsonBody(
      jsonRequest({
        id: "ignorado",
        selectionStrategy: "BALANCED",
        maxConsecutiveFailures: 3,
        cooldownSeconds: 300,
        requestTimeoutMs: 45000,
        maxAttemptsPerOperation: 3,
        envKeyFallbackAllowed: true,
      }),
      geminiSettingsBodySchema
    );
    expect(ok.data?.selectionStrategy).toBe("BALANCED");
  });
});

describe("Rate limit de geração de IA", () => {
  beforeEach(() => resetRateLimiterStore());

  it("bloqueia com 429 após exceder o limite do workspace e isola workspaces", async () => {
    for (let i = 0; i < RATE_LIMIT_RULES.AI_GENERATION.limit; i++) {
      expect(aiRateLimitResponse("ws-a")).toBeNull();
    }
    const blocked = aiRateLimitResponse("ws-a");
    expect(blocked?.status).toBe(429);
    expect(blocked?.headers.get("Retry-After")).toBeTruthy();
    const body = await blocked!.json();
    expect(body.code).toBe("RATE_LIMITED");

    expect(aiRateLimitResponse("ws-b")).toBeNull();
  });
});
