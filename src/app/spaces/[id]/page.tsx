import { redirect } from "next/navigation";

/** Alias antigo de /projects/[id]: mantém links compartilhados funcionando. */
export default async function SpaceAliasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/projects/${encodeURIComponent(id)}`);
}
