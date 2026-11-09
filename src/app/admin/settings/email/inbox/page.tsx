"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface InboxItem {
  id: string;
  fromName: string | null;
  fromAddress: string;
  subject: string;
  snippet: string;
  receivedAt: string;
  isRead: boolean;
}

interface InboxMessage extends InboxItem {
  toAddresses: string;
  textBody: string | null;
  htmlBody: string | null;
}

interface ListResponse {
  items: InboxItem[];
  total: number;
  unread: number;
  page: number;
  totalPages: number;
}

export default function AdminInboxPage() {
  const [list, setList] = useState<ListResponse | null>(null);
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selected, setSelected] = useState<InboxMessage | null>(null);
  const [showHtml, setShowHtml] = useState(false);
  const [reply, setReply] = useState("");
  const [replying, setReplying] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/email/inbox?page=${page}${unreadOnly ? "&unread=1" : ""}`);
      const data = (await res.json()) as ListResponse & { error?: string };
      if (!res.ok) throw new Error(data.error || "Não foi possível carregar a caixa de entrada.");
      setList(data);
    } catch (err) {
      setBanner({ type: "error", text: err instanceof Error ? err.message : "Erro ao carregar." });
    } finally {
      setLoading(false);
    }
  }, [page, unreadOnly]);

  useEffect(() => {
    load();
  }, [load]);

  const sync = async () => {
    setSyncing(true);
    setBanner(null);
    try {
      const res = await fetch("/api/admin/email/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync" }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "Falha ao sincronizar.");
      setBanner({ type: "success", text: data.message ?? "Sincronizado." });
      setPage(1);
      await load();
    } catch (err) {
      setBanner({ type: "error", text: err instanceof Error ? err.message : "Erro ao sincronizar." });
    } finally {
      setSyncing(false);
    }
  };

  const open = async (id: string) => {
    setBanner(null);
    setReply("");
    setShowHtml(false);
    try {
      const res = await fetch(`/api/admin/email/inbox?id=${encodeURIComponent(id)}`);
      const data = (await res.json()) as { message?: InboxMessage; error?: string };
      if (!res.ok || !data.message) throw new Error(data.error || "Mensagem não encontrada.");
      setSelected(data.message);
      setList((prev) =>
        prev
          ? {
              ...prev,
              unread: prev.items.some((i) => i.id === id && !i.isRead) ? Math.max(0, prev.unread - 1) : prev.unread,
              items: prev.items.map((i) => (i.id === id ? { ...i, isRead: true } : i)),
            }
          : prev
      );
    } catch (err) {
      setBanner({ type: "error", text: err instanceof Error ? err.message : "Erro ao abrir a mensagem." });
    }
  };

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !reply.trim() || replying) return;
    setReplying(true);
    setBanner(null);
    try {
      const res = await fetch("/api/admin/email/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reply", id: selected.id, body: reply }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "Falha ao enviar a resposta.");
      setBanner({ type: "success", text: data.message ?? "Resposta enviada." });
      setReply("");
    } catch (err) {
      setBanner({ type: "error", text: err instanceof Error ? err.message : "Erro ao responder." });
    } finally {
      setReplying(false);
    }
  };

  const formatDate = (iso: string) => new Date(iso).toLocaleString("pt-BR");

  return (
    <div className="space-y-6 p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <Link href="/admin/settings/email" className="hover:underline">Servidor de E-mail</Link>
            <span>/</span>
            <span>Caixa de Entrada</span>
          </div>
          <h1 className="mt-1 text-xl font-bold text-white">
            Caixa de Entrada {list && list.unread > 0 && <span className="text-sm text-amber-300">({list.unread} não lida(s))</span>}
          </h1>
          <p className="text-xs text-white/50">Mensagens recebidas na conta de e-mail configurada (IMAP).</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex min-h-10 items-center gap-2 text-xs text-white/70">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => {
                setUnreadOnly(e.target.checked);
                setPage(1);
              }}
              className="h-4 w-4 rounded border-white/20 bg-black text-amber-400 focus:ring-0"
            />
            Só não lidas
          </label>
          <button
            type="button"
            onClick={sync}
            disabled={syncing}
            className="min-h-10 rounded-xl bg-amber-400 px-4 text-xs font-bold text-black transition hover:bg-amber-300 disabled:opacity-50"
          >
            {syncing ? "Sincronizando..." : "Sincronizar agora"}
          </button>
        </div>
      </div>

      {banner && (
        <p
          role="status"
          className={`rounded-xl border p-3 text-xs ${
            banner.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-red-500/30 bg-red-500/10 text-red-300"
          }`}
        >
          {banner.text}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="space-y-2 lg:col-span-2">
          {loading && !list ? (
            <p className="text-xs text-white/40">Carregando...</p>
          ) : list && list.items.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-white/40">
              Nenhuma mensagem. Clique em &quot;Sincronizar agora&quot; para buscar a caixa de entrada.
            </p>
          ) : (
            <div className="max-h-[65vh] space-y-2 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin]">
            {list?.items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => open(item.id)}
                className={`w-full rounded-xl border p-3 text-left transition ${
                  selected?.id === item.id ? "border-primary/60 bg-primary/10" : "border-white/10 bg-black/20 hover:bg-white/5"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`truncate text-xs ${item.isRead ? "text-white/70" : "font-bold text-white"}`}>
                    {item.fromName || item.fromAddress}
                  </span>
                  <span className="shrink-0 text-[10px] text-white/40">{formatDate(item.receivedAt)}</span>
                </div>
                <p className={`truncate text-xs ${item.isRead ? "text-white/60" : "font-semibold text-white"}`}>{item.subject}</p>
                <p className="truncate text-[11px] text-white/40">{item.snippet}</p>
              </button>
            ))}
            </div>
          )}

          {list && list.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 text-xs text-white/60">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="min-h-10 rounded-lg border border-white/10 px-3 disabled:opacity-40"
              >
                ← Anterior
              </button>
              <span>{page} / {list.totalPages}</span>
              <button
                type="button"
                disabled={page >= list.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="min-h-10 rounded-lg border border-white/10 px-3 disabled:opacity-40"
              >
                Próxima →
              </button>
            </div>
          )}
        </div>

        <div className="lg:col-span-3">
          {selected ? (
            <div className="space-y-4 rounded-2xl border border-white/10 bg-[#121620] p-5">
              <div className="space-y-1 border-b border-white/10 pb-3">
                <h2 className="text-sm font-bold text-white">{selected.subject}</h2>
                <p className="text-xs text-white/60">
                  De: {selected.fromName ? `${selected.fromName} <${selected.fromAddress}>` : selected.fromAddress}
                </p>
                <p className="text-[11px] text-white/40">Para: {selected.toAddresses} · {formatDate(selected.receivedAt)}</p>
              </div>

              {selected.htmlBody && selected.textBody && (
                <button
                  type="button"
                  onClick={() => setShowHtml((v) => !v)}
                  className="min-h-9 rounded-lg border border-white/10 px-3 text-xs text-white/70 hover:bg-white/5"
                >
                  {showHtml ? "Ver como texto" : "Ver formatação original"}
                </button>
              )}

              {showHtml || !selected.textBody ? (
                selected.htmlBody ? (
                  // Conteúdo recebido não é confiável: iframe isolado, sem scripts
                  <iframe title="Mensagem" srcDoc={selected.htmlBody} sandbox="" className="h-96 w-full rounded-xl bg-white" />
                ) : (
                  <p className="text-xs text-white/40">(mensagem sem conteúdo)</p>
                )
              ) : (
                <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-black/40 p-3 text-xs text-white/80">
                  {selected.textBody}
                </pre>
              )}

              <form onSubmit={sendReply} className="space-y-2">
                <label htmlFor="inbox-reply" className="text-xs font-semibold text-white/80">
                  Responder a {selected.fromAddress}
                </label>
                <textarea
                  id="inbox-reply"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={5}
                  maxLength={20000}
                  className="w-full resize-y rounded-xl border border-white/10 bg-[#0f1218] p-3 text-xs text-white placeholder-white/30 focus:border-primary focus:outline-none"
                  placeholder="Escreva sua resposta..."
                />
                <button
                  type="submit"
                  disabled={replying || !reply.trim()}
                  className="min-h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-4 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50"
                >
                  {replying ? "Enviando..." : "Enviar resposta"}
                </button>
              </form>
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-xs text-white/40">
              Selecione uma mensagem para ler e responder.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
