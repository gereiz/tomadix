"use client";

import { useEffect, useState, useCallback } from "react";
import { ThemeMode, resolveEffectiveTheme, applyDomTheme } from "@/lib/theme-utils";

export type { ThemeMode };
export { resolveEffectiveTheme, applyDomTheme };

const STORAGE_KEY = "tomadix_theme";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [mode, setMode] = useState<ThemeMode>("dark");
  const [effective, setEffective] = useState<"light" | "dark">("dark");
  const [isOpen, setIsOpen] = useState(false);

  const syncFromStorage = useCallback(() => {
    try {
      const saved = (localStorage.getItem(STORAGE_KEY) as ThemeMode | null) || "dark";
      const validMode: ThemeMode =
        saved === "light" || saved === "dark" || saved === "system" ? saved : "dark";
      setMode(validMode);
      setEffective(applyDomTheme(validMode));
    } catch {
      setEffective(applyDomTheme("dark"));
    }
  }, []);

  useEffect(() => {
    syncFromStorage();

    const mql = window.matchMedia("(prefers-color-scheme: light)");
    const handleMediaChange = () => {
      const currentMode = (localStorage.getItem(STORAGE_KEY) as ThemeMode | null) || "dark";
      if (currentMode === "system") {
        setEffective(applyDomTheme("system"));
      }
    };

    const handleCustomEvent = () => {
      syncFromStorage();
    };

    mql.addEventListener?.("change", handleMediaChange);
    window.addEventListener("tomadix:theme-changed", handleCustomEvent);

    return () => {
      mql.removeEventListener?.("change", handleMediaChange);
      window.removeEventListener("tomadix:theme-changed", handleCustomEvent);
    };
  }, [syncFromStorage]);

  const selectTheme = (nextMode: ThemeMode) => {
    try {
      localStorage.setItem(STORAGE_KEY, nextMode);
    } catch {
      // ignore storage errors
    }
    setMode(nextMode);
    setEffective(applyDomTheme(nextMode));
    setIsOpen(false);
    window.dispatchEvent(new CustomEvent("tomadix:theme-changed", { detail: nextMode }));
  };

  const cycleTheme = () => {
    const next: ThemeMode = effective === "dark" ? "light" : "dark";
    selectTheme(next);
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={cycleTheme}
        title={
          effective === "light"
            ? "Modo Claro ativo (clique para Modo Escuro)"
            : "Modo Escuro ativo (clique para Modo Claro)"
        }
        aria-label="Alternar tema claro ou escuro"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-outline-variant/30 bg-surface-container-low text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface"
      >
        {effective === "light" ? "☀️" : "🌙"}
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title="Escolher aparência (Claro / Escuro / Sistema)"
        aria-label="Escolher tema"
        className="flex items-center gap-1.5 rounded-lg border border-outline-variant/30 bg-surface-container-low/80 px-2.5 py-1.5 text-xs font-medium text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface"
      >
        <span>{mode === "system" ? (effective === "light" ? "☀️" : "🌙") : mode === "light" ? "☀️" : "🌙"}</span>
        <span className="hidden xl:inline">
          {mode === "light" ? "Claro" : mode === "dark" ? "Escuro" : "Auto"}
        </span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 z-50 w-44 rounded-xl border border-outline-variant/30 bg-surface-container p-1.5 shadow-xl backdrop-blur-xl">
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/70">
              Aparência do Sistema
            </div>
            {(
              [
                { id: "light", label: "Modo Claro", icon: "☀️" },
                { id: "dark", label: "Modo Escuro", icon: "🌙" },
                { id: "system", label: "Seguir Sistema", icon: "💻" },
              ] as const
            ).map((opt) => {
              const active = mode === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => selectTheme(opt.id)}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                    active
                      ? "bg-primary/15 text-primary font-semibold"
                      : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{opt.icon}</span>
                    <span>{opt.label}</span>
                  </span>
                  {active && <span className="text-[10px] font-bold">✓</span>}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
