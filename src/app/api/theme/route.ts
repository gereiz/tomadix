import { NextResponse } from "next/server";
import { PlatformSettingsService } from "@/modules/admin/platform-settings.service";

export async function GET() {
  try {
    const customization = await PlatformSettingsService.getCustomization();
    return NextResponse.json(
      {
        brandName: customization.brandName,
        shortName: customization.shortName,
        tagline: customization.tagline,
        description: customization.description,
        logoUrl: customization.logoUrl,
        compactLogoUrl: customization.compactLogoUrl,
        faviconUrl: customization.faviconUrl,
        primaryColor: customization.primaryColor,
        secondaryColor: customization.secondaryColor,
        accentColor: customization.accentColor,
        backgroundColor: customization.backgroundColor,
        surfaceColor: customization.surfaceColor,
        cardColor: customization.cardColor,
        textPrimaryColor: customization.textPrimaryColor,
        textSecondaryColor: customization.textSecondaryColor,
        borderColor: customization.borderColor,
        themePreference: customization.themePreference,
        borderRadius: customization.borderRadius,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
        },
      }
    );
  } catch (error) {
    return NextResponse.json({ error: "Erro ao obter tema." }, { status: 500 });
  }
}

