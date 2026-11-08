"use client";

import { Spinner } from "@/components/ui/spinner";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type {
  AnalysisMode,
  ModelTier,
  CinematicAnalysisResult,
} from "@/modules/cinematic-analysis/cinematic-analysis.schema";
import { AnalysisResultPanel, MODE_META } from "./analysis/analysis-result-panel";
import { GENRE_OPTIONS } from "@/config/genres";
import {
  fileToOptimizedDataUrl,
  urlToRasterDataUrl,
  makeThumbnail,
  loadThumbs,
  saveThumb,
  loadFavorites,
  saveFavorites,
} from "./analysis/image-utils";

interface ProjectSummary {
  id: string;
  title: string;
  genre?: string | null;
  configuration?: any;
}

interface ReferenceItem {
  id: string;
  title: string;
  badge: string;
  category?: string;
  imageUrl: string;
  description: string;
  technicalTag: string;
}

interface UploadedImageItem {
  id: string;
  name: string;
  dataUrl: string;
  thumbnailUrl: string;
  isPrimary: boolean;
  aspects: string[];
  customInstruction: string;
}

interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

type Source = "library" | "upload";

const LAST_PROJECT_KEY = "tomadix.studio.lastProject";
const MODES: AnalysisMode[] = ["TECHNICAL_ANALYSIS", "REVERSE_ENGINEERING", "VISUAL_CONTINUITY", "STYLE_REPRODUCTION"];
const LOADING_STEPS = [
  "Preparando as imagens…",
  "Enviando ao modelo multimodal Gemini…",
  "Analisando imagem principal e referências auxiliares…",
  "Combinando parâmetros e gerando prompts…",
];

/** Aspectos cinematográficos selecionáveis para extrair de cada imagem auxiliar */
const AUXILIARY_ASPECT_OPTIONS: Array<{ id: string; label: string; icon: string }> = [
  { id: "Iluminação", label: "Iluminação", icon: "💡" },
  { id: "Paleta & Cores", label: "Paleta & Cores", icon: "🎨" },
  { id: "Lente & Abertura", label: "Lente & Abertura", icon: "📷" },
  { id: "Enquadramento & Ângulo", label: "Enquadramento & Ângulo", icon: "📐" },
  { id: "Movimento de Câmera", label: "Movimento", icon: "🎥" },
  { id: "Película & Granulação", label: "Película & Grão", icon: "🎞️" },
  { id: "Estilo & Atmosfera", label: "Estilo & Atmosfera", icon: "✨" },
  { id: "Personagem & Figurino", label: "Personagem / Figurino", icon: "👤" },
  { id: "Cenário & Ambiente", label: "Cenário / Ambiente", icon: "🏙️" },
];

const DEFAULT_REFERENCES: ReferenceItem[] = [
  {
    id: "ref_main_vibe",
    title: "Neon Noir • Rua chuvosa à noite",
    badge: "NEON",
    category: "Estética & Iluminação",
    imageUrl: "/studio-references/neon-noir.webp",
    description: "Close-up sob letreiros neon magenta e ciano, reflexos molhados e fundo desfocado.",
    technicalTag: "85mm • f/1.4 • Neon Noir",
  },
  {
    id: "ref_portrait_motion",
    title: "Câmera na mão • Movimento",
    badge: "MOVIMENTO",
    category: "Movimento & Câmera",
    imageUrl: "/studio-references/motion-blur.webp",
    description: "Plataforma de metrô com borrão de movimento e rastros de luz — sensação documental.",
    technicalTag: "35mm • 1/15s • Handheld",
  },
  {
    id: "ref_high_fashion",
    title: "Chiaroscuro • Luz dura lateral",
    badge: "CONTRASTE",
    category: "Iluminação Cinematográfica",
    imageUrl: "/studio-references/chiaroscuro.webp",
    description: "Retrato com uma única luz lateral: metade do rosto em sombra profunda.",
    technicalTag: "85mm • f/2.0 • Low Key",
  },
  {
    id: "ref_golden_dusk",
    title: "Golden Hour • Pôr do sol anamórfico",
    badge: "GOLDEN HOUR",
    category: "Color Grading & Tom",
    imageUrl: "/studio-references/golden-hour.webp",
    description: "Contraluz dourado no fim de tarde com flare horizontal de lente anamórfica.",
    technicalTag: "Anamórfico 40mm • 2.39:1 • 3200K",
  },
  {
    id: "ref_monochrome_film",
    title: "Preto e branco • Grão de película",
    badge: "P&B 35MM",
    category: "Película & Textura",
    imageUrl: "/studio-references/black-white-grain.webp",
    description: "Fotografia analógica P&B com grão marcante e halation nas altas luzes.",
    technicalTag: "35mm • Grão 60% • Tri-X 400",
  },
  {
    id: "ref_natural_soft",
    title: "Luz de janela • Natural e suave",
    badge: "LUZ NATURAL",
    category: "Iluminação Cinematográfica",
    imageUrl: "/studio-references/soft-window-light.webp",
    description: "Luz difusa de dia nublado entrando pela janela, sombras suaves e paleta nórdica.",
    technicalTag: "50mm • f/2.8 • 5600K",
  },
];

/** Imagem com fallback elegante caso a URL esteja quebrada. */
export function SafeThumb({
  src,
  alt,
  fallback,
  className,
}: {
  src?: string;
  alt: string;
  fallback: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (!src || failed) {
    return <div className="flex h-full w-full items-center justify-center text-2xl opacity-50">{fallback}</div>;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

function StepTitle({ n, title, extra }: { n: number; title: string; extra?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary ring-1 ring-primary/30">
          {n}
        </span>
        <h3 className="text-sm font-bold text-white">{title}</h3>
      </div>
      {extra}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Componente principal                                                */
/* ------------------------------------------------------------------ */
export function CinematicStudioWorkflow() {
  // Projeto e Gate de Seleção/Criação Inicial
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [projectsLoading, setProjectsLoading] = useState<boolean>(true);
  const [projectId, setProjectId] = useState<string>("");
  const [projectConfirmed, setProjectConfirmed] = useState<boolean>(false);

  // Criação de novo projeto diretamente no /studio
  const [newProjectTitle, setNewProjectTitle] = useState<string>("");
  const [newProjectDescription, setNewProjectDescription] = useState<string>("");
  const [newProjectGenre, setNewProjectGenre] = useState<string>("Ficção Científica");
  const [newProjectAspectRatio, setNewProjectAspectRatio] = useState<"16:9" | "9:16" | "2.39:1" | "4:3" | "1:1">("16:9");
  const [isCreatingProject, setIsCreatingProject] = useState<boolean>(false);
  const [createProjectError, setCreateProjectError] = useState<string | null>(null);

  // Configuração da análise
  const [references, setReferences] = useState<ReferenceItem[]>(DEFAULT_REFERENCES);
  const [source, setSource] = useState<Source>("library");
  const [selectedRefId, setSelectedRefId] = useState<string>(DEFAULT_REFERENCES[0].id);
  const [uploadedImages, setUploadedImages] = useState<UploadedImageItem[]>([]);
  const [comparisonImage, setComparisonImage] = useState<string | null>(null);
  const [mode, setMode] = useState<AnalysisMode>("TECHNICAL_ANALYSIS");
  const [modelTier, setModelTier] = useState<ModelTier>("flash");
  const [notes, setNotes] = useState("");
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);

  // Resultados
  const [sessionResults, setSessionResults] = useState<CinematicAnalysisResult[]>([]);
  const [historyResults, setHistoryResults] = useState<CinematicAnalysisResult[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState<"all" | "favorites">("all");
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Feedback
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pendingDelete, setPendingDelete] = useState<{ ids: string[]; label: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const resultRef = useRef<HTMLDivElement>(null);
  const multiFileInputRef = useRef<HTMLInputElement>(null);
  const comparisonInputRef = useRef<HTMLInputElement>(null);

  const notify = useCallback((message: string, type: Toast["type"] = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  /* ---------------- Carregamento inicial ---------------- */
  useEffect(() => {
    setThumbs(loadThumbs());
    setFavorites(loadFavorites());

    setProjectsLoading(true);
    fetch("/api/projects?limit=50")
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((data) => {
        const list: ProjectSummary[] = Array.isArray(data) ? data : data.data || [];
        setProjects(list);
        const fromUrl = new URLSearchParams(window.location.search).get("projectId");
        const last = localStorage.getItem(LAST_PROJECT_KEY);
        if (fromUrl && list.some((p) => p.id === fromUrl)) {
          setProjectId(fromUrl);
          setProjectConfirmed(true);
        } else {
          const preferred = [last].find((id) => id && list.some((p) => p.id === id));
          setProjectId(preferred || list[0]?.id || "");
        }
      })
      .catch(() => {})
      .finally(() => setProjectsLoading(false));
  }, []);

  // Histórico + referências (carrega quando o projeto foi confirmado ou trocado)
  useEffect(() => {
    if (!projectConfirmed) return;
    let cancelled = false;
    setHistoryLoading(true);
    const qs = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";
    fetch(`/api/cinematic-analysis${qs}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        if (Array.isArray(data.defaultReferences) && data.defaultReferences.length > 0) {
          setReferences(data.defaultReferences);
          setSelectedRefId((cur) => cur || data.defaultReferences[0]?.id || "");
        }
        setHistoryResults(Array.isArray(data.history) ? data.history : []);
      })
      .catch(() => {})
      .finally(() => !cancelled && setHistoryLoading(false));
    if (projectId) localStorage.setItem(LAST_PROJECT_KEY, projectId);
    return () => {
      cancelled = true;
    };
  }, [projectId, projectConfirmed]);

  // Criar novo projeto de destino diretamente no /studio
  const handleCreateDestinationProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectTitle.trim() || isCreatingProject) return;

    setIsCreatingProject(true);
    setCreateProjectError(null);
    try {
      const activeResult = selectedResult || sessionResults[0];
      const analyzedFilmGrain =
        activeResult?.technicalData?.filmGrain !== undefined
          ? Number(activeResult.technicalData.filmGrain)
          : 25;

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newProjectTitle.trim(),
          description: newProjectDescription.trim(),
          genre: newProjectGenre.trim() || "Ficção Científica",
          language: "pt-BR",
          configuration: {
            aspectRatio: newProjectAspectRatio,
            targetPlatform: "Google Flow",
            filmGrain: analyzedFilmGrain,
            colorGrade:
              activeResult?.technicalData?.colorHarmony ||
              activeResult?.technicalData?.visualAesthetic ||
              undefined,
            parameterSettings: {
              values: {
                nivel_granulacao_pelicula: analyzedFilmGrain,
              },
            },
          },
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.error || "Não foi possível criar o projeto.");
      }
      const created: ProjectSummary = payload.data;
      setProjects((prev) => [created, ...prev]);
      setProjectId(created.id);
      setSessionResults([]);
      setSelectedResultId(null);
      setProjectConfirmed(true);
      setNewProjectTitle("");
      setNewProjectDescription("");
      notify(`Projeto "${created.title}" criado e selecionado como destino!`);
    } catch (err: any) {
      const msg = err?.message || "Erro ao criar o projeto.";
      setCreateProjectError(msg);
      notify(msg, "error");
    } finally {
      setIsCreatingProject(false);
    }
  };

  // Mensagens progressivas durante a análise
  useEffect(() => {
    if (!isAnalyzing) return;
    setLoadingStep(0);
    const t = setInterval(() => setLoadingStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1)), 2200);
    return () => clearInterval(t);
  }, [isAnalyzing]);

  /* ---------------- Derivados ---------------- */
  const selectedProject = projects.find((p) => p.id === projectId);
  const selectedRef = references.find((r) => r.id === selectedRefId);

  const primaryUploadedImage = useMemo(
    () => uploadedImages.find((img) => img.isPrimary) || uploadedImages[0] || null,
    [uploadedImages]
  );
  const auxiliaryUploadedImages = useMemo(
    () => (primaryUploadedImage ? uploadedImages.filter((img) => img.id !== primaryUploadedImage.id) : []),
    [uploadedImages, primaryUploadedImage]
  );

  const allResults = useMemo(() => {
    const seen = new Set<string>();
    return [...sessionResults, ...historyResults].filter((r) => {
      if (!r?.id || seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });
  }, [sessionResults, historyResults]);

  const visibleResults =
    historyFilter === "favorites" ? allResults.filter((r) => favorites.has(r.id)) : allResults;

  const selectedResult = allResults.find((r) => r.id === selectedResultId) || null;

  /** Resolve a miniatura da imagem principal enviada para análise */
  const thumbFor = useCallback(
    (r: CinematicAnalysisResult): string | undefined => {
      if (thumbs[r.id]) return thumbs[r.id];
      if (r.imageUrl) {
        // Se for dataURL completo (não truncado) ou caminho local/http válido
        if (r.imageUrl.startsWith("data:image/") && !r.imageUrl.endsWith("...")) {
          return r.imageUrl;
        }
        if (r.imageUrl.startsWith("/") || r.imageUrl.startsWith("http")) {
          return r.imageUrl;
        }
      }
      // Fallback para referências conhecidas pelo título
      if (r.referenceTitle) {
        const matchedRef = references.find((ref) => r.referenceTitle?.includes(ref.title));
        if (matchedRef) return matchedRef.imageUrl;
        if (r.referenceTitle.toLowerCase().includes("cyber") || r.referenceTitle.toLowerCase().includes("neon")) {
          return "/studio-references/neon-noir.webp";
        }
      }
      return undefined;
    },
    [thumbs, references]
  );

  const primaryImageReady = source === "library" ? !!selectedRef : uploadedImages.length > 0;
  // No modo Continuidade: se o usuário subiu 2+ imagens no upload, a(s) imagem(ns) auxiliar(es) já servem de comparação;
  // se subiu apenas 1 ou está na Biblioteca, exige comparisonImage ou mais uma imagem.
  const hasContinuitySecondImage =
    (source === "upload" && uploadedImages.length >= 2) || Boolean(comparisonImage);
  const needsComparison = mode === "VISUAL_CONTINUITY";
  const validationMessage = !primaryImageReady
    ? source === "upload"
      ? "Envie pelo menos uma imagem para analisar."
      : "Selecione uma referência da biblioteca."
    : needsComparison && !hasContinuitySecondImage
    ? "No modo Continuidade, envie pelo menos 2 imagens ou adicione a Tomada B."
    : null;

  /* ---------------- Manipulação de Upload Múltiplo ---------------- */
  const addFilesToUpload = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList);
      if (files.length === 0) return;

      const addedItems: UploadedImageItem[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const dataUrl = await fileToOptimizedDataUrl(file);
          const thumbnailUrl = await makeThumbnail(dataUrl);
          const cleanName = file.name.replace(/\.[^.]+$/, "");
          addedItems.push({
            id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${i}`,
            name: cleanName || `Imagem ${i + 1}`,
            dataUrl,
            thumbnailUrl,
            isPrimary: false,
            aspects: [],
            customInstruction: "",
          });
        } catch (err: any) {
          notify(`${file.name}: ${err?.message || "Falha ao processar imagem."}`, "error");
        }
      }

      if (addedItems.length === 0) return;

      setUploadedImages((prev) => {
        const next = [...prev, ...addedItems];
        // Garante que exista exatamente uma imagem principal
        if (!next.some((item) => item.isPrimary) && next.length > 0) {
          next[0] = { ...next[0], isPrimary: true };
        }
        return next;
      });
      setSource("upload");
      if (addedItems.length > 1) {
        notify(`${addedItems.length} imagens adicionadas. Escolha a Principal e o que extrair das demais!`, "info");
      }
    },
    [notify]
  );

  const handleSetPrimaryImage = (id: string) => {
    setUploadedImages((prev) =>
      prev.map((item) => ({
        ...item,
        isPrimary: item.id === id,
      }))
    );
  };

  const handleRemoveUploadedImage = (id: string) => {
    setUploadedImages((prev) => {
      const filtered = prev.filter((item) => item.id !== id);
      if (filtered.length > 0 && !filtered.some((item) => item.isPrimary)) {
        filtered[0] = { ...filtered[0], isPrimary: true };
      }
      return filtered;
    });
  };

  const handleToggleAuxAspect = (id: string, aspectId: string) => {
    setUploadedImages((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const exists = item.aspects.includes(aspectId);
        return {
          ...item,
          aspects: exists ? item.aspects.filter((a) => a !== aspectId) : [...item.aspects, aspectId],
        };
      })
    );
  };

  const handleChangeAuxInstruction = (id: string, text: string) => {
    setUploadedImages((prev) =>
      prev.map((item) => (item.id === id ? { ...item, customInstruction: text } : item))
    );
  };

  const handleComparisonFile = async (file: File) => {
    try {
      const dataUrl = await fileToOptimizedDataUrl(file);
      setComparisonImage(dataUrl);
    } catch (err: any) {
      notify(err?.message || "Falha ao ler a imagem.", "error");
    }
  };

  // Colar uma ou mais imagens com Ctrl+V
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const imageFiles = Array.from(e.clipboardData?.items || [])
        .filter((i) => i.type.startsWith("image/"))
        .map((i) => i.getAsFile())
        .filter((f): f is File => Boolean(f));
      if (imageFiles.length === 0) return;
      e.preventDefault();
      addFilesToUpload(imageFiles);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [addFilesToUpload]);

  /* ---------------- Executar Análise ---------------- */
  const handleAnalyze = useCallback(async () => {
    if (isAnalyzing) return;
    if (validationMessage) {
      notify(validationMessage, "error");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

    try {
      let image: string;
      let thumbnailUrl: string;
      let referenceTitle: string;
      let auxiliaryImagesPayload:
        | Array<{
            image: string;
            thumbnailUrl?: string;
            label: string;
            aspects: string[];
            customInstruction?: string;
          }>
        | undefined;

      if (source === "upload" && primaryUploadedImage) {
        image = primaryUploadedImage.dataUrl;
        thumbnailUrl = primaryUploadedImage.thumbnailUrl;
        referenceTitle =
          uploadedImages.length > 1
            ? `${primaryUploadedImage.name} (+${uploadedImages.length - 1} ref${uploadedImages.length > 2 ? "s" : ""})`
            : primaryUploadedImage.name || "Upload personalizado";

        if (auxiliaryUploadedImages.length > 0) {
          auxiliaryImagesPayload = auxiliaryUploadedImages.map((aux, idx) => ({
            image: aux.dataUrl,
            thumbnailUrl: aux.thumbnailUrl,
            label: aux.name || `Imagem ${idx + 2}`,
            aspects: aux.aspects,
            customInstruction: aux.customInstruction.trim() || undefined,
          }));
        }
      } else {
        referenceTitle = selectedRef!.title;
        thumbnailUrl = selectedRef!.imageUrl;
        if (selectedRef!.imageUrl.toLowerCase().endsWith(".svg")) {
          try {
            image = await urlToRasterDataUrl(selectedRef!.imageUrl);
          } catch {
            image = selectedRef!.imageUrl;
          }
        } else {
          image = selectedRef!.imageUrl;
        }
      }

      const res = await fetch("/api/cinematic-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          image,
          thumbnailUrl,
          comparisonImage: needsComparison ? comparisonImage || undefined : undefined,
          auxiliaryImages: auxiliaryImagesPayload,
          projectId: projectId || undefined,
          userNotes: notes.trim() || undefined,
          modelTier,
          referenceTitle,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Falha ao processar a análise.");

      const result: CinematicAnalysisResult = payload.data;

      // Salva miniatura da imagem principal enviada para análise no cache local e estado
      setThumbs(saveThumb(result.id, thumbnailUrl));

      setSessionResults((prev) => [result, ...prev]);
      setSelectedResultId(result.id);
      notify(projectId ? "Análise concluída e salva no histórico do projeto." : "Análise concluída.");
    } catch (err: any) {
      const msg = err?.message || "Não foi possível analisar a imagem.";
      setAnalysisError(msg);
      notify(msg, "error");
    } finally {
      setIsAnalyzing(false);
    }
  }, [
    isAnalyzing,
    validationMessage,
    source,
    primaryUploadedImage,
    uploadedImages.length,
    auxiliaryUploadedImages,
    selectedRef,
    mode,
    needsComparison,
    comparisonImage,
    projectId,
    notes,
    modelTier,
    notify,
  ]);

  // Atalho Ctrl/Cmd + Enter
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleAnalyze();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleAnalyze]);

  const handleApply = async (result: CinematicAnalysisResult) => {
    if (!projectId) {
      notify("Selecione um projeto para aplicar os parâmetros.", "error");
      return;
    }
    if (result.isFallback) {
      notify("Este resultado é genérico (a IA não respondeu). Refaça a análise antes de aplicar.", "error");
      return;
    }
    setIsApplying(true);
    try {
      const res = await fetch("/api/cinematic-analysis/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          parameterSettings: result.parameterSettings,
          technicalData: result.technicalData,
          prompts: result.prompts,
          analysisId: result.id,
          isFallback: Boolean(result.isFallback),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erro ao aplicar parâmetros.");
      notify(data.message || "Parâmetros cinematográficos aplicados ao projeto com sucesso!");
    } catch (err: any) {
      notify(err?.message || "Falha ao aplicar parâmetros.", "error");
    } finally {
      setIsApplying(false);
    }
  };

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      notify(`${label} copiado!`, "info");
    } catch {
      notify("Não foi possível copiar.", "error");
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    const ids = pendingDelete.ids;
    setIsDeleting(true);
    try {
      const results = await Promise.allSettled(
        ids.map((id) =>
          fetch(`/api/cinematic-analysis/${encodeURIComponent(id)}`, { method: "DELETE" }).then(async (res) => {
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              throw new Error(data.error || "Erro ao excluir análise.");
            }
          })
        )
      );
      const failedIds = new Set(ids.filter((_, i) => results[i].status === "rejected"));
      const removed = new Set(ids.filter((id) => !failedIds.has(id)));

      setSessionResults((prev) => prev.filter((r) => !removed.has(r.id)));
      setHistoryResults((prev) => prev.filter((r) => !removed.has(r.id)));
      setFavorites((prev) => {
        const next = new Set(Array.from(prev).filter((id) => !removed.has(id)));
        saveFavorites(next);
        return next;
      });
      if (selectedResultId && removed.has(selectedResultId)) setSelectedResultId(null);

      if (failedIds.size > 0) {
        const firstError = results.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
        notify(firstError?.reason?.message || `${failedIds.size} análise(s) não puderam ser excluídas.`, "error");
      } else {
        notify(removed.size > 1 ? `${removed.size} análises excluídas.` : "Análise excluída.");
      }
      setPendingDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveFavorites(next);
      return next;
    });
  };

  // Lista consolidada de aspectos delegados às imagens auxiliares
  const delegatedAspectsList = useMemo(() => {
    const set = new Set<string>();
    auxiliaryUploadedImages.forEach((aux) => {
      aux.aspects.forEach((a) => set.add(a));
    });
    return Array.from(set);
  }, [auxiliaryUploadedImages]);

  /* ---------------- Render ---------------- */
  return (
    <div className="min-h-dvh bg-[#0e1217] pb-24 font-sans text-[#e0e3e8]">
      {/* Cabeçalho da página */}
      <div className="border-b border-white/5 bg-[#11151a]">
        <div className="flex w-full flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Estúdio · IA Multimodal</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Análise Cinematográfica
            </h1>
            <p className="mt-1 max-w-2xl text-xs text-white/50 sm:text-sm">
              Envie uma ou várias imagens, defina a imagem Principal e combine atributos específicos (como iluminação,
              cor ou lente) de outras referências.
            </p>
          </div>

          {projectConfirmed && (
            <div className="flex flex-col gap-1.5 md:items-end">
              <label htmlFor="studio-project" className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                Projeto de destino ativo
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  id="studio-project"
                  value={projectId}
                  onChange={(e) => {
                    setProjectId(e.target.value);
                    setSessionResults([]);
                    setSelectedResultId(null);
                  }}
                  className="min-w-[220px] rounded-xl border border-white/10 bg-[#181c21] px-3 py-2 text-sm font-semibold text-white focus:border-primary focus:outline-none"
                >
                  <option value="">Sem projeto (não salva histórico)</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setProjectConfirmed(false)}
                  className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-bold text-primary transition hover:bg-primary/20"
                  title="Criar novo projeto de destino ou alterar contexto"
                >
                  + Novo / Trocar projeto
                </button>
                {selectedProject && (
                  <>
                    <span className="rounded-lg bg-white/5 px-2 py-1 text-[11px] font-semibold text-white/60">
                      {selectedProject.configuration?.aspectRatio || "16:9"}
                    </span>
                    <Link
                      href={`/projects/${selectedProject.id}`}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 transition hover:border-primary/40 hover:text-white"
                    >
                      Abrir ↗
                    </Link>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {!projectConfirmed ? (
        <div className="w-full px-4 pt-8 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-white/10 bg-[#12161b] p-6 sm:p-8 shadow-2xl">
            <div className="flex flex-col gap-2 border-b border-white/5 pb-6">
              <div className="inline-flex items-center gap-2 self-start rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
                <span>🎬</span>
                <span>Etapa Inicial · Defina o Projeto de Destino</span>
              </div>
              <h2 className="mt-1 text-xl font-extrabold text-white sm:text-2xl">
                Em qual projeto você deseja realizar suas análises cinematográficas?
              </h2>
              <p className="text-xs text-white/55 sm:text-sm">
                Selecione um projeto existente, crie um novo projeto agora mesmo ou prossiga sem vínculo. Todas as
                análises, parâmetros da Bíblia Visual e histórico serão carregados no contexto escolhido.
              </p>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* Coluna 1: Selecionar projeto existente ou continuar sem projeto */}
              <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#151a20] p-5 lg:col-span-7">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white/80">
                      1. Selecionar Projeto Existente
                    </h3>
                    <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-[11px] font-semibold text-white/50">
                      {projects.length} {projects.length === 1 ? "projeto disponível" : "projetos disponíveis"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-white/45">
                    Escolha um projeto para vincular automaticamente suas análises e salvar no histórico da produção.
                  </p>

                  {projectsLoading ? (
                    <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-20 animate-pulse rounded-2xl bg-white/5" />
                      ))}
                    </div>
                  ) : projects.length === 0 ? (
                    <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-center">
                      <p className="text-xs text-white/50">
                        Você ainda não possui projetos cadastrados neste estúdio. Crie um novo projeto ao lado ou
                        continue sem projeto.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4 grid max-h-[340px] grid-cols-1 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-2">
                      {projects.map((p) => {
                        const isSelected = projectId === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setProjectId(p.id);
                              setSessionResults([]);
                              setSelectedResultId(null);
                              setProjectConfirmed(true);
                              notify(`Contexto definido: "${p.title}"`, "info");
                            }}
                            className={`group flex flex-col justify-between rounded-2xl border p-4 text-left transition ${
                              isSelected
                                ? "border-primary/60 bg-primary/10 ring-1 ring-primary/30"
                                : "border-white/10 bg-black/25 hover:border-primary/40 hover:bg-white/[0.04]"
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/70">
                                  {p.genre || "Produção"}
                                </span>
                                <span className="font-mono text-[10px] text-white/45">
                                  {p.configuration?.aspectRatio || "16:9"}
                                </span>
                              </div>
                              <p className="mt-2.5 line-clamp-1 text-sm font-bold text-white group-hover:text-primary">
                                {p.title}
                              </p>
                            </div>
                            <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2 text-[11px] font-semibold text-primary">
                              <span>Usar este projeto</span>
                              <span>→</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Opção de continuar sem projeto */}
                <div className="mt-6 border-t border-white/10 pt-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-bold text-white/80">Prefere analisar sem vínculo com projeto?</p>
                      <p className="text-[11px] text-white/45">
                        Você poderá inspecionar lentes, luz e gerar prompts avulsos sem salvar histórico em projetos.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setProjectId("");
                        setSessionResults([]);
                        setSelectedResultId(null);
                        setProjectConfirmed(true);
                        notify("Modo avulso (sem projeto) ativado.", "info");
                      }}
                      className="shrink-0 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-bold text-white/85 transition hover:border-white/30 hover:bg-white/10"
                    >
                      Continuar sem projeto (Nenhum) →
                    </button>
                  </div>
                </div>
              </div>

              {/* Coluna 2: Criar Novo Projeto de Destino */}
              <div className="rounded-2xl border border-primary/25 bg-gradient-to-b from-primary/10 to-[#151a20] p-5 lg:col-span-5">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/20 text-xs text-primary">
                    ✨
                  </span>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-primary">
                    2. Criar Novo Projeto de Destino
                  </h3>
                </div>
                <p className="mt-1 text-xs text-white/50">
                  Crie uma nova produção agora e inicie a análise cinematográfica diretamente vinculada a ela.
                </p>

                {createProjectError && (
                  <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
                    ⚠️ {createProjectError}
                  </div>
                )}

                <form onSubmit={handleCreateDestinationProject} className="mt-4 space-y-3.5">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-white/70">
                      Nome do Novo Projeto *
                    </label>
                    <input
                      type="text"
                      required
                      value={newProjectTitle}
                      onChange={(e) => setNewProjectTitle(e.target.value)}
                      placeholder="Ex: Comercial Cyber Fashion 2026"
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-white/70">
                        Gênero / Estilo
                      </label>
                      <select
                        value={newProjectGenre}
                        onChange={(e) => setNewProjectGenre(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-[#181c21] px-3 py-2 text-xs font-semibold text-white focus:border-primary focus:outline-none"
                      >
                        {GENRE_OPTIONS.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-white/70">
                        Proporção (Aspect Ratio)
                      </label>
                      <select
                        value={newProjectAspectRatio}
                        onChange={(e) => setNewProjectAspectRatio(e.target.value as any)}
                        className="w-full rounded-xl border border-white/10 bg-[#181c21] px-3 py-2 text-xs font-semibold text-white focus:border-primary focus:outline-none"
                      >
                        <option value="16:9">16:9 (Widescreen)</option>
                        <option value="9:16">9:16 (Vertical / Reels)</option>
                        <option value="2.39:1">2.39:1 (Anamórfico)</option>
                        <option value="4:3">4:3 (Clássico)</option>
                        <option value="1:1">1:1 (Quadrado)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-white/70">
                      Descrição ou Premissa (opcional)
                    </label>
                    <textarea
                      rows={2}
                      value={newProjectDescription}
                      onChange={(e) => setNewProjectDescription(e.target.value)}
                      placeholder="Breve descrição da estética ou objetivo do projeto..."
                      className="w-full rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-white placeholder-white/30 focus:border-primary focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isCreatingProject || !newProjectTitle.trim()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-xs font-extrabold text-on-primary shadow-lg shadow-primary/20 transition hover:brightness-105 disabled:opacity-50"
                  >
                    {isCreatingProject ? (
                      <>
                        <Spinner className="h-3.5 w-3.5 border-2 border-black" />
                        <span>Criando projeto...</span>
                      </>
                    ) : (
                      <>
                        <span>✨ Criar Projeto e Iniciar Análise</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      ) : (
      <main className="grid w-full grid-cols-1 gap-6 px-4 pt-6 sm:px-6 lg:px-8 lg:grid-cols-12">
        {/* ================= COLUNA ESQUERDA: CONFIGURAÇÃO ================= */}
        <aside className="lg:col-span-5 xl:col-span-5">
          <div className="flex flex-col gap-6 rounded-3xl border border-white/5 bg-[#12161b] p-5 lg:sticky lg:top-20">
            {/* 1. Imagens de origem */}
            <section>
              <StepTitle
                n={1}
                title="Imagens da análise"
                extra={
                  <div className="flex rounded-xl border border-white/5 bg-black/30 p-0.5">
                    {(["library", "upload"] as Source[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => setSource(s)}
                        className={`rounded-lg px-3 py-1 text-[11px] font-semibold transition ${
                          source === s ? "bg-white/10 text-white" : "text-white/50 hover:text-white"
                        }`}
                      >
                        {s === "library"
                          ? "Biblioteca"
                          : `Upload${uploadedImages.length > 0 ? ` (${uploadedImages.length})` : ""}`}
                      </button>
                    ))}
                  </div>
                }
              />

              {source === "library" ? (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    {references.map((ref) => {
                      const active = ref.id === selectedRefId;
                      return (
                        <button
                          key={ref.id}
                          onClick={() => setSelectedRefId(ref.id)}
                          title={ref.title}
                          className={`group relative aspect-video overflow-hidden rounded-xl bg-[#0b0e12] transition ${
                            active
                              ? "ring-2 ring-primary shadow-lg shadow-primary/25"
                              : "ring-1 ring-white/10 opacity-75 hover:opacity-100"
                          }`}
                        >
                          <SafeThumb
                            src={ref.imageUrl}
                            alt={ref.title}
                            fallback="🎞️"
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          />
                          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-1.5 pb-1 pt-4 text-left text-[9px] font-bold uppercase leading-tight tracking-wide text-white">
                            {ref.badge}
                          </span>
                          {active && (
                            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-black text-on-primary">
                              ✓
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {selectedRef && (
                    <div className="mt-3 rounded-xl border border-white/5 bg-white/[0.03] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-bold text-white">{selectedRef.title}</p>
                        <span className="flex-shrink-0 rounded bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-primary">
                          {selectedRef.badge}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-white/50">{selectedRef.description}</p>
                      <p className="mt-1.5 font-mono text-[10px] text-white/40">{selectedRef.technicalTag}</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col gap-3">
                  {/* Dropzone para adicionar 1 ou múltiplas imagens */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingFiles(true);
                    }}
                    onDragLeave={() => setIsDraggingFiles(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingFiles(false);
                      if (e.dataTransfer.files?.length) {
                        addFilesToUpload(e.dataTransfer.files);
                      }
                    }}
                    className={`rounded-2xl border-2 border-dashed transition ${
                      isDraggingFiles
                        ? "border-primary bg-primary/10"
                        : "border-white/10 bg-white/[0.02] hover:border-primary/50"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => multiFileInputRef.current?.click()}
                      className={`flex w-full flex-col items-center justify-center text-center ${
                        uploadedImages.length > 0 ? "gap-1 py-3.5 px-4" : "gap-2 py-7 px-4"
                      }`}
                    >
                      <span className={uploadedImages.length > 0 ? "text-xl" : "text-3xl"}>📸</span>
                      <span className="text-xs font-bold text-white">
                        {uploadedImages.length > 0
                          ? "+ Adicionar mais imagens para combinar"
                          : "Arraste uma ou várias imagens, clique ou cole (Ctrl+V)"}
                      </span>
                      <span className="text-[11px] text-white/45">
                         Seleção múltipla liberada · PNG, JPG ou WEBP até 10MB cada
                      </span>
                    </button>
                    <input
                      ref={multiFileInputRef}
                      type="file"
                      multiple
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.length) {
                          addFilesToUpload(e.target.files);
                        }
                        e.target.value = "";
                      }}
                    />
                  </div>

                  {/* Lista de imagens enviadas + escolha da Principal e o que analisar nas demais */}
                  {uploadedImages.length > 0 && (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-white/70">
                          {uploadedImages.length === 1
                            ? "1 imagem enviada (Principal)"
                            : `${uploadedImages.length} imagens · Marque a Principal e o que extrair das demais`}
                        </span>
                        <button
                          type="button"
                          onClick={() => setUploadedImages([])}
                          className="text-[11px] font-semibold text-rose-300/80 hover:text-rose-300"
                        >
                          Remover todas
                        </button>
                      </div>

                      {/* Resumo automático de combinação quando há 2+ imagens */}
                      {uploadedImages.length > 1 && primaryUploadedImage && (
                        <div className="rounded-xl border border-primary/25 bg-primary/[0.06] p-3 text-[11px] leading-relaxed">
                          <p className="font-bold text-primary">Como a IA vai analisar suas imagens:</p>
                          <ul className="mt-1 space-y-1 text-white/80">
                            <li>
                              • <strong className="text-white">{primaryUploadedImage.name} (Principal):</strong> Todos os
                              parâmetros da cena
                              {delegatedAspectsList.length > 0
                                ? `, exceto ${delegatedAspectsList.join(", ")}`
                                : ""}
                            </li>
                            {auxiliaryUploadedImages.map((aux, idx) => (
                              <li key={aux.id}>
                                • <strong className="text-white">{aux.name || `Imagem ${idx + 2}`}:</strong>{" "}
                                {[
                                  ...aux.aspects,
                                  ...(aux.customInstruction.trim() ? [aux.customInstruction.trim()] : []),
                                ].join(", ") || (
                                  <span className="text-amber-300/90">
                                    Selecione abaixo o que extrair desta imagem
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Cards de cada imagem enviada */}
                      <div className="flex flex-col gap-2.5 max-h-[420px] overflow-y-auto pr-1">
                        {uploadedImages.map((img, idx) => {
                          const isPrimary = img.id === primaryUploadedImage?.id;
                          return (
                            <div
                              key={img.id}
                              className={`rounded-2xl border p-3 transition ${
                                isPrimary
                                  ? "border-primary/60 bg-primary/[0.06]"
                                  : "border-white/10 bg-black/30"
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className="relative h-16 w-28 flex-shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img loading="lazy" decoding="async" src={img.thumbnailUrl} alt={img.name} className="h-full w-full object-cover" />
                                  <span
                                    className={`absolute left-1 top-1 rounded px-1.5 py-0.5 text-[9px] font-black uppercase ${
                                      isPrimary ? "bg-primary text-on-primary" : "bg-black/75 text-white/80"
                                    }`}
                                  >
                                    {isPrimary ? "★ Principal" : `#${idx + 1}`}
                                  </span>
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="truncate text-xs font-bold text-white" title={img.name}>
                                      {img.name}
                                    </p>
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                      {!isPrimary && (
                                        <button
                                          type="button"
                                          onClick={() => handleSetPrimaryImage(img.id)}
                                          className="rounded-lg border border-primary/40 bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary transition hover:bg-primary hover:text-on-primary"
                                        >
                                          ☆ Tornar Principal
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveUploadedImage(img.id)}
                                        aria-label="Remover imagem"
                                        className="rounded-lg bg-white/5 px-2 py-1 text-[10px] font-semibold text-white/60 hover:bg-rose-500/20 hover:text-rose-300"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  </div>

                                  {isPrimary ? (
                                    <p className="mt-1 text-[11px] text-primary/90">
                                      Imagem base da análise — fornece todos os parâmetros principais
                                      {delegatedAspectsList.length > 0
                                        ? ` (exceto ${delegatedAspectsList.join(", ")})`
                                        : "."}
                                    </p>
                                  ) : (
                                    <p className="mt-1 text-[10px] text-white/50">
                                      Escolha abaixo quais parâmetros devem vir desta imagem em vez da Principal:
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Seletor de parâmetros para imagens auxiliares */}
                              {!isPrimary && (
                                <div className="mt-3 border-t border-white/10 pt-2.5">
                                  <div className="flex flex-wrap gap-1.5">
                                    {AUXILIARY_ASPECT_OPTIONS.map((opt) => {
                                      const active = img.aspects.includes(opt.id);
                                      return (
                                        <button
                                          key={opt.id}
                                          type="button"
                                          onClick={() => handleToggleAuxAspect(img.id, opt.id)}
                                          className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold transition ${
                                            active
                                              ? "border-primary bg-primary text-on-primary shadow-sm"
                                              : "border-white/10 bg-white/[0.03] text-white/70 hover:border-white/25 hover:text-white"
                                          }`}
                                        >
                                          <span>{opt.icon}</span>
                                          <span>{opt.label}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                  <input
                                    type="text"
                                    value={img.customInstruction}
                                    onChange={(e) => handleChangeAuxInstruction(img.id, e.target.value)}
                                    placeholder="Ou detalhe o que extrair desta imagem (ex: apenas a luz de recorte neon)…"
                                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-2.5 py-1.5 text-[11px] text-white placeholder-white/30 focus:border-primary focus:outline-none"
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* 2. Modo */}
            <section>
              <StepTitle n={2} title="O que você quer descobrir?" />
              <div className="grid grid-cols-2 gap-2">
                {MODES.map((m) => {
                  const meta = MODE_META[m];
                  const active = mode === m;
                  return (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={`flex flex-col items-start gap-1 rounded-xl border p-2.5 text-left transition ${
                        active
                          ? "border-primary/50 bg-primary/10"
                          : "border-white/5 bg-white/[0.02] hover:border-white/15"
                      }`}
                    >
                      <span className={`text-xs font-bold ${active ? "text-primary" : "text-white"}`}>
                        {meta.icon} {meta.label}
                      </span>
                      <span className="text-[10px] leading-snug text-white/45">{meta.description}</span>
                    </button>
                  );
                })}
              </div>

              {needsComparison && !(source === "upload" && uploadedImages.length >= 2) && (
                <div className="mt-3">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/50">
                    Tomada B (para comparar com a imagem principal)
                  </p>
                  {comparisonImage ? (
                    <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img loading="lazy" decoding="async" src={comparisonImage} alt="Tomada B" className="h-full w-full object-contain" />
                      <div className="absolute inset-x-0 bottom-0 flex justify-end gap-2 bg-gradient-to-t from-black/90 to-transparent p-2">
                        <button
                          type="button"
                          onClick={() => comparisonInputRef.current?.click()}
                          className="rounded-lg bg-white/15 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-white/25"
                        >
                          Trocar
                        </button>
                        <button
                          type="button"
                          onClick={() => setComparisonImage(null)}
                          className="rounded-lg bg-rose-500/80 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-rose-500"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => comparisonInputRef.current?.click()}
                      className="flex w-full flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.02] p-4 text-center hover:border-primary/50"
                    >
                      <span className="text-xl">📸</span>
                      <span className="text-xs font-bold text-white">Enviar Tomada B</span>
                      <span className="text-[11px] text-white/45">
                        Ou suba 2+ imagens na aba Upload acima
                      </span>
                    </button>
                  )}
                  <input
                    ref={comparisonInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleComparisonFile(f);
                      e.target.value = "";
                    }}
                  />
                </div>
              )}
            </section>

            {/* 3. Direção + Modelo */}
            <section>
              <StepTitle n={3} title="Direção e modelo" />
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Opcional: contexto ou foco geral da análise. Ex.: comercial de moda noturno, manter estética anamórfica…"
                className="w-full resize-none rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-white placeholder-white/30 focus:border-primary focus:outline-none"
              />
              <div className="mt-3 grid grid-cols-2 gap-2">
                {(
                  [
                    { id: "flash", label: "⚡ Rápido", desc: "Gemini Flash · segundos" },
                    { id: "pro", label: "🎯 Preciso", desc: "Gemini Pro · mais detalhado" },
                  ] as Array<{ id: ModelTier; label: string; desc: string }>
                ).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setModelTier(t.id)}
                    className={`rounded-xl border p-2.5 text-left transition ${
                      modelTier === t.id
                        ? "border-primary/50 bg-primary/10"
                        : "border-white/5 bg-white/[0.02] hover:border-white/15"
                    }`}
                  >
                    <p className={`text-xs font-bold ${modelTier === t.id ? "text-primary" : "text-white"}`}>{t.label}</p>
                    <p className="text-[10px] text-white/45">{t.desc}</p>
                  </button>
                ))}
              </div>
            </section>

            {/* CTA */}
            <div className="flex flex-col gap-2">
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !!validationMessage}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3.5 text-sm font-bold text-on-primary shadow-lg shadow-primary/25 transition hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
              >
                {isAnalyzing ? (
                  <>
                    <Spinner className="h-4 w-4 border-2 border-on-primary" />
                    Analisando…
                  </>
                ) : source === "upload" && uploadedImages.length > 1 ? (
                  <>✨ Analisar {uploadedImages.length} imagens combinadas</>
                ) : (
                  <>✨ Analisar imagem</>
                )}
              </button>
              <p className="text-center text-[10px] text-white/40">
                {validationMessage ? (
                  <span className="text-amber-300/80">{validationMessage}</span>
                ) : (
                  <>
                    Atalho: <kbd className="rounded bg-white/10 px-1 font-mono">Ctrl</kbd> +{" "}
                    <kbd className="rounded bg-white/10 px-1 font-mono">Enter</kbd>
                  </>
                )}
              </p>
            </div>
          </div>
        </aside>

        {/* ================= COLUNA DIREITA: RESULTADO + HISTÓRICO ================= */}
        <section className="flex flex-col gap-6 lg:col-span-7 xl:col-span-7">
          <div ref={resultRef} className="scroll-mt-24 rounded-3xl border border-white/5 bg-[#12161b] p-5 sm:p-6">
            {isAnalyzing ? (
              <div className="flex flex-col gap-5">
                <div className="flex items-center gap-3">
                  <Spinner className="h-5 w-5 border-2 border-primary" />
                  <p className="text-sm font-semibold text-white">{LOADING_STEPS[loadingStep]}</p>
                </div>
                <div className="flex gap-1.5">
                  {LOADING_STEPS.map((_, i) => (
                    <span
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${i <= loadingStep ? "bg-primary" : "bg-white/10"}`}
                    />
                  ))}
                </div>
                <div className="flex flex-col gap-4 sm:flex-row">
                  <div className="aspect-video w-full animate-pulse rounded-2xl bg-white/5 sm:w-56" />
                  <div className="flex flex-1 flex-col gap-2">
                    <div className="h-4 w-1/3 animate-pulse rounded bg-white/5" />
                    <div className="h-5 w-2/3 animate-pulse rounded bg-white/5" />
                    <div className="h-3 w-full animate-pulse rounded bg-white/5" />
                    <div className="h-3 w-5/6 animate-pulse rounded bg-white/5" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-14 animate-pulse rounded-xl bg-white/5" />
                  ))}
                </div>
              </div>
            ) : selectedResult ? (
              <AnalysisResultPanel
                key={selectedResult.id}
                result={selectedResult}
                thumbnail={thumbFor(selectedResult)}
                isFavorite={favorites.has(selectedResult.id)}
                canApply={!!projectId}
                isApplying={isApplying}
                onToggleFavorite={() => toggleFavorite(selectedResult.id)}
                onApply={() => handleApply(selectedResult)}
                onCopy={handleCopy}
                onReanalyze={handleAnalyze}
                onDelete={() =>
                  setPendingDelete({
                    ids: [selectedResult.id],
                    label: `“${selectedResult.referenceTitle || "Análise"}”`,
                  })
                }
              />
            ) : analysisError ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <span className="text-4xl">⚠️</span>
                <p className="text-sm font-bold text-white">A análise falhou</p>
                <p className="max-w-md text-xs text-white/50">{analysisError}</p>
                <button
                  onClick={handleAnalyze}
                  className="mt-2 rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/15"
                >
                  Tentar novamente
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center py-10 text-center">
                <span className="text-4xl">🎬</span>
                <p className="mt-3 text-base font-bold text-white">Pronto para analisar suas tomadas</p>
                <p className="mt-1 max-w-md text-xs text-white/50">
                  Envie uma ou múltiplas imagens à esquerda, escolha qual é a <strong className="text-white/80">Principal</strong> e quais atributos extrair de cada referência auxiliar.
                </p>
                <div className="mt-6 grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-3">
                  {[
                    { icon: "🖼️", t: "Upload múltiplo", d: "Suba várias imagens e marque a Principal" },
                    { icon: "🎛️", t: "Combine atributos", d: "Ex: cena da Imagem X + iluminação da Imagem Y" },
                    { icon: "📥", t: "Aplique ao projeto", d: "Parâmetros mesclados direto na Bíblia Visual" },
                  ].map((s) => (
                    <div key={s.t} className="rounded-2xl border border-white/5 bg-white/[0.02] p-3 text-left">
                      <p className="text-lg">{s.icon}</p>
                      <p className="mt-1 text-xs font-bold text-white">{s.t}</p>
                      <p className="text-[10px] text-white/45">{s.d}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Histórico */}
          <div className="rounded-3xl border border-white/5 bg-[#12161b] p-5 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white">Histórico de análises</h3>
                <p className="text-[11px] text-white/45">
                  {projectId
                    ? `Análises salvas em “${selectedProject?.title ?? "projeto"}”`
                    : "Sem projeto selecionado: apenas as análises desta sessão"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {visibleResults.length > 0 && (
                  <button
                    onClick={() =>
                      setPendingDelete({
                        ids: visibleResults.map((r) => r.id),
                        label:
                          historyFilter === "favorites"
                            ? `todas as ${visibleResults.length} análises favoritas`
                            : `todas as ${visibleResults.length} análises do histórico`,
                      })
                    }
                    className="rounded-lg border border-rose-500/20 px-2.5 py-1 text-[11px] font-semibold text-rose-300/80 transition hover:bg-rose-500/10 hover:text-rose-300"
                  >
                    🗑 Limpar {historyFilter === "favorites" ? "favoritas" : "tudo"}
                  </button>
                )}
                <div className="flex rounded-xl border border-white/5 bg-black/30 p-0.5">
                  {(
                    [
                      { id: "all", label: `Todas (${allResults.length})` },
                      { id: "favorites", label: `Favoritas (${allResults.filter((r) => favorites.has(r.id)).length})` },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setHistoryFilter(f.id)}
                      className={`rounded-lg px-3 py-1 text-[11px] font-semibold transition ${
                        historyFilter === f.id ? "bg-white/10 text-white" : "text-white/50 hover:text-white"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {historyLoading && allResults.length === 0 ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="aspect-video animate-pulse rounded-2xl bg-white/5" />
                ))}
              </div>
            ) : visibleResults.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 py-10 text-center text-xs text-white/45">
                {historyFilter === "favorites"
                  ? "Nenhuma análise favoritada ainda."
                  : "Nenhuma análise por aqui. Execute a primeira!"}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                {visibleResults.map((r) => {
                  const thumb = thumbFor(r);
                  const active = r.id === selectedResultId;
                  const meta = MODE_META[r.mode] || MODE_META.TECHNICAL_ANALYSIS;
                  const fav = favorites.has(r.id);
                  return (
                    <div
                      key={r.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setSelectedResultId(r.id);
                        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                      onKeyDown={(e) => e.key === "Enter" && setSelectedResultId(r.id)}
                      className={`group relative cursor-pointer overflow-hidden rounded-2xl border bg-[#0b0e12] text-left transition ${
                        active ? "border-primary ring-2 ring-primary/30" : "border-white/10 hover:border-primary/40"
                      }`}
                    >
                      <div className="relative aspect-video bg-gradient-to-br from-[#1a2027] to-[#0c0f13]">
                        <SafeThumb
                          src={thumb}
                          alt={r.referenceTitle || "Análise"}
                          fallback={meta.icon}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPendingDelete({ ids: [r.id], label: `“${r.referenceTitle || "Análise"}”` });
                          }}
                          aria-label="Excluir análise"
                          title="Excluir análise"
                          className="absolute left-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-xs text-white/80 opacity-0 transition hover:bg-rose-500 hover:text-white group-hover:opacity-100 focus:opacity-100"
                        >
                          🗑
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(r.id);
                          }}
                          aria-label={fav ? "Remover dos favoritos" : "Favoritar"}
                          className={`absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full text-sm transition ${
                            fav ? "bg-rose-500 text-white" : "bg-black/50 text-white/70 opacity-0 group-hover:opacity-100 hover:text-white"
                          }`}
                        >
                          {fav ? "♥" : "♡"}
                        </button>
                        {r.auxiliarySummary && r.auxiliarySummary.length > 0 && (
                          <span className="absolute bottom-2 right-1.5 rounded bg-black/75 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                            +{r.auxiliarySummary.length} ref{r.auxiliarySummary.length > 1 ? "s" : ""}
                          </span>
                        )}
                        {r.technicalData?.colorPalette?.length ? (
                          <div className="absolute inset-x-0 bottom-0 flex h-1">
                            {r.technicalData.colorPalette.map((c, i) => (
                              <span key={i} className="flex-1" style={{ backgroundColor: c }} />
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <div className="p-2.5">
                        <p className="truncate text-[11px] font-semibold text-white">{r.referenceTitle || "Análise"}</p>
                        <div className="mt-0.5 flex items-center justify-between gap-1 text-[10px] text-white/45">
                          <span className="truncate">{meta.icon} {meta.label}</span>
                          {r.technicalData?.lensFocalLength && (
                            <span className="flex-shrink-0 font-mono">{r.technicalData.lensFocalLength}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>
      )}

      {/* Confirmação de exclusão */}
      {pendingDelete && (
        <div
          className="fixed inset-0 overflow-y-auto z-50 flex items-center-safe justify-center bg-black/70 p-3 sm:p-4"
          onClick={() => !isDeleting && setPendingDelete(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.key === "Escape" && !isDeleting && setPendingDelete(null)}
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#151a20] p-5 shadow-2xl"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-500/15 text-lg">🗑</div>
            <h4 className="mt-3 text-base font-bold text-white">Excluir análise?</h4>
            <p className="mt-1 text-xs leading-relaxed text-white/55">
              Você está prestes a excluir {pendingDelete.label}. Essa ação é permanente e não pode ser desfeita.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                autoFocus
                disabled={isDeleting}
                onClick={() => setPendingDelete(null)}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-white/80 hover:bg-white/5 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2 text-xs font-bold text-white hover:bg-rose-400 disabled:opacity-60"
              >
                {isDeleting && <Spinner className="h-3.5 w-3.5 border-2 border-white" />}
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
      <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-xl border px-4 py-2.5 text-xs font-semibold shadow-2xl ${
              t.type === "success"
                ? "border-primary/30 bg-surface-container text-primary"
                : t.type === "error"
                ? "border-rose-500/30 bg-rose-950/90 text-rose-200"
                : "border-white/10 bg-[#1a1f25]/95 text-white/85"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
