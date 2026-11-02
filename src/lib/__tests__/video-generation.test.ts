import { describe, it, expect } from "vitest";
import { SEED_CREDIT_OPERATIONS } from "@/modules/billing/credit-pricing.service";
import { PollinationsVideoProvider } from "@/modules/video-generation/pollinations-video-provider";

describe("Video Generation & Credit Pricing", () => {
  it("should have GEN_VIDEO_DIRECT registered in credit operations seed", () => {
    const videoOp = SEED_CREDIT_OPERATIONS.find((op) => op.code === "GEN_VIDEO_DIRECT");
    expect(videoOp).toBeDefined();
    expect(videoOp?.defaultCreditCost).toBeGreaterThanOrEqual(20);
    expect(videoOp?.category).toBe("VIDEO");
  });

  it("should provide certified Pollinations video models with valid aspect ratios and durations", () => {
    const provider = new PollinationsVideoProvider();
    const fallbackModels = provider.getFallbackModels();
    expect(fallbackModels.length).toBeGreaterThanOrEqual(4);

    fallbackModels.forEach((model) => {
      expect(model.modelId).toBeTruthy();
      expect(model.name).toBeTruthy();
      expect(model.supportedAspectRatios).toContain("16:9");
      expect(model.supportedDurations.length).toBeGreaterThan(0);
      expect(model.creditCost).toBeGreaterThanOrEqual(15);
    });
  });

  it("should include Google Veo and ByteDance Seedance in models catalogue", () => {
    const provider = new PollinationsVideoProvider();
    const fallbackModels = provider.getFallbackModels();
    const ids = fallbackModels.map((m) => m.modelId);
    expect(ids.some((id) => id.includes("veo"))).toBe(true);
    expect(ids.some((id) => id.includes("seedance"))).toBe(true);
  });
});
