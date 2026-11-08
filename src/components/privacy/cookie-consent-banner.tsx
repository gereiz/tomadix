"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const CONSENT_STORAGE_KEY = "tomadix_cookie_consent_v1";
const LEGACY_CONSENT_STORAGE_KEY = "cineprompt_cookie_consent_v1";

export function CookieConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const hasConsented =
      localStorage.getItem(CONSENT_STORAGE_KEY) ||
      localStorage.getItem(LEGACY_CONSENT_STORAGE_KEY);
    if (!hasConsented) {
      setShowBanner(true);
    }
  }, []);

  const handleConsent = async (type: "all" | "essential") => {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({ type, timestamp: Date.now() }));
    setShowBanner(false);

    // Se estiver autenticado, registra formalmente no banco
    try {
      await fetch("/api/users/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consentType: type === "all" ? "PRIVACY_POLICY" : "ESSENTIAL_COOKIES",
          version: "1.0",
          granted: true,
        }),
      });
    } catch {
      // Ignora erro se for usuário anônimo
    }
  };

  if (!showBanner) return null;

  return (
    <div className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[90] animate-fade-in md:inset-x-auto md:bottom-6 md:right-6 md:max-w-md">
      <div className="max-h-[70dvh] overflow-y-auto rounded-2xl border border-white/15 bg-[#0b0e17] p-4 shadow-2xl space-y-3 text-xs sm:p-5">
        <div className="flex items-start gap-3">
          <span className="text-xl">🍪</span>
          <div className="space-y-1">
            <h4 className="font-bold text-white">Privacidade e Cookies</h4>
            <p className="text-white/70 leading-relaxed text-xs">
              Utilizamos cookies essenciais de segurança e sessões para operar o Tomadix. Ao continuar, você concorda com nossos{" "}
              <Link href="/terms" className="text-amber-400 hover:underline">
                Termos de Uso
              </Link>{" "}
              e nossa{" "}
              <Link href="/privacy" className="text-primary hover:underline">
                Política de Privacidade (LGPD)
              </Link>.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 pt-1 border-t border-white/5">
          <button
            onClick={() => handleConsent("essential")}
            className="min-h-10 flex-1 rounded-lg border border-white/10 px-3 py-2 text-xs text-white/70 hover:bg-white/5 transition sm:flex-none"
          >
            Apenas Essenciais
          </button>
          <button
            onClick={() => handleConsent("all")}
            className="min-h-10 flex-1 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-on-primary hover:opacity-90 transition shadow-sm shadow-primary/20 sm:flex-none"
          >
            Aceitar e Continuar
          </button>
        </div>
      </div>
    </div>
  );
}
