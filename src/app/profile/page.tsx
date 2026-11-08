"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ToastNotification } from "@/components/ui/toast";
import { applyDomTheme, ThemeMode } from "@/components/theme/theme-toggle";

interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  emailConfirmed: boolean;
  preferences: {
    theme?: ThemeMode;
    compactView?: boolean;
    defaultViewMode?: "cards" | "table";
    language?: "pt-BR" | "en-US";
    emailNotifications?: boolean;
    billingAlerts?: boolean;
    teamInvites?: boolean;
    productUpdates?: boolean;
    defaultPlatform?: string;
    defaultAspectRatio?: string;
    defaultColorGrade?: string;
  };
  createdAt: string;
  memberships: Array<{
    workspaceId: string;
    workspace: {
      id: string;
      name: string;
      slug: string;
      isPersonal: boolean;
    };
  }>;
}

interface SessionItem {
  id: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

type TabType = "account" | "preferences" | "notifications" | "sessions" | "privacy";

export default function ProfilePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("account");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Notificações Toast
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: "success" | "error" | "warning" | "info";
  } | null>(null);

  const showToast = useCallback(
    (text: string, type: "success" | "error" | "warning" | "info" = "success") => {
      setToastMessage({ text, type });
      setTimeout(() => setToastMessage(null), 5000);
    },
    []
  );

  // Formulário de perfil
  const [displayName, setDisplayName] = useState("");

  // Formulário de senha
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Preferências
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [defaultViewMode, setDefaultViewMode] = useState<"cards" | "table">("cards");
  const [compactView, setCompactView] = useState(false);
  const [language, setLanguage] = useState<"pt-BR" | "en-US">("pt-BR");
  const [defaultPlatform, setDefaultPlatform] = useState("Google Flow");
  const [defaultAspectRatio, setDefaultAspectRatio] = useState("16:9");
  const [defaultColorGrade, setDefaultColorGrade] = useState("");

  // Notificações
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [billingAlerts, setBillingAlerts] = useState(true);
  const [teamInvites, setTeamInvites] = useState(true);
  const [productUpdates, setProductUpdates] = useState(false);

  // Modal de Exclusão de Conta
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");

  // Carregar dados
  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const [profRes, sessRes] = await Promise.all([
        fetch("/api/users/profile"),
        fetch("/api/users/sessions"),
      ]);

      if (!profRes.ok) {
        if (profRes.status === 401) {
          router.push("/login");
          return;
        }
        throw new Error("Erro ao carregar perfil.");
      }

      const profData = await profRes.json();
      const p: UserProfile = profData.data;
      setProfile(p);
      setDisplayName(p.displayName || "");

      const prefs = p.preferences || {};
      const savedLocalTheme =
        (typeof window !== "undefined" ? (localStorage.getItem("tomadix_theme") as ThemeMode | null) : null) ||
        prefs.theme ||
        "dark";
      setTheme(savedLocalTheme);
      setDefaultViewMode(prefs.defaultViewMode || "cards");
      setCompactView(Boolean(prefs.compactView));
      setLanguage(prefs.language || "pt-BR");
      setDefaultPlatform(prefs.defaultPlatform || "Google Flow");
      setDefaultAspectRatio(prefs.defaultAspectRatio || "16:9");
      setDefaultColorGrade(prefs.defaultColorGrade || "");

      setEmailNotifications(prefs.emailNotifications !== false);
      setBillingAlerts(prefs.billingAlerts !== false);
      setTeamInvites(prefs.teamInvites !== false);
      setProductUpdates(Boolean(prefs.productUpdates));

      if (sessRes.ok) {
        const sessData = await sessRes.json();
        setSessions(sessData.data || []);
      }
    } catch (err: any) {
      showToast(err.message || "Erro ao carregar dados.", "error");
    } finally {
      setLoading(false);
    }
  }, [router, showToast]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Salvar Nome de Exibição
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao salvar nome.");
      showToast("Nome de exibição atualizado com sucesso!", "success");
      loadProfile();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Salvar Preferências e Notificações
  const handleSavePreferences = async () => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferences: {
            theme,
            defaultViewMode,
            compactView,
            language,
            defaultPlatform,
            defaultAspectRatio,
            defaultColorGrade,
            emailNotifications,
            billingAlerts,
            teamInvites,
            productUpdates,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao salvar preferências.");
      showToast("Preferências salvas com sucesso!", "success");
      loadProfile();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Alterar Senha
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast("A confirmação da nova senha não confere.", "error");
      return;
    }
    if (newPassword.length < 8) {
      showToast("A nova senha deve ter no mínimo 8 caracteres.", "error");
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch("/api/users/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao alterar senha.");

      showToast("Senha alterada com sucesso! Outras sessões foram revogadas.", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      loadProfile();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Revogar Sessão Individual
  const handleRevokeSession = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/users/sessions/${sessionId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao encerrar sessão.");
      showToast("Sessão encerrada com sucesso.", "success");
      loadProfile();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Revogar Outras Sessões
  const handleRevokeOtherSessions = async () => {
    try {
      const res = await fetch("/api/users/sessions/revoke-others", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao encerrar outras sessões.");
      showToast(data.message || "Outras sessões encerradas.", "success");
      loadProfile();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Excluir Conta
  const handleDeleteAccount = async () => {
    if (deleteConfirmationText !== "EXCLUIR MINHA CONTA") {
      showToast('Digite exatamente "EXCLUIR MINHA CONTA" para confirmar.', "error");
      return;
    }
    if (!deletePassword) {
      showToast("Digite sua senha para confirmar a exclusão.", "error");
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch("/api/users/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passwordConfirmation: deletePassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao excluir conta.");

      alert("Sua conta foi excluída com sucesso.");
      router.push("/login");
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh bg-[#0b0d12] text-white">
        <div className="flex min-h-[60dvh] items-center justify-center text-sm text-white/50">
          Carregando configurações da conta...
        </div>
      </div>
    );
  }

  const initials = (profile?.displayName || profile?.email || "U")
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-dvh bg-[#0b0d12] text-white">
      <main className="w-full px-4 sm:px-6 lg:px-8 py-10">
        {/* Cabeçalho do Perfil */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-white/10 pb-8">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-secondary font-bold text-on-primary text-xl shadow-lg shadow-primary/20">
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  {profile?.displayName || "Meu Perfil"}
                </h1>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                    profile?.emailConfirmed
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                  }`}
                >
                  {profile?.emailConfirmed ? "✓ Verificado" : "Confirmação Pendente"}
                </span>
              </div>
              <p className="text-xs text-white/50 mt-0.5">{profile?.email}</p>
              <p className="text-[11px] text-white/30 mt-1">
                Membro desde {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("pt-BR") : "2026"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="rounded-xl border border-white/15 px-4 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 hover:text-white transition"
            >
              Ir ao Dashboard
            </button>
          </div>
        </div>

        {/* Barra de Navegação por Abas */}
        <div className="mt-8 flex overflow-x-auto border-b border-white/10 gap-2 pb-px scrollbar-none">
          {[
            { id: "account", label: "Conta & Segurança", icon: "👤" },
            { id: "preferences", label: "Preferências & Produção", icon: "⚙️" },
            { id: "notifications", label: "Notificações", icon: "🔔" },
            { id: "sessions", label: `Sessões Ativas (${sessions.length})`, icon: "💻" },
            { id: "privacy", label: "Privacidade & LGPD", icon: "🛡️" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 rounded-t-2xl px-5 py-3 text-xs font-semibold whitespace-nowrap transition border-b-2 ${
                activeTab === tab.id
                  ? "border-primary text-primary bg-white/[0.03]"
                  : "border-transparent text-white/50 hover:text-white hover:bg-white/[0.01]"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Conteúdo das Abas */}
        <div className="mt-8">
          {/* Aba 1: Conta & Segurança */}
          {activeTab === "account" && (
            <div className="grid gap-5 sm:gap-8 lg:grid-cols-2">
              {/* Card de Informações da Conta */}
              <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6">
                <h3 className="text-base font-bold text-white">Dados da Conta</h3>
                <p className="text-xs text-white/50 mt-1">Como seu nome é visto pelos colaboradores.</p>

                <form onSubmit={handleSaveProfile} className="mt-6 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-white/70">Nome de Exibição</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Seu nome ou pseudônimo de diretor"
                      className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2 text-xs text-white focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-white/70">Endereço de E-mail</label>
                    <input
                      type="email"
                      disabled
                      value={profile?.email || ""}
                      className="mt-1.5 w-full rounded-xl border border-white/5 bg-black/20 px-3.5 py-2 text-xs text-white/40 cursor-not-allowed"
                    />
                    <p className="mt-1 text-[11px] text-white/40">
                      O e-mail é o identificador único para login e faturamento.
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-on-primary hover:opacity-90 transition disabled:opacity-50 shadow-md shadow-primary/20"
                    >
                      Salvar Alterações
                    </button>
                  </div>
                </form>
              </div>

              {/* Card de Alteração de Senha Segura */}
              <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6">
                <h3 className="text-base font-bold text-white">Segurança & Senha</h3>
                <p className="text-xs text-white/50 mt-1">
                  Atualize sua senha criptografada (revogará outras sessões ativas).
                </p>

                <form onSubmit={handleChangePassword} className="mt-6 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-white/70">Senha Atual</label>
                    <input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2 text-xs text-white focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-white/70">Nova Senha</label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo de 8 caracteres"
                      className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2 text-xs text-white focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-white/70">Confirmar Nova Senha</label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2 text-xs text-white focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="rounded-xl border border-white/15 px-5 py-2 text-xs font-bold text-white hover:bg-white/10 transition disabled:opacity-50"
                    >
                      Atualizar Senha
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Aba 2: Preferências & Produção */}
          {activeTab === "preferences" && (
            <div className="space-y-8">
              {/* Preferências de Interface */}
              <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6">
                <h3 className="text-base font-bold text-white">Preferências de Interface</h3>
                <p className="text-xs text-white/50 mt-1">Personalize sua experiência visual no estúdio.</p>

                <div className="mt-6 grid gap-6 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-semibold text-white/70">Visualização de Projetos</label>
                    <select
                      value={defaultViewMode}
                      onChange={(e: any) => setDefaultViewMode(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white focus:border-primary focus:outline-none"
                    >
                      <option value="cards">Grade de Cartões (Visual)</option>
                      <option value="table">Tabela Compacta (Lista)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-white/70">Tema Visual</label>
                    <select
                      value={theme}
                      onChange={(e: any) => {
                        const nextMode = e.target.value as ThemeMode;
                        setTheme(nextMode);
                        try {
                          localStorage.setItem("tomadix_theme", nextMode);
                        } catch {}
                        applyDomTheme(nextMode);
                        window.dispatchEvent(new CustomEvent("tomadix:theme-changed", { detail: nextMode }));
                      }}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white focus:border-primary focus:outline-none"
                    >
                      <option value="system">💻 Seguir Sistema Operacional (Auto)</option>
                      <option value="light">☀️ Modo Claro</option>
                      <option value="dark">🌙 Modo Escuro Cinema</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-white/70">Idioma da Plataforma</label>
                    <select
                      value={language}
                      onChange={(e: any) => setLanguage(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white focus:border-primary focus:outline-none"
                    >
                      <option value="pt-BR">Português (Brasil)</option>
                      <option value="en-US">English (US)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Preferências Cinematográficas Padrão */}
              <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6">
                <h3 className="text-base font-bold text-white">Padrões de Produção Cinematográfica</h3>
                <p className="text-xs text-white/50 mt-1">
                  Valores pré-preenchidos ao criar novos projetos ou cenas.
                </p>

                <div className="mt-6 grid gap-6 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-semibold text-white/70">Plataforma-Alvo Preferida</label>
                    <select
                      value={defaultPlatform}
                      onChange={(e) => setDefaultPlatform(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white focus:border-primary focus:outline-none"
                    >
                      <option value="Google Flow">Google Flow</option>
                      <option value="OpenAI Sora">OpenAI Sora</option>
                      <option value="Runway Gen-3">Runway Gen-3</option>
                      <option value="Midjourney v6">Midjourney v6</option>
                      <option value="Kling AI">Kling AI</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-white/70">Proporção de Tela Padrão</label>
                    <select
                      value={defaultAspectRatio}
                      onChange={(e) => setDefaultAspectRatio(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white focus:border-primary focus:outline-none"
                    >
                      <option value="16:9">16:9 (Cinema / Vídeo)</option>
                      <option value="2.39:1">2.39:1 (Anamórfico Widescreen)</option>
                      <option value="9:16">9:16 (Vertical / Reels)</option>
                      <option value="4:3">4:3 (Retrô / Academy)</option>
                      <option value="1:1">1:1 (Quadrado)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-white/70">Color Grading Recorrente</label>
                    <input
                      type="text"
                      value={defaultColorGrade}
                      onChange={(e) => setDefaultColorGrade(e.target.value)}
                      placeholder="Ex: Kodachrome 64, Bleach Bypass..."
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
                  <button
                    onClick={handleSavePreferences}
                    disabled={actionLoading}
                    className="rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-on-primary hover:opacity-90 transition shadow-md shadow-primary/20"
                  >
                    Salvar Preferências
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Aba 3: Notificações */}
          {activeTab === "notifications" && (
            <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 w-full">
              <h3 className="text-base font-bold text-white">Canais de Notificação</h3>
              <p className="text-xs text-white/50 mt-1">Escolha quais comunicações você deseja receber.</p>

              <div className="mt-6 divide-y divide-white/10">
                <div className="flex items-center justify-between py-4">
                  <div>
                    <h4 className="text-xs font-bold text-white">Alertas de Créditos Baixos</h4>
                    <p className="text-[11px] text-white/50">
                      Receba aviso quando seu saldo de créditos de IA estiver próximo do fim.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={billingAlerts}
                    onChange={(e) => setBillingAlerts(e.target.checked)}
                    className="h-4 w-4 rounded accent-primary cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between py-4">
                  <div>
                    <h4 className="text-xs font-bold text-white">Convites de Estúdio e Equipe</h4>
                    <p className="text-[11px] text-white/50">
                      Avisos quando outros cineastas convidarem você para seus workspaces.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={teamInvites}
                    onChange={(e) => setTeamInvites(e.target.checked)}
                    className="h-4 w-4 rounded accent-primary cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between py-4">
                  <div>
                    <h4 className="text-xs font-bold text-white">Notificações por E-mail</h4>
                    <p className="text-[11px] text-white/50">
                      Resumos semanais e avisos críticos de integridade da conta.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailNotifications}
                    onChange={(e) => setEmailNotifications(e.target.checked)}
                    className="h-4 w-4 rounded accent-primary cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between py-4">
                  <div>
                    <h4 className="text-xs font-bold text-white">Novidades e Lançamentos de Modelos</h4>
                    <p className="text-[11px] text-white/50">
                      Fique sabendo em primeira mão quando novos modelos (Sora, Flow, Kling) forem integrados.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={productUpdates}
                    onChange={(e) => setProductUpdates(e.target.checked)}
                    className="h-4 w-4 rounded accent-primary cursor-pointer"
                  />
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
                <button
                  onClick={handleSavePreferences}
                  disabled={actionLoading}
                  className="rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-on-primary hover:opacity-90 transition shadow-md shadow-primary/20"
                >
                  Salvar Preferências
                </button>
              </div>
            </div>
          )}

          {/* Aba 4: Sessões Ativas */}
          {activeTab === "sessions" && (
            <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-white">Sessões Ativas</h3>
                  <p className="text-xs text-white/50 mt-1">
                    Dispositivos e navegadores com acesso autorizado à sua conta.
                  </p>
                </div>
                {sessions.length > 1 && (
                  <button
                    onClick={handleRevokeOtherSessions}
                    className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition self-start sm:self-auto"
                  >
                    Encerrar Outras Sessões
                  </button>
                )}
              </div>

              <div className="mt-6 divide-y divide-white/10 rounded-2xl border border-white/10 bg-black/40 overflow-hidden">
                {sessions.map((sess) => (
                  <div key={sess.id} className="flex items-center justify-between p-4 text-xs">
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-lg">
                        {sess.userAgent.includes("Mobile") ? "📱" : "💻"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-white max-w-md truncate">
                            {sess.userAgent}
                          </p>
                          {sess.isCurrent && (
                            <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary border border-primary/30">
                              Esta Sessão
                            </span>
                          )}
                        </div>
                        <p className="text-white/40 mt-0.5 text-[11px]">
                          IP: {sess.ipAddress} • Conectado em:{" "}
                          {new Date(sess.createdAt).toLocaleString("pt-BR")}
                        </p>
                      </div>
                    </div>

                    {!sess.isCurrent && (
                      <button
                        onClick={() => handleRevokeSession(sess.id)}
                        className="rounded-xl border border-white/15 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/10 transition"
                      >
                        Encerrar
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Aba 5: Privacidade & LGPD */}
          {activeTab === "privacy" && (
            <div className="space-y-8 w-full">
              {/* Exportação de Dados Pessoais */}
              <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-white">Exportação de Dados Pessoais</h3>
                    <p className="text-xs text-white/60 mt-1 leading-relaxed">
                      Em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018) e GDPR (Artigo 20), você pode baixar a qualquer momento uma cópia integral dos seus dados cadastrais, preferências, filiações de workspace, metadados de projetos e registros de auditoria em formato JSON legível por máquina.
                    </p>
                    <div className="mt-4">
                      <a
                        href="/api/users/export-data"
                        download
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-blue-400 shadow-md shadow-blue-500/20"
                      >
                        <span>Exportar Meus Dados (JSON)</span>
                        <span>↓</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Zona de Perigo: Exclusão de Conta */}
              <div className="rounded-3xl border border-red-500/30 bg-red-950/20 p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-500/20 text-red-400 border border-red-500/30">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-red-400">Exclusão Permanente da Conta</h3>
                    <p className="text-xs text-white/70 mt-1 leading-relaxed">
                      A exclusão de conta é uma ação definitiva e irreversível. Antes de prosseguir, compreenda os efeitos:
                    </p>
                    <ul className="mt-3 space-y-1.5 text-xs text-white/60 list-disc list-inside">
                      <li>Seu estúdio pessoal, personagens, ambientes e cenas serão apagados permanentemente.</li>
                      <li>Assinaturas ativas no plano pessoal serão canceladas sem reembolso residual.</li>
                      <li>
                        Se você for o único proprietário de workspaces de equipe com outros colaboradores, deverá transferir a propriedade antes de excluir a conta.
                      </li>
                      <li>
                        Registros financeiros e notas fiscais de pagamentos anteriores serão preservados de forma anonimizada para estrito cumprimento de obrigações legais tributárias.
                      </li>
                    </ul>

                    <div className="mt-5">
                      <button
                        onClick={() => setIsDeleteModalOpen(true)}
                        className="rounded-xl bg-red-600 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-red-500 shadow-lg shadow-red-600/20"
                      >
                        Solicitar Exclusão da Conta
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal Seguro de Confirmação de Exclusão */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 overflow-y-auto z-50 flex items-center-safe justify-center bg-black/85 p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl border border-red-500/40 bg-[#120f12] p-6 sm:p-8 text-white shadow-2xl shadow-red-500/10">
            <div className="flex items-center gap-3 text-red-400">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/20 border border-red-500/30">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">Ação Irreversível</span>
                <h3 className="text-lg font-bold text-white">Confirmar Exclusão de Conta</h3>
              </div>
            </div>

            <p className="mt-4 text-xs text-white/70 leading-relaxed">
              Para confirmar que você tem plena ciência da perda irrevogável de seus dados e projetos, digite exatamente a frase abaixo:
            </p>

            <div className="mt-3 rounded-xl border border-white/10 bg-black/60 p-2.5 text-center font-mono text-xs font-bold text-red-300 select-all">
              EXCLUIR MINHA CONTA
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-white/70">Confirmação textual:</label>
                <input
                  type="text"
                  value={deleteConfirmationText}
                  onChange={(e) => setDeleteConfirmationText(e.target.value)}
                  placeholder="Digite EXCLUIR MINHA CONTA"
                  className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3.5 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70">Sua senha atual:</label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3.5 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeleteConfirmationText("");
                  setDeletePassword("");
                }}
                className="rounded-xl border border-white/15 px-4 py-2.5 text-xs font-medium text-white/70 hover:bg-white/10"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={actionLoading || deleteConfirmationText !== "EXCLUIR MINHA CONTA" || !deletePassword}
                onClick={handleDeleteAccount}
                className="rounded-xl bg-red-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-red-500 transition disabled:opacity-40"
              >
                {actionLoading ? "Excluindo..." : "Excluir Definitivamente"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Flutuante */}
      <ToastNotification
        message={toastMessage}
        onClose={() => setToastMessage(null)}
      />
    </div>
  );
}
