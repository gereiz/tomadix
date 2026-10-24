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
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 animate-fade-in">
      <div className="rounded-2xl border border-white/15 bg-[#0b0e17]/95 p-5 shadow-2xl backdrop-blur-xl space-y-3 text-xs">
        <div className="flex items-start gap-3">
          <span className="text-xl">🍪</span>
          <div className="space-y-1">
            <h4 className="font-bold text-white">Privacidade e Cookies</h4>
            <p className="text-white/70 leading-relaxed text-[11px]">
              Utilizamos cookies essenciais de segurança e sessões para operar o Tomadix. Ao continuar, você concorda com nossos{" "}
              <Link href="/terms" className="text-amber-400 hover:underline">
                Termos de Uso
              </Link>{" "}
              e nossa{" "}
              <Link href="/privacy" className="text-emerald-400 hover:underline">
                Política de Privacidade (LGPD)
              </Link>.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/5">
          <button
            onClick={() => handleConsent("essential")}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-[11px] text-white/70 hover:bg-white/5 transition"
          >
            Apenas Essenciais
          </button>
          <button
            onClick={() => handleConsent("all")}
            className="rounded-lg bg-emerald-400 px-3.5 py-1.5 text-[11px] font-semibold text-black hover:bg-emerald-300 transition"
          >
            Aceitar e Continuar
          </button>
        </div>
      </div>
    </div>
  );
}
