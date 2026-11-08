/**
 * Estilos de captura: "como a imagem/vídeo foi gravado".
 * O padrão (`cinematic`) mantém o comportamento cinematográfico atual; os demais
 * substituem câmera, granulação, composição e luz por uma aparência de captura real.
 */
export const CAPTURE_STYLE_KEYS = ["cinematic", "amateur_phone", "selfie_flash", "lowres_grain", "security_cam", "found_footage"] as const;
export type CaptureStyleKey = (typeof CAPTURE_STYLE_KEYS)[number];

export interface CaptureStyle {
  key: CaptureStyleKey;
  label: string;
  icon: string;
  description: string;
  /** Instruções (para o Gemini) que substituem os jargões cinematográficos. */
  instructions: string[];
  /** Termos que devem entrar no negativo. */
  negativeHints: string[];
  /** Fragmento curto, em inglês, anexado direto ao prompt da geração direta de imagem/vídeo. */
  directPromptSuffix: string;
}

export const CAPTURE_STYLES: Record<CaptureStyleKey, CaptureStyle> = {
  cinematic: {
    key: "cinematic",
    label: "Cinematográfico",
    icon: "🎥",
    description: "Aparência de cinema: lentes, iluminação e color grading cuidados (padrão).",
    instructions: [],
    negativeHints: [],
    directPromptSuffix: "",
  },
  amateur_phone: {
    key: "amateur_phone",
    label: "Amador / celular",
    icon: "📱",
    description: "Filmagem de celular de um passante: câmera na mão, ruído digital, enquadramento casual, cara de vídeo viral.",
    instructions: [
      "Câmera: lente principal de smartphone (~24-26mm equivalente), foco profundo (tudo razoavelmente nítido), sem bokeh nem profundidade de campo rasa; câmera na mão com leve tremor, pequenos reenquadramentos e zoom digital.",
      "Composição: enquadramento casual e imperfeito, levemente torto ou inclinado, sujeito fora do centro, elementos cortados nas bordas, objetos do cotidiano atravessando o quadro (ex.: retrovisor ou guidão em primeiro plano desfocado).",
      "Imagem: ruído digital e compressão de vídeo (artefatos H.264/JPEG), realces levemente estourados, exposição automática, baixa faixa dinâmica, baixa resolução aparente (como vídeo ampliado de 480p), grão/ruído digital perceptível, detalhes macios e levemente borrados, cores de sensor de celular, SEM color grading e SEM acabamento cinematográfico.",
      "Luz: apenas luz natural disponível (céu nublado, sombra aberta, sol de rua), sem iluminação de cinema nem luz de preenchimento.",
      "Formato: vertical (9:16) ou 4:5, como vídeo de rede social; pode ter marca d'água discreta de perfil no canto.",
      "Realismo: cenário real, sujo e detalhado, pessoas comuns ao fundo que reagem com naturalidade ou indiferença; qualquer elemento fantástico deve ser tratado como se fosse corriqueiro, fotografado como um registro documental, sem pose, sem estética de comercial.",
    ],
    negativeHints: [
      "cinematic lighting",
      "anamorphic lens",
      "shallow depth of field",
      "bokeh",
      "color grading",
      "studio lighting",
      "clean CGI render",
      "commercial look",
      "perfect composition",
      "sharp 4k",
      "crisp ultra HD",
    ],
    directPromptSuffix:
      "shot on a smartphone by a bystander, handheld, casual off-center framing, deep focus, natural available light, visible grain and digital noise, low resolution, soft blurry detail, heavy video compression artifacts, no color grading, candid documentary realism, viral social media video look",
  },
  selfie_flash: {
    key: "selfie_flash",
    label: "Selfie com flash",
    icon: "🤳",
    description: "Selfie de celular em grande angular, rostos próximos e distorcidos, flash direto, cena noturna caótica e engraçada.",
    instructions: [
      "Câmera: selfie com câmera frontal de celular em grande angular, esticada a um braço de distância; rostos e mãos muito próximos da lente com distorção de perspectiva (nariz e testa ampliados, bordas esticadas), levemente de cima para baixo ou inclinada.",
      "Composição: sujeitos apertados no quadro, cortados nas bordas, alguém ou algo inesperado e absurdo acontecendo ao fundo (ex.: pessoa colando as mãos no vidro), objetos do cenário em primeiro plano (mesa, prato, utensílio).",
      "Luz: flash direto do celular misturado à luz de ambiente de letreiros de neon e faróis, brilho oleoso na pele, sombras duras atrás dos sujeitos, fundo noturno um pouco escuro e colorido.",
      "Imagem: cores saturadas e levemente estouradas, grão e ruído digital de pouca luz bem visíveis, baixa resolução, compressão de vídeo de rede social, sem color grading.",
      "Expressão: caretas e poses exageradas, estilo caricatura/meme, humor absurdo, tratado como registro espontâneo de uma noite fora.",
      "Cenário: ambiente real e banal (lanchonete, pizzaria, toalha xadrez, saleiro), cheio de detalhes do dia a dia.",
    ],
    negativeHints: [
      "cinematic lighting",
      "anamorphic lens",
      "shallow depth of field",
      "color grading",
      "studio portrait",
      "sharp 4k",
      "crisp ultra HD",
      "clean composition",
      "elegant look",
    ],
    directPromptSuffix:
      "wide-angle front-camera smartphone selfie, faces very close to the lens with perspective distortion, harsh direct flash mixed with neon ambient light, night scene, oversaturated colors, heavy grain and digital noise, low resolution, compression artifacts, exaggerated funny expressions, absurd chaotic background, candid meme look",
  },
  lowres_grain: {
    key: "lowres_grain",
    label: "Granulado / baixa resolução",
    icon: "📼",
    description: "Filmagem amadora degradada: baixa resolução, grão forte, imagem macia e comprimida, como vídeo antigo ou de celular barato.",
    instructions: [
      "Resolução: aparência de vídeo de baixa resolução (~480p) ampliado, detalhes macios e borrados, bordas pouco definidas, textura de pele e tecidos sem nitidez.",
      "Grão: ruído de sensor e grão fortes e visíveis em toda a imagem, principalmente nas sombras e no céu.",
      "Compressão: blocos e artefatos de compressão H.264/JPEG, bandas de cor, halos nas bordas de alto contraste.",
      "Cor e luz: contraste baixo e realces estourados, cores levemente lavadas ou supersaturadas, balanço de branco automático impreciso, exposição irregular.",
      "Câmera: câmera de mão de celular simples ou camcorder antigo, enquadramento casual e instável, foco que escorrega; sem lente de cinema.",
      "Realismo: registro espontâneo, sem acabamento de estúdio, sem cara de render ou ilustração; o conteúdo parece uma gravação real e imperfeita.",
    ],
    negativeHints: [
      "sharp",
      "4k",
      "8k",
      "ultra HD",
      "crisp details",
      "clean image",
      "studio quality",
      "cinematic lighting",
      "smooth skin",
      "high resolution",
      "professional photography",
    ],
    directPromptSuffix:
      "low resolution amateur footage, upscaled 480p look, heavy film grain and sensor noise, soft blurry details, strong video compression artifacts, washed-out low contrast, blown highlights, handheld cheap camera, candid unedited recording",
  },
  security_cam: {
    key: "security_cam",
    label: "Câmera de segurança",
    icon: "📹",
    description: "Imagem de câmera de vigilância: grande angular fixa, baixa resolução e cores lavadas.",
    instructions: [
      "Câmera: câmera de vigilância fixa, grande angular com distorção nas bordas, posicionada alto em ângulo descendente, sem movimento de câmera.",
      "Imagem: baixa resolução, compressão pesada, ruído, cores lavadas ou monocromáticas, contraste achatado; pode haver carimbo de data e hora no canto e reflexos na lente.",
      "Luz: iluminação existente do local (poste, loja, noite), sem luz de cinema.",
      "Composição: ação acontece sem consciência da câmera, sujeitos pequenos no quadro, sem enquadramento artístico.",
    ],
    negativeHints: ["cinematic lighting", "shallow depth of field", "bokeh", "color grading", "high resolution", "clean render"],
    directPromptSuffix:
      "CCTV security camera footage, fixed high-angle wide lens, low resolution, heavy compression, washed-out colors, timestamp overlay, no cinematic look",
  },
  found_footage: {
    key: "found_footage",
    label: "Found footage",
    icon: "🎞️",
    description: "Filmagem encontrada: câmera de mão instável, baixa luz, áudio cru e sensação de 'gravação real'.",
    instructions: [
      "Câmera: câmera de mão instável, foco que oscila, zoom e reenquadramentos bruscos, às vezes o operador aparece em reflexos.",
      "Imagem: ruído alto em pouca luz, compressão e perda de detalhe, cores dessaturadas, flare e superexposição ocasionais, sem color grading.",
      "Luz: fontes práticas (lanterna, tela, faróis), sombras duras e áreas totalmente escuras.",
      "Som e ritmo: áudio cru com vento e respiração, cortes abruptos; tudo parece uma gravação real não editada.",
    ],
    negativeHints: ["cinematic lighting", "anamorphic lens", "stabilized footage", "color grading", "studio lighting", "clean render"],
    directPromptSuffix:
      "found footage, unstable handheld camera, low light with digital noise, desaturated colors, raw unedited recording, no cinematic look",
  },
};

export function getCaptureStyle(key?: string | null): CaptureStyle {
  if (key && (CAPTURE_STYLE_KEYS as readonly string[]).includes(key)) {
    return CAPTURE_STYLES[key as CaptureStyleKey];
  }
  return CAPTURE_STYLES.cinematic;
}

export function listCaptureStyles(): CaptureStyle[] {
  return CAPTURE_STYLE_KEYS.map((k) => CAPTURE_STYLES[k]);
}

/** Templates em que o estilo de captura faz sentido (os que descrevem câmera/imagem). */
export const CAPTURE_STYLE_TEMPLATES = ["image_prompt", "video_prompt", "individual_scene", "scene_sequence"];
