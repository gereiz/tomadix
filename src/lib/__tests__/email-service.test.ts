import { describe, it, expect } from "vitest";
import { encryptString, decryptString, maskSecretValue } from "../encryption";
import {
  renderBaseEmailTemplate,
  getWelcomeEmail,
  getPasswordResetEmail,
  getCreditsNotificationEmail,
  getTestEmail,
} from "../../modules/email/email-templates";

describe("Email System — Encryption & Templates", () => {
  it("should encrypt and decrypt secrets safely using AES-256-GCM serialization", () => {
    const originalSecret = "google-app-password-1234-xyz";
    const encrypted = encryptString(originalSecret);

    expect(encrypted).not.toBe(originalSecret);
    expect(encrypted.split(":")).toHaveLength(3); // iv:authTag:data

    const decrypted = decryptString(encrypted);
    expect(decrypted).toBe(originalSecret);
  });

  it("should mask secrets preventing credentials from leaking to frontend", () => {
    expect(maskSecretValue(undefined)).toBe("");
    expect(maskSecretValue("")).toBe("");
    expect(maskSecretValue("abcd")).toBe("••••••••");
    expect(maskSecretValue("my-secret-key-12345")).toBe("my-s••••••••2345");
  });

  it("should generate responsive cinematic dark luxury email templates", () => {
    const welcome = getWelcomeEmail({ name: "Guillermo del Toro" });
    expect(welcome.subject).toContain("Bem-vindo");
    expect(welcome.html).toContain("Guillermo del Toro");
    expect(welcome.html).toContain("#090c10"); // Dark Luxury background
    expect(welcome.html).toContain("TOMADIX");

    const reset = getPasswordResetEmail({ resetUrl: "https://tomadix.ai/reset-password?token=abc" });
    expect(reset.subject).toContain("senha");
    expect(reset.html).toContain("https://tomadix.ai/reset-password?token=abc");

    const credits = getCreditsNotificationEmail({
      name: "Quentin",
      amount: 250,
      newBalance: 1000,
      reason: "Recarga de Créditos",
    });
    expect(credits.subject).toContain("Créditos");
    expect(credits.html).toContain("250");
    expect(credits.html).toContain("1000");

    const test = getTestEmail({
      providerName: "Gmail SMTP",
      testedBy: "admin@tomadix.ai",
      timestamp: "2026-11-02 18:00:00",
    });
    expect(test.subject).toContain("Teste Tomadix");
    expect(test.html).toContain("admin@tomadix.ai");
    expect(test.html).toContain("Gmail SMTP");
  });
});
