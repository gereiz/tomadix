import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { db } from "@/lib/db";
import {
  PlatformSettingsService,
  DEFAULT_GENERAL_SETTINGS,
} from "@/modules/admin/platform-settings.service";
import { ImageGenerationService } from "@/modules/image-generation/image-generation.service";
import { VideoGenerationService } from "@/modules/video-generation/video-generation.service";
import { isMediaFeatureText, stripMediaFeatures, stripMediaOperations } from "@/modules/billing/media-visibility";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf-8");
const KEY = "PLATFORM_GENERAL_SETTINGS";

describe("Chave global de geração de imagens e vídeos", () => {
  let adminId: string;
  let workspaceId: string;
  let originalValue: unknown = null;
  let hadRecord = false;

  beforeEach(async () => {
    const record = await db.commercialPolicy.findUnique({ where: { key: KEY } });
    hadRecord = Boolean(record);
    originalValue = record?.value ?? null;

    const user = await db.user.create({
      data: {
        authSubject: `auth_media_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        email: `media_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`,
        displayName: "Admin Mídia",
        passwordHash: "x",
      },
    });
    adminId = user.id;
    const ws = await db.workspace.create({
      data: {
        name: "Mídia Teste",
        slug: `midia-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        isPersonal: true,
        creditsBalance: 100,
        memberships: { create: { userId: user.id, role: "OWNER" } },
      },
    });
    workspaceId = ws.id;
  });

  afterEach(async () => {
    // restaura a configuração original e limpa os dados do teste
    if (hadRecord) {
      await db.commercialPolicy.update({ where: { key: KEY }, data: { value: originalValue as object } });
    } else {
      await db.commercialPolicy.deleteMany({ where: { key: KEY } });
    }
    await db.platformAuditLog.deleteMany({ where: { adminUserId: adminId } });
    await db.creditLedger.deleteMany({ where: { workspaceId } }).catch(() => undefined);
    await db.workspace.delete({ where: { id: workspaceId } }).catch(() => undefined);
    await db.user.delete({ where: { id: adminId } }).catch(() => undefined);
    // invalida o cache em memória
    await PlatformSettingsService.updateGeneralSettings({}, adminId).catch(() => undefined);
  });

  it("começa desligada por padrão, inclusive em registros antigos sem a chave", async () => {
    expect(DEFAULT_GENERAL_SETTINGS.featureFlags.mediaGenerationEnabled).toBe(false);

    // registro "antigo": featureFlags sem a chave nova
    await db.commercialPolicy.upsert({
      where: { key: KEY },
      create: {
        key: KEY,
        category: "GENERAL",
        label: "t",
        description: "t",
        dataType: "json",
        value: { featureFlags: { registrationEnabled: true } },
        defaultValue: {},
        isSystem: true,
      },
      update: { value: { featureFlags: { registrationEnabled: true } } },
    });
    const settings = await PlatformSettingsService.getGeneralSettings();
    expect(settings.featureFlags.mediaGenerationEnabled).toBe(false);
    expect(settings.featureFlags.registrationEnabled).toBe(true);
    expect(settings.featureFlags.visualLibraryEnabled).toBe(true);
  });

  it("desligada, a geração de imagem e de vídeo é recusada sem cobrar créditos", async () => {
    await PlatformSettingsService.updateGeneralSettings({ featureFlags: { mediaGenerationEnabled: false } }, adminId);

    await expect(
      ImageGenerationService.generateDirectImage({ workspaceId, userId: adminId, prompt: "um gato" })
    ).rejects.toMatchObject({ code: "MEDIA_GENERATION_DISABLED", statusCode: 403 });

    await expect(
      VideoGenerationService.generateDirectVideo({ workspaceId, userId: adminId, prompt: "um gato correndo" })
    ).rejects.toMatchObject({ code: "MEDIA_GENERATION_DISABLED", statusCode: 403 });

    const ws = await db.workspace.findUniqueOrThrow({ where: { id: workspaceId }, select: { creditsBalance: true } });
    expect(ws.creditsBalance).toBe(100);
  });

  it("ligar e desligar vale na hora para a API e fica auditado", async () => {
    await PlatformSettingsService.updateGeneralSettings({ featureFlags: { mediaGenerationEnabled: true } }, adminId);
    expect(await PlatformSettingsService.isMediaGenerationEnabled()).toBe(true);
    // a guarda libera: o erro agora é outro (prompt vazio), não o bloqueio da chave
    await expect(
      ImageGenerationService.generateDirectImage({ workspaceId, userId: adminId, prompt: "   " })
    ).rejects.toMatchObject({ code: "EMPTY_PROMPT" });

    await PlatformSettingsService.updateGeneralSettings({ featureFlags: { mediaGenerationEnabled: false } }, adminId);
    expect(await PlatformSettingsService.isMediaGenerationEnabled()).toBe(false);

    const logs = await db.platformAuditLog.findMany({
      where: { adminUserId: adminId, action: "PLATFORM_MEDIA_GENERATION_TOGGLED" },
      orderBy: { createdAt: "asc" },
    });
    expect(logs.map((l) => (l.details as { to: boolean }).to)).toEqual([true, false]);
  });

  it("catálogo público não menciona imagem/vídeo quando desligada", () => {
    expect(isMediaFeatureText("Geração direta de imagens com IA (Flux)")).toBe(true);
    expect(isMediaFeatureText("Acesso a todos os modelos de imagem")).toBe(true);
    expect(isMediaFeatureText("Prompts para vídeo ilimitados")).toBe(false);

    const plan = stripMediaFeatures({ features: ["Prompts ilimitados", "Geração direta de imagens com cotas elevadas"] });
    expect(plan.features).toEqual(["Prompts ilimitados"]);

    const sim = stripMediaOperations({
      services: [
        { operationCode: "GEN_IMAGE_DIRECT" },
        { operationCode: "GEN_VIDEO_DIRECT" },
        { operationCode: "GEN_IMAGE_PROMPT" },
      ],
    });
    expect(sim.services.map((s) => s.operationCode)).toEqual(["GEN_IMAGE_PROMPT"]);
  });

  it("guardas e ocultação da interface estão no código", () => {
    expect(read("src/app/api/studio/quick-create/route.ts")).toContain("isMediaGenerationEnabled");
    expect(read("src/app/api/videos/available-models/route.ts")).toContain("enabled: false");
    expect(read("src/app/api/images/available-models/route.ts")).toContain("enabled: false");
    expect(read("src/app/layout.tsx")).toContain("<FeatureFlagsProvider>");
    for (const f of [
      "src/components/dashboard/create-hub.tsx",
      "src/components/studio/quick-creation-bar.tsx",
      "src/components/characters/character-grid.tsx",
      "src/components/environments/environment-grid.tsx",
      "src/components/scenes/scenes-list.tsx",
      "src/components/spaces/board/board-toolbar.tsx",
      "src/components/spaces/board/library-drawer.tsx",
    ]) {
      expect(read(f), f).toContain("useMediaGeneration");
    }
  });
});
