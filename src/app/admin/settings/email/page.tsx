"use client";

import { useState, useEffect } from "react";
import { EmailTemplatesPanel } from "@/components/admin/email-templates-panel";
import Link from "next/link";

interface MaskedEmailSettings {
  id: string;
  provider: "GMAIL_SMTP" | "OUTLOOK_SMTP" | "CUSTOM_SMTP" | "OFFICE365_OAUTH2" | "GMAIL_OAUTH2";
  isEnabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  hasPassword: boolean;
  smtpPasswordMasked: string;
  clientId: string;
  hasClientSecret: boolean;
  clientSecretMasked: string;
  hasRefreshToken: boolean;
  tenantId: string;
  senderEmail: string;
  senderName: string;
  replyTo: string;
  lastTestedAt: string | null;
  lastTestStatus: string | null;
  lastTestError: string | null;
  updatedAt: string;
}

interface EmailLogItem {
  id: string;
  recipient: string;
  subject: string;
  provider: string;
  status: string;
  errorMessage?: string;
  createdAt: string;
}

export default function AdminEmailSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [sendingTestMail, setSendingTestMail] = useState(false);

  const [settings, setSettings] = useState<MaskedEmailSettings | null>(null);
  const [logs, setLogs] = useState<EmailLogItem[]>([]);

  // Form states
  const [provider, setProvider] = useState<string>("GMAIL_SMTP");
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const [smtpHost, setSmtpHost] = useState<string>("smtp.gmail.com");
  const [smtpPort, setSmtpPort] = useState<number>(587);
  const [smtpSecure, setSmtpSecure] = useState<boolean>(false);
  const [smtpUser, setSmtpUser] = useState<string>("");
  const [smtpPassword, setSmtpPassword] = useState<string>("");
  const [senderEmail, setSenderEmail] = useState<string>("noreply@tomadix.com");
  const [senderName, setSenderName] = useState<string>("Tomadix Studio");
  const [replyTo, setReplyTo] = useState<string>("");

  const [testRecipient, setTestRecipient] = useState<string>("");
  const [messageBanner, setMessageBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/email/settings");
      const data = await res.json();
      if (res.ok && data.success) {
        setSettings(data.settings);
        setLogs(data.logs || []);

        setProvider(data.settings.provider);
        setIsEnabled(data.settings.isEnabled);
        setSmtpHost(data.settings.smtpHost || "smtp.gmail.com");
        setSmtpPort(data.settings.smtpPort || 587);
        setSmtpSecure(Boolean(data.settings.smtpSecure));
        setSmtpUser(data.settings.smtpUser || "");
        setSenderEmail(data.settings.senderEmail || "noreply@tomadix.com");
        setSenderName(data.settings.senderName || "Tomadix Studio");
        setReplyTo(data.settings.replyTo || "");
      } else {
        setMessageBanner({ type: "error", text: data.error || "Falha ao carregar configurações de e-mail." });
      }
    } catch (err: any) {
      setMessageBanner({ type: "error", text: err.message || "Erro de rede ao buscar configurações." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleProviderChange = (newProvider: string) => {
    setProvider(newProvider);
    if (newProvider === "GMAIL_SMTP") {
      setSmtpHost("smtp.gmail.com");
      setSmtpPort(587);
      setSmtpSecure(false);
    } else if (newProvider === "OUTLOOK_SMTP") {
      setSmtpHost("smtp-mail.outlook.com");
      setSmtpPort(587);
      setSmtpSecure(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMessageBanner(null);

      const payload: any = {
        provider,
        isEnabled,
        smtpHost,
        smtpPort: Number(smtpPort),
        smtpSecure,
        smtpUser,
        senderEmail,
        senderName,
        replyTo,
      };

      if (smtpPassword.trim()) {
        payload.smtpPassword = smtpPassword.trim();
      }

      const res = await fetch("/api/admin/email/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessageBanner({ type: "success", text: "Configurações salvas com sucesso!" });
        setSmtpPassword("");
        fetchSettings();
      } else {
        setMessageBanner({ type: "error", text: data.error || "Erro ao salvar configurações." });
      }
    } catch (err: any) {
      setMessageBanner({ type: "error", text: err.message || "Erro inesperado ao salvar." });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTestingConnection(true);
      setMessageBanner(null);

      const payload: any = {
        provider,
        smtpHost,
        smtpPort: Number(smtpPort),
        smtpSecure,
        smtpUser,
      };
      if (smtpPassword.trim()) {
        payload.smtpPassword = smtpPassword.trim();
      }

      const res = await fetch("/api/admin/email/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessageBanner({ type: "success", text: data.message });
        fetchSettings();
      } else {
        setMessageBanner({ type: "error", text: data.message || "Falha ao conectar ao servidor SMTP." });
      }
    } catch (err: any) {
      setMessageBanner({ type: "error", text: err.message || "Erro de conexão no teste." });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testRecipient.trim()) return;

    try {
      setSendingTestMail(true);
      setMessageBanner(null);

      const res = await fetch("/api/admin/email/test-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient: testRecipient.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessageBanner({ type: "success", text: data.message });
        setTestRecipient("");
        fetchSettings();
      } else {
        setMessageBanner({ type: "error", text: data.error || data.message || "Falha ao disparar e-mail de teste." });
      }
    } catch (err: any) {
      setMessageBanner({ type: "error", text: err.message || "Erro ao disparar teste." });
    } finally {
      setSendingTestMail(false);
    }
  };

  return (
    <div className="space-y-8 p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <span>Integrações</span>
            <span>/</span>
            <span>Servidor de E-mail</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
            Configuração de E-mail Transacional
          </h1>
          <p className="text-sm text-white/60">
            Gerencie o provedor SMTP ou OAuth2 (Gmail, Outlook/Office365, Custom) para notificações, verificação de contas e recuperação de senhas.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/settings"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white/80 hover:bg-white/10 transition"
          >
            ← Voltar às Configurações
          </Link>
        </div>
      </div>

      {/* Banner de Feedback */}
      {messageBanner && (
        <div
          className={`flex items-start gap-3 rounded-2xl p-4 border ${
            messageBanner.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-red-500/10 border-red-500/30 text-red-300"
          }`}
        >
          <span className="text-lg">{messageBanner.type === "success" ? "✓" : "⚠️"}</span>
          <div className="flex-1 text-sm">{messageBanner.text}</div>
          <button
            onClick={() => setMessageBanner(null)}
            className="text-xs opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-white/50 text-sm">
          Carregando configurações de e-mail...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-8">
          {/* Coluna 1 & 2: Formulário Principal */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSave} className="space-y-6">
              {/* Card 1: Status Geral & Provedor */}
              <div className="rounded-2xl border border-white/10 bg-[#121620] p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <h2 className="text-base font-semibold text-white">Provedor Ativo</h2>
                    <p className="text-xs text-white/50">Selecione o provedor de mensageria da plataforma.</p>
                  </div>

                  {/* Toggle Habilitado */}
                  <label className="flex items-center gap-3 cursor-pointer">
                    <span className="text-xs font-medium text-white/80">
                      {isEnabled ? "Envio Ativado" : "Envio Desativado"}
                    </span>
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={(e) => setIsEnabled(e.target.checked)}
                      className="sr-only"
                    />
                    <div
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        isEnabled ? "bg-emerald-500" : "bg-white/20"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          isEnabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </div>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: "GMAIL_SMTP", name: "Gmail / Google", desc: "smtp.gmail.com (Senha de App)", icon: "📧" },
                    { id: "OUTLOOK_SMTP", name: "Microsoft / Outlook", desc: "smtp-mail.outlook.com", icon: "📬" },
                    { id: "CUSTOM_SMTP", name: "SMTP Customizado", desc: "Host e Porta configuráveis", icon: "⚙️" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleProviderChange(item.id)}
                      className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition-all ${
                        provider === item.id
                          ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/30"
                          : "border-white/10 bg-white/5 hover:border-white/20"
                      }`}
                    >
                      <span className="text-xl mb-1">{item.icon}</span>
                      <span className="text-xs font-semibold text-white">{item.name}</span>
                      <span className="text-[10px] text-white/50 mt-0.5">{item.desc}</span>
                    </button>
                  ))}
                </div>

                {provider === "GMAIL_SMTP" && (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200/90 leading-relaxed">
                    💡 <strong>Dica Google:</strong> Para o Gmail, ative a <em>Verificação em duas etapas</em> na sua Conta Google e gere uma <strong>Senha de App</strong> (16 caracteres) em <em>Segurança → Senhas de app</em>. Nunca utilize a senha principal da sua conta.
                    <button
                      type="button"
                      onClick={() => {
                        setSmtpHost("smtp.gmail.com");
                        setSmtpPort(587);
                        setSmtpSecure(false);
                        setSmtpUser("georgie.a.reis@gmail.com");
                        setSenderEmail("georgie.a.reis@gmail.com");
                        setReplyTo("georgie.a.reis@gmail.com");
                      }}
                      className="mt-2 block min-h-9 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 text-xs font-semibold text-amber-200 hover:bg-amber-400/20"
                    >
                      Preencher com georgie.a.reis@gmail.com
                    </button>
                  </div>
                )}

                {provider === "OUTLOOK_SMTP" && (
                  <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-blue-200/90 leading-relaxed">
                    💡 <strong>Dica Microsoft:</strong> Para contas Hotmail/Outlook.com, utilize o host <code>smtp-mail.outlook.com</code> na porta <code>587</code> com STARTTLS.
                  </div>
                )}
              </div>

              {/* Card 2: Conexão SMTP & Credenciais */}
              <div className="rounded-2xl border border-white/10 bg-[#121620] p-6 space-y-4">
                <h2 className="text-base font-semibold text-white border-b border-white/10 pb-3">
                  Parâmetros de Conexão SMTP
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs font-medium text-white/70">Host SMTP</label>
                    <input
                      type="text"
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                      placeholder="smtp.gmail.com"
                      required
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/30 focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-white/70">Porta</label>
                    <input
                      type="number"
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(Number(e.target.value))}
                      placeholder="587"
                      required
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/30 focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="smtpSecure"
                    checked={smtpSecure}
                    onChange={(e) => setSmtpSecure(e.target.checked)}
                    className="rounded border-white/20 bg-white/10 text-primary focus:ring-0"
                  />
                  <label htmlFor="smtpSecure" className="text-xs text-white/70">
                    Conexão SSL/TLS Direta (marcar apenas para porta 465; desmarcado para porta 587 STARTTLS)
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-white/70">Usuário SMTP / Login</label>
                    <input
                      type="text"
                      value={smtpUser}
                      onChange={(e) => setSmtpUser(e.target.value)}
                      placeholder="seu-email@dominio.com"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/30 focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-white/70">Senha de App / SMTP</label>
                      {settings?.hasPassword && (
                        <span className="text-[10px] text-emerald-400 font-mono">
                          Configurada ({settings.smtpPasswordMasked})
                        </span>
                      )}
                    </div>
                    <input
                      type="password"
                      name="tomadix-smtp-app-password"
                      autoComplete="new-password"
                      value={smtpPassword}
                      onChange={(e) => setSmtpPassword(e.target.value)}
                      placeholder={settings?.hasPassword ? "Preencha apenas para alterar" : "Senha ou App Password"}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/30 focus:border-primary focus:outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Card 3: Identidade do Remetente */}
              <div className="rounded-2xl border border-white/10 bg-[#121620] p-6 space-y-4">
                <h2 className="text-base font-semibold text-white border-b border-white/10 pb-3">
                  Identidade do Remetente
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-white/70">Nome de Exibição</label>
                    <input
                      type="text"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      placeholder="Tomadix Studio"
                      required
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/30 focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-white/70">E-mail Remetente (From)</label>
                    <input
                      type="email"
                      value={senderEmail}
                      onChange={(e) => setSenderEmail(e.target.value)}
                      placeholder="contato@seudominio.com"
                      required
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/30 focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-white/70">Responder Para (Reply-To opcional)</label>
                  <input
                    type="email"
                    value={replyTo}
                    onChange={(e) => setReplyTo(e.target.value)}
                    placeholder="suporte@seudominio.com"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/30 focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testingConnection}
                  className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-xs font-semibold text-blue-300 hover:bg-blue-500/20 transition disabled:opacity-50"
                >
                  {testingConnection ? "Verificando..." : "🔌 Testar Conexão SMTP"}
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-black shadow-lg shadow-primary/20 hover:bg-primary/90 transition disabled:opacity-50"
                >
                  {saving ? "Salvando..." : "Salvar Configurações"}
                </button>
              </div>
            </form>
          </div>

          {/* Coluna 3: Testes de Disparo & Status */}
          <div className="space-y-6">
            {/* Status do Diagnóstico */}
            <div className="rounded-2xl border border-white/10 bg-[#121620] p-6 space-y-4">
              <h3 className="text-sm font-semibold text-white border-b border-white/10 pb-3">
                Diagnóstico da Conexão
              </h3>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-white/50">Status:</span>
                  <span
                    className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                      settings?.lastTestStatus === "SUCCESS"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : settings?.lastTestStatus === "FAILED"
                        ? "bg-red-500/20 text-red-300 border border-red-500/30"
                        : "bg-white/10 text-white/50"
                    }`}
                  >
                    {settings?.lastTestStatus === "SUCCESS"
                      ? "Conectado"
                      : settings?.lastTestStatus === "FAILED"
                      ? "Falha"
                      : "Não testado"}
                  </span>
                </div>

                {settings?.lastTestedAt && (
                  <div className="flex items-center justify-between text-white/60">
                    <span>Último teste:</span>
                    <span className="font-mono text-[11px]">
                      {new Date(settings.lastTestedAt).toLocaleString("pt-BR")}
                    </span>
                  </div>
                )}

                {settings?.lastTestError && (
                  <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-2.5 text-[11px] text-red-300 leading-snug">
                    {settings.lastTestError}
                  </div>
                )}
              </div>
            </div>

            {/* Teste de Disparo Real */}
            <div className="rounded-2xl border border-white/10 bg-[#121620] p-6 space-y-4">
              <h3 className="text-sm font-semibold text-white border-b border-white/10 pb-3">
                Disparar E-mail de Teste
              </h3>
              <p className="text-xs text-white/50">
                Envie um e-mail com o template oficial do Tomadix para verificar a entrega na caixa de entrada.
              </p>

              <form onSubmit={handleSendTestEmail} className="space-y-3">
                <input
                  type="email"
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  placeholder="destinatario@email.com"
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/30 focus:border-primary focus:outline-none"
                />

                <button
                  type="submit"
                  disabled={sendingTestMail || !testRecipient.trim()}
                  className="w-full rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25 transition disabled:opacity-50"
                >
                  {sendingTestMail ? "Enviando e-mail..." : "🚀 Disparar E-mail de Teste"}
                </button>
              </form>
            </div>

            {/* Logs Recentes */}
            <div className="rounded-2xl border border-white/10 bg-[#121620] p-6 space-y-4">
              <h3 className="text-sm font-semibold text-white border-b border-white/10 pb-3">
                Disparos Recentes ({logs.length})
              </h3>

              {logs.length === 0 ? (
                <p className="text-xs text-white/40">Nenhum e-mail disparado até o momento.</p>
              ) : (
                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white truncate max-w-[160px]">
                          {log.recipient}
                        </span>
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                            log.status === "SENT"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {log.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/60 truncate">{log.subject}</p>
                      <p className="text-[10px] text-white/30 font-mono">
                        {new Date(log.createdAt).toLocaleString("pt-BR")}
                      </p>
                      {log.errorMessage && (
                        <p className="text-[10px] text-red-400 truncate">{log.errorMessage}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#121620] p-5">
        <div>
          <h2 className="text-base font-semibold text-white">Caixa de Entrada</h2>
          <p className="text-xs text-white/50">Leia e responda os e-mails recebidos na conta configurada (usa a mesma senha de app).</p>
        </div>
        <Link
          href="/admin/settings/email/inbox"
          className="min-h-10 rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-bold text-black transition hover:bg-amber-300"
        >
          Abrir caixa de entrada
        </Link>
      </div>

      <EmailTemplatesPanel />
    </div>
  );
}

