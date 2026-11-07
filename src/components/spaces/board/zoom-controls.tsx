"use client";


interface ZoomControlsProps {
  zoomPercent: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export function ZoomControls({ zoomPercent, onZoomIn, onZoomOut }: ZoomControlsProps) {
  return (
    <div className="pointer-events-auto absolute bottom-3.5 right-3.5 z-20 flex items-center gap-1.5 rounded-xl border border-outline-variant/30 bg-surface-container/95 px-2.5 py-1.5 text-xs font-medium text-on-surface-variant shadow-xl">
      <button
        type="button"
        onClick={onZoomOut}
        className="px-1.5 hover:text-on-surface"
        title="Diminuir zoom"
      >
        −
      </button>
      <span className="min-w-[42px] text-center font-mono text-[11px] font-semibold text-on-surface">
        {zoomPercent}%
      </span>
      <button
        type="button"
        onClick={onZoomIn}
        className="px-1.5 hover:text-on-surface"
        title="Aumentar zoom"
      >
        +
      </button>
    </div>
  );
}
