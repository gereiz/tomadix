"use client";

import { cachedFetch } from "@/lib/client-fetch-cache";
import { Spinner } from "@/components/ui/spinner";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";

interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  platformRole: string;
  isPlatformAdmin: boolean;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    // Carregar preferência de sidebar salva no localStorage
    try {
      const savedCollapse = localStorage.getItem("tomadix_admin_sidebar_collapsed");
      if (savedCollapse === "true") {
        setSidebarCollapsed(true);
      }
    } catch {}

    cachedFetch("/api/auth/me", 10_000)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.authenticated && data?.user?.isPlatformAdmin) {
          setAdmin(data.user);
        } else {
          setAccessDenied(true);
        }
      })
      .catch(() => setAccessDenied(true))
      .finally(() => setLoading(false));
  }, []);

  const handleToggleCollapse = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("tomadix_admin_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07090e] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Spinner block className="h-8 w-8 border-2 border-amber-500" />
          <p className="text-xs text-white/50 tracking-wider uppercase font-mono">
            Verificando credenciais administrativas...
          </p>
        </div>
      </div>
    );
  }

  if (accessDenied || !admin) {
    return (
      <div className="min-h-screen bg-[#07090e] text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl border border-rose-500/30 bg-rose-950/20 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/10 text-2xl text-rose-400 mb-4">
            ⛔
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Acesso Restrito</h1>
          <p className="text-sm text-white/70 mb-6 leading-relaxed">
            Esta área é exclusiva para operadores autorizados e administradores da plataforma Tomadix. Seu usuário não possui os privilégios necessários.
          </p>
          <div className="flex flex-col gap-2">
            <Link
              href="/dashboard"
              className="w-full rounded-xl bg-white/10 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-white/20"
            >
              Retornar ao Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07090e] text-white flex flex-col">
      {/* Sub Header for Breadcrumbs & Quick Context */}
      <AdminHeader
        admin={admin}
        onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
      />

      {/* Main Admin Workspace with Sidebar */}
      <div className="flex-1 flex w-full">
        <AdminSidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleCollapse}
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />

        {/* Content Area */}
        <main className="flex-1 w-full min-w-0 px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
