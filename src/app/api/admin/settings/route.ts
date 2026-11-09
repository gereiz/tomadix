import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { PlatformSettingsService } from "@/modules/admin/platform-settings.service";

const featureFlagsSchema = z
  .object({
    registrationEnabled: z.boolean(),
    cinematicStudioEnabled: z.boolean(),
    visualLibraryEnabled: z.boolean(),
    advancedParametersEnabled: z.boolean(),
    imageGenerationEnabled: z.boolean(),
    videoGenerationEnabled: z.boolean(),
  })
  .partial()
  .strict();

const settingsSchema = z
  .object({
    platformName: z.string().max(120),
    platformDescription: z.string().max(500),
    contactEmail: z.string().max(200),
    publicUrl: z.string().max(300),
    supportUrl: z.string().max(300),
    maintenanceMode: z.boolean(),
    maintenanceMessage: z.string().max(500),
    announcementBanner: z
      .object({ enabled: z.boolean(), message: z.string().max(500), type: z.enum(["info", "warning", "alert"]) })
      .partial(),
    featureFlags: featureFlagsSchema,
    maxUploadSizeMb: z.number().min(1).max(500),
  })
  .partial();

export async function GET() {
  try {
    await requirePlatformAdmin("settings:manage");
    const settings = await PlatformSettingsService.getGeneralSettings();
    return NextResponse.json({ settings });
  } catch (error: any) {
    if (error instanceof AuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof AuthenticationError) return NextResponse.json({ error: error.message }, { status: 401 });
    return NextResponse.json({ error: error?.message || "Erro ao obter configurações gerais." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = await requirePlatformAdmin("settings:manage");
    const parsed = settingsSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos.", issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) },
        { status: 422 }
      );
    }

    const updated = await PlatformSettingsService.updateGeneralSettings(parsed.data, admin.id);
    return NextResponse.json({ success: true, settings: updated });
  } catch (error: any) {
    if (error instanceof AuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof AuthenticationError) return NextResponse.json({ error: error.message }, { status: 401 });
    return NextResponse.json({ error: error?.message || "Erro ao salvar configurações gerais." }, { status: 500 });
  }
}
