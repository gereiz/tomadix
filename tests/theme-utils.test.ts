import { describe, it, expect } from "vitest";
import { generateThemeCss, getContrastTextColor } from "@/lib/theme-utils";
import { DEFAULT_CUSTOMIZATION } from "@/modules/admin/platform-settings.service";

describe("Theme Utils & Badge Color Configuration", () => {
  it("calculates contrast text color correctly", () => {
    expect(getContrastTextColor("#ffffff")).toBe("#002014");
    expect(getContrastTextColor("#000000")).toBe("#ffffff");
    expect(getContrastTextColor("#2563eb")).toBe("#ffffff");
  });

  it("injects badgeTextColor and badgeBgColor into generated theme CSS", () => {
    const css = generateThemeCss({
      ...DEFAULT_CUSTOMIZATION,
      badgeTextColor: "#ffffff",
      badgeBgColor: "#2563eb",
    });

    expect(css).toContain("--brand-badge-text: #ffffff;");
    expect(css).toContain("--brand-badge-bg: #2563eb;");
    expect(css).toContain("--color-badge-text: #ffffff;");
    expect(css).toContain("--color-badge-bg: #2563eb;");
  });

  it("falls back to white for badgeTextColor if omitted", () => {
    const css = generateThemeCss({
      ...DEFAULT_CUSTOMIZATION,
      badgeTextColor: undefined,
      badgeBgColor: undefined,
    });

    expect(css).toContain("--brand-badge-text: #ffffff;");
    expect(css).toContain(`--brand-badge-bg: ${DEFAULT_CUSTOMIZATION.primaryColor};`);
  });
});

