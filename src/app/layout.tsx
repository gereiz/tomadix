import type { Metadata, Viewport } from "next";
import "./globals.css";
import { CookieConsentBanner } from "@/components/privacy/cookie-consent-banner";
import { Navbar } from "@/components/navigation/navbar";

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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className="dark">
      <body suppressHydrationWarning className="overflow-x-hidden min-h-screen bg-[#0b0d12] text-white selection:bg-emerald-500 selection:text-black">
        <Navbar />
        {children}
        <CookieConsentBanner />
      </body>
    </html>
  );
}
