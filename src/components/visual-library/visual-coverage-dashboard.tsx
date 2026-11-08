"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  VisualCoverageReport,
  VisualReferenceOption,
  VisualCategory,
} from "@/modules/visual-library/visual-reference.types";
import { VISUAL_CATEGORIES } from "@/modules/visual-library/visual-reference.catalog";
import { VisualLightboxModal } from "./visual-lightbox-modal";

export function VisualCoverageDashboard() {
  const [report, setReport] = useState<VisualCoverageReport | null>(null);
  const [options, setOptions] = useState<VisualReferenceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Filtros
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "COVERED" | "PENDING">("ALL");
  const [search, setSearch] = useState("");

  // Modal de Edição / Upload
  const [editingOption, setEditingOption] = useState<VisualReferenceOption | null>(null);
  const [inspectingOption, setInspectingOption] = useState<VisualReferenceOption | null>(null);
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formWhatToLookFor, setFormWhatToLookFor] = useState("");
  const [formComparisonNotes, setFormComparisonNotes] = useState("");
  const [formAltText, setFormAltText] = useState("");
  const [formLicense, setFormLicense] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const fetchCoverageData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/visual-library");
      if (!res.ok) throw new Error("Erro ao carregar dados da biblioteca visual.");
      const data = await res.json();
      setReport(data.report);
      setOptions(data.options || []);
    } catch (err: any) {
      setError(err.message || "Erro desconhecido ao carregar biblioteca.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoverageData();
  }, [fetchCoverageData]);

  // Abre modal de edição
  const handleOpenEdit = (opt: VisualReferenceOption) => {
    setEditingOption(opt);
    setFormImageUrl(opt.imageUrl || "");
    setFormDescription(opt.description || "");
    setFormWhatToLookFor(opt.whatToLookFor || "");
    setFormComparisonNotes(opt.comparisonNotes || "");
    setFormAltText(opt.altText || "");
    setFormLicense(opt.license || "Tomadix Studio Original");
    setUploadFile(null);
  };

  // Salvar alterações e upload
  const handleSaveOption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOption) return;
    setSaving(true);
    try {
      let finalImageUrl = formImageUrl;

      // Se houver arquivo selecionado, faz upload primeiro
      if (uploadFile) {
        const formData = new FormData();
        formData.append("file", uploadFile);
        formData.append("optionValue", editingOption.value);
        formData.append("category", editingOption.category);

        const uploadRes = await fetch("/api/admin/visual-library/upload", {
          method: "POST",
          body: formData,
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || "Falha no upload do arquivo.");
        finalImageUrl = uploadData.url;
      }

      // Atualiza a opção via API
      const res = await fetch("/api/admin/visual-library/options", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          optionValue: editingOption.value,
          category: editingOption.category,
          imageUrl: finalImageUrl,
          description: formDescription,
          whatToLookFor: formWhatToLookFor,
          comparisonNotes: formComparisonNotes,
          altText: formAltText,
          license: formLicense,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao salvar referência visual.");

      setNotification({ type: "success", message: `Referência para '${editingOption.label}' salva com sucesso!` });
      setEditingOption(null);
      fetchCoverageData();
    } catch (err: any) {
      setNotification({ type: "error", message: err.message || "Erro ao salvar" });
    } finally {
      setSaving(false);
    }
  };

  // Sincronizar parâmetros padrão do catálogo
  const handleSyncDefaults = async () => {
    if (!confirm("Deseja sincronizar todos os parâmetros cinematográficos do catálogo mestre no estúdio atual?")) return;
    setSyncing(true);
    try {
      const res = await fetch("/api/admin/visual-library/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setNotification({ type: "success", message: "Catálogo visual de parâmetros sincronizado com sucesso!" });
      fetchCoverageData();
    } catch (err: any) {
      setNotification({ type: "error", message: err.message });
    } finally {
      setSyncing(false);
    }
  };

  // Filtros de busca
  const filteredOptions = useMemo(() => {
    return options.filter((opt) => {
      const matchSearch =
        search.trim() === "" ||
        opt.label.toLowerCase().includes(search.toLowerCase()) ||
        opt.value.toLowerCase().includes(search.toLowerCase()) ||
        (opt.originalName && opt.originalName.toLowerCase().includes(search.toLowerCase())) ||
        opt.description.toLowerCase().includes(search.toLowerCase());

      const matchCat = selectedCategory === "ALL" || opt.category === selectedCategory;

      const isCovered = opt.imageUrl && !opt.imageUrl.includes("placeholder");
      const matchStatus =
        statusFilter === "ALL" ||
        (statusFilter === "COVERED" && isCovered) ||
        (statusFilter === "PENDING" && !isCovered);

      return matchSearch && matchCat && matchStatus;
    });
  }, [options, search, selectedCategory, statusFilter]);

  if (loading) {
    return (
      <div className="p-5 sm:p-8 text-center text-xs text-white/40 animate-pulse space-y-2">
        <div className="h-6 w-48 bg-white/10 rounded mx-auto" />
        <p>Carregando diagnóstico da Biblioteca Visual de Parâmetros...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Alerta de Notificação */}
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs animate-in fade-in ${
            notification.type === "success"
              ? "bg-primary/10 border-primary/30 text-primary"
              : "bg-rose-500/10 border-rose-500/30 text-rose-300"
          }`}
        >
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="text-white/60 hover:text-white">✕</button>
        </div>
      )}

      {/* SEÇÃO 1: CABEÇALHO & CARDS DE COBERTURA */}
      <div className="rounded-3xl border border-white/10 bg-[#0b0f19] p-6 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2.5">
              <span>🖼️</span> Diagnóstico de Cobertura da Biblioteca Visual
            </h2>
            <p className="text-xs text-white/50 mt-1">
              Inventário e controle de integridade dos parâmetros visuais de imagem, cena e vídeo do Tomadix.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSyncDefaults}
              disabled={syncing}
              className="rounded-xl border border-primary/40 bg-primary/10 px-3.5 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition flex items-center gap-1.5"
            >
              <span>⚡</span> {syncing ? "Sincronizando..." : "Sincronizar Catálogo Mestre"}
            </button>
          </div>
        </div>

        {/* 4 Cards de Métricas Principais */}
        {report && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-1">
              <span className="text-[11px] font-medium text-white/50">Taxa de Cobertura Global</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-primary">
                  {report.coveragePercentage}%
                </span>
                <span className="text-[10px] text-white/40">validadas</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                  className="bg-primary h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${report.coveragePercentage}%` }}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-1">
              <span className="text-[11px] font-medium text-white/50">Total de Opções Mapeadas</span>
              <div className="text-2xl font-bold font-mono text-white">
                {report.totalOptions}
              </div>
              <p className="text-[10px] text-white/40">em 11 categorias cinematográficas</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-1">
              <span className="text-[11px] font-medium text-white/50">Referências com Asset Ativo</span>
              <div className="text-2xl font-bold font-mono text-cyan-400">
                {report.coveredOptions}
              </div>
              <p className="text-[10px] text-white/40">imagens vetoriais / assets aprovados</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-1">
              <span className="text-[11px] font-medium text-white/50">Referências Pendentes</span>
              <div className="text-2xl font-bold font-mono text-amber-400">
                {report.pendingOptions}
              </div>
              <p className="text-[10px] text-white/40">usando placeholder seguro</p>
            </div>
          </div>
        )}

        {/* Breakdown de Cobertura por Categoria */}
        {report && (
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/60">
              Progresso de Cobertura por Categoria Técnica
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {report.categories.map((c) => (
                <div
                  key={c.category}
                  onClick={() => setSelectedCategory(c.category)}
                  className={`p-3 rounded-xl border transition cursor-pointer ${
                    selectedCategory === c.category
                      ? "border-primary bg-primary/10"
                      : "border-white/5 bg-black/40 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white flex items-center gap-1.5">
                      <span>{c.icon}</span> {c.categoryName}
                    </span>
                    <span className="font-mono text-[11px] font-bold text-primary">
                      {c.covered}/{c.total} ({c.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-1 mt-2 overflow-hidden">
                    <div
                      className="bg-primary h-1 rounded-full"
                      style={{ width: `${c.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SEÇÃO 2: GERENCIADOR DE ASSETS VISUAIS & TABELA INTERATIVA */}
      <div className="rounded-3xl border border-white/10 bg-[#0b0f19] overflow-hidden shadow-2xl">
        <div className="p-5 border-b border-white/10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>📁</span> Catálogo de Opções & Gestão de Referências
              </h3>
              <p className="text-xs text-white/50">
                Altere imagens, substitua assets por uploads locais e edite as orientações didáticas de cada parâmetro.
              </p>
            </div>

            {/* Filtro de Status */}
            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 self-start sm:self-auto">
              <button
                onClick={() => setStatusFilter("ALL")}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                  statusFilter === "ALL" ? "bg-white/15 text-white" : "text-white/50 hover:text-white"
                }`}
              >
                Todas ({options.length})
              </button>
              <button
                onClick={() => setStatusFilter("COVERED")}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                  statusFilter === "COVERED" ? "bg-primary/20 text-primary" : "text-white/50 hover:text-white"
                }`}
              >
                Válidas
              </button>
              <button
                onClick={() => setStatusFilter("PENDING")}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                  statusFilter === "PENDING" ? "bg-amber-500/20 text-amber-300" : "text-white/50 hover:text-white"
                }`}
              >
                Pendentes
              </button>
            </div>
          </div>

          {/* Barra de Pesquisa e Filtro de Categoria */}
          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-xs">🔍</span>
              <input
                type="text"
                placeholder="Pesquisar por código, título em português ou termo em inglês..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/60 py-2 pl-9 pr-8 text-xs text-white placeholder-white/40 focus:border-primary focus:outline-none"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/40 hover:text-white">
                  ✕
                </button>
              )}
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs text-white font-mono focus:border-primary focus:outline-none"
            >
              <option value="ALL">Todas as Categorias</option>
              {VISUAL_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabela de Referências */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[660px]">
            <thead className="bg-white/[0.02] border-b border-white/10 text-white/50 font-mono">
              <tr>
                <th className="p-3.5">Miniatura</th>
                <th className="p-3.5">Parâmetro / Código</th>
                <th className="p-3.5">Categoria</th>
                <th className="p-3.5">O Que Observar</th>
                <th className="p-3.5">Status Asset</th>
                <th className="p-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-white/80">
              {filteredOptions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-5 sm:p-8 text-center text-xs text-white/40">
                    Nenhuma opção visual encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredOptions.map((opt) => {
                  const hasValidAsset = opt.imageUrl && !opt.imageUrl.includes("placeholder");
                  return (
                    <tr key={`${opt.category}_${opt.value}`} className="hover:bg-white/[0.01]">
                      {/* Miniatura */}
                      <td className="p-3.5">
                        <div
                          onClick={() => setInspectingOption(opt)}
                          className="h-12 w-20 rounded-xl overflow-hidden bg-black border border-white/10 cursor-pointer hover:border-primary transition flex-shrink-0"
                          title="Clique para ampliar"
                        >
                          <img loading="lazy" decoding="async"
                            src={opt.imageUrl}
                            alt={opt.label}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/visual-references/placeholder.svg";
                            }}
                          />
                        </div>
                      </td>

                      {/* Nome e Código */}
                      <td className="p-3.5">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{opt.label}</span>
                        </div>
                        <div className="font-mono text-[11px] text-amber-400/90">{opt.value}</div>
                        {opt.originalName && (
                          <div className="text-[10px] text-white/40 font-mono mt-0.5">
                            EN: {opt.originalName}
                          </div>
                        )}
                      </td>

                      {/* Categoria */}
                      <td className="p-3.5">
                        <span className="rounded-md bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] font-mono text-white/70">
                          {opt.categoryLabel || opt.category}
                        </span>
                      </td>

                      {/* Explicação Didática */}
                      <td className="p-3.5 max-w-xs">
                        <p className="text-[11px] text-white/70 line-clamp-2">
                          {opt.whatToLookFor || opt.description}
                        </p>
                      </td>

                      {/* Status */}
                      <td className="p-3.5">
                        {hasValidAsset ? (
                          <span className="rounded-full bg-primary/15 border border-primary/30 px-2 py-0.5 text-[10px] font-bold text-primary">
                            ✓ Ativo (Válido)
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                            ⏳ Pendente
                          </span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="p-3.5 text-right whitespace-nowrap space-x-2">
                        <button
                          onClick={() => setInspectingOption(opt)}
                          className="rounded-lg border border-white/10 px-2.5 py-1 text-[11px] font-medium text-white/70 hover:bg-white/10 hover:text-white transition"
                        >
                          Visualizar
                        </button>
                        <button
                          onClick={() => handleOpenEdit(opt)}
                          className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-300 hover:bg-cyan-500/20 transition"
                        >
                          Editar / Trocar Imagem
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: EDITAR / ASSOCIAR IMAGEM E DIDÁTICA (SEÇÃO 7) */}
      {editingOption && (
        <div className="fixed inset-0 z-50 flex items-center-safe justify-center bg-black/85 p-3 sm:p-4 overflow-y-auto">
          <div className="relative w-full max-w-xl max-h-[90dvh] overflow-y-auto rounded-3xl border border-white/15 bg-[#0b0f19] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>🎨</span> Gerenciar Referência: {editingOption.label}
                </h3>
                <code className="text-xs text-amber-400 font-mono">{editingOption.value}</code>
              </div>
              <button
                onClick={() => setEditingOption(null)}
                className="rounded-full p-1.5 text-white/50 hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveOption} className="space-y-4 text-xs">
              {/* Prévia da Imagem Atual ou do Arquivo Selecionado */}
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4 space-y-2">
                <span className="text-[11px] font-semibold text-white/70">Prévia Visual da Referência:</span>
                <div className="aspect-[16/9] w-full max-w-md mx-auto rounded-xl overflow-hidden bg-black border border-white/10 flex items-center justify-center">
                  <img loading="lazy" decoding="async"
                    src={uploadFile ? URL.createObjectURL(uploadFile) : formImageUrl || "/visual-references/placeholder.svg"}
                    alt="Prévia"
                    className="h-full w-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/visual-references/placeholder.svg";
                    }}
                  />
                </div>
              </div>

              {/* Upload de Arquivo Local */}
              <div>
                <label className="block text-white/70 font-semibold mb-1">
                  Substituir por Upload Local (PNG, JPG, WebP, SVG até 5MB)
                </label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setUploadFile(e.target.files[0]);
                    }
                  }}
                  className="w-full text-xs text-white/60 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary/20 file:text-primary hover:file:bg-primary/30"
                />
              </div>

              {/* URL da Imagem */}
              <div>
                <label className="block text-white/70 font-semibold mb-1">
                  Ou informar Caminho / URL da Imagem
                </label>
                <input
                  type="text"
                  value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                  placeholder="/visual-references/camera-movement/dolly_in.svg ou https://..."
                  className="w-full rounded-xl border border-white/10 bg-[#141b29] p-2.5 text-white font-mono"
                />
              </div>

              {/* Descrição Curta */}
              <div>
                <label className="block text-white/70 font-semibold mb-1">Descrição Curta</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#141b29] p-2.5 text-white resize-none"
                />
              </div>

              {/* O Que Observar */}
              <div>
                <label className="block text-white/70 font-semibold mb-1">
                  O Que Observar Visualmente (Instrução ao Diretor)
                </label>
                <textarea
                  rows={2}
                  value={formWhatToLookFor}
                  onChange={(e) => setFormWhatToLookFor(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#141b29] p-2.5 text-white resize-none"
                />
              </div>

              {/* Notas Comparativas */}
              <div>
                <label className="block text-white/70 font-semibold mb-1">
                  Diferença Conceitual com Opções Semelhantes
                </label>
                <textarea
                  rows={2}
                  value={formComparisonNotes}
                  onChange={(e) => setFormComparisonNotes(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#141b29] p-2.5 text-white resize-none"
                />
              </div>

              {/* Licença */}
              <div>
                <label className="block text-white/70 font-semibold mb-1">Licença e Origem do Asset</label>
                <input
                  type="text"
                  value={formLicense}
                  onChange={(e) => setFormLicense(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#141b29] p-2.5 text-white"
                />
              </div>

              {/* Botões do Rodapé */}
              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingOption(null)}
                  className="rounded-xl border border-white/10 px-4 py-2 font-medium text-white/70 hover:bg-white/5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-primary px-5 py-2 font-bold text-on-primary shadow-lg shadow-primary/20 hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? "Salvando Asset..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Lightbox de Ampliação */}
      <VisualLightboxModal
        option={inspectingOption}
        isOpen={Boolean(inspectingOption)}
        onClose={() => setInspectingOption(null)}
      />
    </div>
  );
}
