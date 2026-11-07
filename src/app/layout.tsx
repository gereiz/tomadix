import type { Metadata, Viewport } from "next";
import "./globals.css";
import { CookieConsentBanner } from "@/components/privacy/cookie-consent-banner";
import { Navbar } from "@/components/navigation/navbar";
import { PlatformSettingsService } from "@/modules/admin/platform-settings.service";
import { ThemeInjector } from "@/components/theme/theme-injector";
import { generateThemeCss } from "@/lib/theme-utils";
import { BRAND } from "@/config/brand";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0b0d12",
};

export const metadata: Metadata = {
  title: {
    default: BRAND.name,
    template: BRAND.meta.titleTemplate,
  },
  description: BRAND.description,
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const customization = await PlatformSettingsService.getCustomization().catch(() => null);

  const themeCss = customization ? generateThemeCss(customization) : "";

  return (
    <html lang="pt-BR" suppressHydrationWarning className="dark">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=localStorage.getItem("tomadix_theme")||"dark";var eff=m==="light"||m==="dark"?m:(window.matchMedia&&window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");var r=document.documentElement;r.setAttribute("data-theme",eff);r.setAttribute("data-theme-mode",m);if(eff==="light"){r.classList.remove("dark");r.classList.add("light");}else{r.classList.remove("light");r.classList.add("dark");}}catch(e){}})();`,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500&family=Plus+Jakarta+Sans:wght@600;700&display=swap"
          rel="stylesheet"
        />
        {customization?.faviconUrl && (
          <link rel="icon" href={customization.faviconUrl} />
        )}
        {themeCss && (
          <style
            id="tomadix-custom-theme"
            dangerouslySetInnerHTML={{ __html: themeCss }}
          />
        )}
      </head>
      <body suppressHydrationWarning className="overflow-x-hidden min-h-screen bg-surface font-body-md text-on-surface antialiased selection:bg-primary selection:text-on-primary">
        {customization && <ThemeInjector initialCustomization={customization} />}
        <Navbar />
        {children}
        <CookieConsentBanner />
      </body>
    </html>
  );
}
