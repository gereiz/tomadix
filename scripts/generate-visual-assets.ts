import fs from "fs";
import path from "path";
import { VISUAL_REFERENCE_OPTIONS, VISUAL_CATEGORIES } from "../src/modules/visual-library/visual-reference.catalog";

const publicDir = path.join(process.cwd(), "public");
const baseOutputDir = path.join(publicDir, "visual-references");

// Paletas por categoria
const CATEGORY_THEMES: Record<string, { primary: string; secondary: string; bg: string }> = {
  LIGHTING: { primary: "#f59e0b", secondary: "#fbbf24", bg: "#1a160d" },
  FRAMING: { primary: "#06b6d4", secondary: "#38bdf8", bg: "#081b24" },
  CAMERA_ANGLE: { primary: "#10b981", secondary: "#34d399", bg: "#091f18" },
  CAMERA_MOVEMENT: { primary: "#6366f1", secondary: "#818cf8", bg: "#111429" },
  LENS_PERSPECTIVE: { primary: "#a855f7", secondary: "#c084fc", bg: "#1a0f26" },
  COMPOSITION: { primary: "#ec4899", secondary: "#f472b6", bg: "#220d1c" },
  FOCUS_OPTICS: { primary: "#3b82f6", secondary: "#60a5fa", bg: "#0d182b" },
  COLOR_GRADING: { primary: "#f43f5e", secondary: "#fb7185", bg: "#240d14" },
  SCENE_DYNAMIC: { primary: "#eab308", secondary: "#fde047", bg: "#1c1809" },
  SENSOR_FORMAT: { primary: "#8b5cf6", secondary: "#a78bfa", bg: "#150e24" },
  ATMOSPHERE: { primary: "#14b8a6", secondary: "#2dd4bf", bg: "#091d1a" },
};

function generateSvgContent(option: typeof VISUAL_REFERENCE_OPTIONS[0]): string {
  const theme = CATEGORY_THEMES[option.category] || { primary: "#10b981", secondary: "#34d399", bg: "#0d111c" };
  const cat = option.category;
  const val = option.value;

  let diagramContent = "";

  // 1. Iluminação
  if (cat === "LIGHTING") {
    if (val.includes("natural")) {
      diagramContent = `
        <circle cx="110" cy="70" r="28" fill="${theme.primary}" fill-opacity="0.2" />
        <circle cx="110" cy="70" r="16" fill="${theme.primary}" />
        <path d="M110 30 L110 18 M110 110 L110 122 M70 70 L58 70 M150 70 L162 70 M80 40 L72 32 M140 100 L148 108 M80 100 L72 108 M140 40 L148 32" stroke="${theme.secondary}" stroke-width="2.5" stroke-linecap="round" />
        <path d="M135 85 L280 145 M135 70 L280 110 M135 55 L280 75" stroke="${theme.primary}" stroke-width="1.5" stroke-dasharray="4 4" stroke-opacity="0.6" />
        <ellipse cx="280" cy="115" rx="35" ry="45" fill="#1e293b" stroke="${theme.secondary}" stroke-width="2" />
        <ellipse cx="270" cy="115" rx="25" ry="38" fill="${theme.primary}" fill-opacity="0.3" />
      `;
    } else if (val.includes("chiaroscuro") || val.includes("low_key")) {
      diagramContent = `
        <rect x="50" y="40" width="300" height="150" rx="8" fill="#000000" />
        <path d="M50 40 L180 190 L50 190 Z" fill="${theme.primary}" fill-opacity="0.1" />
        <path d="M200 60 Q230 115 200 170" fill="none" stroke="${theme.primary}" stroke-width="3" />
        <polygon points="180,85 200,105 180,125" fill="${theme.primary}" />
        <text x="210" y="100" fill="#ffffff" font-size="11" font-family="sans-serif">Rembrandt Triangle</text>
      `;
    } else if (val.includes("rim_light") || val.includes("contraluz") || val.includes("silhueta")) {
      diagramContent = `
        <circle cx="200" cy="115" r="50" fill="#050811" />
        <path d="M200 65 A50 50 0 0 1 245 140" fill="none" stroke="${theme.secondary}" stroke-width="4" filter="drop-shadow(0 0 8px ${theme.primary})" />
        <path d="M155 140 A50 50 0 0 1 200 65" fill="none" stroke="${theme.secondary}" stroke-width="4" filter="drop-shadow(0 0 8px ${theme.primary})" />
        <circle cx="200" cy="115" r="46" fill="#020408" />
        <text x="200" y="185" text-anchor="middle" fill="${theme.secondary}" font-size="10" font-family="monospace">CONTOUR HIGHLIGHT</text>
      `;
    } else if (val.includes("neon")) {
      diagramContent = `
        <line x1="80" y1="50" x2="80" y2="180" stroke="#06b6d4" stroke-width="6" stroke-linecap="round" filter="drop-shadow(0 0 10px #06b6d4)" />
        <line x1="320" y1="50" x2="320" y2="180" stroke="#f43f5e" stroke-width="6" stroke-linecap="round" filter="drop-shadow(0 0 10px #f43f5e)" />
        <ellipse cx="200" cy="115" rx="35" ry="45" fill="#111827" stroke="#374151" stroke-width="1.5" />
        <path d="M165 115 Q190 70 200 70" stroke="#06b6d4" stroke-width="3" fill="none" />
        <path d="M235 115 Q210 70 200 70" stroke="#f43f5e" stroke-width="3" fill="none" />
      `;
    } else if (val.includes("tres_pontos")) {
      diagramContent = `
        <!-- Três Pontos -->
        <circle cx="200" cy="115" r="28" fill="#1f293d" stroke="#ffffff" stroke-width="1.5" />
        <text x="200" y="119" text-anchor="middle" fill="#ffffff" font-size="10" font-weight="bold">ATOR</text>
        <!-- Key Light -->
        <circle cx="120" cy="170" r="14" fill="${theme.primary}" />
        <text x="120" y="195" text-anchor="middle" fill="${theme.primary}" font-size="9" font-weight="bold">KEY</text>
        <path d="M130 160 L180 130" stroke="${theme.primary}" stroke-width="2" stroke-linecap="round" />
        <!-- Fill Light -->
        <circle cx="280" cy="170" r="12" fill="#38bdf8" fill-opacity="0.6" />
        <text x="280" y="195" text-anchor="middle" fill="#38bdf8" font-size="9" font-weight="bold">FILL</text>
        <path d="M270 160 L220 130" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="3 3" />
        <!-- Back Light -->
        <circle cx="150" cy="60" r="10" fill="#e2e8f0" />
        <text x="150" y="48" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="bold">BACK</text>
        <path d="M160 70 L190 95" stroke="#e2e8f0" stroke-width="1.5" />
      `;
    } else {
      diagramContent = `
        <circle cx="100" cy="90" r="24" fill="${theme.primary}" fill-opacity="0.4" />
        <path d="M100 90 L290 130 M100 90 L290 90 M100 90 L290 50" stroke="${theme.primary}" stroke-width="2" stroke-dasharray="5 3" />
        <rect x="270" y="55" width="25" height="75" rx="12" fill="#1f2937" stroke="${theme.secondary}" stroke-width="2" />
      `;
    }
  }

  // 2. Enquadramento
  else if (cat === "FRAMING") {
    let scaleY = 30;
    let headR = 12;
    let desc = "Framing Scale";

    if (val.includes("extreme_wide")) {
      scaleY = 14;
      headR = 3;
      desc = "EWS: 5% da tela";
    } else if (val.includes("wide")) {
      scaleY = 32;
      headR = 6;
      desc = "WS: 25% da tela";
    } else if (val.includes("full")) {
      scaleY = 65;
      headR = 10;
      desc = "FS: 70% da tela";
    } else if (val.includes("medium_full")) {
      scaleY = 80;
      headR = 12;
      desc = "MFS / Cowboy: Joelhos para cima";
    } else if (val.includes("medium_close")) {
      scaleY = 120;
      headR = 24;
      desc = "MCU: Peito para cima";
    } else if (val.includes("medium")) {
      scaleY = 95;
      headR = 16;
      desc = "MS: Cintura para cima";
    } else if (val.includes("extreme_close")) {
      scaleY = 220;
      headR = 50;
      desc = "ECU: Olhos e lábios";
    } else if (val.includes("close_up")) {
      scaleY = 160;
      headR = 36;
      desc = "CU: Rosto dominante";
    }

    diagramContent = `
      <!-- Frame 16:9 boundary -->
      <rect x="50" y="35" width="300" height="150" rx="6" fill="#08101e" stroke="${theme.primary}" stroke-width="2" />
      <line x1="150" y1="35" x2="150" y2="185" stroke="#ffffff" stroke-opacity="0.08" stroke-dasharray="3 3" />
      <line x1="250" y1="35" x2="250" y2="185" stroke="#ffffff" stroke-opacity="0.08" stroke-dasharray="3 3" />
      <line x1="50" y1="85" x2="350" y2="85" stroke="#ffffff" stroke-opacity="0.08" stroke-dasharray="3 3" />
      <line x1="50" y1="135" x2="350" y2="135" stroke="#ffffff" stroke-opacity="0.08" stroke-dasharray="3 3" />
      <!-- Silhouette -->
      <g transform="translate(200, 150)">
        <ellipse cx="0" cy="${-scaleY}" rx="${headR}" ry="${headR * 1.2}" fill="${theme.secondary}" />
        <path d="M${-headR * 1.5} ${-scaleY + headR * 1.3} C${-headR * 2} ${-scaleY + 30}, ${-headR * 2} 40, 0 40 C${headR * 2} 40, ${headR * 2} ${-scaleY + 30}, ${headR * 1.5} ${-scaleY + headR * 1.3} Z" fill="${theme.primary}" fill-opacity="0.8" />
      </g>
      <rect x="60" y="45" width="130" height="20" rx="4" fill="#030712" fill-opacity="0.8" />
      <text x="68" y="59" fill="${theme.secondary}" font-size="10" font-family="monospace">${desc}</text>
    `;
  }

  // 3. Ângulos de Câmera
  else if (cat === "CAMERA_ANGLE") {
    let camY = 110;
    let camRotate = 0;
    let label = "EYE LEVEL 0°";

    if (val.includes("low_angle")) {
      camY = 160;
      camRotate = -30;
      label = "LOW ANGLE (Contra-Plongée) -30°";
    } else if (val.includes("high_angle")) {
      camY = 60;
      camRotate = 30;
      label = "HIGH ANGLE (Plongée) +30°";
    } else if (val.includes("birds_eye") || val.includes("zenithal") || val.includes("top_down")) {
      camY = 40;
      camRotate = 85;
      label = "ZENITHAL / OVERHEAD 90°";
    } else if (val.includes("worms_eye")) {
      camY = 180;
      camRotate = -65;
      label = "WORM'S-EYE (Nadir) -65°";
    } else if (val.includes("dutch")) {
      camY = 110;
      camRotate = 25;
      label = "DUTCH ANGLE (Roll tilt) 25°";
    }

    diagramContent = `
      <!-- Sujeito no centro -->
      <g transform="translate(260, 115)">
        <ellipse cx="0" cy="-25" rx="14" ry="18" fill="#e2e8f0" />
        <path d="M-18 -5 C-22 30, -15 50, 0 50 C15 50, 22 30, 18 -5 Z" fill="#94a3b8" />
        <circle cx="0" cy="-25" r="3" fill="#0f172a" />
      </g>
      <!-- Eixo de visão -->
      <line x1="120" y1="${camY}" x2="260" y2="100" stroke="${theme.primary}" stroke-width="2" stroke-dasharray="4 3" />
      <!-- Câmera com ângulo de inclinação -->
      <g transform="translate(100, ${camY}) rotate(${camRotate})">
        <rect x="-18" y="-12" width="28" height="24" rx="4" fill="${theme.primary}" />
        <polygon points="10,-6 24,-12 24,12 10,6" fill="${theme.secondary}" />
        <circle cx="-6" cy="0" r="5" fill="#0b0f19" />
      </g>
      <!-- Ângulo e badge -->
      <rect x="50" y="195" width="220" height="22" rx="4" fill="#030712" />
      <text x="60" y="210" fill="${theme.secondary}" font-size="10" font-family="monospace">${label}</text>
    `;
  }

  // 4. Movimento de Câmera
  else if (cat === "CAMERA_MOVEMENT") {
    let arrowPath = "M120 115 L260 115";
    let desc = "Horizontal Vector";

    if (val.includes("dolly_in") || val.includes("zoom_in") || val.includes("push_in")) {
      arrowPath = "M100 115 L250 115";
      desc = "DOLLY IN ➔ Aproximação Frontal";
    } else if (val.includes("dolly_out") || val.includes("zoom_out") || val.includes("pull_out")) {
      arrowPath = "M250 115 L100 115";
      desc = "DOLLY OUT ➔ Recuo Espacial";
    } else if (val.includes("pan_left")) {
      arrowPath = "M240 100 A90 90 0 0 0 130 100";
      desc = "PAN LEFT ➔ Rotação para Esquerda";
    } else if (val.includes("pan_right")) {
      arrowPath = "M130 100 A90 90 0 0 1 240 100";
      desc = "PAN RIGHT ➔ Rotação para Direita";
    } else if (val.includes("tilt_up") || val.includes("crane_up") || val.includes("pedestal_up")) {
      arrowPath = "M180 160 L180 60";
      desc = "VERTICAL UP ➔ Subida";
    } else if (val.includes("tilt_down") || val.includes("crane_down") || val.includes("pedestal_down")) {
      arrowPath = "M180 60 L180 160";
      desc = "VERTICAL DOWN ➔ Descida";
    } else if (val.includes("orbit")) {
      arrowPath = "M120 115 A60 30 0 1 1 240 115 A60 30 0 1 1 120 115";
      desc = "ORBIT 360° ➔ Trajetória Circular";
    } else if (val.includes("handheld") || val.includes("shake")) {
      arrowPath = "M80 115 Q100 95, 120 115 T160 115 T200 115 T240 115 T280 115";
      desc = "HANDHELD ➔ Vibração Orgânica Manual";
    } else if (val.includes("tracking")) {
      arrowPath = "M80 145 L300 145";
      desc = "TRACKING / TRUCK ➔ Deslocamento Lateral";
    }

    diagramContent = `
      <!-- Rails / Grid de chão -->
      <path d="M60 170 L340 170 M80 185 L320 185" stroke="#1f293d" stroke-width="2" />
      <line x1="100" y1="165" x2="100" y2="190" stroke="#1f293d" stroke-width="1.5" />
      <line x1="160" y1="165" x2="160" y2="190" stroke="#1f293d" stroke-width="1.5" />
      <line x1="220" y1="165" x2="220" y2="190" stroke="#1f293d" stroke-width="1.5" />
      <line x1="280" y1="165" x2="280" y2="190" stroke="#1f293d" stroke-width="1.5" />
      <!-- Sujeito de referência -->
      <circle cx="280" cy="100" r="14" fill="#334155" />
      <rect x="272" y="116" width="16" height="30" rx="3" fill="#1e293b" />
      <!-- Câmera no carrinho -->
      <rect x="75" y="95" width="30" height="22" rx="4" fill="${theme.primary}" />
      <polygon points="105,101 118,95 118,117 105,111" fill="${theme.secondary}" />
      <!-- Vetor do movimento -->
      <path d="${arrowPath}" fill="none" stroke="${theme.secondary}" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="6 4" filter="drop-shadow(0 0 6px ${theme.primary})" />
      <rect x="50" y="195" width="250" height="22" rx="4" fill="#030712" />
      <text x="60" y="210" fill="${theme.secondary}" font-size="10" font-family="monospace">${desc}</text>
    `;
  }

  // 5. Lentes e Perspectiva
  else if (cat === "LENS_PERSPECTIVE") {
    if (val.includes("anamorfica")) {
      diagramContent = `
        <rect x="60" y="55" width="280" height="110" rx="4" fill="#030712" stroke="${theme.primary}" stroke-width="2" />
        <line x1="30" y1="110" x2="370" y2="110" stroke="#38bdf8" stroke-width="3" filter="drop-shadow(0 0 8px #38bdf8)" />
        <ellipse cx="140" cy="110" rx="14" ry="32" fill="#38bdf8" fill-opacity="0.3" stroke="#38bdf8" stroke-width="2" />
        <ellipse cx="260" cy="110" rx="14" ry="32" fill="#38bdf8" fill-opacity="0.3" stroke="#38bdf8" stroke-width="2" />
        <text x="70" y="75" fill="#38bdf8" font-size="10" font-family="monospace">2.39:1 ANAMORPHIC SCOPE</text>
      `;
    } else if (val.includes("fisheye") || val.includes("distorcao_barril")) {
      diagramContent = `
        <circle cx="200" cy="115" r="65" fill="#030712" stroke="${theme.primary}" stroke-width="3" />
        <ellipse cx="200" cy="115" rx="55" ry="30" fill="none" stroke="${theme.secondary}" stroke-width="1.5" stroke-dasharray="3 3" />
        <ellipse cx="200" cy="115" rx="30" ry="55" fill="none" stroke="${theme.secondary}" stroke-width="1.5" stroke-dasharray="3 3" />
        <rect x="180" y="95" width="40" height="40" rx="8" fill="${theme.primary}" fill-opacity="0.6" />
      `;
    } else if (val.includes("bokeh")) {
      diagramContent = `
        <!-- Sujeito em foco nítido -->
        <circle cx="130" cy="110" r="25" fill="${theme.primary}" stroke="#ffffff" stroke-width="2" />
        <!-- Esferas de Bokeh desfocadas ao fundo -->
        <circle cx="240" cy="80" r="32" fill="${theme.secondary}" fill-opacity="0.35" filter="drop-shadow(0 0 10px ${theme.secondary})" />
        <circle cx="280" cy="130" r="42" fill="#38bdf8" fill-opacity="0.25" />
        <circle cx="200" cy="140" r="22" fill="#ec4899" fill-opacity="0.3" />
        <circle cx="310" cy="70" r="18" fill="${theme.primary}" fill-opacity="0.3" />
        <text x="60" y="210" fill="${theme.secondary}" font-size="10" font-family="monospace">SHALLOW DOF f/1.2 (BOKEH)</text>
      `;
    } else {
      diagramContent = `
        <polygon points="120,60 280,40 280,180 120,160" fill="none" stroke="${theme.primary}" stroke-width="2" />
        <line x1="80" y1="110" x2="320" y2="110" stroke="${theme.secondary}" stroke-width="1.5" stroke-dasharray="4 4" />
        <circle cx="180" cy="110" r="16" fill="${theme.primary}" />
      `;
    }
  }

  // 6. Composição
  else if (cat === "COMPOSITION") {
    if (val.includes("tercos")) {
      diagramContent = `
        <rect x="60" y="45" width="280" height="140" rx="4" fill="#08101e" stroke="#334155" stroke-width="1.5" />
        <line x1="153" y1="45" x2="153" y2="185" stroke="${theme.primary}" stroke-width="2" />
        <line x1="246" y1="45" x2="246" y2="185" stroke="${theme.primary}" stroke-width="2" />
        <line x1="60" y1="91" x2="340" y2="91" stroke="${theme.primary}" stroke-width="2" />
        <line x1="60" y1="138" x2="340" y2="138" stroke="${theme.primary}" stroke-width="2" />
        <circle cx="153" cy="91" r="7" fill="${theme.secondary}" filter="drop-shadow(0 0 6px ${theme.secondary})" />
        <circle cx="246" cy="91" r="7" fill="${theme.secondary}" filter="drop-shadow(0 0 6px ${theme.secondary})" />
        <circle cx="153" cy="138" r="7" fill="${theme.secondary}" />
        <circle cx="246" cy="138" r="7" fill="${theme.secondary}" />
      `;
    } else if (val.includes("simetria")) {
      diagramContent = `
        <rect x="60" y="45" width="280" height="140" rx="4" fill="#08101e" stroke="#334155" stroke-width="1.5" />
        <line x1="200" y1="45" x2="200" y2="185" stroke="${theme.primary}" stroke-width="3" stroke-dasharray="5 3" />
        <polygon points="120,80 180,60 180,160 120,140" fill="${theme.secondary}" fill-opacity="0.3" stroke="${theme.secondary}" stroke-width="1.5" />
        <polygon points="280,80 220,60 220,160 280,140" fill="${theme.secondary}" fill-opacity="0.3" stroke="${theme.secondary}" stroke-width="1.5" />
        <circle cx="200" cy="115" r="14" fill="#ffffff" />
      `;
    } else if (val.includes("linhas_guia") || val.includes("perspectiva")) {
      diagramContent = `
        <rect x="60" y="45" width="280" height="140" rx="4" fill="#08101e" stroke="#334155" stroke-width="1.5" />
        <line x1="60" y1="185" x2="200" y2="115" stroke="${theme.primary}" stroke-width="3" />
        <line x1="340" y1="185" x2="200" y2="115" stroke="${theme.primary}" stroke-width="3" />
        <line x1="60" y1="45" x2="200" y2="115" stroke="${theme.primary}" stroke-width="1.5" stroke-dasharray="3 3" />
        <line x1="340" y1="45" x2="200" y2="115" stroke="${theme.primary}" stroke-width="1.5" stroke-dasharray="3 3" />
        <circle cx="200" cy="115" r="8" fill="${theme.secondary}" />
      `;
    } else if (val.includes("moldura")) {
      diagramContent = `
        <rect x="60" y="45" width="280" height="140" rx="4" fill="#08101e" stroke="#334155" stroke-width="1.5" />
        <rect x="110" y="65" width="180" height="100" rx="4" fill="#000000" stroke="${theme.primary}" stroke-width="4" />
        <circle cx="200" cy="115" r="18" fill="${theme.secondary}" />
      `;
    } else {
      diagramContent = `
        <rect x="60" y="45" width="280" height="140" rx="4" fill="#08101e" stroke="${theme.primary}" stroke-width="1.5" />
        <path d="M70 170 Q140 70, 200 115 T330 60" fill="none" stroke="${theme.secondary}" stroke-width="3" />
        <circle cx="200" cy="115" r="10" fill="${theme.primary}" />
      `;
    }
  }

  // 7. Foco e Tratamento Óptico
  else if (cat === "FOCUS_OPTICS") {
    diagramContent = `
      <rect x="60" y="45" width="280" height="140" rx="4" fill="#08101e" stroke="#334155" stroke-width="1.5" />
      <g transform="translate(130, 115)">
        <circle cx="0" cy="0" r="28" fill="${theme.primary}" stroke="#ffffff" stroke-width="2.5" />
        <circle cx="0" cy="0" r="10" fill="#090d16" />
        <circle cx="3" cy="-3" r="3" fill="#ffffff" />
      </g>
      <circle cx="270" cy="115" r="36" fill="${theme.secondary}" fill-opacity="0.3" filter="drop-shadow(0 0 12px ${theme.secondary})" />
      <line x1="160" y1="115" x2="230" y2="115" stroke="#ffffff" stroke-width="2" stroke-dasharray="4 3" />
    `;
  }

  // 8. Cor e Gradação
  else if (cat === "COLOR_GRADING") {
    if (val.includes("teal")) {
      diagramContent = `
        <rect x="60" y="50" width="140" height="130" fill="#0d9488" rx="4" />
        <rect x="200" y="50" width="140" height="130" fill="#f97316" rx="4" />
        <text x="130" y="120" text-anchor="middle" fill="#ffffff" font-weight="bold" font-size="14">TEAL</text>
        <text x="270" y="120" text-anchor="middle" fill="#ffffff" font-weight="bold" font-size="14">ORANGE</text>
      `;
    } else if (val.includes("preto_e_branco")) {
      diagramContent = `
        <rect x="60" y="50" width="140" height="130" fill="#000000" rx="4" />
        <rect x="200" y="50" width="140" height="130" fill="#ffffff" rx="4" />
        <text x="130" y="120" text-anchor="middle" fill="#ffffff" font-weight="bold" font-size="14">BLACK</text>
        <text x="270" y="120" text-anchor="middle" fill="#000000" font-weight="bold" font-size="14">WHITE</text>
      `;
    } else if (val.includes("matrix")) {
      diagramContent = `
        <rect x="60" y="50" width="280" height="130" fill="#021f0a" rx="4" stroke="#22c55e" stroke-width="1.5" />
        <text x="200" y="90" text-anchor="middle" fill="#22c55e" font-family="monospace" font-size="12">0 1 0 1 1 0 1 0</text>
        <text x="200" y="115" text-anchor="middle" fill="#86efac" font-family="monospace" font-size="14" font-weight="bold">GREEN SHADOWS</text>
        <text x="200" y="140" text-anchor="middle" fill="#22c55e" font-family="monospace" font-size="12">CYBERNETIC TINT</text>
      `;
    } else {
      diagramContent = `
        <defs>
          <linearGradient id="grad_${val}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${theme.primary}" />
            <stop offset="50%" stop-color="${theme.secondary}" />
            <stop offset="100%" stop-color="#1e1b4b" />
          </linearGradient>
        </defs>
        <rect x="60" y="50" width="280" height="130" rx="8" fill="url(#grad_${val})" />
        <path d="M70 160 Q130 90, 200 110 T330 65" fill="none" stroke="#ffffff" stroke-width="2.5" />
      `;
    }
  }

  // 9. Dinâmica e Comportamento
  else if (cat === "SCENE_DYNAMIC") {
    diagramContent = `
      <rect x="60" y="45" width="280" height="140" rx="4" fill="#08101e" stroke="#334155" stroke-width="1.5" />
      <path d="M80 115 L140 115" stroke="${theme.secondary}" stroke-width="2" stroke-dasharray="3 3" />
      <circle cx="160" cy="115" r="16" fill="${theme.primary}" />
      <path d="M190 115 L280 115" stroke="${theme.primary}" stroke-width="4" stroke-linecap="round" />
      <polygon points="280,107 295,115 280,123" fill="${theme.primary}" />
      <text x="70" y="75" fill="${theme.secondary}" font-size="10" font-family="monospace">VELOCITY VECTOR</text>
    `;
  }

  // 10. Sensor e Atmosfera
  else {
    diagramContent = `
      <rect x="70" y="55" width="260" height="120" rx="6" fill="#060c18" stroke="${theme.primary}" stroke-width="2" />
      <circle cx="200" cy="115" r="30" fill="${theme.secondary}" fill-opacity="0.3" />
      <path d="M120 80 Q200 130, 280 80" stroke="${theme.primary}" stroke-width="2" fill="none" />
      <text x="200" y="120" text-anchor="middle" fill="#ffffff" font-family="monospace" font-size="11" font-weight="bold">${option.value.toUpperCase()}</text>
    `;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240" width="100%" height="100%">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#090d16" />
      <stop offset="100%" stop-color="#131926" />
    </linearGradient>
  </defs>

  <!-- Background Base -->
  <rect width="400" height="240" rx="14" fill="url(#bgGrad)" stroke="#1e293b" stroke-width="2"/>

  <!-- Diagram Visual Zone -->
  ${diagramContent}

  <!-- Header Category Badge -->
  <g transform="translate(16, 22)">
    <rect x="0" y="-12" width="160" height="18" rx="4" fill="${theme.primary}" fill-opacity="0.15" stroke="${theme.primary}" stroke-width="1"/>
    <text x="6" y="1" fill="${theme.secondary}" font-size="9" font-family="monospace" font-weight="bold">${option.categoryLabel?.toUpperCase() || option.category}</text>
  </g>

  <!-- Footer Title and Code -->
  <rect x="0" y="196" width="400" height="44" fill="#070a12" fill-opacity="0.95" />
  <line x1="0" y1="196" x2="400" y2="196" stroke="#1e293b" stroke-width="1"/>
  
  <text x="16" y="215" fill="#f8fafc" font-size="11" font-family="sans-serif" font-weight="bold">${option.label.length > 42 ? option.label.substring(0, 40) + "..." : option.label}</text>
  <text x="16" y="229" fill="#94a3b8" font-size="9" font-family="monospace">${option.originalName || option.value}</text>
  
  <rect x="310" y="206" width="74" height="20" rx="4" fill="${theme.primary}" fill-opacity="0.2" stroke="${theme.primary}" stroke-width="0.7"/>
  <text x="347" y="220" text-anchor="middle" fill="${theme.secondary}" font-size="9" font-family="monospace" font-weight="bold">REF V1.0</text>
</svg>`;
}

async function main() {
  console.log("Iniciando geração de 175+ assets visuais vetoriais para Tomadix...");

  // Garante diretórios
  for (const cat of VISUAL_CATEGORIES) {
    const dir = path.join(baseOutputDir, cat.id.toLowerCase().replace(/_/g, "-"));
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  let count = 0;
  for (const opt of VISUAL_REFERENCE_OPTIONS) {
    const subPath = opt.imageUrl.replace(/^\/visual-references\//, "");
    const fullPath = path.join(baseOutputDir, subPath);
    const parentDir = path.dirname(fullPath);

    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    const svg = generateSvgContent(opt);
    fs.writeFileSync(fullPath, svg, "utf-8");
    count++;
  }

  // Gera placeholder padrão para opções sem imagem
  const placeholderSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240" width="100%" height="100%">
    <rect width="400" height="240" rx="14" fill="#0f172a" stroke="#334155" stroke-width="2"/>
    <circle cx="200" cy="100" r="32" fill="#1e293b" />
    <path d="M185 100 L215 100 M200 85 L200 115" stroke="#94a3b8" stroke-width="3" stroke-linecap="round" />
    <text x="200" y="150" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="12" font-weight="bold">Referência Visual em Produção</text>
    <text x="200" y="170" text-anchor="middle" fill="#64748b" font-family="monospace" font-size="10">TOMADIX STUDIO ASSET PENDING</text>
  </svg>`;
  fs.writeFileSync(path.join(baseOutputDir, "placeholder.svg"), placeholderSvg, "utf-8");

  console.log(`Sucesso: ${count} referências visuais vetoriais geradas em public/visual-references/!`);
}

main().catch(console.error);
