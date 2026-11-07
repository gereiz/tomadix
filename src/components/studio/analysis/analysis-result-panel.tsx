"use client";

import { useMemo, useState } from "react";
import type { CinematicAnalysisResult } from "@/modules/cinematic-analysis/cinematic-analysis.schema";

export const MODE_META: Record<
  string,
  { label: string; icon: string; description: string }
> = {
  TECHNICAL_ANALYSIS: {
    label: "Análise Técnica",
    icon: "📐",
    description: "Lente, abertura, enquadramento, luz e paleta da tomada.",
  },
  REVERSE_ENGINEERING: {
    label: "Engenharia Reversa",
    icon: "🔄",
    description: "Gera prompts prontos para Midjourney, Flux, SDXL e vídeo.",
  },
  VISUAL_CONTINUITY: {
    label: "Continuidade",
    icon: "🛡️",
    description: "Compara duas tomadas e aponta quebras de raccord.",
  },
  STYLE_REPRODUCTION: {
    label: "Reprodução de Estilo",
    icon: "🎨",
    description: "Extrai a identidade visual para reaplicar no projeto.",
  },
};

type TabId = "tech" | "prompts" | "continuity" | "params" | "images";

interface SentImageEntry {
  index: number;
  label: string;
  role: string;
  isPrimary: boolean;
  src?: string;
  details: string;
}

interface Props {
  result: CinematicAnalysisResult;
  thumbnail?: string;
  isFavorite: boolean;
  canApply: boolean;
  isApplying: boolean;
  onToggleFavorite: () => void;
  onApply: () => void;
  onCopy: (text: string, label: string) => void;
  onReanalyze: () => void;
  onDelete: () => void;
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">{label}</p>
      <p className="mt-0.5 text-xs font-medium text-white/90 break-words">{value || "—"}</p>
    </div>
  );
}

function isUsableImageSrc(url?: string): boolean {
  if (!url) return false;
  if (url.startsWith("data:image/") && !url.endsWith("...")) return true;
  if (url.startsWith("/") || url.startsWith("http")) return true;
  return false;
}

export function AnalysisResultPanel({
  result,
  thumbnail,
  isFavorite,
  canApply,
  isApplying,
  onToggleFavorite,
  onApply,
  onCopy,
  onReanalyze,
  onDelete,
}: Props) {
  const [failedIndices, setFailedIndices] = useState<Set<number>>(new Set());
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [tab, setTab] = useState<TabId>(result.continuityReport ? "continuity" : "tech");

  const td = result.technicalData;
  const prompts = result.prompts;
  const mode = MODE_META[result.mode] || MODE_META.TECHNICAL_ANALYSIS;

  // Lista completa de imagens enviadas na análise (Principal + Auxiliares / Tomada B)
  const sentImages = useMemo<SentImageEntry[]>(() => {
    const auxList = result.auxiliarySummary || [];
    const delegatedAspects = new Set<string>();
    auxList.forEach((a) => (a.aspects || []).forEach((asp) => delegatedAspects.add(asp)));

    const cleanPrimaryTitle = (result.referenceTitle || "Imagem Principal").replace(/\s*\(\+\d+\s*refs?\)$/i, "");
    const primarySrc = isUsableImageSrc(thumbnail)
      ? thumbnail
      : isUsableImageSrc(result.imageUrl)
      ? result.imageUrl
      : undefined;

    const list: SentImageEntry[] = [
      {
        index: 0,
        label: cleanPrimaryTitle,
        role: "★ Principal",
        isPrimary: true,
        src: primarySrc,
        details:
          delegatedAspects.size > 0
            ? `Todos os parâmetros base, exceto ${Array.from(delegatedAspects).join(", ")}`
            : "Todos os parâmetros base da cena",
      },
    ];

    auxList.forEach((aux, idx) => {
      const details = [
        ...(aux.aspects || []),
        ...(aux.customInstruction ? [aux.customInstruction] : []),
      ].join(", ");
      list.push({
        index: list.length,
        label: aux.label || `Imagem ${idx + 2}`,
        role: `Auxiliar #${idx + 2}`,
        isPrimary: false,
        src: isUsableImageSrc(aux.imageUrl) ? aux.imageUrl : undefined,
        details: details || "Referência complementar",
      });
    });

    if (auxList.length === 0 && isUsableImageSrc(result.comparisonImageUrl)) {
      list.push({
        index: list.length,
        label: "Tomada B",
        role: "Comparação",
        isPrimary: false,
        src: result.comparisonImageUrl,
        details: "Tomada B para comparação de continuidade (Raccord)",
      });
    }

    return list;
  }, [result, thumbnail]);

  const currentImage = sentImages[activeImageIndex] || sentImages[0];

  const markFailed = (idx: number) => {
    setFailedIndices((prev) => {
      const next = new Set(prev);
      next.add(idx);
      return next;
    });
  };

  const promptBlocks: Array<{ key: string; label: string; text?: string; mono?: boolean; tone?: "neg" }> = [
    { key: "pt", label: "Descrição cênica (PT-BR)", text: prompts?.narrativeDescriptionPt },
    { key: "en", label: "Prompt cinematográfico (EN)", text: prompts?.englishPrompt },
    { key: "mj", label: "Midjourney v6.1", text: prompts?.midjourney, mono: true },
    { key: "flux", label: "Flux 1.1 Pro", text: prompts?.flux },
    { key: "sdxl", label: "Stable Diffusion XL", text: prompts?.sdxl, mono: true },
    { key: "video", label: "Vídeo (Kling · Runway · Luma)", text: prompts?.videoGenerators },
    { key: "neg", label: "Negative prompt", text: prompts?.negativePrompt, mono: true, tone: "neg" as const },
  ].filter((b) => !!b.text);

  const tabs: Array<{ id: TabId; label: string }> = [
    { id: "tech", label: "Ficha técnica" },
    { id: "prompts", label: `Prompts (${promptBlocks.length})` },
    ...(sentImages.length > 1 ? [{ id: "images" as TabId, label: `Imagens enviadas (${sentImages.length})` }] : []),
    ...(result.continuityReport ? [{ id: "continuity" as TabId, label: "Continuidade" }] : []),
    { id: "params", label: "Parâmetros" },
  ];

  const paramEntries = Object.entries(result.parameterSettings || {});

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analise-${result.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const score = result.continuityReport?.score ?? 0;
  const scoreColor = score >= 80 ? "bg-primary" : score >= 55 ? "bg-amber-400" : "bg-rose-500";
  const lightboxEntry = lightboxIndex !== null ? sentImages[lightboxIndex] : null;

  return (
    <div className="flex flex-col gap-5">
      {/* Cabeçalho do resultado */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div
          onClick={() => currentImage?.src && !failedIndices.has(currentImage.index) && setLightboxIndex(currentImage.index)}
          title={currentImage?.src ? "Clique para ampliar a imagem" : undefined}
          className={`group relative w-full sm:w-64 aspect-video flex-shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1a2027] to-[#0c0f13] ${
            currentImage?.src && !failedIndices.has(currentImage.index) ? "cursor-zoom-in" : ""
          }`}
        >
          {currentImage?.src && !failedIndices.has(currentImage.index) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentImage.src}
              alt={currentImage.label}
              loading="lazy"
              decoding="async"
              onError={() => markFailed(currentImage.index)}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-3xl opacity-60">{mode.icon}</div>
          )}

          {/* Badge indicando qual imagem está em exibição no quadro principal */}
          <span
            className={`absolute left-2 top-2 rounded-md px-2 py-0.5 text-[9px] font-extrabold uppercase shadow ${
              currentImage?.isPrimary
                ? "bg-primary text-on-primary"
                : "bg-black/80 text-cyan-300 border border-cyan-400/30"
            }`}
          >
            {currentImage?.role}
          </span>

          {currentImage?.src && !failedIndices.has(currentImage.index) && (
            <span className="absolute right-2 top-2 rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-white/80 opacity-0 transition group-hover:opacity-100">
              🔍 Ampliar
            </span>
          )}

          {td?.colorPalette?.length ? (
            <div className="absolute inset-x-0 bottom-0 flex h-1.5">
              {td.colorPalette.map((c, i) => (
                <span key={i} className="flex-1" style={{ backgroundColor: c }} />
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
              {mode.icon} {mode.label}
            </span>
            {sentImages.length > 1 && (
              <span className="rounded-lg bg-cyan-400/10 border border-cyan-400/25 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                1 Principal + {sentImages.length - 1} Auxiliar{sentImages.length - 1 > 1 ? "es" : ""}
              </span>
            )}
            <span className="rounded-lg bg-white/5 px-2 py-0.5 text-[10px] font-mono text-white/50">{result.modelUsed}</span>
            {result.createdAt && (
              <span className="text-[10px] text-white/40">
                {new Date(result.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
              </span>
            )}
          </div>
          <h3 className="text-lg font-bold text-white leading-tight truncate">
            {result.referenceTitle || "Análise cinematográfica"}
          </h3>
          {td?.summaryDescription && (
            <p className="text-xs leading-relaxed text-white/60 line-clamp-3">{td.summaryDescription}</p>
          )}

          <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
            <button
              onClick={onApply}
              disabled={!canApply || isApplying}
              title={canApply ? "Mescla os parâmetros na Bíblia Visual do projeto" : "Selecione um projeto no topo da página"}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-on-primary transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 shadow-sm shadow-primary/20"
            >
              {isApplying ? (
                <span className="h-3.5 w-3.5 rounded-full border-2 border-black border-t-transparent animate-spin" />
              ) : (
                <span>📥</span>
              )}
              Aplicar ao projeto
            </button>
            <button
              onClick={onToggleFavorite}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                isFavorite
                  ? "border-rose-400/40 bg-rose-500/15 text-rose-300"
                  : "border-white/10 bg-white/5 text-white/70 hover:text-white"
              }`}
            >
              {isFavorite ? "♥ Favorita" : "♡ Favoritar"}
            </button>
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/70 transition hover:text-white"
            >
              ⤓ JSON
            </button>
            <button
              onClick={onReanalyze}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/70 transition hover:text-white"
              title="Executar a análise novamente com a configuração atual"
            >
              ↻ Refazer
            </button>
            <button
              onClick={onDelete}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-xs font-semibold text-rose-300/90 transition hover:bg-rose-500/15 hover:text-rose-200"
              title="Excluir esta análise do histórico"
            >
              🗑 Excluir
            </button>
          </div>
          {!canApply && (
            <p className="text-[10px] text-amber-300/80">Selecione um projeto no topo para aplicar os parâmetros.</p>
          )}
        </div>
      </div>

      {/* Faixa de todas as imagens enviadas nesta análise (sempre visível quando há 2+ imagens) */}
      {sentImages.length > 1 && (
        <div className="rounded-2xl border border-white/10 bg-black/30 p-3.5">
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/70">
              Imagens enviadas nesta análise ({sentImages.length})
            </span>
            <span className="text-[10px] text-white/45">
              Clique em uma imagem para alternar ou ampliar
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3">
            {sentImages.map((img) => {
              const isSelected = img.index === activeImageIndex;
              const hasValidThumb = Boolean(img.src && !failedIndices.has(img.index));
              return (
                <div
                  key={img.index}
                  onClick={() => setActiveImageIndex(img.index)}
                  className={`group flex cursor-pointer items-center gap-3 rounded-xl border p-2 transition ${
                    isSelected
                      ? "border-primary bg-primary/10 ring-1 ring-primary/40"
                      : "border-white/10 bg-white/[0.02] hover:border-white/25"
                  }`}
                >
                  <div className="relative h-14 w-24 flex-shrink-0 overflow-hidden rounded-lg border border-white/10 bg-[#0c0f13]">
                    {hasValidThumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img loading="lazy" decoding="async"
                        src={img.src}
                        alt={img.label}
                        onError={() => markFailed(img.index)}
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center text-[10px] text-white/40">
                        <span className="text-base">🖼️</span>
                      </div>
                    )}
                    <span
                      className={`absolute left-1 top-1 rounded px-1 py-0.5 text-[8px] font-black uppercase ${
                        img.isPrimary ? "bg-primary text-on-primary" : "bg-black/80 text-cyan-300"
                      }`}
                    >
                      {img.role}
                    </span>
                    {hasValidThumb && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLightboxIndex(img.index);
                        }}
                        title="Ampliar imagem"
                        className="absolute bottom-1 right-1 rounded bg-black/75 px-1.5 py-0.5 text-[9px] font-bold text-white opacity-0 transition group-hover:opacity-100 hover:bg-primary-fixed hover:text-black"
                      >
                        🔍
                      </button>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-white" title={img.label}>
                      {img.label}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-white/60" title={img.details}>
                      {img.details}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Abas */}
      <div className="flex gap-1 overflow-x-auto border-b border-white/10">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`whitespace-nowrap border-b-2 px-3.5 py-2.5 text-xs font-semibold transition ${
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-white/50 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "tech" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <Field label="Câmera / Sensor" value={td?.cameraSensor} />
            <Field label="Lente" value={td?.lensFocalLength} />
            <Field label="Abertura" value={td?.aperture} />
            <Field label="Enquadramento" value={td?.framing} />
            <Field label="Ângulo" value={td?.cameraAngle} />
            <Field label="Movimento" value={td?.cameraMovement} />
            <Field label="Estilo de luz" value={td?.lightingStyle} />
            <Field label="Setup de luz" value={td?.lightingSetup} />
            <Field label="Temperatura de cor" value={td?.colorTemperature} />
            <Field label="Proporção" value={td?.aspectRatio} />
            <Field label="Harmonia de cor" value={td?.colorHarmony} />
            <Field label="Estética" value={td?.visualAesthetic} />
          </div>

          <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-3.5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">Paleta dominante</p>
              <span className="text-[10px] text-white/40">Clique para copiar o HEX</span>
            </div>
            <div className="flex gap-2">
              {(td?.colorPalette || []).map((c, i) => (
                <button
                  key={i}
                  onClick={() => onCopy(c, `Cor ${c}`)}
                  className="group flex-1 overflow-hidden rounded-xl border border-white/10 transition hover:-translate-y-0.5"
                >
                  <span className="block h-10" style={{ backgroundColor: c }} />
                  <span className="block bg-black/40 py-1 text-center font-mono text-[10px] text-white/70 group-hover:text-white">
                    {c}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-3.5">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-white/50">
              <span>Granulação de película</span>
              <span className="text-white/80">{td?.filmGrain ?? 0}%</span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
                style={{ width: `${Math.min(100, Math.max(0, td?.filmGrain ?? 0))}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {tab === "images" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {sentImages.map((img) => {
            const hasValidThumb = Boolean(img.src && !failedIndices.has(img.index));
            return (
              <div
                key={img.index}
                className={`overflow-hidden rounded-2xl border ${
                  img.isPrimary ? "border-primary/40 bg-primary/[0.04]" : "border-white/10 bg-white/[0.02]"
                }`}
              >
                <div
                  onClick={() => hasValidThumb && setLightboxIndex(img.index)}
                  className={`relative aspect-video w-full bg-[#0b0e12] ${hasValidThumb ? "cursor-zoom-in" : ""}`}
                >
                  {hasValidThumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img loading="lazy" decoding="async"
                      src={img.src}
                      alt={img.label}
                      onError={() => markFailed(img.index)}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-white/40">
                      <span className="text-2xl">🖼️</span>
                      <span className="text-[11px]">Miniatura não registrada nesta análise antiga</span>
                    </div>
                  )}
                  <span
                    className={`absolute left-2.5 top-2.5 rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                      img.isPrimary ? "bg-primary text-on-primary" : "bg-black/80 text-cyan-300 border border-cyan-400/30"
                    }`}
                  >
                    {img.role}
                  </span>
                </div>
                <div className="p-3.5">
                  <p className="text-sm font-bold text-white">{img.label}</p>
                  <p className="mt-1 text-xs text-white/65">{img.details}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "prompts" && (
        <div className="flex flex-col gap-2.5">
          <div className="flex justify-end">
            <button
              onClick={() =>
                onCopy(promptBlocks.map((b) => `## ${b.label}\n${b.text}`).join("\n\n"), "Todos os prompts")
              }
              className="text-[11px] font-semibold text-primary hover:underline"
            >
              Copiar todos
            </button>
          </div>
          {promptBlocks.map((b) => (
            <div
              key={b.key}
              className={`rounded-2xl border p-3.5 ${
                b.tone === "neg" ? "border-rose-500/20 bg-rose-500/5" : "border-white/5 bg-white/[0.03]"
              }`}
            >
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${b.tone === "neg" ? "text-rose-300" : "text-white/60"}`}>
                  {b.label}
                </span>
                <button
                  onClick={() => onCopy(b.text!, b.label)}
                  className="rounded-lg bg-white/5 px-2 py-1 text-[10px] font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
                >
                  Copiar
                </button>
              </div>
              <p className={`whitespace-pre-wrap text-[11.5px] leading-relaxed text-white/85 ${b.mono ? "font-mono" : ""}`}>
                {b.text}
              </p>
            </div>
          ))}
        </div>
      )}

      {tab === "continuity" && result.continuityReport && (
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
            <div className="flex items-end justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">Score de continuidade</p>
              <p className="text-2xl font-black text-white">{score}%</p>
            </div>
            <div className="mt-2 h-2 rounded-full bg-white/10">
              <div className={`h-full rounded-full ${scoreColor}`} style={{ width: `${score}%` }} />
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            <Field label="Personagem" value={result.continuityReport.characterConsistency} />
            <Field label="Luz" value={result.continuityReport.lightingConsistency} />
            <Field label="Espaço / Cenografia" value={result.continuityReport.spatialConsistency} />
          </div>
          {result.continuityReport.discrepancies?.length > 0 && (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-3.5">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-rose-300">Quebras de raccord</p>
              <ul className="space-y-1.5 text-xs text-white/80">
                {result.continuityReport.discrepancies.map((d, i) => (
                  <li key={i} className="flex gap-2"><span className="text-rose-400">•</span>{d}</li>
                ))}
              </ul>
            </div>
          )}
          {result.continuityReport.alignmentRecommendations?.length > 0 && (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3.5">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-primary">Recomendações</p>
              <ul className="space-y-1.5 text-xs text-white/80">
                {result.continuityReport.alignmentRecommendations.map((d, i) => (
                  <li key={i} className="flex gap-2"><span className="text-primary">✓</span>{d}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {tab === "params" && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-white/50">
            Estes {paramEntries.length} parâmetros serão mesclados na configuração do projeto ao clicar em{" "}
            <strong className="text-white/80">Aplicar ao projeto</strong>.
          </p>
          <div className="overflow-hidden rounded-2xl border border-white/5">
            {paramEntries.map(([k, v], i) => (
              <div
                key={k}
                className={`grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-3 px-3.5 py-2 text-xs ${i % 2 ? "bg-white/[0.02]" : ""}`}
              >
                <code className="truncate font-mono text-[11px] text-primary">{k}</code>
                <span className="break-words text-white/80">{typeof v === "string" ? v : JSON.stringify(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox para visualizar qualquer uma das imagens enviadas em tamanho grande */}
      {lightboxEntry && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setLightboxIndex(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/15 bg-[#12161b] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                    lightboxEntry.isPrimary
                      ? "bg-primary text-on-primary"
                      : "bg-cyan-400/15 text-cyan-300 border border-cyan-400/30"
                  }`}
                >
                  {lightboxEntry.role}
                </span>
                <h4 className="truncate text-sm font-bold text-white">{lightboxEntry.label}</h4>
                <span className="hidden sm:inline text-xs text-white/45">— {lightboxEntry.details}</span>
              </div>
              <button
                type="button"
                onClick={() => setLightboxIndex(null)}
                className="rounded-xl bg-white/5 px-3 py-1 text-xs font-bold text-white/70 hover:bg-white/15 hover:text-white"
              >
                ✕ Fechar
              </button>
            </div>

            <div className="relative flex flex-1 items-center justify-center bg-black/60 p-4 min-h-[320px]">
              {lightboxEntry.src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img loading="lazy" decoding="async"
                  src={lightboxEntry.src}
                  alt={lightboxEntry.label}
                  className="max-h-[68vh] w-auto max-w-full rounded-xl object-contain"
                />
              ) : (
                <p className="text-xs text-white/50">Imagem indisponível</p>
              )}

              {sentImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setLightboxIndex((cur) => ((cur ?? 0) - 1 + sentImages.length) % sentImages.length)
                    }
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/70 px-3 py-2 text-sm font-bold text-white hover:bg-primary-fixed hover:text-black"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() => setLightboxIndex((cur) => ((cur ?? 0) + 1) % sentImages.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/70 px-3 py-2 text-sm font-bold text-white hover:bg-primary-fixed hover:text-black"
                  >
                    ›
                  </button>
                </>
              )}
            </div>

            {sentImages.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto border-t border-white/10 bg-[#0e1217] px-5 py-3">
                {sentImages.map((img) => (
                  <button
                    key={img.index}
                    type="button"
                    onClick={() => setLightboxIndex(img.index)}
                    className={`flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-left transition flex-shrink-0 ${
                      img.index === lightboxEntry.index
                        ? "border-primary bg-primary/15 text-white"
                        : "border-white/10 bg-white/[0.02] text-white/60 hover:text-white"
                    }`}
                  >
                    {img.src && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img loading="lazy" decoding="async" src={img.src} alt={img.label} className="h-8 w-12 rounded object-cover" />
                    )}
                    <div>
                      <p className="text-[10px] font-bold">{img.role}</p>
                      <p className="max-w-[120px] truncate text-[10px] text-white/70">{img.label}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
