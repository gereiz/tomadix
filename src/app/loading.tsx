import { Spinner } from "@/components/ui/spinner";

/** Estado de carregamento exibido pelo Next durante a navegação entre rotas. */
export default function Loading() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-surface">
      <Spinner className="h-8 w-8 border-2 border-primary" />
    </div>
  );
}
