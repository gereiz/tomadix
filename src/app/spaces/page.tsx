import { redirect } from "next/navigation";

/** "Spaces" é o mesmo que Projetos: mantém links antigos funcionando. */
export default function SpacesAliasPage() {
  redirect("/projects");
}
