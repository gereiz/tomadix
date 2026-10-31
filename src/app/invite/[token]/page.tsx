"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface InviteData {
  id: string;
  email: string;
  role: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELED" | "EXPIRED";
  expiresAt: string;
  workspace: {
    id: string;
    name: string;
    slug: string;
    isArchived: boolean;
  };
  invitedBy: {
    displayName: string | null;
    email: string;
  };
}

export default function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const router = useRouter();
  const { token } = use(params);

  const [invite, setInvite] = useState<InviteData | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    async function loadInvite() {
      try {
        const [invRes, userRes] = await Promise.all([
          fetch(`/api/invites/${token}`),
          fetch("/api/auth/me"),
        ]);

        if (invRes.ok) {
          const invData = await invRes.json();
          setInvite(invData.data);
        } else {
          const errData = await invRes.json();
          setError(errData.error || "Convite inválido ou não encontrado.");
        }

        if (userRes.ok) {
          const userData = await userRes.json();
          if (userData.authenticated) {
            setCurrentUser(userData.user);
          }
        }
      } catch (err: any) {
        setError(err.message || "Erro ao carregar dados do convite.");
      } finally {
        setLoading(false);
      }
    }

    loadInvite();
  }, [token]);

  const handleAccept = async () => {
    setActionLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/invites/${token}/accept`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao aceitar convite.");
      }

      setAccepted(true);
      setTimeout(() => {
        router.push("/projects");
        router.refresh();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Falha ao aceitar convite.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async () => {
    setActionLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/invites/${token}/decline`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao recusar convite.");
      }

      router.push("/");
    } catch (err: any) {
      setError(err.message || "Falha ao recusar convite.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07090e] px-6 py-20 flex items-center justify-center text-white/50">
        Carregando informações do convite...
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div className="min-h-screen bg-[#07090e] px-6 py-20 flex items-center justify-center text-white">
        <div className="mx-auto max-w-md text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/30 text-2xl">
            ⚠️
          </div>
          <h1 className="text-xl font-bold">Convite Indisponível</h1>
          <p className="text-xs text-white/60">
            {error || "O link do convite pode ter expirado ou foi cancelado."}
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-block rounded-xl border border-white/15 px-4 py-2 text-xs font-medium text-white hover:bg-white/5 transition"
            >
              Voltar ao Início
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen bg-[#07090e] px-6 py-20 flex items-center justify-center text-white">
        <div className="mx-auto max-w-md text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/30 text-2xl">
            🎉
          </div>
          <h1 className="text-2xl font-bold">Convite Aceito!</h1>
          <p className="text-xs text-white/60">
            Você agora é membro de <strong>{invite.workspace.name}</strong>. Redirecionando para o estúdio...
          </p>
        </div>
      </div>
    );
  }

  const isPending = invite.status === "PENDING";

  return (
    <div className="min-h-screen bg-[#07090e] px-6 py-20 flex items-center justify-center text-white">
      <div className="mx-auto max-w-md w-full rounded-2xl border border-white/15 bg-white/[0.02] p-8 backdrop-blur-md shadow-2xl text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/30 text-3xl">
          🎬
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
            Convite para Colaboração
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {invite.workspace.name}
          </h1>
          <p className="text-xs text-white/60">
            {invite.invitedBy.displayName || invite.invitedBy.email} convidou você para colaborar
            com o papel de <span className="font-bold text-white uppercase">{invite.role}</span>.
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/40 p-4 text-xs text-left space-y-2">
          <div className="flex justify-between text-white/60">
            <span>E-mail Convidado:</span>
            <span className="text-white font-medium">{invite.email}</span>
          </div>
          <div className="flex justify-between text-white/60">
            <span>Papel Atribuído:</span>
            <span className="text-primary font-bold uppercase">{invite.role}</span>
          </div>
          <div className="flex justify-between text-white/60">
            <span>Expiração do Convite:</span>
            <span className="text-white font-medium">
              {new Date(invite.expiresAt).toLocaleDateString("pt-BR")}
            </span>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-950/50 p-3 text-xs text-red-300">
            {error}
          </div>
        )}

        {isPending ? (
          currentUser ? (
            <div className="space-y-3 pt-2">
              <button
                onClick={handleAccept}
                disabled={actionLoading}
                className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-on-primary transition hover:opacity-90 disabled:opacity-50 shadow-md shadow-primary/20"
              >
                {actionLoading ? "Aceitando..." : "Aceitar Convite e Entrar"}
              </button>
              <button
                onClick={handleDecline}
                disabled={actionLoading}
                className="w-full py-2 text-xs text-white/40 hover:text-white transition"
              >
                Recusar Convite
              </button>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <p className="text-xs text-white/50">
                Para aceitar este convite, faça login ou cadastre-se no Tomadix.
              </p>
              <Link
                href={`/login?redirect=/invite/${token}`}
                className="block w-full rounded-xl bg-primary py-3 text-sm font-bold text-on-primary transition hover:opacity-90 shadow-md shadow-primary/20"
              >
                Fazer Login para Aceitar
              </Link>
              <Link
                href={`/register?redirect=/invite/${token}`}
                className="block w-full rounded-xl border border-white/15 py-3 text-xs font-semibold text-white transition hover:bg-white/5"
              >
                Criar Nova Conta
              </Link>
            </div>
          )
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-white/50">
            Este convite não está mais pendente (Estado: {invite.status}).
          </div>
        )}
      </div>
    </div>
  );
}
