import { redirect } from "next/navigation";

/** A Análise de imagem vive em /studio: mantém links antigos funcionando. */
export default function CinematicAnalysisAliasPage() {
  redirect("/studio");
}
