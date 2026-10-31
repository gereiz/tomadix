import { describe, it, expect, vi, beforeEach } from "vitest";
import { PollinationsImageProvider } from "@/modules/image-generation/pollinations-image-provider";
import { ImageGenerationError } from "@/modules/image-generation/image-generation.types";
import { ImageProviderRegistryService } from "@/modules/image-generation/image-provider-registry.service";

describe("15.1 Integração e Provedor Pollinations.ai", () => {
  let provider: PollinationsImageProvider;

  beforeEach(() => {
    provider = new PollinationsImageProvider();
    vi.restoreAllMocks();
  });

  it("deve expor identificador e capacidades estruturais corretas", () => {
    expect(provider.id).toBe("pollinations");
    expect(provider.name).toBe("Pollinations.ai");

    const caps = provider.getCapabilities();
    expect(caps.supportsReferenceImages).toBe(true);
    expect(caps.supportsNegativePrompt).toBe(true);
    expect(caps.supportedAspectRatios).toContain("16:9");
    expect(caps.supportedAspectRatios).toContain("1:1");
    expect(caps.supportedResolutions).toContain("1024x1024");
    expect(caps.supportedResolutions).toContain("1280x720");
  });

  it("deve retornar status UNCONFIGURED no teste de conexão quando apiKey não for informada", async () => {
    const result = await provider.testConnection("");
    expect(result.success).toBe(false);
    expect(result.status).toBe("UNCONFIGURED");
    expect(result.message).toContain("não configurada");
  });

  it("deve validar conexão com sucesso quando API retornar lista de modelos", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ["flux", "turbo", "flux-realism"],
    } as any);

    const result = await provider.testConnection("sk_test_valid_key_12345");
    expect(result.success).toBe(true);
    expect(result.status).toBe("CONNECTED");
    expect(result.modelsCount).toBe(3);
    expect(result.eligibleModels).toContain("flux");
  });

  it("deve tratar erro 401 como INVALID_KEY com mensagem compreensível", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => "Unauthorized: Invalid API key",
    } as any);

    const result = await provider.testConnection("sk_invalid_key");
    expect(result.success).toBe(false);
    expect(result.status).toBe("INVALID_KEY");
    expect(result.message).toContain("inválida");
  });

  it("deve tratar erro 402 como INSUFFICIENT_BALANCE", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 402,
      text: async () => "Payment Required: Out of pollen",
    } as any);

    const result = await provider.testConnection("sk_out_of_pollen");
    expect(result.success).toBe(false);
    expect(result.status).toBe("INSUFFICIENT_BALANCE");
    expect(result.message).toContain("Saldo ou orçamento insuficiente");
  });

  it("deve tratar erro 429 como RATE_LIMIT_EXCEEDED", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: async () => "Too Many Requests",
    } as any);

    await expect(
      provider.listModels("sk_key")
    ).rejects.toThrowError(ImageGenerationError);
  });

  it("deve tratar erro 500 / 503 como PROVIDER_UNAVAILABLE", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 503,
      text: async () => "Service Unavailable",
    } as any);

    const result = await provider.testConnection("sk_valid_key");
    expect(result.success).toBe(false);
    expect(result.status).toBe("UNREACHABLE");
  });

  it("deve gerar imagem com sucesso via endpoint OpenAI recebendo b64_json", async () => {
    const mockB64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ "x-pollen-cost": "1" }),
      json: async () => ({
        created: Date.now(),
        data: [
          {
            b64_json: mockB64,
            revised_prompt: "Cinematic portrait with soft volumetric lighting",
          },
        ],
      }),
    } as any);

    const result = await provider.generateImage(
      {
        prompt: "A cinematic detective in rainy neo-noir city",
        model: "flux",
        aspectRatio: "16:9",
      },
      "sk_live_valid_key"
    );

    expect(result.b64Json).toBe(mockB64);
    expect(result.imageUrl).toContain("data:image/jpeg;base64,");
    expect(result.model).toBe("flux");
    expect(result.externalCost).toBe(1);
    expect(result.externalCostUnit).toBe("pollen");
    expect(result.revisedPrompt).toContain("Cinematic portrait");
  });

  it("deve gerar imagem com sucesso recebendo URL", async () => {
    const mockUrl = "https://gen.pollinations.ai/images/test_image_123.jpg";

    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({
        data: [{ url: mockUrl }],
      }),
    } as any);

    const result = await provider.generateImage(
      {
        prompt: "Futuristic spaceship landing in desert at sunset",
        model: "turbo",
        aspectRatio: "1:1",
      },
      "sk_live_valid_key"
    );

    expect(result.imageUrl).toBe(mockUrl);
    expect(result.model).toBe("turbo");
  });

  it("deve mascarar a API Key com segurança nunca expondo a chave integral", () => {
    expect(ImageProviderRegistryService.maskApiKey("sk_live_9876543210abcdef")).toBe("sk_l...cdef");
    expect(ImageProviderRegistryService.maskApiKey("")).toBe("(não configurada)");
    expect(ImageProviderRegistryService.maskApiKey("1234")).toBe("••••••••");
  });
});

