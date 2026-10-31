"use client";

import { useEffect, useState } from "react";
import { CustomizationSettings, DEFAULT_CUSTOMIZATION } from "@/modules/admin/platform-settings.service";

function toValidHex(val: string | undefined | null, fallback = "#000000"): string {
  if (!val) return fallback;
  const trimmed = val.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed;
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`;
  }
  return fallback;
}

export default function AdminCustomizationPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Initial and editable state
  const [settings, setSettings] = useState<CustomizationSettings>(DEFAULT_CUSTOMIZATION);
  const [originalSettings, setOriginalSettings] = useState<CustomizationSettings>(DEFAULT_CUSTOMIZATION);

  // Active tab in the customization screen
  const [activeTab, setActiveTab] = useState<"identity" | "colors" | "theme">("identity");

  useEffect(() => {
    fetch("/api/admin/customization")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.customization) {
          setSettings(data.customization);
          setOriginalSettings(data.customization);
        }
      })
      .catch(() => {
        setFeedback({
          type: "error",
          message: "Falha ao carregar as configurações de personalização.",
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (field: keyof CustomizationSettings, value: any) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/customization", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro ao salvar.");

      setSettings(data.customization);
      setOriginalSettings(data.customization);

      // Dispara atualização em tempo real no sistema
      window.dispatchEvent(
        new CustomEvent("tomadix:customization-updated", { detail: data.customization })
      );

      setFeedback({
        type: "success",
        message: "Identidade visual e personalização salvas com sucesso no banco de dados!",
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || "Erro ao salvar personalização.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = async () => {
    if (!confirm("Deseja restaurar todas as cores e parâmetros visuais para o padrão original do Tomadix?")) {
      return;
    }
    setResetting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/customization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro ao restaurar.");

      setSettings(data.customization);
      setOriginalSettings(data.customization);

      // Dispara atualização em tempo real no sistema
      window.dispatchEvent(
        new CustomEvent("tomadix:customization-updated", { detail: data.customization })
      );

      setFeedback({
        type: "success",
        message: "Configurações restauradas com sucesso para os valores padrão!",
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || "Erro ao restaurar padrões.",
      });
    } finally {
      setResetting(false);
    }
  };

  const handleDiscard = () => {
    setSettings(originalSettings);
    setFeedback({
      type: "success",
      message: "Alterações não salvas foram descartadas.",
    });
  };

  const hasUnsavedChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-20 rounded-2xl bg-white/5 border border-white/10" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 rounded-2xl bg-white/5 border border-white/10" />
          <div className="h-96 rounded-2xl bg-white/5 border border-white/10" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Title & Action Bar */}
      <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-slate-900 to-indigo-950/20 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-mono font-semibold tracking-wider text-amber-400 uppercase">
              Plataforma & Branding
            </span>
            {hasUnsavedChanges && (
              <span className="rounded bg-amber-400/20 border border-amber-400/40 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                Alterações não salvas
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Personalização da Plataforma
          </h1>
          <p className="text-sm text-white/60 mt-1 max-w-2xl">
            Gerencie a identidade visual, logotipo, paleta de cores e estilo global do Tomadix sem necessidade de novos deploys.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleResetToDefaults}
            disabled={resetting || saving}
            className="rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-medium text-white/70 hover:bg-white/10 hover:text-white transition disabled:opacity-50"
          >
            {resetting ? "Restaurando..." : "Restaurar Padrão"}
          </button>

          {hasUnsavedChanges && (
            <button
              type="button"
              onClick={handleDiscard}
              disabled={saving}
              className="rounded-xl border border-rose-500/30 bg-rose-950/20 px-3.5 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-900/30 transition disabled:opacity-50"
            >
              Descartar
            </button>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !hasUnsavedChanges}
            className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-black transition hover:bg-amber-300 shadow-md shadow-amber-500/10 disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar Alterações"}
          </button>
        </div>
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

      {/* Main Form & Live Preview Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form: Tabs & Inputs (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Sub-tabs */}
          <div className="flex border-b border-white/10 gap-2 pb-1">
            <button
              type="button"
              onClick={() => setActiveTab("identity")}
              className={`pb-2.5 px-3 text-xs font-semibold transition border-b-2 ${
                activeTab === "identity"
                  ? "border-amber-400 text-amber-300"
                  : "border-transparent text-white/50 hover:text-white"
              }`}
            >
              Identidade & Logotipo
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("colors")}
              className={`pb-2.5 px-3 text-xs font-semibold transition border-b-2 ${
                activeTab === "colors"
                  ? "border-amber-400 text-amber-300"
                  : "border-transparent text-white/50 hover:text-white"
              }`}
            >
              Paleta de Cores
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("theme")}
              className={`pb-2.5 px-3 text-xs font-semibold transition border-b-2 ${
                activeTab === "theme"
                  ? "border-amber-400 text-amber-300"
                  : "border-transparent text-white/50 hover:text-white"
              }`}
            >
              Tema & Detalhes Visuais
            </button>
          </div>

          {/* TAB 1: IDENTIDADE & LOGOTIPO */}
          {activeTab === "identity" && (
            <div className="rounded-2xl border border-white/10 bg-[#0d111c] p-6 space-y-6">
              <h2 className="text-sm font-bold text-white border-b border-white/10 pb-3">
                Informações da Marca
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/70">Nome da Plataforma</label>
                  <input
                    type="text"
                    value={settings.brandName}
                    onChange={(e) => handleChange("brandName", e.target.value)}
                    placeholder="Ex: Tomadix"
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                  />
                  <p className="text-[11px] text-white/40">Exibido na barra de título e navegação principal.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/70">Nome Curto / Sigla</label>
                  <input
                    type="text"
                    value={settings.shortName}
                    onChange={(e) => handleChange("shortName", e.target.value)}
                    placeholder="Ex: TM"
                    maxLength={10}
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                  />
                  <p className="text-[11px] text-white/40">Utilizado em ícones compactos e crachás.</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/70">Slogan / Tagline</label>
                <input
                  type="text"
                  value={settings.tagline}
                  onChange={(e) => handleChange("tagline", e.target.value)}
                  placeholder="Ex: Da ideia ao prompt cinematográfico com direção."
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                />
                <p className="text-[11px] text-white/40">Frase institucional exibida em banners e boas-vindas.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/70">Descrição Institucional</label>
                <textarea
                  rows={3}
                  value={settings.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  placeholder="Descrição da proposta de valor do software..."
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              <h2 className="text-sm font-bold text-white border-b border-white/10 pb-3 pt-2">
                Ativos Gráficos (Logotipos & Favicon)
              </h2>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/70">URL do Logotipo Principal</label>
                  <input
                    type="text"
                    value={settings.logoUrl || ""}
                    onChange={(e) => handleChange("logoUrl", e.target.value)}
                    placeholder="https://... ou caminho relativo /brand/logo.svg"
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                  />
                  <p className="text-[11px] text-white/40">
                    Deixe em branco para utilizar a insignia tipográfica padrão do sistema.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-white/70">URL Logo Compacto</label>
                    <input
                      type="text"
                      value={settings.compactLogoUrl || ""}
                      onChange={(e) => handleChange("compactLogoUrl", e.target.value)}
                      placeholder="/brand/icon.svg"
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-white/70">URL Favicon</label>
                    <input
                      type="text"
                      value={settings.faviconUrl || ""}
                      onChange={(e) => handleChange("faviconUrl", e.target.value)}
                      placeholder="/favicon.ico"
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CORES */}
          {activeTab === "colors" && (
            <div className="rounded-2xl border border-white/10 bg-[#0d111c] p-6 space-y-6">
              <div>
                <h2 className="text-sm font-bold text-white">Paleta de Cores da Aplicação</h2>
                <p className="text-xs text-white/50 mt-1">
                  Defina as cores em hexadecimal. A prévia ao lado reage instantaneamente aos ajustes.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Primary Color */}
                <div className="rounded-xl border border-white/10 bg-black/30 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-white">Cor Primária (Brand)</label>
                    <label
                      className="relative flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border border-white/20 shadow-sm transition hover:scale-110 hover:border-white focus-within:ring-2 focus-within:ring-amber-400"
                      style={{ backgroundColor: settings.primaryColor }}
                      title="Clique no quadro para abrir o seletor de cor"
                    >
                      <input
                        type="color"
                        value={toValidHex(settings.primaryColor, "#4edea3")}
                        onChange={(e) => handleChange("primaryColor", e.target.value)}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      />
                    </label>
                  </div>
                  <input
                    type="text"
                    value={settings.primaryColor}
                    onChange={(e) => handleChange("primaryColor", e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-1.5 text-xs font-mono text-white"
                  />
                  <p className="text-[10px] text-white/40">Botões principais, badges de destaque e foco.</p>
                </div>

                {/* Secondary Color */}
                <div className="rounded-xl border border-white/10 bg-black/30 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-white">Cor Secundária</label>
                    <label
                      className="relative flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border border-white/20 shadow-sm transition hover:scale-110 hover:border-white focus-within:ring-2 focus-within:ring-amber-400"
                      style={{ backgroundColor: settings.secondaryColor }}
                      title="Clique no quadro para abrir o seletor de cor"
                    >
                      <input
                        type="color"
                        value={toValidHex(settings.secondaryColor, "#95d3ba")}
                        onChange={(e) => handleChange("secondaryColor", e.target.value)}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      />
                    </label>
                  </div>
                  <input
                    type="text"
                    value={settings.secondaryColor}
                    onChange={(e) => handleChange("secondaryColor", e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-1.5 text-xs font-mono text-white"
                  />
                  <p className="text-[10px] text-white/40">Elementos de apoio, ícones secundários e sutis.</p>
                </div>

                {/* Accent Color */}
                <div className="rounded-xl border border-white/10 bg-black/30 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-white">Cor de Destaque (Accent)</label>
                    <label
                      className="relative flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border border-white/20 shadow-sm transition hover:scale-110 hover:border-white focus-within:ring-2 focus-within:ring-amber-400"
                      style={{ backgroundColor: settings.accentColor }}
                      title="Clique no quadro para abrir o seletor de cor"
                    >
                      <input
                        type="color"
                        value={toValidHex(settings.accentColor, "#f59e0b")}
                        onChange={(e) => handleChange("accentColor", e.target.value)}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      />
                    </label>
                  </div>
                  <input
                    type="text"
                    value={settings.accentColor}
                    onChange={(e) => handleChange("accentColor", e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-1.5 text-xs font-mono text-white"
                  />
                  <p className="text-[10px] text-white/40">Avisos proeminentes, badges PRO e alertas operacionais.</p>
                </div>

                {/* Border Color */}
                <div className="rounded-xl border border-white/10 bg-black/30 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-white">Cor de Bordas</label>
                    <label
                      className="relative flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border border-white/20 shadow-sm transition hover:scale-110 hover:border-white focus-within:ring-2 focus-within:ring-amber-400"
                      style={{ backgroundColor: settings.borderColor }}
                      title="Clique no quadro para abrir o seletor de cor"
                    >
                      <input
                        type="color"
                        value={toValidHex(settings.borderColor, "#ffffff")}
                        onChange={(e) => handleChange("borderColor", e.target.value)}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      />
                    </label>
                  </div>
                  <input
                    type="text"
                    value={settings.borderColor}
                    onChange={(e) => handleChange("borderColor", e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-1.5 text-xs font-mono text-white"
                  />
                  <p className="text-[10px] text-white/40">Divisores e bordas de cartões.</p>
                </div>

                {/* Background Color */}
                <div className="rounded-xl border border-white/10 bg-black/30 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-white">Fundo Principal</label>
                    <label
                      className="relative flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border border-white/20 shadow-sm transition hover:scale-110 hover:border-white focus-within:ring-2 focus-within:ring-amber-400"
                      style={{ backgroundColor: settings.backgroundColor }}
                      title="Clique no quadro para abrir o seletor de cor"
                    >
                      <input
                        type="color"
                        value={toValidHex(settings.backgroundColor, "#07090e")}
                        onChange={(e) => handleChange("backgroundColor", e.target.value)}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      />
                    </label>
                  </div>
                  <input
                    type="text"
                    value={settings.backgroundColor}
                    onChange={(e) => handleChange("backgroundColor", e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-1.5 text-xs font-mono text-white"
                  />
                  <p className="text-[10px] text-white/40">Canvas e background geral da página.</p>
                </div>

                {/* Surface/Card Color */}
                <div className="rounded-xl border border-white/10 bg-black/30 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-white">Superfície / Cards</label>
                    <label
                      className="relative flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border border-white/20 shadow-sm transition hover:scale-110 hover:border-white focus-within:ring-2 focus-within:ring-amber-400"
                      style={{ backgroundColor: settings.surfaceColor }}
                      title="Clique no quadro para abrir o seletor de cor"
                    >
                      <input
                        type="color"
                        value={toValidHex(settings.surfaceColor, "#0d111c")}
                        onChange={(e) => handleChange("surfaceColor", e.target.value)}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      />
                    </label>
                  </div>
                  <input
                    type="text"
                    value={settings.surfaceColor}
                    onChange={(e) => handleChange("surfaceColor", e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-1.5 text-xs font-mono text-white"
                  />
                  <p className="text-[10px] text-white/40">Painéis elevados e contêineres.</p>
                </div>

                {/* Text Primary */}
                <div className="rounded-xl border border-white/10 bg-black/30 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-white">Texto Primário</label>
                    <label
                      className="relative flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border border-white/20 shadow-sm transition hover:scale-110 hover:border-white focus-within:ring-2 focus-within:ring-amber-400"
                      style={{ backgroundColor: settings.textPrimaryColor }}
                      title="Clique no quadro para abrir o seletor de cor"
                    >
                      <input
                        type="color"
                        value={toValidHex(settings.textPrimaryColor, "#ffffff")}
                        onChange={(e) => handleChange("textPrimaryColor", e.target.value)}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      />
                    </label>
                  </div>
                  <input
                    type="text"
                    value={settings.textPrimaryColor}
                    onChange={(e) => handleChange("textPrimaryColor", e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-1.5 text-xs font-mono text-white"
                  />
                  <p className="text-[10px] text-white/40">Títulos e texto de alta ênfase.</p>
                </div>

                {/* Text Secondary */}
                <div className="rounded-xl border border-white/10 bg-black/30 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-white">Texto Secundário</label>
                    <label
                      className="relative flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border border-white/20 shadow-sm transition hover:scale-110 hover:border-white focus-within:ring-2 focus-within:ring-amber-400"
                      style={{ backgroundColor: settings.textSecondaryColor }}
                      title="Clique no quadro para abrir o seletor de cor"
                    >
                      <input
                        type="color"
                        value={toValidHex(settings.textSecondaryColor, "#94a3b8")}
                        onChange={(e) => handleChange("textSecondaryColor", e.target.value)}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      />
                    </label>
                  </div>
                  <input
                    type="text"
                    value={settings.textSecondaryColor}
                    onChange={(e) => handleChange("textSecondaryColor", e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-1.5 text-xs font-mono text-white"
                  />
                  <p className="text-[10px] text-white/40">Legendas, metadados e notas de apoio.</p>
                </div>

                {/* Badge Text Color */}
                <div className="rounded-xl border border-white/10 bg-black/30 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-white">Texto dos Badges</label>
                    <label
                      className="relative flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border border-white/20 shadow-sm transition hover:scale-110 hover:border-white focus-within:ring-2 focus-within:ring-amber-400"
                      style={{ backgroundColor: settings.badgeTextColor || "#ffffff" }}
                      title="Clique no quadro para abrir o seletor de cor"
                    >
                      <input
                        type="color"
                        value={toValidHex(settings.badgeTextColor, "#ffffff")}
                        onChange={(e) => handleChange("badgeTextColor", e.target.value)}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      />
                    </label>
                  </div>
                  <input
                    type="text"
                    value={settings.badgeTextColor || "#ffffff"}
                    onChange={(e) => handleChange("badgeTextColor", e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-1.5 text-xs font-mono text-white"
                  />
                  <p className="text-[10px] text-white/40">Cor do texto nos selos (badges), tags de gênero e metadados.</p>
                </div>

                {/* Badge Background Color */}
                <div className="rounded-xl border border-white/10 bg-black/30 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-white">Fundo dos Badges</label>
                    <label
                      className="relative flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border border-white/20 shadow-sm transition hover:scale-110 hover:border-white focus-within:ring-2 focus-within:ring-amber-400"
                      style={{ backgroundColor: settings.badgeBgColor || settings.primaryColor }}
                      title="Clique no quadro para abrir o seletor de cor"
                    >
                      <input
                        type="color"
                        value={toValidHex(settings.badgeBgColor || settings.primaryColor, "#2563eb")}
                        onChange={(e) => handleChange("badgeBgColor", e.target.value)}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      />
                    </label>
                  </div>
                  <input
                    type="text"
                    value={settings.badgeBgColor || settings.primaryColor}
                    onChange={(e) => handleChange("badgeBgColor", e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-1.5 text-xs font-mono text-white"
                  />
                  <p className="text-[10px] text-white/40">Fundo padrão dos selos informativos e categorias.</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TEMA & DETALHES */}
          {activeTab === "theme" && (
            <div className="rounded-2xl border border-white/10 bg-[#0d111c] p-6 space-y-6">
              <h2 className="text-sm font-bold text-white border-b border-white/10 pb-3">
                Preferências de Estilo & Layout
              </h2>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-white/70">Tema Padrão</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: "DARK", label: "Modo Escuro (Padrão)", icon: "🌙" },
                      { id: "LIGHT", label: "Modo Claro", icon: "☀️" },
                      { id: "SYSTEM", label: "Automático (Sistema)", icon: "💻" },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleChange("themePreference", t.id)}
                        className={`rounded-xl border p-3 text-center transition ${
                          settings.themePreference === t.id
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

                <div className="space-y-2 pt-2">
                  <label className="text-xs font-semibold text-white/70">Arredondamento de Bordas (Border Radius)</label>
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      { id: "none", label: "Reto (0px)" },
                      { id: "sm", label: "Sutil (4px)" },
                      { id: "md", label: "Médio (8px)" },
                      { id: "lg", label: "Grande (12px)" },
                      { id: "xl", label: "Amplo (16px)" },
                    ].map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => handleChange("borderRadius", r.id)}
                        className={`rounded-xl border py-2 px-2 text-center text-xs transition ${
                          settings.borderRadius === r.id
                            ? "border-amber-400 bg-amber-400/10 text-white font-bold"
                            : "border-white/10 bg-black/30 text-white/60 hover:bg-white/5"
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="text-xs font-semibold text-white/70">Estilo Padrão da Barra Lateral</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleChange("sidebarStyle", "default")}
                      className={`rounded-xl border p-3 text-left transition ${
                        settings.sidebarStyle === "default"
                          ? "border-amber-400 bg-amber-400/10 text-white font-bold"
                          : "border-white/10 bg-black/30 text-white/60 hover:bg-white/5"
                      }`}
                    >
                      <div className="text-xs font-semibold text-white">Expandida (Padrão)</div>
                      <div className="text-[11px] text-white/50 mt-1">Exibe ícones, nomes e categorias completos.</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChange("sidebarStyle", "compact")}
                      className={`rounded-xl border p-3 text-left transition ${
                        settings.sidebarStyle === "compact"
                          ? "border-amber-400 bg-amber-400/10 text-white font-bold"
                          : "border-white/10 bg-black/30 text-white/60 hover:bg-white/5"
                      }`}
                    >
                      <div className="text-xs font-semibold text-white">Recolhida (Compacta)</div>
                      <div className="text-[11px] text-white/50 mt-1">Modo focado apenas em ícones minimizados.</div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: Interactive Live Preview (5 cols) */}
        <div className="lg:col-span-5 sticky top-24 space-y-4">
          <div className="rounded-2xl border border-white/15 bg-[#090c14] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-xs font-mono font-bold tracking-wider text-amber-400 uppercase">
                Pré-visualização em Tempo Real
              </span>
              <span className="text-[10px] text-white/40">Sem salvar ainda</span>
            </div>

            {/* Canvas simulating page elements with applied custom colors */}
            <div
              className="rounded-xl border p-4 space-y-4 transition-colors"
              style={{
                backgroundColor: settings.backgroundColor,
                borderColor: settings.borderColor,
                color: settings.textPrimaryColor,
              }}
            >
              {/* Header preview */}
              <div
                className="flex items-center justify-between border-b pb-3"
                style={{ borderColor: settings.borderColor }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-lg font-mono text-xs font-black shadow-sm"
                    style={{
                      backgroundColor: settings.primaryColor,
                      color: "#000000",
                    }}
                  >
                    {settings.shortName.substring(0, 2).toUpperCase() || "TM"}
                  </span>
                  <div>
                    <div className="text-xs font-bold leading-tight" style={{ color: settings.textPrimaryColor }}>
                      {settings.brandName || "Tomadix"}
                    </div>
                    <div className="text-[9px]" style={{ color: settings.textSecondaryColor }}>
                      {settings.tagline || "Da ideia à cena."}
                    </div>
                  </div>
                </div>
                <span
                  className="rounded px-2 py-0.5 text-[10px] font-bold"
                  style={{
                    backgroundColor: `${settings.accentColor}25`,
                    color: settings.accentColor,
                    border: `1px solid ${settings.accentColor}50`,
                  }}
                >
                  PRO
                </span>
              </div>

              {/* Sample card inside canvas */}
              <div
                className="rounded-xl border p-3.5 space-y-2.5 shadow-md"
                style={{
                  backgroundColor: settings.surfaceColor,
                  borderColor: settings.borderColor,
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold" style={{ color: settings.textPrimaryColor }}>
                    Análise Cinematográfica #104
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide shadow-sm"
                      style={{
                        backgroundColor: settings.badgeBgColor || settings.primaryColor,
                        color: settings.badgeTextColor || "#ffffff",
                      }}
                    >
                      CYBERPUNK
                    </span>
                    <span
                      className="rounded px-1.5 py-0.5 text-[9px] font-semibold"
                      style={{
                        backgroundColor: `${settings.primaryColor}20`,
                        color: settings.primaryColor,
                      }}
                    >
                      Concluído
                    </span>
                  </div>
                </div>
                <p className="text-[11px] leading-relaxed" style={{ color: settings.textSecondaryColor }}>
                  Iluminação Chiaroscuro de alta densidade dramática combinada com lente anamórfica 35mm.
                </p>

                {/* Simulated Input */}
                <div className="pt-1">
                  <div
                    className="w-full rounded-lg border px-2.5 py-1.5 text-[11px]"
                    style={{
                      backgroundColor: settings.backgroundColor,
                      borderColor: settings.borderColor,
                      color: settings.textPrimaryColor,
                    }}
                  >
                    Exemplo de campo de busca...
                  </div>
                </div>
              </div>

              {/* Buttons sample */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  className="rounded-lg px-3 py-1.5 text-xs font-bold shadow-sm transition hover:opacity-90"
                  style={{
                    backgroundColor: settings.primaryColor,
                    color: "#000000",
                  }}
                >
                  Ação Primária
                </button>
                <button
                  type="button"
                  className="rounded-lg border px-3 py-1.5 text-xs font-semibold transition hover:bg-white/5"
                  style={{
                    borderColor: settings.borderColor,
                    color: settings.textPrimaryColor,
                    backgroundColor: settings.surfaceColor,
                  }}
                >
                  Secundário
                </button>
                <button
                  type="button"
                  className="rounded-lg px-3 py-1.5 text-xs font-bold shadow-sm transition hover:opacity-90"
                  style={{
                    backgroundColor: settings.accentColor,
                    color: "#000000",
                  }}
                >
                  Destaque
                </button>
              </div>
            </div>

            <div className="text-[11px] text-white/40 leading-relaxed px-1">
              💡 As alterações salvas são gravadas como políticas de identidade no banco de dados e refletem em tempo real no visual da plataforma.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

