"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const workspaceId = searchParams.get("workspaceId");
  const [subStatus, setSubStatus] = useState<any>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Consultar estado comercial real no servidor
    const checkState = async () => {
      try {
        const res = await fetch(`/api/billing/subscription${workspaceId ? `?workspaceId=${workspaceId}` : ""}`);
        if (res.ok) {
          const data = await res.json();
          setSubStatus(data.data);
        }
      } catch (err) {
        console.error("Erro ao verificar sincronização:", err);
      } finally {
        setChecking(false);
      }
    };

    checkState();
    // Tentar nova consulta após 3 segundos caso o webhook esteja processando
    const timer = setTimeout(checkState, 3000);
    return () => clearTimeout(timer);
  }, [workspaceId]);

  return (
    <div className="mx-auto max-w-xl text-center space-y-6">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/30 text-3xl">
        🎉
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          Pedido de Assinatura Recebido!
        </h1>
        <p className="text-sm text-white/60">
          Sua transação foi submetida com sucesso ao provedor de pagamento.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-left space-y-3">
        <div className="flex items-center justify-between text-xs pb-3 border-b border-white/10">
          <span className="text-white/50">Status de Confirmação:</span>
          <span className="font-semibold text-primary flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            {checking
              ? "Sincronizando com gateway..."
              : subStatus?.status === "ACTIVE"
              ? "Ativo & Confirmado"
              : "Aguardando confirmação do webhook"}
          </span>
        </div>

        <div className="flex items-center justify-between text-xs pb-3 border-b border-white/10">
          <span className="text-white/50">Plano Contratado:</span>
          <span className="font-semibold text-white">
            {subStatus?.planName || "Plano Selecionado"}
          </span>
        </div>

        {sessionId && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/50">Identificador da Sessão:</span>
            <span className="font-mono text-white/70 truncate max-w-[200px]">
              {sessionId}
            </span>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-left text-xs text-blue-300">
        <p className="font-semibold mb-1">ℹ️ Validação de Segurança & Direitos</p>
        <p className="text-blue-200/70">
          Por conformidade rigorosa de segurança, os direitos comerciais do SaaS são
          desbloqueados exclusivamente após a confirmação criptográfica do webhook do gateway.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
        <Link
          href="/workspace/billing"
          className="w-full sm:w-auto rounded-xl bg-primary px-6 py-3 text-sm font-bold text-on-primary transition hover:opacity-90 shadow-md shadow-primary/20"
        >
          Ver Painel de Assinatura
        </Link>
        <Link
          href="/projects"
          className="w-full sm:w-auto rounded-xl border border-white/15 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/5"
        >
          Ir para os Projetos
        </Link>
      </div>
    </div>
  );
}

export default function BillingSuccessPage() {
  return (
    <div className="min-h-dvh bg-[#07090e] px-6 py-20 flex items-center justify-center">
      <Suspense fallback={<div className="text-white/40">Carregando confirmação...</div>}>
        <SuccessContent />
      </Suspense>
    </div>
  );
}
