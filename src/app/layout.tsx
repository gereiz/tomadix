import type { Metadata } from "next";
import "./globals.css";
import { CookieConsentBanner } from "@/components/privacy/cookie-consent-banner";

import { BRAND } from "@/config/brand";

export const metadata: Metadata = {
  title: {
    default: BRAND.name,
    template: BRAND.meta.titleTemplate,
  },
  description: BRAND.description,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
        <CookieConsentBanner />
      </body>
    </html>
  );
}
