"use client";

import { AdminDatabaseManager } from "@/components/admin/admin-database-manager";
import Link from "next/link";

export default function AdminDatabasePage() {
  return (
    <div className="space-y-8">
      {/* Title & Action Bar */}
      <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-slate-900 to-indigo-950/20 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-mono font-semibold tracking-wider text-amber-400 uppercase">
              Infraestrutura & Armazenamento
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Gestão de Bancos de Dados
          </h1>
          <p className="text-sm text-white/60 mt-1 max-w-2xl">
            Teste a conectividade e latência, altere o ambiente do banco (PostgreSQL / Supabase) ou execute a inicialização completa de uma nova instalação.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/settings"
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium text-white/70 hover:bg-white/10 hover:text-white transition"
          >
            ← Voltar para Configurações Gerais
          </Link>
        </div>
      </div>

      <AdminDatabaseManager />
    </div>
  );
}

