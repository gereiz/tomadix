import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import * as geminiProvider from "@/modules/ai/gemini-provider";
import { CinematicCreationService } from "@/modules/cinematic-creation/cinematic-creation.service";
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
      vi.spyOn(CreditExecutionService as any, "deductViaConsumptionOrder").mockResolvedValue({
        newBalance: 96,
        usedLots: [],
      });

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

  describe("generateSceneSequence (história curta com IA)", () => {
    let workspaceId: string;
    let projectId: string;
    let charA: string;
    let charB: string;
    let envA: string;

    beforeAll(async () => {
      const { db } = await import("@/lib/db");
      const { ProjectService } = await import("@/modules/projects/project.service");
      const { CharacterService } = await import("@/modules/characters/character.service");
      const { EnvironmentService } = await import("@/modules/environments/environment.service");
      const ws = await db.workspace.create({ data: { name: "Seq Test", slug: `seq-test-${Date.now()}` } });
      workspaceId = ws.id;
      const project = await ProjectService.createProject(workspaceId, {
        title: "Fuga nos Telhados",
        description: "Curta de ação noturno.",
        genre: "Ação",
        language: "pt-BR",
        configuration: { aspectRatio: "16:9" },
      } as any);
      projectId = project.id;
      charA = (await CharacterService.createCharacter(projectId, workspaceId, { name: "Lia", description: "Ladra de casaco vermelho." } as any)).id;
      charB = (await CharacterService.createCharacter(projectId, workspaceId, { name: "Caio", description: "Perseguidor de terno cinza." } as any)).id;
      envA = (await EnvironmentService.createEnvironment(projectId, workspaceId, { name: "Telhados", description: "Telhados molhados à noite." } as any)).id;
    }, 60000);

    afterAll(async () => {
      const { db } = await import("@/lib/db");
      await db.scene.deleteMany({ where: { projectId } });
      await db.character.deleteMany({ where: { projectId } });
      await db.environment.deleteMany({ where: { projectId } });
      await db.project.deleteMany({ where: { id: projectId } });
      await db.workspace.deleteMany({ where: { id: workspaceId } });
    }, 60000);

    const scene = (n: number, characterIds: string[], environmentIds: string[]) => ({
      title: `Cena ${n}`,
      description: `Descrição ${n}`,
      durationSeconds: 6,
      framing: "Plano Geral",
      cameraMovement: "Tracking",
      mainAction: `Ação ${n}`,
      lighting: "Neon azul",
      visualStyle: "Noir",
      transitionIn: "Corte",
      transitionOut: "Corte",
      startState: `Início ${n}`,
      endState: `Fim ${n}`,
      visualContinuity: "Casaco vermelho molhado",
      characterIds,
      environmentIds,
    });

    const mockCredits = () => {
      vi.spyOn(EntitlementService, "getWorkspaceSubscription").mockResolvedValue({ planTier: PlanTier.PRO } as any);
      vi.spyOn(CreditPricingService, "resolveCost").mockResolvedValue({
        operationCode: "GEN_SCENE_SEQUENCE", operationName: "Sequência", creditCost: 12, isFree: false, appliedRule: "OPERATION_DEFAULT", version: 1,
      });
      vi.spyOn(CreditExecutionService as any, "deductViaConsumptionOrder").mockResolvedValue({
        newBalance: 88,
        usedLots: [{ lotId: "lot-x", amount: 12 }],
      });
      return vi.spyOn(CreditExecutionService as any, "refundDeductedLots").mockResolvedValue(undefined);
    };

    it("cria 3 cenas em ordem e vincula personagens/ambientes só onde aparecem", async () => {
      vi.restoreAllMocks();
      const refund = mockCredits();
      const data = {
        sequenceTitle: "A Fuga",
        dramaticArc: "Começo, virada e fecho.",
        // ids inventados ("fantasma") devem ser ignorados
        scenes: [scene(1, [charA], [envA]), scene(2, [charA, charB, "fantasma"], [envA]), scene(3, [charB], [])],
      };
      const gen = vi.spyOn(geminiProvider, "generateStructuredJson").mockResolvedValueOnce({
        data, rawText: JSON.stringify(data), model: "mock", tokens: { inputTokens: 1, outputTokens: 1 },
      } as any);

      const res = await CinematicCreationService.generateSceneSequence(projectId, workspaceId, {
        premise: "Uma ladra foge pelos telhados", sceneCount: 3, characterIds: [charA, charB], environmentIds: [envA], mood: "", pacing: "BALANCED",
      });

      // O modelo só obedece o formato se o prompt o descrever (sem isso o Gemini inventa outro JSON).
      const sent = (gen.mock.calls[0][2] as { systemInstruction: string }).systemInstruction;
      expect(sent).toContain('"sequenceTitle"');
      expect(sent).toContain('"startState"');

      const created = res.result.createdScenes;
      expect(created.map((c) => c.order)).toEqual([created[0].order, created[0].order + 1, created[0].order + 2]);
      const chars = created.map((c) => c.characters.map((x) => x.characterId).sort());
      expect(chars).toEqual([[charA], [charA, charB].sort(), [charB]]);
      expect(created.map((c) => c.environments.length)).toEqual([1, 1, 0]);
      expect((created[1].configuration as any).startState).toBe("Início 2");
      expect((created[1].configuration as any).endState).toBe("Fim 2");
      expect((created[1].configuration as any).sequenceTitle).toBe("A Fuga");
      expect(refund).not.toHaveBeenCalled();
    });

    it("JSON inválido falha, não cria cenas e estorna os créditos", async () => {
      vi.restoreAllMocks();
      const refund = mockCredits();
      const { db } = await import("@/lib/db");
      const before = await db.scene.count({ where: { projectId } });
      const bad = { sequenceTitle: "X", dramaticArc: "Y", scenes: [{ title: "só título" }] };
      vi.spyOn(geminiProvider, "generateStructuredJson").mockResolvedValueOnce({
        data: bad, rawText: "{}", model: "mock", tokens: { inputTokens: 1, outputTokens: 1 },
      } as any);

      await expect(
        CinematicCreationService.generateSceneSequence(projectId, workspaceId, {
          premise: "Uma ladra foge pelos telhados", sceneCount: 3, characterIds: [], environmentIds: [], mood: "", pacing: "BALANCED",
        })
      ).rejects.toThrow();

      expect(refund).toHaveBeenCalledTimes(1);
      expect(await db.scene.count({ where: { projectId } })).toBe(before);
    });
  });

  describe("Visual Bible Prerequisites & Parameter Settings", () => {
    it("validates that projectConfigurationSchema accepts parameterSettings.enabledParameterKeys", async () => {
      const { projectConfigurationSchema } = await import("@/lib/schemas/project");
      const parsed = projectConfigurationSchema.parse({
        aspectRatio: "16:9",
        parameterSettings: {
          enabledParameterKeys: ["camera_lens", "lighting_style"],
        },
      });

      expect(parsed.parameterSettings?.enabledParameterKeys).toEqual(["camera_lens", "lighting_style"]);
    });

    it("verifies that CinematicCreationService.generateVisualBible rejects execution when prerequisites are missing", async () => {
      const { CinematicCreationService } = await import("@/modules/cinematic-creation/cinematic-creation.service");
      const { db } = await import("@/lib/db");

      // Mock project with missing description, 0 characters and 0 environments
      vi.spyOn(db.project, "findFirst").mockResolvedValue({
        id: "proj-incomplete",
        workspaceId: "ws-test",
        title: "Projeto Sem Dados",
        description: "",
        genre: null,
        characters: [],
        environments: [],
      } as any);

      await expect(
        CinematicCreationService.generateVisualBible("proj-incomplete", "ws-test", {
          artDirectives: "",
          cinematographerReference: "",
        })
      ).rejects.toMatchObject({
        statusCode: 422,
        code: "PREREQUISITES_NOT_MET",
      });
    });
  });
});

