/**
 * Utilitário robusto para download de imagens no navegador.
 * Suporta data URLs base64 e URLs remotas via Blob (contornando restrições de CORS no download).
 */
export async function downloadImage(url: string, filename = "imagem_tomadix.jpg"): Promise<void> {
  if (!url) return;

  // Se já for data URL base64, download direto via âncora
  if (url.startsWith("data:")) {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }

  // Se for URL remota (ex: Cloud Storage ou Pollinations), tentar via blob fetch
  try {
    const response = await fetch(url, { mode: "cors" });
    if (!response.ok) throw new Error("Falha ao obter blob da imagem");
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  } catch (err) {
    // Fallback: abrir em nova janela ou disparar âncora simples
    console.warn("[downloadImage] Falha no blob fetch, aplicando fallback:", err);
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

