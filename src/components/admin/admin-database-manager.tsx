"use client";

import { Spinner } from "@/components/ui/spinner";
import { Modal } from "@/components/ui/modal";
import { AdminDatabaseDump } from "@/components/admin/admin-database-dump";
import { useEffect, useState } from "react";
import {
  SanitizedConnectionInfo,
  ConnectionTestResult,
  DatabaseDiagnosis,
  InitializeDatabaseReport,
} from "@/modules/admin/admin-database.service";

export function AdminDatabaseManager() {
  // Estado da Conexão Atual
  const [connectionInfo, setConnectionInfo] = useState<SanitizedConnectionInfo | null>(null);
  const [currentTest, setCurrentTest] = useState<ConnectionTestResult | null>(null);
  const [testingCurrent, setTestingCurrent] = useState(false);

  // Estado da Nova Conexão
  const [connectionType, setConnectionType] = useState<"supabase" | "postgres_remote" | "postgres_local" | "custom_url">("supabase");
  const [formHost, setFormHost] = useState("");
  const [formPort, setFormPort] = useState(6543);
  const [formDatabase, setFormDatabase] = useState("postgres");
  const [formUser, setFormUser] = useState("postgres");
  const [formPassword, setFormPassword] = useState("");
  const [formSslMode, setFormSslMode] = useState<"require" | "disable" | "prefer">("require");
  const [formDirectUrl, setFormDirectUrl] = useState("");
  const [customUrl, setCustomUrl] = useState("");

  const [candidateTest, setCandidateTest] = useState<ConnectionTestResult | null>(null);
  const [testingCandidate, setTestingCandidate] = useState(false);
  const [savingConnection, setSavingConnection] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [loadingEnvPreview, setLoadingEnvPreview] = useState(false);
  const [envPreview, setEnvPreview] = useState<{ envText: string; envMasked: string } | null>(null);
  const [envModalError, setEnvModalError] = useState<string | null>(null);
  const [envCopied, setEnvCopied] = useState(false);

  // Estado da Inicialização / Diagnóstico
  const [activeSubTab, setActiveSubTab] = useState<"status" | "change" | "wizard" | "backup">("status");
  const [diagnosing, setDiagnosing] = useState(false);
  const [diagnosis, setDiagnosis] = useState<DatabaseDiagnosis | null>(null);

  // Wizard States
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState("");
  const [seedDemoProject, setSeedDemoProject] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [initReport, setInitReport] = useState<InitializeDatabaseReport | null>(null);

  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Carregar dados iniciais da conexão atual
  const loadCurrentInfo = async () => {
    try {
      const res = await fetch("/api/admin/database/info");
      const data = await res.json();
      if (res.ok && data.connection) {
        setConnectionInfo(data.connection);
      }
    } catch {}
  };

  const handleTestCurrent = async () => {
    setTestingCurrent(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/database/test", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao testar conexão.");
      setCurrentTest(data.test);
      if (data.test.success) {
        setFeedback({
          type: "success",
          message: `Conexão ativa validada em ${data.test.totalLatencyMs}ms! Servidor PostgreSQL operacional.`,
        });
      } else {
        setFeedback({
          type: "error",
          message: data.test.error || "Falha na conexão com o banco.",
        });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Erro de rede ao testar." });
    } finally {
      setTestingCurrent(false);
    }
  };

  const candidatePayload = () =>
    connectionType === "custom_url"
      ? { url: customUrl.trim() }
      : {
          connectionType,
          host: formHost.trim(),
          port: Number(formPort),
          database: formDatabase.trim(),
          user: formUser.trim(),
          password: formPassword,
          sslMode: formSslMode,
          directUrl: formDirectUrl.trim() || undefined,
        };

  // Ao clicar em Salvar: mostra o .env que seria gravado e só aplica depois da confirmação no modal.
  const handleOpenEnvPreview = async () => {
    if (!candidateTest || !candidateTest.success) {
      alert("É necessário testar e validar com sucesso a nova conexão antes de aplicá-la.");
      return;
    }
    setLoadingEnvPreview(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/database/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(candidatePayload()),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao gerar prévia do .env.");
      setEnvModalError(null);
      setEnvCopied(false);
      setEnvPreview(data);
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Erro ao gerar prévia do .env." });
    } finally {
      setLoadingEnvPreview(false);
    }
  };

  const handleCopyEnv = async () => {
    if (!envPreview) return;
    try {
      await navigator.clipboard.writeText(envPreview.envText);
      setEnvCopied(true);
    } catch {
      setEnvModalError("Não foi possível copiar automaticamente. Selecione o texto e copie manualmente.");
    }
  };

  const handleTestCandidate = async () => {
    setTestingCandidate(true);
    setCandidateTest(null);
    setSaveSuccessMessage(null);
    setFeedback(null);

    const payload = candidatePayload();

    try {
      const res = await fetch("/api/admin/database/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao testar nova conexão.");
      setCandidateTest(data.test);
      if (data.test.success) {
        setFeedback({
          type: "success",
          message: `Nova conexão testada com sucesso (${data.test.totalLatencyMs}ms)! ${data.test.tableCount} tabelas encontradas.`,
        });
      } else {
        setFeedback({
          type: "error",
          message: `Falha no teste: ${data.test.error || "Servidor inacessível"}`,
        });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Falha ao testar conexão." });
    } finally {
      setTestingCandidate(false);
    }
  };

  const handleApplyNewConnection = async () => {
    if (!candidateTest || !candidateTest.success) {
      alert("É necessário testar e validar com sucesso a nova conexão antes de aplicá-la.");
      return;
    }

    setSavingConnection(true);
    setFeedback(null);

    const payload = candidatePayload();

    try {
      const res = await fetch("/api/admin/database/change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao salvar nova conexão.");

      setSaveSuccessMessage(
        `Conexão alterada com sucesso! Backup criado em ${data.backupFile}. Reinicie a aplicação caso necessário para atualizar o pool.`
      );
      setEnvPreview(null);
      setConnectionInfo(data.connectionInfo);
      setCandidateTest(null);
      setFormPassword("");
      await handleTestCurrent();
    } catch (err: any) {
      setEnvModalError(err.message || "Erro ao aplicar nova conexão.");
    } finally {
      setSavingConnection(false);
    }
  };

  const handleDiagnose = async () => {
    setDiagnosing(true);
    try {
      const res = await fetch("/api/admin/database/diagnose");
      const data = await res.json();
      if (res.ok && data.diagnosis) {
        setDiagnosis(data.diagnosis);
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: "Erro ao diagnosticar estado do banco." });
    } finally {
      setDiagnosing(false);
    }
  };

  const handleExecuteInitialization = async () => {
    if (!diagnosis?.hasSuperAdmin && (!adminEmail || !adminPassword)) {
      alert("Por favor, preencha o e-mail e a senha do administrador inicial.");
      return;
    }

    if (!diagnosis?.hasSuperAdmin && adminPassword !== adminPasswordConfirm) {
      alert("A confirmação de senha não coincide com a senha digitada.");
      return;
    }

    setInitializing(true);
    setInitReport(null);
    setFeedback(null);

    try {
      const payload: any = {
        seedDemoProject,
      };

      if (!diagnosis?.hasSuperAdmin && adminEmail) {
        payload.adminUser = {
          name: adminName.trim() || "Administrador Geral",
          email: adminEmail.trim(),
          password: adminPassword,
        };
      }

      const res = await fetch("/api/admin/database/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro durante a inicialização.");

      setInitReport(data.report);
      setWizardStep(4);
      setFeedback({
        type: "success",
        message: "Inicialização completa da plataforma concluída com sucesso!",
      });
      await handleDiagnose();
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Falha na inicialização do banco." });
    } finally {
      setInitializing(false);
    }
  };

  useEffect(() => {
    loadCurrentInfo();
    handleTestCurrent();
    handleDiagnose();
  }, []);

  return (
    <div className="space-y-6">
      {/* Banner de Feedback */}
      {feedback && (
        <div
          className={`rounded-2xl border p-4 text-xs font-medium flex items-center justify-between ${
            feedback.type === "success"
              ? "border-primary/30 bg-primary/30 text-primary"
              : "border-rose-500/30 bg-rose-950/30 text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{feedback.type === "success" ? "✅" : "⚠️"}</span>
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-white/40 hover:text-white ml-3"
          >
            ✕
          </button>
        </div>
      )}

      {/* Sub-navegação interna de Banco de Dados */}
      <div className="flex border-b border-white/10 gap-2 pb-1 overflow-x-auto no-scrollbar">
        {[
          { id: "status", label: "Conexão Ativa & Métricas", icon: "🔌" },
          { id: "change", label: "Alterar ou Testar Conexão", icon: "🔄" },
          { id: "wizard", label: "Inicializar Banco de Dados (Setup)", icon: "🚀" },
          { id: "backup", label: "Backup e Migração (Dump)", icon: "📦" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`pb-2.5 px-3 text-xs font-semibold transition border-b-2 whitespace-nowrap flex items-center gap-2 ${
              activeSubTab === tab.id
                ? "border-amber-400 text-amber-300"
                : "border-transparent text-white/50 hover:text-white"
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ========================================================= */}
      {/* SEÇÃO 1: CONEXÃO ATIVA E MÉTRICAS EM TEMPO REAL          */}
      {/* ========================================================= */}
      {activeSubTab === "backup" && <AdminDatabaseDump />}

      {activeSubTab === "status" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-[#0d111c] p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>🗄️</span> Estado da Conexão Principal
                </h3>
                <p className="text-xs text-white/50 mt-1 max-w-xl">
                  Verifique a conectividade, latência de rede, versão do motor PostgreSQL e status de segurança da instância em produção.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleTestCurrent}
                  disabled={testingCurrent}
                  className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition disabled:opacity-50 flex items-center gap-2 shadow-sm"
                >
                  {testingCurrent ? (
                    <>
                      <Spinner block className="h-3.5 w-3.5 border-2 border-amber-300" />
                      <span>Testando...</span>
                    </>
                  ) : (
                    <>
                      <span>⚡</span>
                      <span>Testar Conexão Agora</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Painel de Métricas Rápidas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                <div className="text-[11px] text-white/50">Status Operacional</div>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      currentTest?.success ? "bg-primary animate-pulse" : "bg-rose-500"
                    }`}
                  />
                  <span className="text-sm font-bold text-white">
                    {currentTest?.status === "CONNECTED"
                      ? "Conectado"
                      : currentTest?.status === "AUTH_FAILED"
                      ? "Falha de Autenticação"
                      : currentTest?.status === "UNREACHABLE"
                      ? "Inacessível"
                      : currentTest
                      ? "Com Erro"
                      : "Verificando..."}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                <div className="text-[11px] text-white/50">Latência Round-trip</div>
                <div className="mt-1 text-sm font-mono font-bold text-amber-300">
                  {currentTest?.totalLatencyMs !== undefined ? `${currentTest.totalLatencyMs} ms` : "—"}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                <div className="text-[11px] text-white/50">Tabelas Ativas</div>
                <div className="mt-1 text-sm font-bold text-white">
                  {currentTest?.tableCount !== undefined ? `${currentTest.tableCount} tabelas` : "—"}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                <div className="text-[11px] text-white/50">Ambiente Identificado</div>
                <div className="mt-1 text-sm font-bold text-indigo-300 flex items-center gap-1.5">
                  <span>{connectionInfo?.isSupabase ? "⚡ Supabase" : "🐘 PostgreSQL"}</span>
                  {connectionInfo?.isPooler && (
                    <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[9px] font-mono text-indigo-200">
                      Pooler
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Ficha Técnica da Conexão */}
            <div className="rounded-xl border border-white/10 bg-black/20 p-5 space-y-4">
              <h4 className="text-xs font-mono font-bold uppercase text-white/70 tracking-wider">
                Parâmetros Técnicos (Seguros / Sem Exposição de Segredos)
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-white/40 block text-[10px]">Host do Banco:</span>
                  <span className="font-mono text-white/90">
                    {connectionInfo?.hostMasked || currentTest?.hostMasked || "aws-0-***.pooler.supabase.com"}
                  </span>
                </div>

                <div>
                  <span className="text-white/40 block text-[10px]">Porta de Acesso:</span>
                  <span className="font-mono text-white/90">
                    {connectionInfo?.port || currentTest?.port || 5432}
                    {connectionInfo?.isPooler && " (Transação PgBouncer)"}
                  </span>
                </div>

                <div>
                  <span className="text-white/40 block text-[10px]">Nome do Banco:</span>
                  <span className="font-mono text-white/90">{connectionInfo?.database || "postgres"}</span>
                </div>

                <div>
                  <span className="text-white/40 block text-[10px]">Usuário Mascarado:</span>
                  <span className="font-mono text-white/90">{connectionInfo?.userMasked || "pos***"}</span>
                </div>

                <div>
                  <span className="text-white/40 block text-[10px]">Criptografia SSL/TLS:</span>
                  <span className="font-medium text-primary">
                    {currentTest?.sslUsed ? "Ativa (TLS Seguro)" : "Conexão SSL Require"}
                  </span>
                </div>

                <div>
                  <span className="text-white/40 block text-[10px]">Versão do Motor:</span>
                  <span className="text-white/80 line-clamp-1">{currentTest?.version || "PostgreSQL 15+"}</span>
                </div>
              </div>

              {currentTest?.testedAt && (
                <div className="border-t border-white/5 pt-3 text-[11px] text-white/40 flex items-center justify-between">
                  <span>Última verificação: {new Date(currentTest.testedAt).toLocaleString("pt-BR")}</span>
                  <span className="text-primary/80 font-mono">Prisma Client v6 • Driver Nativo</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SEÇÃO 2: TESTAR OU ALTERAR CONEXÃO                        */}
      {/* ========================================================= */}
      {activeSubTab === "change" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-[#0d111c] p-6 space-y-6">
            <div className="border-b border-white/10 pb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>🔄</span> Configurar Nova Conexão com Banco de Dados
              </h3>
              <p className="text-xs text-white/50 mt-1 max-w-2xl">
                Configure uma nova conexão (local, remota ou Supabase). A conexão é testada de forma temporária e isolada. A configuração ativa só é substituída se o teste for 100% bem-sucedido e com backup automático do arquivo .env.
              </p>
            </div>

            {saveSuccessMessage && (
              <div className="rounded-xl border border-primary/30 bg-primary/40 p-4 text-xs text-primary">
                {saveSuccessMessage}
              </div>
            )}

            {/* Seletor de Tipo de Conexão */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/70">Tipo de Banco / Provedor</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: "supabase", label: "Supabase Hospedado", icon: "⚡" },
                  { id: "postgres_remote", label: "PostgreSQL Remoto", icon: "☁️" },
                  { id: "postgres_local", label: "PostgreSQL Local", icon: "💻" },
                  { id: "custom_url", label: "String / URL Direta", icon: "🔗" },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setConnectionType(t.id as any);
                      if (t.id === "postgres_local") {
                        setFormHost("localhost");
                        setFormPort(5432);
                        setFormSslMode("disable");
                      } else if (t.id === "supabase") {
                        setFormPort(6543);
                        setFormSslMode("require");
                      } else {
                        setFormPort(5432);
                        setFormSslMode("require");
                      }
                    }}
                    className={`rounded-xl border p-3 text-left transition ${
                      connectionType === t.id
                        ? "border-amber-400 bg-amber-400/10 text-white font-bold"
                        : "border-white/10 bg-black/30 text-white/60 hover:bg-white/5"
                    }`}
                  >
                    <div className="text-lg mb-1">{t.icon}</div>
                    <div className="text-xs">{t.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Formulário: URL Customizada */}
            {connectionType === "custom_url" ? (
              <div className="space-y-3">
                <label className="text-xs font-semibold text-white/70">
                  URL Completa de Conexão (PostgreSQL)
                </label>
                <input
                  type="password"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="postgresql://usuario:senha@host:5432/banco?sslmode=require"
                  className="w-full rounded-xl border border-white/10 bg-black/50 px-3.5 py-2.5 text-xs font-mono text-white focus:border-amber-400 focus:outline-none"
                />
                <p className="text-[11px] text-white/40">
                  Suporta parâmetros padrão como sslmode=require, pgbouncer=true, connection_limit, etc.
                </p>
              </div>
            ) : (
              /* Formulário: Campos Individuais */
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs font-semibold text-white/70">Host do Banco</label>
                    <input
                      type="text"
                      value={formHost}
                      onChange={(e) => setFormHost(e.target.value)}
                      placeholder={connectionType === "supabase" ? "aws-0-us-east-2.pooler.supabase.com" : "localhost"}
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs font-mono text-white focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-white/70">Porta</label>
                    <input
                      type="number"
                      value={formPort}
                      onChange={(e) => setFormPort(Number(e.target.value))}
                      placeholder="5432"
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs font-mono text-white focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-white/70">Nome do Banco</label>
                    <input
                      type="text"
                      value={formDatabase}
                      onChange={(e) => setFormDatabase(e.target.value)}
                      placeholder="postgres"
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs font-mono text-white focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-white/70">Usuário</label>
                    <input
                      type="text"
                      value={formUser}
                      onChange={(e) => setFormUser(e.target.value)}
                      placeholder="postgres"
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs font-mono text-white focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-white/70">Senha</label>
                    <input
                      type="password"
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                </div>

                {connectionType === "supabase" && (
                  <div className="space-y-1.5 pt-1">
                    <label className="text-xs font-semibold text-white/70">
                      Direct URL (Opcional — para Migrations na porta 5432)
                    </label>
                    <input
                      type="password"
                      value={formDirectUrl}
                      onChange={(e) => setFormDirectUrl(e.target.value)}
                      placeholder="postgresql://postgres.xxx:senha@aws-0-us-east-2.pooler.supabase.com:5432/postgres"
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs font-mono text-white focus:border-amber-400 focus:outline-none"
                    />
                    <p className="text-[11px] text-white/40">
                      Se omitido, o sistema utilizará a porta direta calculada automaticamente.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Ações de Teste e Aplicação */}
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={handleTestCandidate}
                disabled={testingCandidate}
                className="rounded-xl border border-amber-500/40 bg-amber-500/20 px-4 py-2.5 text-xs font-bold text-amber-300 hover:bg-amber-500/30 transition disabled:opacity-50 flex items-center gap-2"
              >
                {testingCandidate ? (
                  <>
                    <Spinner block className="h-3 w-3 border-2 border-amber-300" />
                    <span>Testando Conexão Temporária...</span>
                  </>
                ) : (
                  <>
                    <span>🧪</span>
                    <span>1. Testar Nova Conexão</span>
                  </>
                )}
              </button>

              {candidateTest?.success && (
                <button
                  type="button"
                  onClick={handleOpenEnvPreview}
                  disabled={loadingEnvPreview}
                  className="rounded-xl bg-primary hover:bg-primary-fixed px-5 py-2.5 text-xs font-bold text-black transition shadow-lg shadow-primary/10 disabled:opacity-50 flex items-center gap-2"
                >
                  {loadingEnvPreview ? (
                    <span>Gerando prévia do .env...</span>
                  ) : (
                    <>
                      <span>💾</span>
                      <span>2. Salvar e Aplicar Nova Conexão</span>
                    </>
                  )}
                </button>
              )}

              {envPreview && (
                <Modal
                  onClose={() => !savingConnection && setEnvPreview(null)}
                  size="2xl"
                  labelledBy="env-preview-title"
                  closeOnOverlay={!savingConnection}
                >
                  <div className="p-4 sm:p-6 space-y-4">
                    <div>
                      <h3 id="env-preview-title" className="text-base font-bold text-white">
                        Novas configurações do .env
                      </h3>
                      <p className="mt-1 text-xs text-white/50">
                        Estas são as variáveis que serão gravadas. A senha aparece oculta aqui, mas o botão Copiar leva o valor completo.
                        Em produção (Docker/Easypanel) o .env é somente leitura: copie e defina as duas variáveis no serviço.
                      </p>
                    </div>

                    <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-emerald-300 font-mono whitespace-pre-wrap break-all">
                      {envPreview.envMasked}
                    </pre>

                    {envModalError && (
                      <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                        {envModalError}
                      </div>
                    )}

                    <div className="flex flex-col-reverse gap-2 border-t border-white/10 pt-4 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={() => setEnvPreview(null)}
                        disabled={savingConnection}
                        className="min-h-11 rounded-xl px-4 py-2 text-xs font-medium text-white/70 hover:bg-white/10 transition disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyEnv}
                        className="min-h-11 rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10 transition"
                      >
                        {envCopied ? "Copiado!" : "Copiar variáveis"}
                      </button>
                      <button
                        type="button"
                        onClick={handleApplyNewConnection}
                        disabled={savingConnection}
                        className="min-h-11 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-black hover:bg-primary-fixed transition disabled:opacity-50"
                      >
                        {savingConnection ? "Gravando no .env..." : "Gravar no .env"}
                      </button>
                    </div>
                  </div>
                </Modal>
              )}
            </div>

            {/* Resultado do Teste da Nova Conexão */}
            {candidateTest && (
              <div
                className={`rounded-xl border p-4 space-y-3 ${
                  candidateTest.success
                    ? "border-primary/30 bg-primary/20"
                    : "border-rose-500/30 bg-rose-950/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{candidateTest.success ? "✅" : "❌"}</span>
                    <span className="text-xs font-bold text-white">
                      {candidateTest.success ? "Teste Aprovado!" : "Teste Reprovado"}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-amber-300">
                    {candidateTest.totalLatencyMs} ms
                  </span>
                </div>

                {candidateTest.success ? (
                  <div className="text-xs text-white/70 space-y-1">
                    <p>
                      Conexão estabelecida com sucesso com o servidor{" "}
                      <strong className="text-white">{candidateTest.version}</strong>.
                    </p>
                    <p>
                      Banco: <span className="font-mono text-white">{candidateTest.databaseName}</span> •
                      Tabelas já existentes:{" "}
                      <strong className="text-amber-300">{candidateTest.tableCount}</strong>
                    </p>
                  </div>
                ) : (
                  <div className="text-xs text-rose-300 space-y-2">
                    <p className="font-mono text-[11px]">{candidateTest.error}</p>
                    {candidateTest.suggestions && candidateTest.suggestions.length > 0 && (
                      <div className="rounded-lg bg-black/40 p-2.5 space-y-1">
                        <span className="font-bold text-[10px] uppercase text-white/50">Sugestões:</span>
                        <ul className="list-disc list-inside text-[11px] text-white/70 space-y-0.5">
                          {candidateTest.suggestions.map((s, idx) => (
                            <li key={idx}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SEÇÃO 3: INICIALIZAÇÃO GUIADA DO BANCO (WIZARD)           */}
      {/* ========================================================= */}
      {activeSubTab === "wizard" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-[#0d111c] p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>🚀</span> Assistente de Inicialização da Plataforma
                </h3>
                <p className="text-xs text-white/50 mt-1 max-w-2xl">
                  Prepare uma nova instalação do Tomadix de forma totalmente automatizada e idempotente: tabelas, administrador inicial, planos, catálogo de parâmetros e projeto demonstrativo.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDiagnose}
                disabled={diagnosing}
                className="rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-medium text-white/70 hover:bg-white/10 transition disabled:opacity-50"
              >
                {diagnosing ? "Diagnosticando..." : "Atualizar Diagnóstico"}
              </button>
            </div>

            {/* Stepper Visual */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-b border-white/10 pb-5">
              {[
                { step: 1, label: "1. Diagnóstico" },
                { step: 2, label: "2. Administrador" },
                { step: 3, label: "3. Confirmação" },
                { step: 4, label: "4. Conclusão" },
              ].map((s) => (
                <div
                  key={s.step}
                  className={`rounded-xl p-2.5 text-center transition ${
                    wizardStep === s.step
                      ? "border border-amber-400 bg-amber-400/10 text-amber-300 font-bold"
                      : wizardStep > s.step
                      ? "bg-primary/20 text-primary font-medium"
                      : "bg-white/5 text-white/40"
                  }`}
                >
                  <div className="text-xs">{s.label}</div>
                </div>
              ))}
            </div>

            {/* PASSO 1: DIAGNÓSTICO DO BANCO */}
            {wizardStep === 1 && (
              <div className="space-y-4">
                <div className="rounded-xl border border-white/10 bg-black/30 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Estado Atual do Schema</span>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                        diagnosis?.status === "READY"
                          ? "bg-primary/20 text-primary"
                          : diagnosis?.status === "PARTIAL"
                          ? "bg-amber-500/20 text-amber-300"
                          : "bg-rose-500/20 text-rose-300"
                      }`}
                    >
                      {diagnosis?.status === "READY"
                        ? "Todas as Tabelas Criadas"
                        : diagnosis?.status === "PARTIAL"
                        ? "Instalação Parcial"
                        : "Banco Vazio"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2">
                    <div>
                      <span className="text-white/40 block text-[10px]">Tabelas Criadas:</span>
                      <span className="font-bold text-white">
                        {diagnosis?.existingTablesCount || 0} / {diagnosis?.totalExpectedTables || 35}
                      </span>
                    </div>
                    <div>
                      <span className="text-white/40 block text-[10px]">Super Administrador:</span>
                      <span
                        className={`font-bold ${
                          diagnosis?.hasSuperAdmin ? "text-primary" : "text-amber-400"
                        }`}
                      >
                        {diagnosis?.hasSuperAdmin ? "Configurado ✅" : "Ausente ⚠️"}
                      </span>
                    </div>
                    <div>
                      <span className="text-white/40 block text-[10px]">Planos Comerciais:</span>
                      <span className="font-bold text-white">{diagnosis?.plansCount || 0} planos</span>
                    </div>
                    <div>
                      <span className="text-white/40 block text-[10px]">Parâmetros Cinematográficos:</span>
                      <span className="font-bold text-white">{diagnosis?.parametersCount || 0} parâmetros</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setWizardStep(2)}
                    className="rounded-xl bg-amber-400 px-5 py-2.5 text-xs font-bold text-black hover:bg-amber-300 transition"
                  >
                    Avançar para Configuração do Administrador →
                  </button>
                </div>
              </div>
            )}

            {/* PASSO 2: CONFIGURAÇÃO DO ADMINISTRADOR */}
            {wizardStep === 2 && (
              <div className="space-y-4">
                {diagnosis?.hasSuperAdmin ? (
                  <div className="rounded-xl border border-primary/30 bg-primary/20 p-5 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-primary">✅</span>
                      <h4 className="text-xs font-bold text-white">
                        Administrador Inicial já Existente
                      </h4>
                    </div>
                    <p className="text-xs text-white/70">
                      Um ou mais administradores ({diagnosis.superAdminEmailMasked || "administrador ativo"}) já existem no banco. Para segurança da conta, o processo de inicialização irá preservar o administrador existente sem duplicar ou alterar sua senha.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-white/10 bg-black/30 p-5 space-y-4">
                    <h4 className="text-xs font-bold text-white border-b border-white/10 pb-2">
                      Criar Conta do Super Administrador Inicial
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-white/70">Nome do Administrador</label>
                        <input
                          type="text"
                          value={adminName}
                          onChange={(e) => setAdminName(e.target.value)}
                          placeholder="Ex: Diretor Técnico"
                          className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-xs text-white"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-white/70">E-mail Corporativo</label>
                        <input
                          type="email"
                          value={adminEmail}
                          onChange={(e) => setAdminEmail(e.target.value)}
                          placeholder="admin@tomadix.com"
                          className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-xs text-white"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-white/70">Senha (mín. 8 dígitos)</label>
                        <input
                          type="password"
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-xs text-white"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-white/70">Confirmar Senha</label>
                        <input
                          type="password"
                          value={adminPasswordConfirm}
                          onChange={(e) => setAdminPasswordConfirm(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-xs text-white"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setWizardStep(1)}
                    className="rounded-xl border border-white/15 px-4 py-2 text-xs font-medium text-white/70 hover:bg-white/5"
                  >
                    ← Voltar
                  </button>

                  <button
                    type="button"
                    onClick={() => setWizardStep(3)}
                    className="rounded-xl bg-amber-400 px-5 py-2.5 text-xs font-bold text-black hover:bg-amber-300 transition"
                  >
                    Avançar para Confirmação do Plano →
                  </button>
                </div>
              </div>
            )}

            {/* PASSO 3: PLANO DE EXECUÇÃO E CONFIRMAÇÃO */}
            {wizardStep === 3 && (
              <div className="space-y-4">
                <div className="rounded-xl border border-white/10 bg-black/30 p-5 space-y-3">
                  <h4 className="text-xs font-bold text-white border-b border-white/10 pb-2">
                    Plano de Execução Idempotente
                  </h4>

                  <ul className="text-xs text-white/70 space-y-2 list-disc list-inside">
                    <li>
                      <strong>Tabelas & Schema:</strong> Sincronizar todas as 35 tabelas Prisma sem deletar ou truncar nenhum dado preexistente.
                    </li>
                    <li>
                      <strong>Administrador:</strong>{" "}
                      {diagnosis?.hasSuperAdmin
                        ? "Preservar o administrador existente sem alterações."
                        : `Criar conta com privilégios SUPER_ADMIN para ${adminEmail}.`}
                    </li>
                    <li>
                      <strong>Planos Comerciais:</strong> Cadastrar/atualizar os 4 planos oficiais (FREE, PRO, TEAM, ENTERPRISE).
                    </li>
                    <li>
                      <strong>Parâmetros Cinematográficos:</strong> Sincronizar lentes, iluminação, relações de aspecto e câmeras.
                    </li>
                    <li>
                      <strong>Políticas e Gateways:</strong> Provisionar regras comerciais de créditos e cobrança.
                    </li>
                  </ul>

                  <div className="pt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-white/80">
                      <input
                        type="checkbox"
                        checked={seedDemoProject}
                        onChange={(e) => setSeedDemoProject(e.target.checked)}
                        className="rounded border-white/20 bg-black/40 text-amber-400 focus:ring-0"
                      />
                      <span>Incluir Projeto de Demonstração Cinematográfico ("O Brasil em VHS • Cinema Noir")</span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setWizardStep(2)}
                    className="rounded-xl border border-white/15 px-4 py-2 text-xs font-medium text-white/70 hover:bg-white/5"
                  >
                    ← Voltar
                  </button>

                  <button
                    type="button"
                    onClick={handleExecuteInitialization}
                    disabled={initializing}
                    className="rounded-xl bg-amber-400 hover:bg-amber-300 px-6 py-2.5 text-xs font-bold text-black transition shadow-lg shadow-amber-500/10 disabled:opacity-50 flex items-center gap-2"
                  >
                    {initializing ? (
                      <>
                        <Spinner block className="h-3.5 w-3.5 border-2 border-black" />
                        <span>Inicializando Plataforma...</span>
                      </>
                    ) : (
                      <>
                        <span>🚀</span>
                        <span>Confirmar e Inicializar Banco de Dados</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* PASSO 4: RELATÓRIO FINAL */}
            {wizardStep === 4 && (
              <div className="space-y-4">
                <div className="rounded-xl border border-primary/30 bg-primary/20 p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🎉</span>
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        {initReport?.message || "Inicialização Concluída com Sucesso!"}
                      </h4>
                      <p className="text-xs text-primary">
                        Tempo total de execução: {initReport?.durationMs}ms
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border-t border-white/10 pt-3">
                    <div>
                      <span className="text-white/40 block text-[10px]">Tabelas:</span>
                      <span className="font-bold text-white">35 Verificadas</span>
                    </div>

                    <div>
                      <span className="text-white/40 block text-[10px]">Admin:</span>
                      <span className="font-bold text-white">
                        {initReport?.stepResults.adminCreated ? "Criado com Sucesso" : "Preservado"}
                      </span>
                    </div>

                    <div>
                      <span className="text-white/40 block text-[10px]">Planos Comerciais:</span>
                      <span className="font-bold text-white">
                        {initReport?.stepResults.plansSyncedCount} Ativos
                      </span>
                    </div>

                    <div>
                      <span className="text-white/40 block text-[10px]">Parâmetros Cinematográficos:</span>
                      <span className="font-bold text-white">
                        {initReport?.stepResults.parametersSyncedCount} Sincronizados
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setWizardStep(1);
                      setActiveSubTab("status");
                      handleTestCurrent();
                    }}
                    className="rounded-xl bg-white/10 hover:bg-white/20 px-5 py-2.5 text-xs font-semibold text-white transition"
                  >
                    Retornar ao Painel de Status
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

