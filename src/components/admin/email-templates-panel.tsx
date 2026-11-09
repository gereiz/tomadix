"use client";

import { useEffect, useState } from "react";
import type { EmailTemplateInfo } from "@/modules/email/email-template-catalog";

/** Modelos de e-mail do Tomadix: lista, pré-visualização e envio de teste por modelo. */
export function EmailTemplatesPanel() {
  const [templates, setTemplates] = useState<EmailTemplateInfo[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [sending, setSending] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/email/templates")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { templates?: EmailTemplateInfo[] } | null) => {
        if (data?.templates) {
          setTemplates(data.templates);
          setSelected(data.templates[0]?.key ?? "");
        }
      })
      .catch(() => setBanner({ type: "error", text: "Não foi possível carregar os modelos de e-mail." }));
  }, []);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    setLoadingPreview(true);
    fetch(`/api/admin/email/templates?key=${encodeURIComponent(selected)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { subject?: string; html?: string } | null) => {
        if (!cancelled) setPreview(data?.html ? { subject: data.subject ?? "", html: data.html } : null);
      })
      .finally(() => {
        if (!cancelled) setLoadingPreview(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const sendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient.trim() || !selected || sending) return;
    setSending(true);
    setBanner(null);
    try {
      const res = await fetch("/api/admin/email/test-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient: recipient.trim(), templateKey: selected }),
      });
      const data = (await res.json()) as { success?: boolean; message?: string; error?: string };
      setBanner(
        res.ok && data.success
          ? { type: "success", text: data.message ?? "Modelo enviado." }
          : { type: "error", text: data.error || data.message || "Falha ao enviar o modelo." }
      );
    } catch (err) {
      setBanner({ type: "error", text: err instanceof Error ? err.message : "Erro ao enviar o modelo." });
    } finally {
      setSending(false);
    }
  };

  const current = templates.find((t) => t.key === selected);

  return (
    <section className="rounded-2xl border border-white/10 bg-[#121620] p-6 space-y-4">
      <div className="border-b border-white/10 pb-3">
        <h2 className="text-base font-semibold text-white">Modelos de E-mail</h2>
        <p className="text-xs text-white/50">
          Modelos padrão enviados automaticamente pelo Tomadix. Veja a pré-visualização e envie um teste.
        </p>
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-1.5">
          {templates.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setSelected(t.key)}
              aria-pressed={selected === t.key}
              className={`w-full rounded-xl border p-3 text-left transition ${
                selected === t.key ? "border-primary/60 bg-primary/10" : "border-white/10 bg-black/20 hover:bg-white/5"
              }`}
            >
              <span className="block text-xs font-semibold text-white">{t.label}</span>
              <span className="block text-[11px] text-white/50">{t.trigger}</span>
            </button>
          ))}
        </div>

        <div className="space-y-3 lg:col-span-2">
          {current && <p className="text-xs text-white/60">{current.description}</p>}
          {preview && <p className="text-xs text-white/80">Assunto: <strong>{preview.subject}</strong></p>}
          <div className="overflow-hidden rounded-xl border border-white/10 bg-[#090c10]">
            {loadingPreview ? (
              <p className="p-6 text-xs text-white/40">Carregando pré-visualização...</p>
            ) : preview ? (
              <iframe title="Pré-visualização do e-mail" srcDoc={preview.html} sandbox="" className="h-[520px] w-full" />
            ) : (
              <p className="p-6 text-xs text-white/40">Selecione um modelo.</p>
            )}
          </div>

          <form onSubmit={sendTest} className="flex flex-col gap-2 sm:flex-row">
            <input
              type="email"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="destinatario@email.com"
              required
              className="min-h-10 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 text-xs text-white placeholder-white/30 focus:border-primary focus:outline-none"
            />
            <button
              type="submit"
              disabled={sending || !recipient.trim() || !selected}
              className="min-h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-4 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25 transition disabled:opacity-50"
            >
              {sending ? "Enviando..." : "Enviar este modelo de teste"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
