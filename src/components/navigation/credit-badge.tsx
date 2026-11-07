"use client";

import { cachedFetch } from "@/lib/client-fetch-cache";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface CreditBadgeProps {
  className?: string;
  showAddButton?: boolean;
}

export function CreditBadge({ className = "", showAddButton = true }: CreditBadgeProps) {
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [pulse, setPulse] = useState<boolean>(false);

  const fetchCredits = useCallback(async () => {
    try {
      const res = await cachedFetch("/api/billing/subscription", 5_000);
      if (res.ok) {
        const json = await res.json();
        const balance = json?.data?.creditsBalance ?? 0;
        setCredits((prev) => {
          if (prev !== null && prev !== balance) {
            setPulse(true);
            setTimeout(() => setPulse(false), 2000);
          }
          return balance;
        });
      }
    } catch (err) {
      console.error("Falha ao obter saldo de créditos:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCredits();

    // Sincronização em tempo real de créditos consumidos, adicionados ou transferidos
    const handleCreditsUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{ balance?: number }>;
      if (typeof customEvent.detail?.balance === "number") {
        setCredits(customEvent.detail.balance);
        setPulse(true);
        setTimeout(() => setPulse(false), 2000);
      } else {
        fetchCredits();
      }
    };

    window.addEventListener("tomadix:credits-updated", handleCreditsUpdated);
    window.addEventListener("tomadix:workspace-switched", fetchCredits);

    return () => {
      window.removeEventListener("tomadix:credits-updated", handleCreditsUpdated);
      window.removeEventListener("tomadix:workspace-switched", fetchCredits);
    };
  }, [fetchCredits]);

  if (loading && credits === null) {
    return (
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-surface-container-high/60 border border-outline-variant/30 text-xs text-on-surface-variant animate-pulse ${className}`}>
        <span className="text-amber-400">⚡</span>
        <span className="w-8 h-3.5 bg-white/10 rounded"></span>
      </div>
    );
  }

  return (
    <Link
      href="/workspace/billing"
      title="Saldo disponível de créditos de IA. Clique para ver detalhes e faturas."
      className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-xl border transition-all duration-300 ${
        pulse
          ? "bg-amber-500/25 border-amber-400 text-amber-300 ring-2 ring-amber-400/50 scale-105"
          : "bg-surface-container-high/80 border-outline-variant/30 text-on-surface hover:border-amber-400/50 hover:bg-surface-container hover:shadow-sm"
      } ${className}`}
    >
      <span className="text-amber-400 font-bold text-xs flex-shrink-0 animate-none">⚡</span>
      <span className="font-mono text-xs font-bold tracking-tight">
        {credits !== null ? credits.toLocaleString("pt-BR") : "0"}
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant group-hover:text-amber-300 transition-colors">
        cr
      </span>
      {showAddButton && (
        <span className="hidden lg:inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-amber-400/20 text-amber-400 text-[10px] font-bold group-hover:bg-amber-400 group-hover:text-black transition-colors ml-0.5">
          +
        </span>
      )}
    </Link>
  );
}

