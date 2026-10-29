"use client";

import Link from "next/link";
import { StudioFeedItem } from "@/app/api/studio/feed/route";

interface StudioContentCardProps {
  item: StudioFeedItem;
  onDuplicate?: (item: StudioFeedItem) => void;
  onDelete?: (item: StudioFeedItem) => void;
}

const TYPE_CONFIG = {
  PROJECT: {
    label: "Projeto",
    badgeBg: "bg-lime-400/10 text-lime-400 border-lime-400/30",
    icon: "🎬",
    accentGradient: "from-lime-500/20 via-transparent to-transparent",
  },
  CHARACTER: {
    label: "Personagem",
    badgeBg: "bg-purple-400/10 text-purple-300 border-purple-400/30",
    icon: "👤",
    accentGradient: "from-purple-500/20 via-transparent to-transparent",
  },
  ENVIRONMENT: {
    label: "Ambiente",
    badgeBg: "bg-cyan-400/10 text-cyan-300 border-cyan-400/30",
    icon: "🏙️",
    accentGradient: "from-cyan-500/20 via-transparent to-transparent",
  },
  SCENE: {
    label: "Cena",
    badgeBg: "bg-amber-400/10 text-amber-300 border-amber-400/30",
    icon: "🎥",
    accentGradient: "from-amber-500/20 via-transparent to-transparent",
  },
  PROMPT: {
    label: "Prompt IA",
    badgeBg: "bg-emerald-400/10 text-emerald-300 border-emerald-400/30",
    icon: "✨",
    accentGradient: "from-emerald-500/20 via-transparent to-transparent",
  },
};

export function StudioContentCard({ item, onDuplicate, onDelete }: StudioContentCardProps) {
  const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.PROJECT;

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "short",
      }).format(d);
    } catch {
      return "";
    }
  };

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#12151E] p-4 transition-all duration-300 hover:-translate-y-1 hover:border-lime-400/40 hover:shadow-[0_8px_30px_rgba(163,230,53,0.08)]">
      {/* Glow de fundo sutil no hover */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${config.accentGradient} opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none`}
      />

      <div>
        {/* Top Header: Badge de Tipo e Data */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${config.badgeBg}`}
            >
              <span>{config.icon}</span>
              <span>{item.badge || config.label}</span>
            </span>
          </div>
          <span className="text-[11px] font-mono text-white/40">{formatDate(item.updatedAt)}</span>
        </div>

        {/* Thumbnail / Representação Visual Neutra Cinematográfica */}
        <div className="mt-3.5 relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl border border-white/5 bg-[#181C28]/80 text-white/20 transition group-hover:border-white/10">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex flex-col items-center gap-1.5 p-3 text-center">
              <span className="text-2xl opacity-60 group-hover:scale-110 transition-transform duration-300">
                {config.icon}
              </span>
              <span className="text-[10px] uppercase font-mono tracking-wider text-white/30">
                {item.projectName || config.label}
              </span>
            </div>
          )}

          {/* Tag de Projeto pai quando aplicável */}
          {item.projectName && item.type !== "PROJECT" && (
            <div className="absolute bottom-2 left-2 max-w-[85%] truncate rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-medium text-white/70 backdrop-blur-md">
              {item.projectName}
            </div>
          )}
        </div>

        {/* Título e Descrição */}
        <div className="mt-3">
          <Link href={item.href} className="group-hover:text-lime-300 transition-colors">
            <h3 className="text-sm font-bold tracking-tight text-white line-clamp-1">
              {item.title}
            </h3>
          </Link>
          <p className="mt-1 text-xs text-white/50 line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        </div>
      </div>

      {/* Footer com Metadados e Ações */}
      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
        {/* Metadados rápidos */}
        <div className="text-[11px] text-white/40 flex items-center gap-2">
          {item.type === "PROJECT" && item.metadata && (
            <span>
              {item.metadata.scenesCount ?? 0} cenas • {item.metadata.charactersCount ?? 0} personagens
            </span>
          )}
          {item.type === "CHARACTER" && item.metadata && (
            <span>{item.metadata.sceneLinksCount ?? 0} cenas vinculadas</span>
          )}
          {item.type === "ENVIRONMENT" && item.metadata && (
            <span>{item.metadata.sceneLinksCount ?? 0} tomadas no cenário</span>
          )}
          {item.type === "SCENE" && item.metadata && (
            <span>
              {item.metadata.durationSeconds ? `${item.metadata.durationSeconds}s` : "Tomada"}
              {item.metadata.environmentName ? ` • ${item.metadata.environmentName}` : ""}
            </span>
          )}
          {item.type === "PROMPT" && item.metadata && (
            <span>{item.metadata.modelName || "Gemini 3.5 Flash"}</span>
          )}
        </div>

        {/* Botão de Ação Direta */}
        <Link
          href={item.href}
          className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-2.5 py-1 text-xs font-semibold text-white/80 transition hover:bg-lime-400 hover:text-black hover:shadow-[0_0_15px_rgba(163,230,53,0.3)]"
        >
          <span>Abrir</span>
          <span className="text-[10px]">→</span>
        </Link>
      </div>
    </div>
  );
}
