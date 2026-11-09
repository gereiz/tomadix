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
import {
  isImageFeatureText,
  isVideoFeatureText,
  stripMediaFeatures,
  stripMediaOperations,
} from "@/modules/billing/media-visibility";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf-8");
const KEY = "PLATFORM_GENERAL_SETTINGS";

describe("Chaves globais de geração de imagens e de vídeos", () => {
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

  async function upsertRaw(value: object) {
    await db.commercialPolicy.upsert({
      where: { key: KEY },
      create: {
        key: KEY,
        category: "GENERAL",
        label: "t",
        description: "t",
        dataType: "json",
        value,
        defaultValue: {},
        isSystem: true,
      },
      update: { value },
    });
  }

  it("as duas começam desligadas, inclusive em registros antigos sem as chaves", async () => {
    expect(DEFAULT_GENERAL_SETTINGS.featureFlags.imageGenerationEnabled).toBe(false);
    expect(DEFAULT_GENERAL_SETTINGS.featureFlags.videoGenerationEnabled).toBe(false);

    await upsertRaw({ featureFlags: { registrationEnabled: true } });
    const settings = await PlatformSettingsService.getGeneralSettings();
    expect(settings.featureFlags.imageGenerationEnabled).toBe(false);
    expect(settings.featureFlags.videoGenerationEnabled).toBe(false);
    expect(settings.featureFlags.registrationEnabled).toBe(true);
    expect(settings.featureFlags.visualLibraryEnabled).toBe(true);
  });

  it("migra a chave única antiga: ligada liga as duas, desligada mantém as duas desligadas", async () => {
    await upsertRaw({ featureFlags: { mediaGenerationEnabled: true } });
    let flags = (await PlatformSettingsService.getGeneralSettings()).featureFlags;
    expect(flags.imageGenerationEnabled).toBe(true);
    expect(flags.videoGenerationEnabled).toBe(true);

    await upsertRaw({ featureFlags: { mediaGenerationEnabled: true, videoGenerationEnabled: false } });
    flags = (await PlatformSettingsService.getGeneralSettings()).featureFlags;
    expect(flags.imageGenerationEnabled).toBe(true);
    expect(flags.videoGenerationEnabled).toBe(false);

    await upsertRaw({ featureFlags: { mediaGenerationEnabled: false } });
    flags = (await PlatformSettingsService.getGeneralSettings()).featureFlags;
    expect(flags.imageGenerationEnabled).toBe(false);
    expect(flags.videoGenerationEnabled).toBe(false);
  });

  it("ambas desligadas: imagem e vídeo são recusados sem cobrar créditos", async () => {
    await PlatformSettingsService.updateGeneralSettings(
      { featureFlags: { imageGenerationEnabled: false, videoGenerationEnabled: false } },
      adminId
    );

    await expect(
      ImageGenerationService.generateDirectImage({ workspaceId, userId: adminId, prompt: "um gato" })
    ).rejects.toMatchObject({ code: "MEDIA_GENERATION_DISABLED", statusCode: 403 });

    await expect(
      VideoGenerationService.generateDirectVideo({ workspaceId, userId: adminId, prompt: "um gato correndo" })
    ).rejects.toMatchObject({ code: "MEDIA_GENERATION_DISABLED", statusCode: 403 });

    const ws = await db.workspace.findUniqueOrThrow({ where: { id: workspaceId }, select: { creditsBalance: true } });
    expect(ws.creditsBalance).toBe(100);
  });

  it("só imagens ligada: imagem libera e vídeo continua recusado", async () => {
    await PlatformSettingsService.updateGeneralSettings(
      { featureFlags: { imageGenerationEnabled: true, videoGenerationEnabled: false } },
      adminId
    );
    expect(await PlatformSettingsService.isImageGenerationEnabled()).toBe(true);
    expect(await PlatformSettingsService.isVideoGenerationEnabled()).toBe(false);
    expect(await PlatformSettingsService.isMediaGenerationEnabled()).toBe(true);

    // a guarda libera: o erro agora é outro (prompt vazio), não o bloqueio da chave
    await expect(
      ImageGenerationService.generateDirectImage({ workspaceId, userId: adminId, prompt: "   " })
    ).rejects.toMatchObject({ code: "EMPTY_PROMPT" });
    await expect(
      VideoGenerationService.generateDirectVideo({ workspaceId, userId: adminId, prompt: "x" })
    ).rejects.toMatchObject({ code: "MEDIA_GENERATION_DISABLED" });
  });

  it("só vídeos ligada: a guarda de vídeo libera e imagem continua recusada", async () => {
    await PlatformSettingsService.updateGeneralSettings(
      { featureFlags: { imageGenerationEnabled: false, videoGenerationEnabled: true } },
      adminId
    );
    expect(await PlatformSettingsService.isImageGenerationEnabled()).toBe(false);
    expect(await PlatformSettingsService.isVideoGenerationEnabled()).toBe(true);

    await expect(
      ImageGenerationService.generateDirectImage({ workspaceId, userId: adminId, prompt: "um gato" })
    ).rejects.toMatchObject({ code: "MEDIA_GENERATION_DISABLED" });
  });

  it("a mudança é auditada por tipo, com valor anterior e novo", async () => {
    await PlatformSettingsService.updateGeneralSettings({ featureFlags: { imageGenerationEnabled: true } }, adminId);
    await PlatformSettingsService.updateGeneralSettings({ featureFlags: { videoGenerationEnabled: true } }, adminId);
    await PlatformSettingsService.updateGeneralSettings({ featureFlags: { imageGenerationEnabled: false } }, adminId);

    const logs = await db.platformAuditLog.findMany({
      where: { adminUserId: adminId, action: "PLATFORM_MEDIA_GENERATION_TOGGLED" },
      orderBy: { createdAt: "asc" },
    });
    expect(logs.map((l) => l.details)).toEqual([
      { kind: "image", from: false, to: true },
      { kind: "video", from: false, to: true },
      { kind: "image", from: true, to: false },
    ]);
  });

  it("catálogo público filtra só o tipo que está desligado", () => {
    expect(isImageFeatureText("Geração direta de imagens com IA (Flux)")).toBe(true);
    expect(isImageFeatureText("Acesso a todos os modelos de imagem")).toBe(true);
    expect(isVideoFeatureText("Geração direta de vídeos com IA")).toBe(true);
    expect(isImageFeatureText("Prompts para vídeo ilimitados")).toBe(false);
    expect(isVideoFeatureText("Prompts para vídeo ilimitados")).toBe(false);

    const plan = {
      features: ["Prompts ilimitados", "Geração direta de imagens com cotas elevadas", "Geração direta de vídeos"],
    };
    expect(stripMediaFeatures(plan, { image: false, video: false }).features).toEqual(["Prompts ilimitados"]);
    expect(stripMediaFeatures(plan, { image: true, video: false }).features).toEqual([
      "Prompts ilimitados",
      "Geração direta de imagens com cotas elevadas",
    ]);
    expect(stripMediaFeatures(plan, { image: false, video: true }).features).toEqual([
      "Prompts ilimitados",
      "Geração direta de vídeos",
    ]);

    const sim = {
      services: [
        { operationCode: "GEN_IMAGE_DIRECT" },
        { operationCode: "GEN_VIDEO_DIRECT" },
        { operationCode: "GEN_IMAGE_PROMPT" },
      ],
    };
    const codes = (flags: { image: boolean; video: boolean }) =>
      stripMediaOperations(sim, flags).services.map((s) => s.operationCode);
    expect(codes({ image: false, video: false })).toEqual(["GEN_IMAGE_PROMPT"]);
    expect(codes({ image: true, video: false })).toEqual(["GEN_IMAGE_DIRECT", "GEN_IMAGE_PROMPT"]);
    expect(codes({ image: false, video: true })).toEqual(["GEN_VIDEO_DIRECT", "GEN_IMAGE_PROMPT"]);
  });

  it("guardas e ocultação da interface estão no código", () => {
    expect(read("src/app/api/studio/quick-create/route.ts")).toContain("isImageGenerationEnabled");
    expect(read("src/app/api/videos/available-models/route.ts")).toContain("isVideoGenerationEnabled");
    expect(read("src/app/api/images/available-models/route.ts")).toContain("isImageGenerationEnabled");
    expect(read("src/app/layout.tsx")).toContain("<FeatureFlagsProvider>");
    const settingsPage = read("src/app/admin/settings/page.tsx");
    expect(settingsPage).toContain('id: "features"');
    expect(settingsPage).toContain("imageGenerationEnabled");
    expect(settingsPage).toContain("videoGenerationEnabled");
    expect(read("src/app/admin/page.tsx")).toContain("/admin/settings?tab=features");
    for (const f of [
      "src/components/dashboard/create-hub.tsx",
      "src/components/studio/quick-creation-bar.tsx",
      "src/components/characters/character-grid.tsx",
      "src/components/environments/environment-grid.tsx",
      "src/components/scenes/scenes-list.tsx",
      "src/components/spaces/board/board-toolbar.tsx",
      "src/components/spaces/board/library-drawer.tsx",
      "src/components/spaces/board/node-actions-sheet.tsx",
    ]) {
      expect(read(f), f).toContain("useMediaFlags");
    }
  });
});
