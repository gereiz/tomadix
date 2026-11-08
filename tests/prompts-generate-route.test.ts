import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Teste de contrato HTTP da rota de geração: sem banco, sem Gemini real.
// Mocka a autenticação e o motor; valida o mapeamento de erros para códigos HTTP
// e que nenhum detalhe interno vaza para o cliente.
vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
  return {
    ...actual,
    getCurrentWorkspace: vi.fn(async () => ({
      workspace: { id: "ws-teste" },
      user: { id: "user-teste" },
    })),
  };
});

vi.mock("@/modules/prompt-engine/prompt-engine.service", () => ({
  PromptEngineService: { generate: vi.fn() },
}));

import { POST } from "@/app/api/projects/[id]/prompts/generate/route";
import { PromptEngineService } from "@/modules/prompt-engine/prompt-engine.service";
import { getCurrentWorkspace, AuthorizationError } from "@/lib/auth";
import {
  GeminiAuthError,
  GeminiQuotaError,
  GeminiUnavailableError,
  GeminiTimeoutError,
  GeminiInvalidJsonError,
  GeminiValidationError,
} from "@/modules/ai/gemini-provider";
import { resetRateLimiterStore, RATE_LIMIT_RULES } from "@/lib/rate-limiter";

const generate = vi.mocked(PromptEngineService.generate);

function call(body: unknown) {
  const request = new NextRequest("http://localhost/api/projects/p1/prompts/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(request, { params: Promise.resolve({ id: "p1" }) });
}

const validBody = { templateKey: "image_prompt", targetTool: "google_flow" };

describe("POST /api/projects/[id]/prompts/generate — contrato HTTP", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimiterStore();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("201 com o resultado quando a geração tem sucesso", async () => {
    generate.mockResolvedValueOnce({ jobId: "j1", versionId: "v1" } as never);
    const res = await call(validBody);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.versionId).toBe("v1");
    expect(generate).toHaveBeenCalledWith("p1", "ws-teste", expect.objectContaining({ templateKey: "image_prompt" }));
  });

  it("400 com detalhes quando o corpo é inválido (Zod) e não chama o motor", async () => {
    const res = await call({ templateKey: "inexistente" });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.details).toBeDefined();
    expect(generate).not.toHaveBeenCalled();
  });

  it("403 quando o usuário não tem autorização", async () => {
    vi.mocked(getCurrentWorkspace).mockRejectedValueOnce(new AuthorizationError("Sem acesso ao workspace."));
    const res = await call(validBody);
    expect(res.status).toBe(403);
  });

  it.each([
    ["GeminiAuthError", () => new GeminiAuthError(), 401, "AUTH_ERROR"],
    ["GeminiQuotaError", () => new GeminiQuotaError(), 429, "QUOTA_EXCEEDED"],
    ["GeminiUnavailableError", () => new GeminiUnavailableError(), 503, "MODEL_UNAVAILABLE"],
    ["GeminiTimeoutError", () => new GeminiTimeoutError(), 504, "TIMEOUT"],
    ["GeminiInvalidJsonError", () => new GeminiInvalidJsonError(), 502, "INVALID_JSON"],
    ["GeminiValidationError", () => new GeminiValidationError("fora do schema", { campo: ["x"] }), 422, "VALIDATION_FAILED"],
  ])("%s vira HTTP %i com o code correspondente", async (_nome, build, status, code) => {
    generate.mockRejectedValueOnce(build());
    const res = await call(validBody);
    expect(res.status).toBe(status);
    const json = await res.json();
    expect(json.code).toBe(code);
  });

  it("502 não devolve a resposta bruta da IA ao cliente", async () => {
    generate.mockRejectedValueOnce(new GeminiInvalidJsonError("malformada", "SEGREDO-NA-RESPOSTA-BRUTA"));
    const res = await call(validBody);
    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toContain("SEGREDO-NA-RESPOSTA-BRUTA");
  });

  it("404 para projeto não encontrado e 400 para regra de negócio (saldo)", async () => {
    generate.mockRejectedValueOnce(new Error("Projeto não encontrado ou acesso não permitido."));
    expect((await call(validBody)).status).toBe(404);

    generate.mockRejectedValueOnce(Object.assign(new Error("Saldo insuficiente de créditos (5 disponíveis, 8 necessários)."), { statusCode: 402 }));
    const res = await call(validBody);
    expect(res.status).toBe(402);
    expect((await res.json()).error).toContain("Saldo insuficiente");
  });

  it("500 genérico não vaza a mensagem interna (ex.: string de conexão)", async () => {
    generate.mockRejectedValueOnce(new Error("connect ECONNREFUSED postgresql://admin:senha@10.0.0.5:5432/db"));
    const res = await call(validBody);
    expect(res.status).toBe(500);
    const text = JSON.stringify(await res.json());
    expect(text).not.toContain("postgresql://");
    expect(text).not.toContain("senha");
  });

  it("429 do rate limit após exceder o limite, sem chamar o motor", async () => {
    generate.mockResolvedValue({ jobId: "j", versionId: "v" } as never);
    for (let i = 0; i < RATE_LIMIT_RULES.AI_GENERATION.limit; i++) {
      expect((await call(validBody)).status).toBe(201);
    }
    const blocked = await call(validBody);
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBeTruthy();
    expect((await blocked.json()).code).toBe("RATE_LIMITED");
    expect(generate).toHaveBeenCalledTimes(RATE_LIMIT_RULES.AI_GENERATION.limit);
  });
});
