import { Spinner } from "@/components/ui/spinner";

import dynamic from "next/dynamic";

export const SpaceBoardCanvas = dynamic(
  () => import("@/components/spaces/space-board-canvas").then((mod) => mod.SpaceBoardCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[75dvh] w-full items-center justify-center rounded-2xl border border-white/10 bg-[#0c0f13]/80">
        <div className="flex flex-col items-center gap-3">
          <Spinner block className="h-8 w-8 border-2 border-primary" />
          <span className="text-xs text-white/50 font-label-code">Carregando Space Board...</span>
        </div>
      </div>
    ),
  }
);

