import { describe, it, expect, vi, beforeEach } from "vitest";
import { composePromptInstructions } from "@/modules/prompt-engine/compose-prompt";
import { CreditExecutionService } from "@/modules/billing/credit-execution.service";
import { CreditPricingService } from "@/modules/billing/credit-pricing.service";
import { EntitlementService } from "@/modules/billing/entitlement.service";
import { BillingPolicyService } from "@/modules/billing/billing-policy.service";
import { db } from "@/lib/db";

describe("Credit Execution and Contextual Mentions", () => {
  describe("composePromptInstructions with contextualReferences", () => {
    it("embeds character, environment and scene mentions with high fidelity", () => {
      const dummyProject = {
        id: "proj-1",
        title: "Cyberpunk 2099",
        description: "Projeto Sci-Fi de teste",
        genre: "Sci-Fi",
        targetAudience: "Adults",
        language: "pt-BR",
        aspectRatio: "16:9",
        visualStyle: "Neon Dark",
      } as any;

      const dummyTool = {
        id: "google_flow",
        key: "google_flow",
        version: "1.0",
        name: "Google Flow",
        description: "Video/Prompt Model",
        supportsNegativePrompt: true,
        maxTokens: 4096,
        formatInstructions: "Output JSON",
        promptFormattingRules: ["Gere descrições visuais ricas", "Use iluminação dramática"],
        supportedOutputs: ["json"],
        features: [],
      } as any;

      const dummyTemplate = {
        key: "visual_bible" as const,
        title: "Bíblia Visual",
        description: "Template para bíblia visual",
        version: 1,
        systemInstruction: "You are an AI cinematographer.",
        userPromptTemplate: "Generate visual bible for {project_title}.",
        schema: {},
        name: "Bíblia Visual",
        sections: [],
        systemInstructions: "You are an AI cinematographer.",
      } as any;

      const result = composePromptInstructions({
        project: dummyProject,
        toolProfile: dummyTool,
        template: dummyTemplate,
        resolvedParameters: {
          lighting: "Chiaroscuro Neon",
          lens: "Anamorphic 35mm",
        },
        contextualReferences: {
          characters: [
            {
              id: "char-1",
              name: "Sofia",
              description: "Hacker rebelde com jaqueta de couro e implantes cibernéticos.",
              attributes: { hair: "neon blue", age: "28" },
            },
          ],
          environments: [
            {
              id: "env-1",
              name: "Submundo Neon",
              description: "Beco chuvoso com luzes de neon holográficas e fumaça densa.",
              attributes: { weather: "rain", mood: "cyberpunk" },
            },
          ],
          scenes: [
            {
              id: "scene-1",
              title: "A Fuga do Distrito 9",
              order: 1,
              description: "Perseguição em alta velocidade entre arranha-céus.",
              configuration: { camera: "drone chase" },
            },
          ],
        },
        customInstructions: "Gere a cena com foco no confronto entre @Sofia e os drones.",
      });

      expect(result.userPrompt).toContain("REFERÊNCIAS CONTEXTUAIS VINCULADAS DO PROJETO");
      expect(result.userPrompt).toContain("Personagens de Referência Vinculados (@):");
      expect(result.userPrompt).toContain("@Sofia (ID: char-1): Hacker rebelde com jaqueta de couro");
      expect(result.userPrompt).toContain("Ambientes / Locações de Referência Vinculados (#):");
      expect(result.userPrompt).toContain("#Submundo Neon (ID: env-1): Beco chuvoso com luzes de neon");
      expect(result.userPrompt).toContain("Cenas de Referência Vinculadas ($):");
      expect(result.userPrompt).toContain("$A Fuga do Distrito 9 (Cena #1, ID: scene-1)");
      expect(result.userPrompt).toContain("Gere a cena com foco no confronto entre @Sofia e os drones.");
    });
  });

  describe("CreditExecutionService.executeWithCredits", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("executes the callback and deducts resolved credits atomically", async () => {
      vi.spyOn(db.subscription, "findUnique").mockResolvedValue({
        planTier: "PRO",
      } as any);

      vi.spyOn(CreditPricingService, "resolveCost").mockResolvedValue({
        operationCode: "CINEMATIC_ANALYSIS",
        operationName: "Análise Cinematográfica",
        creditCost: 2,
        currentPlanTier: "PRO",
        appliedRule: "PLAN_SPECIFIC",
        version: 1,
      } as any);

      vi.spyOn(EntitlementService, "assertCanConsumeCredits").mockResolvedValue(true as any);

      const mockTx = {
        workspace: {
          findUnique: vi.fn().mockResolvedValue({ creditsBalance: 100 }),
          update: vi.fn().mockResolvedValue({ creditsBalance: 98 }),
        },
        creditLedger: {
          create: vi.fn().mockResolvedValue({ id: "ledger-1" }),
        },
      };

      vi.spyOn(db, "$transaction").mockImplementation(async (cb: any) => {
        return await cb(mockTx);
      });

      const result = await CreditExecutionService.executeWithCredits(
        {
          workspaceId: "ws-1",
          operationCode: "CINEMATIC_ANALYSIS",
          description: "Análise Multimodal de Teste",
        },
        async () => {
          return { analysisId: "anal-1", score: 95 };
        }
      );

      expect(result.creditCost).toBe(2);
      expect(result.newBalance).toBe(98);
      expect(result.result).toEqual({ analysisId: "anal-1", score: 95 });
      expect(mockTx.workspace.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "ws-1" },
          data: { creditsBalance: 98 },
        })
      );
    });

    it("automatically refunds deducted credits if the execution fails", async () => {
      vi.spyOn(db.subscription, "findUnique").mockResolvedValue({
        planTier: "FREE",
      } as any);

      vi.spyOn(CreditPricingService, "resolveCost").mockResolvedValue({
        operationCode: "QUICK_CREATION",
        operationName: "Criação Rápida",
        creditCost: 1,
        currentPlanTier: "FREE",
        appliedRule: "OPERATION_DEFAULT",
        version: 1,
      } as any);

      vi.spyOn(EntitlementService, "assertCanConsumeCredits").mockResolvedValue(true as any);

      const mockTxDeduct = {
        workspace: {
          findUnique: vi.fn().mockResolvedValue({ creditsBalance: 50 }),
          update: vi.fn().mockResolvedValue({ creditsBalance: 49 }),
        },
        creditLedger: {
          create: vi.fn().mockResolvedValue({ id: "ledger-deduct" }),
        },
      };

      vi.spyOn(db, "$transaction").mockImplementation(async (cb: any) => {
        return await cb(mockTxDeduct);
      });

      vi.spyOn(BillingPolicyService, "getPolicyValue").mockResolvedValue(true);

      const updateWsSpy = vi.spyOn(db.workspace, "update").mockResolvedValue({ creditsBalance: 50 } as any);
      const createLedgerSpy = vi.spyOn(db.creditLedger, "create").mockResolvedValue({ id: "ledger-refund" } as any);

      await expect(
        CreditExecutionService.executeWithCredits(
          {
            workspaceId: "ws-1",
            operationCode: "QUICK_CREATION",
            description: "Criação Rápida Falha",
          },
          async () => {
            throw new Error("Erro de infraestrutura na IA");
          }
        )
      ).rejects.toThrow("Erro de infraestrutura na IA");

      // Verificou que o estorno foi acionado
      expect(updateWsSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "ws-1" },
          data: { creditsBalance: { increment: 1 } },
        })
      );
      expect(createLedgerSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            amount: 1,
            reason: expect.stringContaining("Estorno automático por falha"),
          }),
        })
      );
    });
  });
});
