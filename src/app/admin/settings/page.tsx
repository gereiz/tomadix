"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { GeneralSettings, DEFAULT_GENERAL_SETTINGS } from "@/modules/admin/platform-settings.service";
import { AdminDatabaseManager } from "@/components/admin/admin-database-manager";

function AdminSettingsContent() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as any) || "features";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Settings state
  const [settings, setSettings] = useState<GeneralSettings>(DEFAULT_GENERAL_SETTINGS);
  const [originalSettings, setOriginalSettings] = useState<GeneralSettings>(DEFAULT_GENERAL_SETTINGS);

  // Active Category Tab
  const [activeTab, setActiveTab] = useState<"features" | "cleanup" | "database" | "platform" | "maintenance" | "diagnostics">(initialTab);

  // Test data cleanup states
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [cleanupModalOpen, setCleanupModalOpen] = useState(false);
  const [confirmationPhrase, setConfirmationPhrase] = useState("");
  const [cleaning, setCleaning] = useState(false);
  const [cleanupReport, setCleanupReport] = useState<any>(null);

  // Diagnostics states
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);
  const [diagnosticsData, setDiagnosticsData] = useState<any>(null);

  const loadSettings = () => {
    setLoading(true);
    fetch("/api/admin/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.settings) {
          setSettings(data.settings);
          setOriginalSettings(data.settings);
        }
      })
      .catch(() => {
        setFeedback({
          type: "error",
          message: "Falha ao carregar as configurações gerais.",
        });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleChange = (field: keyof GeneralSettings, value: any) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro ao salvar.");

      setSettings(data.settings);
      setOriginalSettings(data.settings);
      setFeedback({
        type: "success",
        message: "Configurações gerais atualizadas com sucesso no banco de dados!",
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || "Erro ao salvar configurações gerais.",
      });
    } finally {
      setSaving(false);
    }
  };

  // 1. Analisar dados de teste (Etapa 5.1.2)
  const handleAnalyzeTestData = async () => {
    setAnalyzing(true);
    setFeedback(null);
    setCleanupReport(null);
    try {
      const res = await fetch("/api/admin/settings/cleanup/analyze", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro ao analisar dados.");

      setAnalysisResult(data.analysis);
      setFeedback({
        type: "success",
        message: "Auditoria de dados de teste concluída com sucesso!",
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || "Erro ao analisar dados de teste.",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  // 2. Executar limpeza de dados de teste (Etapa 5.1.4)
  const handleExecuteCleanup = async () => {
    if (confirmationPhrase !== "EXCLUIR DADOS DE TESTE") {
      alert("Digite exatamente a frase solicitada para autorizar a limpeza.");
      return;
    }

    setCleaning(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/settings/cleanup/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmationPhrase }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro ao executar limpeza.");

      setCleanupReport(data.report);
      setCleanupModalOpen(false);
      setConfirmationPhrase("");
      setAnalysisResult(null);
      setFeedback({
        type: "success",
        message: "Limpeza de dados de teste executada com sucesso! Relatório gerado abaixo.",
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || "Falha na exclusão de dados de teste.",
      });
    } finally {
      setCleaning(false);
    }
  };

  // 3. Executar diagnósticos do sistema (Etapa 7.4)
  const handleRunDiagnostics = async () => {
    setDiagnosticsLoading(true);
    try {
      const res = await fetch("/api/admin/settings/diagnostics");
      const data = await res.json();
      if (res.ok) {
        setDiagnosticsData(data.diagnostics);
      }
    } catch (err) {
      console.error("Falha ao rodar diagnósticos:", err);
    } finally {
      setDiagnosticsLoading(false);
    }
  };

  const hasUnsavedChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-24 rounded-2xl bg-white/5 border border-white/10" />
        <div className="h-96 rounded-2xl bg-white/5 border border-white/10" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-slate-900 to-indigo-950/20 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-mono font-semibold tracking-wider text-amber-400 uppercase">
              Operações & Governança
            </span>
            {hasUnsavedChanges && (
              <span className="rounded bg-amber-400/20 border border-amber-400/40 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                Alterações não salvas
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Configurações Gerais da Plataforma
          </h1>
          <p className="text-sm text-white/60 mt-1 max-w-2xl">
            Gerenciamento de parâmetros operacionais, modo de manutenção, avisos globais e ferramenta segura de limpeza de dados de teste.
          </p>
        </div>

        {activeTab !== "cleanup" && activeTab !== "diagnostics" && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !hasUnsavedChanges}
            className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-black transition hover:bg-amber-300 shadow-md shadow-amber-500/10 disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar Configurações"}
          </button>
        )}
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`rounded-xl border p-4 text-xs font-medium flex items-center justify-between ${
            feedback.type === "success"
              ? "border-primary/30 bg-primary/30 text-primary"
              : "border-rose-500/30 bg-rose-950/30 text-rose-300"
          }`}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="ml-4 text-white/50 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Categories Navigation */}
      <div className="flex border-b border-white/10 gap-2 pb-1 overflow-x-auto no-scrollbar">
        {[
          { id: "features", label: "Recursos de IA", icon: "🎞️" },
          { id: "database", label: "Banco de Dados & Infra", icon: "🗄️" },
          { id: "cleanup", label: "Limpeza de Dados de Teste", icon: "🧹" },
          { id: "platform", label: "Informações da Plataforma", icon: "ℹ️" },
          { id: "maintenance", label: "Operação & Manutenção", icon: "⚙️" },
          { id: "diagnostics", label: "Diagnóstico & Desempenho", icon: "🩺" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setActiveTab(tab.id as any);
              if (tab.id === "diagnostics" && !diagnosticsData) {
                handleRunDiagnostics();
              }
            }}
            className={`pb-2.5 px-3.5 text-xs font-semibold transition border-b-2 whitespace-nowrap flex items-center gap-2 ${
              activeTab === tab.id
                ? "border-amber-400 text-amber-300"
                : "border-transparent text-white/50 hover:text-white"
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* CATEGORY F: RECURSOS DE IA (geração de imagens e vídeos) */}
      {activeTab === "features" && (
        <div className="rounded-2xl border border-white/10 bg-[#0d111c] p-6 space-y-5">
          <h2 className="text-sm font-bold text-white border-b border-white/10 pb-3">
            Geração de Imagens e Vídeos por IA
          </h2>

          {(
            [
              {
                key: "imageGenerationEnabled",
                title: "Imagens por IA",
                description: "Liberar a geração de imagens para os usuários",
              },
              {
                key: "videoGenerationEnabled",
                title: "Vídeos por IA",
                description: "Liberar a geração de vídeos para os usuários",
              },
            ] as const
          ).map((item) => {
            const draft = settings.featureFlags[item.key] === true;
            const saved = originalSettings.featureFlags[item.key] === true;
            return (
              <div key={item.key} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-black/30 p-4">
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="text-xs text-white/60">{item.description}</p>
                  <p className="text-xs text-white/60">
                    Situação salva:{" "}
                    <strong className={saved ? "text-emerald-300" : "text-amber-300"}>{saved ? "Ligada" : "Desligada"}</strong>
                    {draft !== saved && " (alteração pendente: clique em Salvar Configurações)"}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={draft}
                  aria-label={item.title}
                  onClick={() =>
                    handleChange("featureFlags", {
                      ...settings.featureFlags,
                      [item.key]: !draft,
                    })
                  }
                  className="flex min-h-11 min-w-11 items-center justify-center"
                >
                  <span className={`relative inline-flex h-7 w-12 rounded-full transition ${draft ? "bg-amber-400" : "bg-white/20"}`}>
                    <span
                      className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${
                        draft ? "left-[1.375rem]" : "left-0.5"
                      }`}
                    />
                  </span>
                </button>
              </div>
            );
          })}

          <ul className="list-disc space-y-1.5 pl-5 text-xs leading-relaxed text-white/60">
            <li>Cada chave é independente: dá para liberar só imagens ou só vídeos. Desligada, as telas, botões e menções daquele tipo somem para os usuários e a API recusa a geração.</li>
            <li>Continuam ativos: prompts de imagem/vídeo (texto), Análise de imagem e as imagens já geradas (voltam ao religar).</li>
            <li>A mudança vale em até 15 segundos para a API e no próximo carregamento de página para a interface.</li>
            <li>Configure provedores, modelos e preços antes de ligar: eles continuam acessíveis com a chave desligada.</li>
          </ul>

          <div className="flex flex-wrap gap-2 text-xs">
            <Link href="/admin/settings/image-providers" className="rounded-lg border border-white/10 px-3 py-1.5 text-white/80 hover:bg-white/10">
              APIs de Imagem
            </Link>
            <Link href="/admin/settings/video-providers" className="rounded-lg border border-white/10 px-3 py-1.5 text-white/80 hover:bg-white/10">
              APIs de Vídeo
            </Link>
            <Link href="/admin/settings/pollinations" className="rounded-lg border border-white/10 px-3 py-1.5 text-white/80 hover:bg-white/10">
              Central Pollinations
            </Link>
            <Link href="/admin/credits" className="rounded-lg border border-white/10 px-3 py-1.5 text-white/80 hover:bg-white/10">
              Tabela de Créditos
            </Link>
          </div>
        </div>
      )}

      {/* CATEGORY 0: GESTÃO DE BANCO DE DADOS E INFRAESTRUTURA */}
      {activeTab === "database" && <AdminDatabaseManager />}

      {/* CATEGORY 1: DADOS DE TESTE E LIMPEZA SEGURA (ETAPA 5.1) */}
      {activeTab === "cleanup" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-[#0d111c] p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>🧹</span> Ferramenta de Limpeza de Dados de Desenvolvimento
                </h2>
                <p className="text-xs text-white/50 mt-1 max-w-2xl">
                  Identifica e remove confiavelmente registros de teste gerados por suítes de teste automatizadas (@example.com, @cineprompt.ai, gateways de teste), garantindo a preservação absoluta de todos os usuários reais, seus estúdios e projetos.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleAnalyzeTestData}
                  disabled={analyzing}
                  className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {analyzing ? "Analisando Banco..." : "🔍 Analisar Dados de Teste"}
                </button>

                {analysisResult && (
                  <button
                    type="button"
                    onClick={() => setCleanupModalOpen(true)}
                    disabled={!analysisResult.canExecute}
                    className="rounded-xl bg-rose-500/20 border border-rose-500/40 px-4 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/30 transition disabled:opacity-30"
                  >
                    🗑️ Excluir Dados Identificados
                  </button>
                )}
              </div>
            </div>

            {/* Analysis Overview Cards if analyzed */}
            {analysisResult && (
              <div className="space-y-6 animate-fade-in">
                {/* Status Callout */}
                <div className="rounded-xl border border-primary/30 bg-primary/20 p-4 flex items-start gap-3">
                  <span className="text-xl">🛡️</span>
                  <div>
                    <h3 className="text-xs font-bold text-primary">
                      Critérios Auditados e Classificação Concluída
                    </h3>
                    <p className="text-[11px] text-white/70 mt-1 leading-relaxed">
                      Foram localizados <strong>{analysisResult.eligibleTestData.total}</strong> registros elegíveis para exclusão. Os <strong>{analysisResult.preservedRealData.usersCount} usuários reais</strong> e seus <strong>{analysisResult.preservedRealData.projectsCount} projetos</strong> estão protegidos e não sofrerão nenhuma alteração.
                    </p>
                  </div>
                </div>

                {/* Grid Comparison: Test Data vs Real Data Preserved */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Test Data Eligible */}
                  <div className="rounded-xl border border-rose-500/20 bg-rose-950/10 p-5 space-y-3">
                    <span className="text-xs font-mono font-bold text-rose-400 uppercase tracking-wider">
                      Identificados para Limpeza ({analysisResult.eligibleTestData.total})
                    </span>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-black/40 border border-white/5 p-3 rounded-lg">
                        <span className="text-white/40 block text-[11px]">Usuários de Teste:</span>
                        <strong className="text-white text-base">{analysisResult.eligibleTestData.usersCount}</strong>
                      </div>
                      <div className="bg-black/40 border border-white/5 p-3 rounded-lg">
                        <span className="text-white/40 block text-[11px]">Estúdios de Teste:</span>
                        <strong className="text-white text-base">{analysisResult.eligibleTestData.workspacesCount}</strong>
                      </div>
                      <div className="bg-black/40 border border-white/5 p-3 rounded-lg">
                        <span className="text-white/40 block text-[11px]">Projetos de Teste:</span>
                        <strong className="text-white text-base">{analysisResult.eligibleTestData.projectsCount}</strong>
                      </div>
                      <div className="bg-black/40 border border-white/5 p-3 rounded-lg">
                        <span className="text-white/40 block text-[11px]">Gateways / Webhooks:</span>
                        <strong className="text-white text-base">
                          {analysisResult.eligibleTestData.gatewaysCount + analysisResult.eligibleTestData.webhooksCount}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Real Data Preserved */}
                  <div className="rounded-xl border border-primary/20 bg-primary/10 p-5 space-y-3">
                    <span className="text-xs font-mono font-bold text-primary uppercase tracking-wider">
                      Dados Reais Preservados (Intactos)
                    </span>
                    <div className="space-y-2 text-xs">
                      {analysisResult.preservedRealData.users.map((u: any) => (
                        <div key={u.email} className="flex items-center justify-between bg-black/40 border border-white/5 px-3 py-2 rounded-lg">
                          <div>
                            <span className="font-semibold text-white block">{u.displayName}</span>
                            <span className="text-[11px] font-mono text-white/40">{u.email}</span>
                          </div>
                          <span className="rounded bg-primary/20 px-2 py-0.5 text-[10px] text-primary font-mono">
                            {u.platformRole}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Post-cleanup Report if generated */}
            {cleanupReport && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-5 space-y-4 animate-fade-in">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h3 className="text-xs font-bold text-amber-300 flex items-center gap-2">
                    <span>📋</span> Relatório Oficial da Limpeza Executada
                  </h3>
                  <span className="text-[11px] font-mono text-white/40">
                    {new Date(cleanupReport.executedAt).toLocaleString("pt-BR")}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-black/40 p-3 rounded-lg">
                    <span className="text-white/40 block text-[10px]">Usuários Removidos:</span>
                    <strong className="text-amber-400 text-lg">{cleanupReport.summary.deletedUsers}</strong>
                  </div>
                  <div className="bg-black/40 p-3 rounded-lg">
                    <span className="text-white/40 block text-[10px]">Estúdios Removidos:</span>
                    <strong className="text-amber-400 text-lg">{cleanupReport.summary.deletedWorkspaces}</strong>
                  </div>
                  <div className="bg-black/40 p-3 rounded-lg">
                    <span className="text-white/40 block text-[10px]">Projetos Removidos:</span>
                    <strong className="text-amber-400 text-lg">{cleanupReport.summary.deletedProjects}</strong>
                  </div>
                  <div className="bg-black/40 p-3 rounded-lg">
                    <span className="text-white/40 block text-[10px]">Gateways Removidos:</span>
                    <strong className="text-amber-400 text-lg">{cleanupReport.summary.deletedGateways}</strong>
                  </div>
                </div>
                <p className="text-[11px] text-primary font-medium">
                  ✓ Ação registrada permanentemente na trilha de auditoria sob PLATFORM_TEST_DATA_CLEANUP.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CATEGORY 2: INFORMAÇÕES DA PLATAFORMA */}
      {activeTab === "platform" && (
        <div className="rounded-2xl border border-white/10 bg-[#0d111c] p-6 space-y-6">
          <h2 className="text-sm font-bold text-white border-b border-white/10 pb-3">
            Informações Institucionais e URLs Globais
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/70">Nome Oficial do SaaS</label>
              <input
                type="text"
                value={settings.platformName}
                onChange={(e) => handleChange("platformName", e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/70">E-mail Administrativo de Contato</label>
              <input
                type="email"
                value={settings.contactEmail}
                onChange={(e) => handleChange("contactEmail", e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/70">URL Pública da Aplicação</label>
              <input
                type="text"
                value={settings.publicUrl}
                onChange={(e) => handleChange("publicUrl", e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/70">URL da Central de Suporte</label>
              <input
                type="text"
                value={settings.supportUrl}
                onChange={(e) => handleChange("supportUrl", e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white/70">Descrição Geral da Plataforma</label>
            <textarea
              rows={3}
              value={settings.platformDescription}
              onChange={(e) => handleChange("platformDescription", e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* CATEGORY 3: OPERAÇÃO E MANUTENÇÃO */}
      {activeTab === "maintenance" && (
        <div className="rounded-2xl border border-white/10 bg-[#0d111c] p-6 space-y-6">
          <h2 className="text-sm font-bold text-white border-b border-white/10 pb-3">
            Modo de Manutenção e Avisos Globais
          </h2>

          {/* Maintenance Mode Toggle */}
          <div className="rounded-xl border border-white/10 bg-black/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">Modo de Manutenção</span>
                <span className="text-[11px] text-white/40">
                  Bloqueia novos acessos de usuários comuns durante manutenções programadas.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.maintenanceMode}
                  onChange={(e) => handleChange("maintenanceMode", e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-400"></div>
              </label>
            </div>

            {settings.maintenanceMode && (
              <div className="pt-2 space-y-1.5">
                <label className="text-xs font-semibold text-white/70">Mensagem de Manutenção</label>
                <input
                  type="text"
                  value={settings.maintenanceMessage}
                  onChange={(e) => handleChange("maintenanceMessage", e.target.value)}
                  className="w-full rounded-xl border border-amber-500/30 bg-amber-950/20 px-3.5 py-2 text-xs text-amber-200 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Global Announcement Banner */}
          <div className="rounded-xl border border-white/10 bg-black/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">Faixa de Comunicado Global (Banner)</span>
                <span className="text-[11px] text-white/40">
                  Exibe um banner no topo para todos os usuários logados.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.announcementBanner.enabled}
                  onChange={(e) =>
                    handleChange("announcementBanner", {
                      ...settings.announcementBanner,
                      enabled: e.target.checked,
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            {settings.announcementBanner.enabled && (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
                <div className="sm:col-span-3 space-y-1">
                  <label className="text-xs font-semibold text-white/70">Texto do Anúncio</label>
                  <input
                    type="text"
                    value={settings.announcementBanner.message}
                    onChange={(e) =>
                      handleChange("announcementBanner", {
                        ...settings.announcementBanner,
                        message: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-white/10 bg-black/50 px-3.5 py-2 text-xs text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white/70">Tipo de Alerta</label>
                  <select
                    value={settings.announcementBanner.type}
                    onChange={(e) =>
                      handleChange("announcementBanner", {
                        ...settings.announcementBanner,
                        type: e.target.value as any,
                      })
                    }
                    className="w-full rounded-xl border border-white/10 bg-black/50 px-3.5 py-2 text-xs text-white"
                  >
                    <option value="info">Informativo (Azul)</option>
                    <option value="warning">Aviso (Amarelo)</option>
                    <option value="alert">Crítico (Vermelho)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Feature Flags */}
          <div className="rounded-xl border border-white/10 bg-black/30 p-4 space-y-4">
            <span className="text-xs font-bold text-white block">Módulos Opcionais (Feature Flags)</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {[
                { key: "registrationEnabled", label: "Auto-Cadastro de Novos Usuários" },
                { key: "cinematicStudioEnabled", label: "Estúdio Multimodal de Análise de Imagens" },
                { key: "visualLibraryEnabled", label: "Biblioteca Visual de Referências" },
                { key: "advancedParametersEnabled", label: "Parâmetros Cinematográficos Avançados" },
              ].map((flag) => (
                <label key={flag.key} className="flex items-center justify-between p-2.5 rounded-lg border border-white/5 bg-black/20 hover:bg-black/40 cursor-pointer">
                  <span className="text-white/80">{flag.label}</span>
                  <input
                    type="checkbox"
                    checked={(settings.featureFlags as any)[flag.key] ?? true}
                    onChange={(e) =>
                      handleChange("featureFlags", {
                        ...settings.featureFlags,
                        [flag.key]: e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded border-white/20 bg-black text-amber-400 focus:ring-0"
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CATEGORY 4: DIAGNÓSTICO E DESEMPENHO */}
      {activeTab === "diagnostics" && (
        <div className="rounded-2xl border border-white/10 bg-[#0d111c] p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h2 className="text-sm font-bold text-white">Saúde e Diagnóstico da Infraestrutura</h2>
              <p className="text-xs text-white/50">Métricas operacionais reais de banco e servidor</p>
            </div>
            <button
              type="button"
              onClick={handleRunDiagnostics}
              disabled={diagnosticsLoading}
              className="rounded-xl border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-white/10 transition"
            >
              {diagnosticsLoading ? "Testando..." : "↻ Atualizar Diagnóstico"}
            </button>
          </div>

          {diagnosticsData && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-white/10 bg-black/30 p-4 space-y-2">
                <span className="text-xs text-white/50 font-medium">Banco de Dados (PostgreSQL)</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-bold text-primary">{diagnosticsData.database.status}</span>
                  <span className="text-xs font-mono text-white/60">{diagnosticsData.database.latencyMs} ms</span>
                </div>
                <p className="text-[11px] text-white/40">{diagnosticsData.database.provider}</p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/30 p-4 space-y-2">
                <span className="text-xs text-white/50 font-medium">Ambiente Node.js</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-bold text-white">{diagnosticsData.system.nodeVersion}</span>
                  <span className="text-xs font-mono text-white/60">{diagnosticsData.system.platform}</span>
                </div>
                <p className="text-[11px] text-white/40">Uptime: {diagnosticsData.system.uptimeSeconds}s</p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/30 p-4 space-y-2">
                <span className="text-xs text-white/50 font-medium">Memória do Processo</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-bold text-amber-300">
                    {diagnosticsData.system.memory.heapUsedMb} MB
                  </span>
                  <span className="text-xs font-mono text-white/60">
                    de {diagnosticsData.system.memory.heapTotalMb} MB
                  </span>
                </div>
                <p className="text-[11px] text-white/40">RSS: {diagnosticsData.system.memory.rssMb} MB</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Safety Confirmation Modal for Test Data Cleanup */}
      {cleanupModalOpen && (
        <div className="fixed inset-0 overflow-y-auto z-50 flex items-center-safe justify-center bg-black/80 p-3 sm:p-4">
          <div className="w-full max-w-lg rounded-2xl border border-rose-500/40 bg-[#0d111c] p-6 shadow-2xl space-y-5 animate-scale-up">
            <div className="flex items-center gap-3 text-rose-400">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="text-base font-bold text-white">Confirmação de Segurança Requerida</h3>
                <p className="text-xs text-rose-300">Exclusão irreversível de registros de teste identificados</p>
              </div>
            </div>

            <p className="text-xs text-white/70 leading-relaxed">
              Esta ação removerá permanentemente os <strong>{analysisResult?.eligibleTestData?.total || 0}</strong> registros de teste identificados pela auditoria. Todos os 4 usuários reais e seus 8 projetos permanecerão 100% intactos.
            </p>

            <div className="rounded-xl border border-white/10 bg-black/50 p-4 space-y-2">
              <label className="text-xs text-white/60 block">
                Para autorizar a operação, digite exatamente a frase abaixo:
              </label>
              <div className="font-mono text-xs font-bold text-amber-300 select-all">
                EXCLUIR DADOS DE TESTE
              </div>
              <input
                type="text"
                value={confirmationPhrase}
                onChange={(e) => setConfirmationPhrase(e.target.value)}
                placeholder="Digite a frase aqui..."
                className="w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-xs font-mono text-white focus:border-rose-400 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setCleanupModalOpen(false);
                  setConfirmationPhrase("");
                }}
                disabled={cleaning}
                className="rounded-xl border border-white/15 px-4 py-2 text-xs font-medium text-white/70 hover:bg-white/10"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteCleanup}
                disabled={cleaning || confirmationPhrase !== "EXCLUIR DADOS DE TESTE"}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500 transition disabled:opacity-40"
              >
                {cleaning ? "Executando Limpeza..." : "Confirmar e Excluir Dados"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminSettingsPage() {
  return (
    <Suspense fallback={<div className="h-64 rounded-2xl bg-white/5 animate-pulse" />}>
      <AdminSettingsContent />
    </Suspense>
  );
}

