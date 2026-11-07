import { describe, it, expect, beforeEach } from "vitest";
import {
  parseJsonBody,
  createInviteBodySchema,
  adjustCreditsBodySchema,
  checkoutBodySchema,
  onboardingStepBodySchema,
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
