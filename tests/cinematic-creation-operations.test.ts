import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  expandSceneSchema,
  generateSceneSequenceSchema,
  generateScriptSchema,
  generateCharacterSchema,
  generateEnvironmentSchema,
  enhancePromptSchema,
  batchGeneratePromptsSchema,
} from "@/modules/cinematic-creation/cinematic-creation.schema";
import { CreditPricingService } from "@/modules/billing/credit-pricing.service";
import { CreditExecutionService } from "@/modules/billing/credit-execution.service";
import { EntitlementService } from "@/modules/billing/entitlement.service";
import { PlanTier } from "@prisma/client";

describe("Cinematic Creation Operations & AI Schemas", () => {
  describe("Input Schemas Validation", () => {
    it("validates expandSceneSchema successfully with default sub-shots", () => {
      const valid = expandSceneSchema.parse({
        expansionType: "SUB_SHOTS",
        count: 3,
        directives: "Foco no olhar do protagonista",
      });
      expect(valid.expansionType).toBe("SUB_SHOTS");
      expect(valid.count).toBe(3);
    });

    it("rejects invalid expansion count outside boundaries (min 2, max 4)", () => {
      expect(() => expandSceneSchema.parse({ count: 5 })).toThrow();
      expect(() => expandSceneSchema.parse({ count: 1 })).toThrow();
    });

    it("validates generateSceneSequenceSchema with valid pacing", () => {
      const valid = generateSceneSequenceSchema.parse({
        premise: "Fuga noturna nos telhados de paralelepípedo",
        sceneCount: 5,
        pacing: "ACTION_INTENSE",
      });
      expect(valid.pacing).toBe("ACTION_INTENSE");
      expect(valid.sceneCount).toBe(5);
    });

    it("validates generateScriptSchema with format and tone", () => {
      const valid = generateScriptSchema.parse({
        premise: "Um detetive investiga um caso impossível em Tóquio",
        format: "SHORT_FILM",
        tone: "Neo-noir melancólico",
        generateScenesImmediately: true,
      });
      expect(valid.format).toBe("SHORT_FILM");
      expect(valid.generateScenesImmediately).toBe(true);
    });

    it("validates generateCharacterSchema and generateEnvironmentSchema", () => {
      const char = generateCharacterSchema.parse({
        prompt: "Hacker veterana de 30 anos com estilo techwear",
        archetype: "O Rebelde",
      });
      expect(char.archetype).toBe("O Rebelde");

      const env = generateEnvironmentSchema.parse({
        prompt: "Laboratório clandestino com néons azuis",
        locationType: "INTERIOR",
      });
      expect(env.locationType).toBe("INTERIOR");
    });

    it("validates enhancePromptSchema with target generators", () => {
      const enhance = enhancePromptSchema.parse({
        prompt: "Um homem andando na chuva",
        targetGenerator: "MIDJOURNEY",
        enhancementFocus: "ALL_CINEMATIC",
      });
      expect(enhance.targetGenerator).toBe("MIDJOURNEY");
    });
  });

  describe("Credit Operations Pricing Resolution", () => {
    it("resolves pricing for EXPAND_SCENE, GEN_SCENE_SEQUENCE and GEN_SCRIPT", async () => {
      const expandCost = await CreditPricingService.resolveCost("EXPAND_SCENE", PlanTier.FREE);
      expect(expandCost.operationCode).toBe("EXPAND_SCENE");
      expect(expandCost.creditCost).toBeGreaterThan(0);

      const seqCost = await CreditPricingService.resolveCost("GEN_SCENE_SEQUENCE", PlanTier.FREE);
      expect(seqCost.operationCode).toBe("GEN_SCENE_SEQUENCE");
      expect(seqCost.creditCost).toBeGreaterThan(0);

      const scriptCost = await CreditPricingService.resolveCost("GEN_SCRIPT", PlanTier.FREE);
      expect(scriptCost.operationCode).toBe("GEN_SCRIPT");
      expect(scriptCost.creditCost).toBeGreaterThan(0);
    });

    it("resolves pricing for GEN_CHARACTER, GEN_ENVIRONMENT and REWRITE_ENHANCE", async () => {
      const charCost = await CreditPricingService.resolveCost("GEN_CHARACTER", PlanTier.FREE);
      expect(charCost.creditCost).toBeGreaterThan(0);

      const envCost = await CreditPricingService.resolveCost("GEN_ENVIRONMENT", PlanTier.FREE);
      expect(envCost.creditCost).toBeGreaterThan(0);

      const rewriteCost = await CreditPricingService.resolveCost("REWRITE_ENHANCE", PlanTier.FREE);
      expect(rewriteCost.creditCost).toBeGreaterThan(0);
    });
  });

  describe("Credit Execution Atomic Wrapper for Cinematic Tasks", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("executes task and charges credits when balance is sufficient", async () => {
      vi.spyOn(EntitlementService, "getWorkspaceSubscription").mockResolvedValue({
        planTier: PlanTier.PRO,
      } as any);

      vi.spyOn(CreditPricingService, "resolveCost").mockResolvedValue({
        operationCode: "EXPAND_SCENE",
        operationName: "Expansão de Cena",
        creditCost: 4,
        isFree: false,
        appliedRule: "OPERATION_DEFAULT",
        version: 1,
      });

      vi.spyOn(EntitlementService, "assertCanConsumeCredits").mockResolvedValue();
      vi.spyOn(EntitlementService, "deductCredits").mockResolvedValue(96);

      const result = await CreditExecutionService.executeWithCredits(
        {
          workspaceId: "ws-test",
          operationCode: "EXPAND_SCENE",
          description: "Teste de expansão de cena",
        },
        async () => {
          return { shotsCreated: 3 };
        }
      );

      expect(result.success).toBe(true);
      expect(result.creditCost).toBe(4);
      expect(result.newBalance).toBe(96);
      expect(result.result).toEqual({ shotsCreated: 3 });
    });
  });
});

