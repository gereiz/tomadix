import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { ImageEntitlementService } from "@/modules/image-generation/image-entitlement.service";
import { ImageGenerationService } from "@/modules/image-generation/image-generation.service";
import { ImageGenerationError } from "@/modules/image-generation/image-generation.types";
import { PlanTier } from "@prisma/client";
import { GeneratedImageService } from "@/modules/image-generation/generated-image.service";

describe("15.2 e 15.3 Planos, Limites, Custos em Créditos e Segurança", () => {
  const mockWorkspaceId = "ws_test_image_entitlement";
  const mockUserId = "usr_test_image_entitlement";

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("deve BLOQUEAR geração direta de imagens quando o plano estiver com hasImageGeneration = false", async () => {
    // Simular que o plano do workspace é FREE e não possui geração direta
    vi.spyOn(db.subscription, "findUnique").mockResolvedValueOnce({
      workspaceId: mockWorkspaceId,
      planTier: PlanTier.FREE,
      plan: {
        hasImageGeneration: false,
        name: "Plano Gratuito",
      },
    } as any);

    vi.spyOn(db.plan, "findUnique").mockResolvedValueOnce({
      tier: PlanTier.FREE,
      name: "Plano Gratuito",
      hasImageGeneration: false,
    } as any);

    await expect(
      ImageEntitlementService.validateAndCalculate({
        workspaceId: mockWorkspaceId,
        modelId: "flux",
      })
    ).rejects.toThrowError(/não está disponível no plano/);
  });

  it("deve BLOQUEAR quando o modelo solicitado não pertencer à lista de modelos permitidos pelo plano", async () => {
    vi.spyOn(db.subscription, "findUnique").mockResolvedValueOnce({
      workspaceId: mockWorkspaceId,
      planTier: PlanTier.PRO,
    } as any);

    vi.spyOn(db.plan, "findUnique").mockResolvedValueOnce({
      tier: PlanTier.PRO,
      name: "Tomadix Pro",
      hasImageGeneration: true,
      imageAllowedModels: ["flux", "turbo"], // Não inclui 'flux-3d-exclusive'
      imageDailyLimit: 20,
      imageMonthlyLimit: 100,
      imageDefaultCost: 10,
    } as any);

    await expect(
      ImageEntitlementService.validateAndCalculate({
        workspaceId: mockWorkspaceId,
        modelId: "flux-3d-exclusive",
      })
    ).rejects.toThrowError(/não está disponível para o plano/);
  });

  it("deve BLOQUEAR quando o limite diário de gerações do plano for atingido", async () => {
    vi.spyOn(db.subscription, "findUnique").mockResolvedValueOnce({
      workspaceId: mockWorkspaceId,
      planTier: PlanTier.PRO,
    } as any);

    vi.spyOn(db.plan, "findUnique").mockResolvedValueOnce({
      tier: PlanTier.PRO,
      name: "Tomadix Pro",
      hasImageGeneration: true,
      imageAllowedModels: ["flux"],
      imageDailyLimit: 5,
      imageMonthlyLimit: 50,
      imageDefaultCost: 10,
    } as any);

    vi.spyOn(db.imageModelConfig, "findFirst").mockResolvedValueOnce({
      modelId: "flux",
      isEnabled: true,
      isAvailable: true,
    } as any);

    // Simular que já foram feitas 5 gerações bem-sucedidas hoje
    vi.spyOn(GeneratedImageService, "countSuccessfulGenerations").mockImplementation(async (_ws, sinceDate) => {
      return 5;
    });

    await expect(
      ImageEntitlementService.validateAndCalculate({
        workspaceId: mockWorkspaceId,
        modelId: "flux",
      })
    ).rejects.toThrowError(/Limite diário de gerações de imagem atingido/);
  });

  it("deve BLOQUEAR com INSUFFICIENT_CREDITS quando o saldo do workspace for inferior ao custo da geração", async () => {
    vi.spyOn(db.subscription, "findUnique").mockResolvedValueOnce({
      workspaceId: mockWorkspaceId,
      planTier: PlanTier.PRO,
    } as any);

    vi.spyOn(db.plan, "findUnique").mockResolvedValueOnce({
      tier: PlanTier.PRO,
      name: "Tomadix Pro",
      hasImageGeneration: true,
      imageAllowedModels: ["flux"],
      imageDailyLimit: 20,
      imageMonthlyLimit: 100,
      imageDefaultCost: 15,
    } as any);

    vi.spyOn(db.imageModelConfig, "findFirst").mockResolvedValueOnce({
      modelId: "flux",
      isEnabled: true,
      isAvailable: true,
      defaultCreditCost: 15,
    } as any);

    vi.spyOn(GeneratedImageService, "countSuccessfulGenerations").mockResolvedValue(0);

    // Workspace com apenas 5 créditos (precisa de 15)
    vi.spyOn(db.workspace, "findUnique").mockResolvedValueOnce({
      id: mockWorkspaceId,
      creditsBalance: 5,
    } as any);

    await expect(
      ImageEntitlementService.validateAndCalculate({
        workspaceId: mockWorkspaceId,
        modelId: "flux",
      })
    ).rejects.toThrowError(/Saldo insuficiente de créditos/);
  });

  it("deve permitir e calcular corretamente o custo quando todas as regras forem satisfeitas", async () => {
    vi.spyOn(db.subscription, "findUnique").mockResolvedValueOnce({
      workspaceId: mockWorkspaceId,
      planTier: PlanTier.PRO,
    } as any);

    vi.spyOn(db.plan, "findUnique").mockResolvedValueOnce({
      tier: PlanTier.PRO,
      name: "Tomadix Pro",
      hasImageGeneration: true,
      imageAllowedModels: ["flux"],
      imageDailyLimit: 20,
      imageMonthlyLimit: 100,
      imageDefaultCost: 10,
    } as any);

    vi.spyOn(db.imageModelConfig, "findFirst").mockResolvedValueOnce({
      modelId: "flux",
      isEnabled: true,
      isAvailable: true,
      defaultCreditCost: 12, // Override do modelo
    } as any);

    vi.spyOn(GeneratedImageService, "countSuccessfulGenerations").mockResolvedValue(2);

    vi.spyOn(db.workspace, "findUnique").mockResolvedValueOnce({
      id: mockWorkspaceId,
      creditsBalance: 50,
    } as any);

    const check = await ImageEntitlementService.validateAndCalculate({
      workspaceId: mockWorkspaceId,
      modelId: "flux",
    });

    expect(check.creditCost).toBe(12);
    expect(check.availableBalance).toBe(50);
    expect(check.limits.dailyUsed).toBe(2);
    expect(check.planTier).toBe(PlanTier.PRO);
  });
});

