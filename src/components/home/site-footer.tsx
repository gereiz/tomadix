import Link from "next/link";
import { BRAND } from "@/config/brand";
import { PollinationsBadge } from "./pollinations-badge";

export function SiteFooter() {
  return (
    <footer className="safe-bottom border-t border-outline-variant/30 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col items-start justify-between gap-3 text-sm text-on-surface-variant sm:flex-row sm:items-center">
        <p>
          <span className="font-semibold text-on-surface">{BRAND.name}</span> · {BRAND.slogan}
        </p>
        <nav aria-label="Rodapé" className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/terms" className="inline-flex min-h-10 items-center hover:text-on-surface">Termos</Link>
          <Link href="/privacy" className="inline-flex min-h-10 items-center hover:text-on-surface">Privacidade</Link>
          <Link href="/pricing" className="inline-flex min-h-10 items-center hover:text-on-surface">Planos</Link>
          <PollinationsBadge />
        </nav>
      </div>
    </footer>
  );
}
