import fs from "fs";
import path from "path";
import { VISUAL_REFERENCE_OPTIONS, VISUAL_CATEGORIES } from "../src/modules/visual-library/visual-reference.catalog";

const publicDir = path.join(process.cwd(), "public");
const baseOutputDir = path.join(publicDir, "visual-references");

// Paleta de cores para cada categoria
const CAT_STYLES: Record<string, { primary: string; secondary: string; accent: string; badge: string }> = {
  LIGHTING: { primary: "#f59e0b", secondary: "#fbbf24", accent: "#fef08a", badge: "ILUMINAÇÃO" },
  FRAMING: { primary: "#06b6d4", secondary: "#38bdf8", accent: "#a5f3fc", badge: "ENQUADRAMENTO" },
  CAMERA_ANGLE: { primary: "#10b981", secondary: "#34d399", accent: "#a7f3d0", badge: "ÂNGULO DE CÂMERA" },
  CAMERA_MOVEMENT: { primary: "#6366f1", secondary: "#818cf8", accent: "#c7d2fe", badge: "MOVIMENTO DE CÂMERA" },
  LENS_PERSPECTIVE: { primary: "#a855f7", secondary: "#c084fc", accent: "#e9d5ff", badge: "LENTES & PERSPECTIVA" },
  COMPOSITION: { primary: "#ec4899", secondary: "#f472b6", accent: "#fbcfe8", badge: "COMPOSIÇÃO" },
  FOCUS_OPTICS: { primary: "#3b82f6", secondary: "#60a5fa", accent: "#bfdbfe", badge: "FOCO & TRATAMENTO ÓPTICO" },
  COLOR_GRADING: { primary: "#f43f5e", secondary: "#fb7185", accent: "#fecdd3", badge: "COR & GRADAÇÃO" },
  SCENE_DYNAMIC: { primary: "#eab308", secondary: "#fde047", accent: "#fef9c3", badge: "DINÂMICA DE CENA" },
  SENSOR_FORMAT: { primary: "#8b5cf6", secondary: "#a78bfa", accent: "#ddd6fe", badge: "FORMATO DO SENSOR" },
  ATMOSPHERE: { primary: "#14b8a6", secondary: "#2dd4bf", accent: "#99f6e4", badge: "ATMOSFERA & CLIMA" },
};

function renderHumanFigure(x: number, y: number, scale: number = 1, color: string = "#e2e8f0", detail: boolean = true): string {
  return `
    <g transform="translate(${x}, ${y}) scale(${scale})">
      <!-- Cabeça -->
      <circle cx="0" cy="-25" r="9" fill="${color}" />
      ${detail ? `<circle cx="-2" cy="-25" r="1.5" fill="#0b0f19" /><path d="M-4 -20 Q0 -17 4 -20" stroke="#0b0f19" stroke-width="0.8" fill="none" />` : ""}
      <!-- Pescoço e Ombros -->
      <path d="M-3 -16 L3 -16 L6 -10 L16 2 L-16 2 L-6 -10 Z" fill="${color}" />
      <!-- Torso -->
      <path d="M-15 2 L15 2 L11 28 L-11 28 Z" fill="${color}" fill-opacity="0.9" />
      <!-- Pernas -->
      <path d="M-10 28 L-4 28 L-3 62 L-9 62 Z M4 28 L10 28 L9 62 L3 62 Z" fill="${color}" fill-opacity="0.8" />
    </g>
  `;
}

function renderViewfinderOverlay(w: number = 320, h: number = 180, x: number = 40, y: number = 30): string {
  const x2 = x + w;
  const y2 = y + h;
  return `
    <!-- Viewfinder Reticles -->
    <path d="M${x} ${y + 16} L${x} ${y} L${x + 16} ${y}" stroke="#38bdf8" stroke-width="2" fill="none" />
    <path d="M${x2 - 16} ${y} L${x2} ${y} L${x2} ${y + 16}" stroke="#38bdf8" stroke-width="2" fill="none" />
    <path d="M${x} ${y2 - 16} L${x} ${y2} L${x + 16} ${y2}" stroke="#38bdf8" stroke-width="2" fill="none" />
    <path d="M${x2 - 16} ${y2} L${x2} ${y2} L${x2 - 16} ${y2}" stroke="#38bdf8" stroke-width="2" fill="none" />
    <!-- Center Crosshair -->
    <line x1="${x + w / 2 - 8}" y1="${y + h / 2}" x2="${x + w / 2 + 8}" y2="${y + h / 2}" stroke="#38bdf8" stroke-width="1.2" stroke-opacity="0.6" />
    <line x1="${x + w / 2}" y1="${y + h / 2 - 8}" x2="${x + w / 2}" y2="${y + h / 2 + 8}" stroke="#38bdf8" stroke-width="1.2" stroke-opacity="0.6" />
    <!-- 16:9 safe zone marker -->
    <rect x="${x + 14}" y="${y + 10}" width="${w - 28}" height="${h - 20}" fill="none" stroke="#ffffff" stroke-width="0.8" stroke-dasharray="4 4" stroke-opacity="0.25" />
  `;
}

function generateSvgContent(option: typeof VISUAL_REFERENCE_OPTIONS[0]): string {
  const style = CAT_STYLES[option.category] || { primary: "#10b981", secondary: "#34d399", accent: "#a7f3d0", badge: option.category };
  const cat = option.category;
  const val = option.value.toLowerCase();

  let graphic = "";

  // ==========================================
  // 1. ILUMINAÇÃO (LIGHTING)
  // ==========================================
  if (cat === "LIGHTING") {
    if (val.includes("natural")) {
      graphic = `
        <circle cx="100" cy="70" r="32" fill="#f59e0b" fill-opacity="0.2" filter="drop-shadow(0 0 15px #f59e0b)" />
        <circle cx="100" cy="70" r="18" fill="#fbbf24" />
        <!-- Sun Rays -->
        <g stroke="#fde047" stroke-width="2.5" stroke-linecap="round">
          <line x1="100" y1="28" x2="100" y2="16" />
          <line x1="100" y1="112" x2="100" y2="124" />
          <line x1="58" y1="70" x2="46" y2="70" />
          <line x1="142" y1="70" x2="154" y2="70" />
          <line x1="70" y1="40" x2="62" y2="32" />
          <line x1="130" y1="100" x2="138" y2="108" />
          <line x1="70" y1="100" x2="62" y2="108" />
          <line x1="130" y1="40" x2="138" y2="32" />
        </g>
        <!-- Directional light path -->
        <path d="M125 80 L250 120" stroke="#f59e0b" stroke-width="2" stroke-dasharray="6 4" stroke-opacity="0.8" />
        <path d="M125 65 L250 90" stroke="#f59e0b" stroke-width="2" stroke-dasharray="6 4" stroke-opacity="0.8" />
        <!-- Subject sphere with natural falloff -->
        <defs>
          <radialGradient id="natSphereGrad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stop-color="#fef08a" />
            <stop offset="35%" stop-color="#f59e0b" />
            <stop offset="70%" stop-color="#78350f" />
            <stop offset="100%" stop-color="#180e04" />
          </radialGradient>
        </defs>
        <circle cx="270" cy="115" r="46" fill="url(#natSphereGrad)" stroke="#f59e0b" stroke-width="1.5" />
        <ellipse cx="270" cy="162" rx="42" ry="8" fill="#000000" fill-opacity="0.6" />
      `;
    } else if (val.includes("chiaroscuro") || val.includes("rembrandt") || val.includes("low_key")) {
      graphic = `
        <!-- High Contrast Dramatic Light Scene -->
        <rect x="40" y="30" width="320" height="150" rx="8" fill="#05070d" stroke="#334155" stroke-width="1.5" />
        <!-- Spot of light beam -->
        <polygon points="50,40 180,80 160,170 50,170" fill="#f59e0b" fill-opacity="0.15" />
        <!-- Sculpted face portrait in shadow -->
        <path d="M210 50 Q235 50 240 75 Q245 105 235 130 Q225 150 205 160 Q185 150 175 130 Q165 105 170 75 Q175 50 210 50 Z" fill="#1e293b" />
        <!-- Light side highlight -->
        <path d="M170 75 Q175 50 210 50 L210 160 Q185 150 175 130 Q165 105 170 75 Z" fill="#fbbf24" fill-opacity="0.85" />
        <!-- Rembrandt Triangle on cheek in shadow -->
        <polygon points="222,95 234,102 225,112" fill="#fbbf24" />
        <text x="260" y="105" fill="#fde047" font-size="10" font-family="monospace">REMBRANDT LIGHT</text>
      `;
    } else if (val.includes("rim_light") || val.includes("contraluz") || val.includes("silhueta")) {
      graphic = `
        <!-- Dark silhouette with glowing rim edge -->
        <rect x="40" y="30" width="320" height="150" rx="8" fill="#030509" stroke="#1e293b" stroke-width="1.5" />
        <circle cx="200" cy="90" r="32" fill="#080c16" />
        <path d="M160 165 C160 125, 240 125, 240 165 Z" fill="#080c16" />
        <!-- Glowing rim light edge line -->
        <path d="M168 90 A32 32 0 0 1 232 90" fill="none" stroke="#38bdf8" stroke-width="4.5" filter="drop-shadow(0 0 10px #38bdf8)" />
        <path d="M160 165 C160 125, 175 125, 175 165" fill="none" stroke="#38bdf8" stroke-width="4" filter="drop-shadow(0 0 8px #38bdf8)" />
        <path d="M225 165 C225 125, 240 125, 240 165" fill="none" stroke="#38bdf8" stroke-width="4" filter="drop-shadow(0 0 8px #38bdf8)" />
        <text x="200" y="172" text-anchor="middle" fill="#38bdf8" font-size="11" font-family="monospace" font-weight="bold">EDGE / RIM LIGHTING</text>
      `;
    } else if (val.includes("neon") || val.includes("bicolor")) {
      graphic = `
        <!-- Cyberpunk Dual Tone Neon Tubes -->
        <rect x="40" y="30" width="320" height="150" rx="8" fill="#070913" />
        <!-- Cyan Tube -->
        <line x1="75" y1="45" x2="75" y2="165" stroke="#06b6d4" stroke-width="6" stroke-linecap="round" filter="drop-shadow(0 0 12px #06b6d4)" />
        <!-- Magenta Tube -->
        <line x1="325" y1="45" x2="325" y2="165" stroke="#f43f5e" stroke-width="6" stroke-linecap="round" filter="drop-shadow(0 0 12px #f43f5e)" />
        <!-- Character face lit by both sides -->
        <circle cx="200" cy="95" r="34" fill="#0f172a" stroke="#334155" stroke-width="1.5" />
        <!-- Cyan rim on left -->
        <path d="M166 95 A34 34 0 0 1 200 61" stroke="#06b6d4" stroke-width="4.5" fill="none" filter="drop-shadow(0 0 8px #06b6d4)" />
        <!-- Magenta rim on right -->
        <path d="M200 61 A34 34 0 0 1 234 95" stroke="#f43f5e" stroke-width="4.5" fill="none" filter="drop-shadow(0 0 8px #f43f5e)" />
        <text x="200" y="160" text-anchor="middle" fill="#f8fafc" font-size="10" font-family="monospace">CYAN / MAGENTA SPLIT</text>
      `;
    } else if (val.includes("tres_pontos")) {
      graphic = `
        <!-- 3-Point Lighting Studio Diagram -->
        <rect x="40" y="30" width="320" height="150" rx="8" fill="#080e18" stroke="#1e293b" />
        <!-- Subject Center -->
        <circle cx="200" cy="110" r="22" fill="#334155" stroke="#f8fafc" stroke-width="2" />
        <text x="200" y="114" text-anchor="middle" fill="#f8fafc" font-size="9" font-weight="bold">ATOR</text>
        <!-- Key Light (45 deg left) -->
        <circle cx="110" cy="145" r="14" fill="#f59e0b" filter="drop-shadow(0 0 10px #f59e0b)" />
        <text x="110" y="170" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="bold">KEY LIGHT (100%)</text>
        <line x1="122" y1="135" x2="182" y2="116" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" />
        <!-- Fill Light (45 deg right) -->
        <circle cx="290" cy="145" r="12" fill="#38bdf8" fill-opacity="0.7" />
        <text x="290" y="170" text-anchor="middle" fill="#38bdf8" font-size="9" font-weight="bold">FILL LIGHT (50%)</text>
        <line x1="278" y1="136" x2="218" y2="116" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="3 3" />
        <!-- Back / Hair Light (behind) -->
        <circle cx="140" cy="55" r="10" fill="#e2e8f0" />
        <text x="140" y="45" text-anchor="middle" fill="#e2e8f0" font-size="8" font-weight="bold">BACK LIGHT</text>
        <line x1="150" y1="65" x2="186" y2="94" stroke="#e2e8f0" stroke-width="1.8" />
      `;
    } else {
      graphic = `
        <!-- Generic Cinematic Studio Light Rig -->
        <circle cx="100" cy="75" r="24" fill="${style.primary}" fill-opacity="0.3" filter="drop-shadow(0 0 12px ${style.primary})" />
        <circle cx="100" cy="75" r="12" fill="${style.secondary}" />
        <!-- Directional Cones -->
        <polygon points="112,75 280,35 280,155" fill="${style.primary}" fill-opacity="0.18" />
        <!-- Lit Subject -->
        <ellipse cx="270" cy="100" rx="36" ry="46" fill="#1e293b" stroke="${style.secondary}" stroke-width="2" />
        <path d="M234 100 A36 46 0 0 1 270 54" stroke="${style.accent}" stroke-width="3" fill="none" />
      `;
    }
  }

  // ==========================================
  // 2. ENQUADRAMENTO (FRAMING)
  // ==========================================
  else if (cat === "FRAMING") {
    if (val.includes("extreme_close_up") || val.includes("plano_detalhe")) {
      graphic = `
        ${renderViewfinderOverlay(320, 150, 40, 30)}
        <!-- Extreme Close Up on Human Eye -->
        <ellipse cx="200" cy="105" rx="90" ry="48" fill="#111827" stroke="#38bdf8" stroke-width="2" />
        <circle cx="200" cy="105" r="38" fill="#0284c7" />
        <circle cx="200" cy="105" r="18" fill="#000000" />
        <!-- Iris reflection highlights -->
        <circle cx="210" cy="95" r="7" fill="#ffffff" />
        <circle cx="192" cy="115" r="3.5" fill="#ffffff" fill-opacity="0.8" />
        <text x="200" y="165" text-anchor="middle" fill="#38bdf8" font-size="11" font-family="monospace">EXTREME CLOSE-UP (ECU)</text>
      `;
    } else if (val.includes("close_up") || val.includes("primeiro_plano")) {
      graphic = `
        ${renderViewfinderOverlay(320, 150, 40, 30)}
        <!-- Close Up of Face Filling Frame -->
        <circle cx="200" cy="100" r="42" fill="#334155" stroke="#38bdf8" stroke-width="2" />
        <!-- Eyes, Nose, Mouth -->
        <circle cx="185" cy="94" r="4.5" fill="#ffffff" />
        <circle cx="215" cy="94" r="4.5" fill="#ffffff" />
        <circle cx="185" cy="94" r="2.5" fill="#000000" />
        <circle cx="215" cy="94" r="2.5" fill="#000000" />
        <path d="M200 98 L200 108 L196 112" stroke="#64748b" stroke-width="1.8" fill="none" />
        <path d="M190 124 Q200 130 210 124" stroke="#64748b" stroke-width="2" fill="none" />
        <path d="M165 142 C165 130, 235 130, 235 142 L245 180 L155 180 Z" fill="#1e293b" />
        <text x="200" y="170" text-anchor="middle" fill="#38bdf8" font-size="11" font-family="monospace">CLOSE-UP (CU)</text>
      `;
    } else if (val.includes("medium_shot") || val.includes("plano_medio")) {
      graphic = `
        ${renderViewfinderOverlay(320, 150, 40, 30)}
        <!-- Medium Shot (Waist Up) -->
        ${renderHumanFigure(200, 115, 1.4, "#38bdf8")}
        <!-- Waist Crop Line -->
        <line x1="80" y1="150" x2="320" y2="150" stroke="#f43f5e" stroke-width="1.5" stroke-dasharray="4 3" />
        <text x="90" y="145" fill="#f43f5e" font-size="9" font-family="monospace">WAIST LINE CROP</text>
        <text x="200" y="172" text-anchor="middle" fill="#38bdf8" font-size="11" font-family="monospace">MEDIUM SHOT (MS)</text>
      `;
    } else if (val.includes("cowboy")) {
      graphic = `
        ${renderViewfinderOverlay(320, 150, 40, 30)}
        <!-- Cowboy Shot (Mid Thigh Up) -->
        ${renderHumanFigure(200, 105, 1.1, "#38bdf8")}
        <!-- Mid-thigh crop line -->
        <line x1="80" y1="156" x2="320" y2="156" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="4 3" />
        <text x="90" y="152" fill="#f59e0b" font-size="9" font-family="monospace">MID-THIGH HOLSTER CROP</text>
        <text x="200" y="172" text-anchor="middle" fill="#38bdf8" font-size="11" font-family="monospace">COWBOY SHOT (MLS)</text>
      `;
    } else if (val.includes("full_shot") || val.includes("plano_inteiro")) {
      graphic = `
        ${renderViewfinderOverlay(320, 150, 40, 30)}
        <!-- Full Shot (Head to Toe) -->
        ${renderHumanFigure(200, 85, 0.9, "#38bdf8")}
        <line x1="120" y1="145" x2="280" y2="145" stroke="#334155" stroke-width="1.5" />
        <text x="200" y="170" text-anchor="middle" fill="#38bdf8" font-size="11" font-family="monospace">FULL SHOT (FS)</text>
      `;
    } else if (val.includes("wide_shot") || val.includes("plano_aberto") || val.includes("geral")) {
      graphic = `
        ${renderViewfinderOverlay(320, 150, 40, 30)}
        <!-- Mountainous Scenic Landscape -->
        <polygon points="40,140 110,80 180,140" fill="#1e293b" />
        <polygon points="140,140 230,65 310,140" fill="#0f172a" />
        <polygon points="260,140 330,90 360,140" fill="#1e293b" />
        <line x1="40" y1="140" x2="360" y2="140" stroke="#38bdf8" stroke-width="1.5" />
        <!-- Small human figure in landscape -->
        ${renderHumanFigure(200, 125, 0.45, "#f8fafc")}
        <text x="200" y="170" text-anchor="middle" fill="#38bdf8" font-size="11" font-family="monospace">WIDE SHOT (WS) / ESTABLISHING</text>
      `;
    } else if (val.includes("over_the_shoulder") || val.includes("contra_plano")) {
      graphic = `
        ${renderViewfinderOverlay(320, 150, 40, 30)}
        <!-- Foreground Shoulder Silhouette -->
        <path d="M40 180 L40 90 Q80 90 100 120 Q120 150 140 180 Z" fill="#0a0f1d" stroke="#38bdf8" stroke-width="1.5" />
        <circle cx="85" cy="85" r="26" fill="#0a0f1d" />
        <!-- Opposite Speaker in Focus -->
        ${renderHumanFigure(250, 105, 1.0, "#38bdf8")}
        <text x="200" y="170" text-anchor="middle" fill="#38bdf8" font-size="11" font-family="monospace">OVER THE SHOULDER (OTS)</text>
      `;
    } else if (val.includes("dutch")) {
      graphic = `
        <!-- Dutch Tilted Frame -->
        <g transform="rotate(14 200 105)">
          ${renderViewfinderOverlay(300, 140, 50, 35)}
          ${renderHumanFigure(200, 105, 1.2, "#f43f5e")}
          <line x1="50" y1="140" x2="350" y2="140" stroke="#f43f5e" stroke-width="2" stroke-dasharray="6 3" />
        </g>
        <text x="200" y="172" text-anchor="middle" fill="#f43f5e" font-size="11" font-family="monospace" font-weight="bold">DUTCH / CANTED ANGLE (TILTED)</text>
      `;
    } else {
      graphic = `
        ${renderViewfinderOverlay(320, 150, 40, 30)}
        ${renderHumanFigure(200, 105, 1.1, "#38bdf8")}
        <text x="200" y="170" text-anchor="middle" fill="#38bdf8" font-size="11" font-family="monospace">${option.originalName?.toUpperCase() || option.value.toUpperCase()}</text>
      `;
    }
  }

  // ==========================================
  // 3. ÂNGULO DE CÂMERA (CAMERA_ANGLE)
  // ==========================================
  else if (cat === "CAMERA_ANGLE") {
    if (val.includes("low_angle") || val.includes("contra_plongee")) {
      graphic = `
        <!-- Camera on Floor looking up at imposing figure -->
        <rect x="40" y="30" width="320" height="150" rx="8" fill="#08101a" stroke="#1e293b" />
        <!-- Low Camera -->
        <rect x="60" y="145" width="32" height="20" rx="4" fill="#10b981" />
        <polygon points="92,150 105,142 105,168 92,160" fill="#34d399" />
        <!-- Upward Sightline cone -->
        <polygon points="105,155 280,45 320,95" fill="#10b981" fill-opacity="0.18" />
        <line x1="105" y1="155" x2="260" y2="70" stroke="#34d399" stroke-width="2" stroke-dasharray="5 3" />
        <!-- Towering Hero Figure -->
        ${renderHumanFigure(260, 60, 1.5, "#f8fafc")}
        <text x="200" y="172" text-anchor="middle" fill="#34d399" font-size="11" font-family="monospace">LOW ANGLE (CONTRA-PLONGÉE) ▲</text>
      `;
    } else if (val.includes("high_angle") || val.includes("plongee")) {
      graphic = `
        <!-- High Camera looking down at small figure -->
        <rect x="40" y="30" width="320" height="150" rx="8" fill="#08101a" stroke="#1e293b" />
        <!-- High Camera -->
        <rect x="60" y="45" width="32" height="20" rx="4" fill="#10b981" />
        <polygon points="92,50 105,42 105,68 92,60" fill="#34d399" />
        <!-- Downward Sightline cone -->
        <polygon points="105,55 240,115 280,165" fill="#10b981" fill-opacity="0.18" />
        <line x1="105" y1="55" x2="260" y2="135" stroke="#34d399" stroke-width="2" stroke-dasharray="5 3" />
        <!-- Small Figure Below -->
        ${renderHumanFigure(260, 125, 0.8, "#f8fafc")}
        <text x="200" y="172" text-anchor="middle" fill="#34d399" font-size="11" font-family="monospace">HIGH ANGLE (PLONGÉE) ▼</text>
      `;
    } else if (val.includes("birds_eye") || val.includes("zenithal") || val.includes("overhead")) {
      graphic = `
        <!-- 90 Degree Overhead View (Bird's Eye) -->
        <rect x="40" y="30" width="320" height="150" rx="8" fill="#050811" stroke="#1e293b" />
        <!-- Road / Crosswalk below -->
        <rect x="150" y="30" width="100" height="150" fill="#1e293b" />
        <line x1="180" y1="40" x2="180" y2="170" stroke="#f8fafc" stroke-width="4" stroke-dasharray="12 12" />
        <line x1="220" y1="40" x2="220" y2="170" stroke="#f8fafc" stroke-width="4" stroke-dasharray="12 12" />
        <!-- Head and shoulders seen directly from above -->
        <circle cx="200" cy="105" r="14" fill="#10b981" />
        <ellipse cx="200" cy="105" rx="26" ry="12" fill="#34d399" />
        <circle cx="200" cy="105" r="45" fill="none" stroke="#10b981" stroke-width="1.5" stroke-dasharray="4 4" />
        <text x="200" y="172" text-anchor="middle" fill="#34d399" font-size="11" font-family="monospace">TOP DOWN / BIRD'S EYE VIEW 90°</text>
      `;
    } else if (val.includes("worms_eye")) {
      graphic = `
        <!-- Worm's Eye View (Ground to Sky) -->
        <rect x="40" y="30" width="320" height="150" rx="8" fill="#050811" stroke="#1e293b" />
        <!-- Skyscrapers towering into vanishing point -->
        <polygon points="50,180 180,45 220,45 350,180" fill="#1e293b" />
        <line x1="180" y1="45" x2="180" y2="180" stroke="#10b981" stroke-width="1.5" />
        <line x1="220" y1="45" x2="220" y2="180" stroke="#10b981" stroke-width="1.5" />
        <circle cx="200" cy="45" r="10" fill="#34d399" />
        <text x="200" y="172" text-anchor="middle" fill="#34d399" font-size="11" font-family="monospace">WORM'S EYE VIEW (GROUND LEVEL)</text>
      `;
    } else {
      graphic = `
        <!-- Eye Level Neutral -->
        <rect x="40" y="30" width="320" height="150" rx="8" fill="#08101a" stroke="#1e293b" />
        <rect x="60" y="95" width="34" height="22" rx="4" fill="#10b981" />
        <polygon points="94,101 106,95 106,117 94,111" fill="#34d399" />
        <line x1="106" y1="106" x2="260" y2="106" stroke="#34d399" stroke-width="2.5" stroke-linecap="round" />
        ${renderHumanFigure(260, 105, 1.2, "#f8fafc")}
        <text x="200" y="172" text-anchor="middle" fill="#34d399" font-size="11" font-family="monospace">EYE LEVEL (NEUTRAL 1:1)</text>
      `;
    }
  }

  // ==========================================
  // 4. MOVIMENTO DE CÂMERA (CAMERA_MOVEMENT)
  // ==========================================
  else if (cat === "CAMERA_MOVEMENT") {
    let arrow = "M100 105 L240 105";
    let moveLabel = "HORIZONTAL PAN / DOLLY";

    if (val.includes("dolly_in") || val.includes("push_in") || val.includes("zoom_in")) {
      arrow = "M90 105 L230 105";
      moveLabel = "DOLLY IN / PUSH IN ➔";
    } else if (val.includes("dolly_out") || val.includes("pull_out") || val.includes("zoom_out")) {
      arrow = "M230 105 L90 105";
      moveLabel = "DOLLY OUT / PULL OUT ➔";
    } else if (val.includes("pan_left")) {
      arrow = "M240 90 A90 90 0 0 0 130 90";
      moveLabel = "PAN LEFT ⟲ (HORIZONTAL)";
    } else if (val.includes("pan_right")) {
      arrow = "M130 90 A90 90 0 0 1 240 90";
      moveLabel = "PAN RIGHT ⟳ (HORIZONTAL)";
    } else if (val.includes("tilt_up") || val.includes("crane_up") || val.includes("pedestal_up")) {
      arrow = "M180 150 L180 60";
      moveLabel = "TILT / PEDESTAL UP ▲";
    } else if (val.includes("tilt_down") || val.includes("crane_down") || val.includes("pedestal_down")) {
      arrow = "M180 60 L180 150";
      moveLabel = "TILT / PEDESTAL DOWN ▼";
    } else if (val.includes("orbit") || val.includes("360")) {
      arrow = "M120 105 A60 25 0 1 1 240 105 A60 25 0 1 1 120 105";
      moveLabel = "ORBIT 360° AROUND SUBJECT";
    } else if (val.includes("handheld") || val.includes("shake")) {
      arrow = "M80 105 Q100 85, 120 105 T160 105 T200 105 T240 105 T280 105";
      moveLabel = "HANDHELD / SHAKY CAM (ORGANIC)";
    } else if (val.includes("steadicam") || val.includes("tracking")) {
      arrow = "M70 140 L310 140";
      moveLabel = "STEADICAM / DOLLY TRACKING";
    }

    graphic = `
      <rect x="40" y="30" width="320" height="150" rx="8" fill="#0b0e1d" stroke="#1e293b" />
      <!-- Dolly Tracks Grid -->
      <line x1="60" y1="150" x2="340" y2="150" stroke="#334155" stroke-width="2.5" />
      <line x1="60" y1="165" x2="340" y2="165" stroke="#334155" stroke-width="2.5" />
      <line x1="100" y1="146" x2="100" y2="169" stroke="#334155" stroke-width="1.8" />
      <line x1="160" y1="146" x2="160" y2="169" stroke="#334155" stroke-width="1.8" />
      <line x1="220" y1="146" x2="220" y2="169" stroke="#334155" stroke-width="1.8" />
      <line x1="280" y1="146" x2="280" y2="169" stroke="#334155" stroke-width="1.8" />
      <!-- Camera Rig Icon -->
      <rect x="75" y="85" width="34" height="24" rx="4" fill="#6366f1" />
      <polygon points="109,92 122,86 122,108 109,102" fill="#818cf8" />
      <circle cx="85" cy="115" r="4" fill="#c7d2fe" />
      <circle cx="100" cy="115" r="4" fill="#c7d2fe" />
      <!-- Movement Vector Trajectory -->
      <path d="${arrow}" fill="none" stroke="#818cf8" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="6 4" filter="drop-shadow(0 0 8px #6366f1)" />
      <!-- Subject at end of path -->
      ${renderHumanFigure(275, 95, 0.9, "#f8fafc")}
      <text x="200" y="172" text-anchor="middle" fill="#818cf8" font-size="11" font-family="monospace">${moveLabel}</text>
    `;
  }

  // ==========================================
  // 5. LENTES & PERSPECTIVA (LENS_PERSPECTIVE)
  // ==========================================
  else if (cat === "LENS_PERSPECTIVE") {
    if (val.includes("anamorfica")) {
      graphic = `
        <!-- Anamorphic 2.39:1 Cinema Letterbox with Streak Flare -->
        <rect x="40" y="30" width="320" height="150" rx="8" fill="#05070f" />
        <!-- 2.39:1 Frame Outline -->
        <rect x="50" y="65" width="300" height="80" rx="3" fill="#0b1329" stroke="#38bdf8" stroke-width="1.5" />
        <!-- Horizontal Blue Anamorphic Streak Flare -->
        <line x1="40" y1="105" x2="360" y2="105" stroke="#38bdf8" stroke-width="3.5" filter="drop-shadow(0 0 10px #38bdf8)" />
        <ellipse cx="200" cy="105" rx="60" ry="8" fill="#ffffff" filter="drop-shadow(0 0 12px #38bdf8)" />
        <!-- Oval Bokeh Disc -->
        <ellipse cx="120" cy="105" rx="14" ry="32" fill="#38bdf8" fill-opacity="0.35" stroke="#38bdf8" stroke-width="1.5" />
        <ellipse cx="280" cy="105" rx="14" ry="32" fill="#38bdf8" fill-opacity="0.35" stroke="#38bdf8" stroke-width="1.5" />
        <text x="200" y="170" text-anchor="middle" fill="#38bdf8" font-size="11" font-family="monospace">2.39:1 ANAMORPHIC SCOPE + BLUE FLARE</text>
      `;
    } else if (val.includes("fisheye") || val.includes("14mm")) {
      graphic = `
        <!-- Fisheye 180 Degree Warped Grid -->
        <rect x="40" y="30" width="320" height="150" rx="8" fill="#080714" stroke="#1e293b" />
        <circle cx="200" cy="105" r="60" fill="#0f0e26" stroke="#c084fc" stroke-width="2.5" />
        <!-- Curving distorted grid lines -->
        <ellipse cx="200" cy="105" rx="50" ry="25" fill="none" stroke="#a855f7" stroke-width="1.5" stroke-dasharray="3 3" />
        <ellipse cx="200" cy="105" rx="25" ry="50" fill="none" stroke="#a855f7" stroke-width="1.5" stroke-dasharray="3 3" />
        <circle cx="200" cy="105" r="14" fill="#e9d5ff" />
        <text x="200" y="172" text-anchor="middle" fill="#c084fc" font-size="11" font-family="monospace">180° ULTRA WIDE / FISHEYE BARREL</text>
      `;
    } else if (val.includes("85mm") || val.includes("135mm") || val.includes("teleobjetiva") || val.includes("bokeh")) {
      graphic = `
        <!-- Telephoto Portrait with Creamy Bokeh -->
        <rect x="40" y="30" width="320" height="150" rx="8" fill="#0e0a1c" stroke="#1e293b" />
        <!-- Background Creamy Bokeh Discs -->
        <circle cx="90" cy="70" r="30" fill="#ec4899" fill-opacity="0.35" filter="drop-shadow(0 0 10px #ec4899)" />
        <circle cx="310" cy="80" r="38" fill="#38bdf8" fill-opacity="0.3" filter="drop-shadow(0 0 12px #38bdf8)" />
        <circle cx="290" cy="140" r="26" fill="#f59e0b" fill-opacity="0.35" />
        <circle cx="100" cy="135" r="24" fill="#a855f7" fill-opacity="0.35" />
        <!-- Sharp Focused Subject in Center -->
        ${renderHumanFigure(200, 95, 1.35, "#ffffff")}
        <text x="200" y="172" text-anchor="middle" fill="#c084fc" font-size="11" font-family="monospace">SHALLOW DOF (f/1.4 PORTRAIT BOKEH)</text>
      `;
    } else if (val.includes("50mm") || val.includes("normal")) {
      graphic = `
        <!-- 50mm Standard Human Eye View -->
        <rect x="40" y="30" width="320" height="150" rx="8" fill="#0c0919" stroke="#1e293b" />
        ${renderViewfinderOverlay(260, 120, 70, 45)}
        ${renderHumanFigure(200, 105, 1.2, "#e9d5ff")}
        <line x1="70" y1="135" x2="330" y2="135" stroke="#334155" stroke-width="1.5" />
        <text x="200" y="172" text-anchor="middle" fill="#c084fc" font-size="11" font-family="monospace">50mm NORMAL LENS (NATURAL PERSPECTIVE)</text>
      `;
    } else {
      graphic = `
        <!-- Generic Optical Barrel Diagram -->
        <rect x="40" y="30" width="320" height="150" rx="8" fill="#0c0919" stroke="#1e293b" />
        <rect x="90" y="65" width="220" height="80" rx="8" fill="#13102b" stroke="#a855f7" stroke-width="2" />
        <!-- Lens glass elements -->
        <path d="M120 70 Q135 105 120 140" stroke="#38bdf8" stroke-width="4" fill="none" />
        <path d="M180 70 Q165 105 180 140" stroke="#c084fc" stroke-width="4" fill="none" />
        <path d="M240 70 Q255 105 240 140" stroke="#38bdf8" stroke-width="4" fill="none" />
        <text x="200" y="172" text-anchor="middle" fill="#c084fc" font-size="11" font-family="monospace">${option.originalName?.toUpperCase() || option.value.toUpperCase()}</text>
      `;
    }
  }

  // ==========================================
  // 6. COMPOSIÇÃO (COMPOSITION)
  // ==========================================
  else if (cat === "COMPOSITION") {
    if (val.includes("tercos")) {
      graphic = `
        <!-- Rule of Thirds 3x3 Matrix Grid -->
        <rect x="50" y="35" width="300" height="140" rx="6" fill="#0e0717" stroke="#334155" stroke-width="1.5" />
        <!-- Vertical Grid Lines -->
        <line x1="150" y1="35" x2="150" y2="175" stroke="#ec4899" stroke-width="2" />
        <line x1="250" y1="35" x2="250" y2="175" stroke="#ec4899" stroke-width="2" />
        <!-- Horizontal Grid Lines -->
        <line x1="50" y1="82" x2="350" y2="82" stroke="#ec4899" stroke-width="2" />
        <line x1="50" y1="128" x2="350" y2="128" stroke="#ec4899" stroke-width="2" />
        <!-- 4 Golden Intersection Points -->
        <circle cx="150" cy="82" r="7" fill="#f472b6" filter="drop-shadow(0 0 8px #ec4899)" />
        <circle cx="250" cy="82" r="7" fill="#f472b6" filter="drop-shadow(0 0 8px #ec4899)" />
        <circle cx="150" cy="128" r="7" fill="#f472b6" />
        <circle cx="250" cy="128" r="7" fill="#f472b6" />
        <!-- Actor aligned on right third -->
        ${renderHumanFigure(250, 95, 0.9, "#fbcfe8")}
        <text x="200" y="172" text-anchor="middle" fill="#f472b6" font-size="11" font-family="monospace">RULE OF THIRDS (3x3 GOLDEN INTERSECTIONS)</text>
      `;
    } else if (val.includes("simetria")) {
      graphic = `
        <!-- Symmetrical Corridor Framing -->
        <rect x="50" y="35" width="300" height="140" rx="6" fill="#0e0717" stroke="#334155" stroke-width="1.5" />
        <!-- Central Axis -->
        <line x1="200" y1="35" x2="200" y2="175" stroke="#ec4899" stroke-width="2.5" stroke-dasharray="6 3" />
        <!-- Left Arch -->
        <polygon points="60,45 150,75 150,155 60,165" fill="#1e112a" stroke="#f472b6" stroke-width="1.5" />
        <!-- Right Arch (Mirrored) -->
        <polygon points="340,45 250,75 250,155 340,165" fill="#1e112a" stroke="#f472b6" stroke-width="1.5" />
        ${renderHumanFigure(200, 105, 1.2, "#ffffff")}
        <text x="200" y="172" text-anchor="middle" fill="#f472b6" font-size="11" font-family="monospace">CENTRAL SYMMETRY (1-POINT PERSPECTIVE)</text>
      `;
    } else if (val.includes("linhas_guia") || val.includes("convergentes")) {
      graphic = `
        <!-- Leading Lines Receding to Vanishing Point -->
        <rect x="50" y="35" width="300" height="140" rx="6" fill="#0e0717" stroke="#334155" stroke-width="1.5" />
        <line x1="50" y1="175" x2="200" y2="100" stroke="#ec4899" stroke-width="3.5" />
        <line x1="350" y1="175" x2="200" y2="100" stroke="#ec4899" stroke-width="3.5" />
        <line x1="50" y1="35" x2="200" y2="100" stroke="#ec4899" stroke-width="1.5" stroke-dasharray="4 3" />
        <line x1="350" y1="35" x2="200" y2="100" stroke="#ec4899" stroke-width="1.5" stroke-dasharray="4 3" />
        <!-- Vanishing Point Target -->
        <circle cx="200" cy="100" r="12" fill="#f472b6" filter="drop-shadow(0 0 10px #ec4899)" />
        ${renderHumanFigure(200, 100, 0.7, "#ffffff")}
        <text x="200" y="172" text-anchor="middle" fill="#f472b6" font-size="11" font-family="monospace">LEADING LINES ➔ VANISHING POINT</text>
      `;
    } else if (val.includes("aurea") || val.includes("fibonacci")) {
      graphic = `
        <!-- Golden Spiral Fibonacci Curve -->
        <rect x="50" y="35" width="300" height="140" rx="6" fill="#0e0717" stroke="#334155" stroke-width="1.5" />
        <path d="M60 165 C60 50, 180 40, 240 40 C300 40, 335 80, 335 120 C335 155, 305 170, 280 170 C250 170, 240 145, 240 130 C240 115, 255 110, 260 110" fill="none" stroke="#f472b6" stroke-width="3" filter="drop-shadow(0 0 8px #ec4899)" />
        <circle cx="260" cy="110" r="6" fill="#ffffff" />
        ${renderHumanFigure(260, 110, 0.6, "#fbcfe8")}
        <text x="200" y="172" text-anchor="middle" fill="#f472b6" font-size="11" font-family="monospace">GOLDEN RATIO (FIBONACCI SPIRAL)</text>
      `;
    } else {
      graphic = `
        <rect x="50" y="35" width="300" height="140" rx="6" fill="#0e0717" stroke="#334155" stroke-width="1.5" />
        <path d="M70 165 Q200 45 330 165" fill="none" stroke="#ec4899" stroke-width="2.5" />
        <circle cx="200" cy="105" r="18" fill="#f472b6" />
        <text x="200" y="172" text-anchor="middle" fill="#f472b6" font-size="11" font-family="monospace">${option.label.toUpperCase()}</text>
      `;
    }
  }

  // ==========================================
  // 7. FOCO & TRATAMENTO ÓPTICO (FOCUS_OPTICS)
  // ==========================================
  else if (cat === "FOCUS_OPTICS") {
    if (val.includes("foco_raso") || val.includes("bokeh")) {
      graphic = `
        <!-- Shallow Depth of Field with Bokeh -->
        <rect x="40" y="30" width="320" height="150" rx="8" fill="#081024" stroke="#1e293b" />
        <!-- Soft Bokeh Orbs in Background -->
        <circle cx="90" cy="65" r="26" fill="#38bdf8" fill-opacity="0.3" filter="drop-shadow(0 0 8px #38bdf8)" />
        <circle cx="130" cy="130" r="34" fill="#60a5fa" fill-opacity="0.25" />
        <circle cx="300" cy="70" r="32" fill="#93c5fd" fill-opacity="0.3" />
        <circle cx="270" cy="135" r="28" fill="#38bdf8" fill-opacity="0.3" />
        <!-- Crisp Foreground Focus -->
        ${renderHumanFigure(200, 95, 1.3, "#ffffff")}
        <circle cx="200" cy="70" r="16" fill="none" stroke="#60a5fa" stroke-width="2" stroke-dasharray="4 2" />
        <text x="200" y="172" text-anchor="middle" fill="#60a5fa" font-size="11" font-family="monospace">SHALLOW DOF (CRISP SUBJECT + BOKEH)</text>
      `;
    } else if (val.includes("foco_profundo") || val.includes("deep_focus")) {
      graphic = `
        <!-- Deep Focus (Everything Sharp) -->
        <rect x="40" y="30" width="320" height="150" rx="8" fill="#081024" stroke="#1e293b" />
        <!-- Sharp Mountains in background -->
        <polygon points="40,130 120,60 200,130" fill="#1e293b" stroke="#3b82f6" stroke-width="1.5" />
        <polygon points="160,130 260,50 360,130" fill="#172554" stroke="#3b82f6" stroke-width="1.5" />
        <!-- Sharp Foreground Actor -->
        ${renderHumanFigure(120, 100, 1.2, "#ffffff")}
        <!-- Sharp Middleground Actor -->
        ${renderHumanFigure(280, 105, 0.8, "#bfdbfe")}
        <line x1="40" y1="130" x2="360" y2="130" stroke="#60a5fa" stroke-width="1.5" />
        <text x="200" y="172" text-anchor="middle" fill="#60a5fa" font-size="11" font-family="monospace">DEEP FOCUS (ALL PLANES SHARP f/16)</text>
      `;
    } else if (val.includes("split_diopter")) {
      graphic = `
        <!-- Split Diopter (Foreground + Deep Background) -->
        <rect x="40" y="30" width="320" height="150" rx="8" fill="#081024" stroke="#1e293b" />
        <!-- Vertical Seam in Middle -->
        <line x1="200" y1="30" x2="200" y2="180" stroke="#38bdf8" stroke-width="3" stroke-dasharray="6 3" />
        <!-- Extreme Close Up on Left Half -->
        <circle cx="130" cy="105" r="45" fill="#1e293b" stroke="#3b82f6" stroke-width="2" />
        <circle cx="130" cy="105" r="16" fill="#60a5fa" />
        <!-- Full Scene on Right Half -->
        ${renderHumanFigure(280, 105, 0.8, "#ffffff")}
        <text x="200" y="172" text-anchor="middle" fill="#60a5fa" font-size="11" font-family="monospace">SPLIT DIOPTER DUAL FOCUS SEAM</text>
      `;
    } else {
      graphic = `
        <rect x="40" y="30" width="320" height="150" rx="8" fill="#081024" stroke="#1e293b" />
        <circle cx="150" cy="105" r="30" fill="#3b82f6" fill-opacity="0.3" />
        <circle cx="250" cy="105" r="40" fill="#60a5fa" fill-opacity="0.3" />
        <line x1="150" y1="105" x2="250" y2="105" stroke="#ffffff" stroke-width="2" stroke-dasharray="5 3" />
        <text x="200" y="172" text-anchor="middle" fill="#60a5fa" font-size="11" font-family="monospace">${option.label.toUpperCase()}</text>
      `;
    }
  }

  // ==========================================
  // 8. COR & GRADAÇÃO (COLOR_GRADING)
  // ==========================================
  else if (cat === "COLOR_GRADING") {
    if (val.includes("teal")) {
      graphic = `
        <!-- Teal & Orange Blockbuster Split Grade -->
        <rect x="40" y="30" width="320" height="150" rx="8" fill="#050811" />
        <!-- Split Halves -->
        <rect x="40" y="30" width="160" height="150" rx="6" fill="#042f2e" />
        <rect x="200" y="30" width="160" height="150" rx="6" fill="#451a03" />
        <!-- Swatch labels -->
        <text x="120" y="65" text-anchor="middle" fill="#2dd4bf" font-size="13" font-family="monospace" font-weight="bold">TEAL SHADOWS</text>
        <text x="280" y="65" text-anchor="middle" fill="#fb923c" font-size="13" font-family="monospace" font-weight="bold">ORANGE SKINS</text>
        <!-- Center Character across boundary -->
        <circle cx="200" cy="105" r="34" fill="#0f172a" />
        <path d="M166 105 A34 34 0 0 1 200 71 L200 139 A34 34 0 0 1 166 105 Z" fill="#14b8a6" />
        <path d="M234 105 A34 34 0 0 1 200 139 L200 71 A34 34 0 0 1 234 105 Z" fill="#f97316" />
        <text x="200" y="172" text-anchor="middle" fill="#ffffff" font-size="11" font-family="monospace">HOLLYWOOD TEAL & ORANGE COMPLEMENT</text>
      `;
    } else if (val.includes("preto_e_branco") || val.includes("monocromatico") || val.includes("noir")) {
      graphic = `
        <!-- High Contrast Black and White Film Noir -->
        <rect x="40" y="30" width="320" height="150" rx="8" fill="#000000" stroke="#334155" />
        <!-- Venetian Blind Slanted Shadows -->
        <polygon points="40,40 180,40 140,180 40,180" fill="#18181b" />
        <polygon points="190,40 260,40 220,180 150,180" fill="#27272a" />
        <polygon points="270,40 360,40 320,180 230,180" fill="#3f3f46" />
        <!-- Silver White Highlights -->
        <ellipse cx="200" cy="105" rx="36" ry="46" fill="#71717a" stroke="#ffffff" stroke-width="2" />
        <path d="M164 105 A36 46 0 0 1 200 59" stroke="#ffffff" stroke-width="3.5" fill="none" />
        <text x="200" y="172" text-anchor="middle" fill="#f4f4f5" font-size="11" font-family="monospace">B&W MONOCHROME FILM NOIR</text>
      `;
    } else if (val.includes("matrix") || val.includes("cyberpunk")) {
      graphic = `
        <!-- Cybernetic Matrix Phosphor Green Grade -->
        <rect x="40" y="30" width="320" height="150" rx="8" fill="#021408" stroke="#16a34a" stroke-width="1.5" />
        <text x="100" y="60" fill="#22c55e" font-family="monospace" font-size="11">01101001 01101110</text>
        <text x="220" y="60" fill="#22c55e" font-family="monospace" font-size="11">11010010 10101001</text>
        <circle cx="200" cy="105" r="36" fill="#052e16" stroke="#4ade80" stroke-width="2.5" filter="drop-shadow(0 0 10px #22c55e)" />
        <text x="200" y="172" text-anchor="middle" fill="#4ade80" font-size="11" font-family="monospace">MATRIX GREEN SHADOWS / CYBERNETIC</text>
      `;
    } else if (val.includes("wes_anderson") || val.includes("pastel")) {
      graphic = `
        <!-- Wes Anderson Pastel Tones -->
        <rect x="40" y="30" width="320" height="150" rx="8" fill="#fef3c7" />
        <rect x="60" y="50" width="80" height="110" rx="4" fill="#fbcfe8" />
        <rect x="160" y="50" width="80" height="110" rx="4" fill="#fed7aa" />
        <rect x="260" y="50" width="80" height="110" rx="4" fill="#bfdbfe" />
        <text x="200" y="172" text-anchor="middle" fill="#831843" font-size="11" font-family="monospace" font-weight="bold">WES ANDERSON PASTEL PALETTE</text>
      `;
    } else {
      graphic = `
        <!-- 3-Way Color Wheels Spectrum -->
        <rect x="40" y="30" width="320" height="150" rx="8" fill="#090d18" stroke="#1e293b" />
        <circle cx="100" cy="95" r="28" fill="#0284c7" fill-opacity="0.7" />
        <circle cx="200" cy="95" r="28" fill="#f43f5e" fill-opacity="0.7" />
        <circle cx="300" cy="95" r="28" fill="#eab308" fill-opacity="0.7" />
        <text x="100" y="135" text-anchor="middle" fill="#38bdf8" font-size="9" font-family="monospace">LIFT</text>
        <text x="200" y="135" text-anchor="middle" fill="#fb7185" font-size="9" font-family="monospace">GAMMA</text>
        <text x="300" y="135" text-anchor="middle" fill="#fde047" font-size="9" font-family="monospace">GAIN</text>
        <text x="200" y="172" text-anchor="middle" fill="#fb7185" font-size="11" font-family="monospace">${option.label.toUpperCase()}</text>
      `;
    }
  }

  // ==========================================
  // 9. DINÂMICA DE CENA (SCENE_DYNAMIC)
  // ==========================================
  else if (cat === "SCENE_DYNAMIC") {
    if (val.includes("slow_motion")) {
      graphic = `
        <!-- Slow Motion Water Splash Droplets -->
        <rect x="40" y="30" width="320" height="150" rx="8" fill="#060c18" stroke="#1e293b" />
        <!-- Crown Splash -->
        <ellipse cx="200" cy="140" rx="70" ry="16" fill="#0284c7" fill-opacity="0.4" />
        <path d="M150 140 Q160 100 170 115 Q185 85 200 110 Q215 85 230 115 Q240 100 250 140 Z" fill="#38bdf8" />
        <!-- Suspended Floating Droplets -->
        <circle cx="200" cy="75" r="7" fill="#38bdf8" filter="drop-shadow(0 0 6px #38bdf8)" />
        <circle cx="175" cy="65" r="4" fill="#7dd3fc" />
        <circle cx="225" cy="60" r="4.5" fill="#7dd3fc" />
        <text x="200" y="172" text-anchor="middle" fill="#38bdf8" font-size="11" font-family="monospace">SLOW MOTION (SUSPENDED TIME 120+ FPS)</text>
      `;
    } else if (val.includes("fast_motion") || val.includes("timelapse")) {
      graphic = `
        <!-- Light Trails of Long Exposure -->
        <rect x="40" y="30" width="320" height="150" rx="8" fill="#050811" stroke="#1e293b" />
        <!-- Red Rear Lights Trail -->
        <path d="M60 140 Q160 120 340 70" stroke="#f43f5e" stroke-width="4.5" fill="none" filter="drop-shadow(0 0 10px #f43f5e)" />
        <path d="M60 148 Q160 128 340 78" stroke="#f43f5e" stroke-width="2.5" fill="none" />
        <!-- White Headlights Trail -->
        <path d="M340 140 Q240 120 60 70" stroke="#fef08a" stroke-width="4.5" fill="none" filter="drop-shadow(0 0 10px #fef08a)" />
        <text x="200" y="172" text-anchor="middle" fill="#fde047" font-size="11" font-family="monospace">FAST MOTION / TIME-LAPSE LIGHT TRAILS</text>
      `;
    } else {
      graphic = `
        <rect x="40" y="30" width="320" height="150" rx="8" fill="#060c18" stroke="#1e293b" />
        <circle cx="120" cy="105" r="14" fill="#eab308" />
        <path d="M140 105 L260 105" stroke="#fde047" stroke-width="3" stroke-linecap="round" />
        <polygon points="260,98 275,105 260,112" fill="#fde047" />
        <text x="200" y="172" text-anchor="middle" fill="#fde047" font-size="11" font-family="monospace">${option.label.toUpperCase()}</text>
      `;
    }
  }

  // ==========================================
  // 10. FORMATO DO SENSOR (SENSOR_FORMAT)
  // ==========================================
  else if (cat === "SENSOR_FORMAT") {
    let sensorW = 180;
    let sensorH = 100;
    let formatLabel = "36 x 24mm (FULL FRAME)";

    if (val.includes("super_35")) {
      sensorW = 145;
      sensorH = 82;
      formatLabel = "24.89 x 18.66mm (SUPER 35 HOLLYWOOD)";
    } else if (val.includes("medio_formato")) {
      sensorW = 230;
      sensorH = 115;
      formatLabel = "53.4 x 40.0mm (MEDIUM FORMAT LARGE SENSOR)";
    } else if (val.includes("micro_quatro_tercos")) {
      sensorW = 105;
      sensorH = 75;
      formatLabel = "17.3 x 13.0mm (MICRO 4/3 CROP 2.0x)";
    } else if (val.includes("imax")) {
      sensorW = 260;
      sensorH = 115;
      formatLabel = "70 x 48.5mm (15-PERF IMAX 70mm)";
    }

    const sensorX = 200 - sensorW / 2;
    const sensorY = 105 - sensorH / 2;

    graphic = `
      <!-- Camera Lens Mount Collar -->
      <rect x="40" y="30" width="320" height="150" rx="8" fill="#080718" stroke="#1e293b" />
      <circle cx="200" cy="105" r="68" fill="#120e29" stroke="#334155" stroke-width="2" />
      <!-- Silicon Wafer iridescent gradient -->
      <defs>
        <linearGradient id="sensorWaferGrad_${val}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#311042" />
          <stop offset="40%" stop-color="#1e1b4b" />
          <stop offset="75%" stop-color="#0284c7" />
          <stop offset="100%" stop-color="#14532d" />
        </linearGradient>
      </defs>
      <!-- Active Sensor Area -->
      <rect x="${sensorX}" y="${sensorY}" width="${sensorW}" height="${sensorH}" rx="4" fill="url(#sensorWaferGrad_${val})" stroke="#8b5cf6" stroke-width="2.5" filter="drop-shadow(0 0 10px #8b5cf6)" />
      <!-- Gold Bond Wires / Contacts -->
      <rect x="${sensorX + 4}" y="${sensorY + 4}" width="${sensorW - 8}" height="3" fill="#fbbf24" />
      <rect x="${sensorX + 4}" y="${sensorY + sensorH - 7}" width="${sensorW - 8}" height="3" fill="#fbbf24" />
      <!-- Center Sensor Reticle Cross -->
      <line x1="${sensorX + sensorW / 2 - 10}" y1="${sensorY + sensorH / 2}" x2="${sensorX + sensorW / 2 + 10}" y2="${sensorY + sensorH / 2}" stroke="#ffffff" stroke-width="1.2" />
      <line x1="${sensorX + sensorW / 2}" y1="${sensorY + sensorH / 2 - 10}" x2="${sensorX + sensorW / 2}" y2="${sensorY + sensorH / 2 + 10}" stroke="#ffffff" stroke-width="1.2" />
      <text x="200" y="172" text-anchor="middle" fill="#a78bfa" font-size="11" font-family="monospace">${formatLabel}</text>
    `;
  }

  // ==========================================
  // 11. ATMOSFERA & CLIMA (ATMOSPHERE)
  // ==========================================
  else if (cat === "ATMOSPHERE") {
    if (val.includes("neblina") || val.includes("fog")) {
      graphic = `
        <!-- Rolling Fog through Forest -->
        <rect x="40" y="30" width="320" height="150" rx="8" fill="#041214" stroke="#1e293b" />
        <!-- Dark Pine Trees in Fog -->
        <polygon points="100,160 120,80 140,160" fill="#0f2628" />
        <polygon points="180,160 210,65 240,160" fill="#091b1d" />
        <polygon points="270,160 290,90 310,160" fill="#0f2628" />
        <!-- Layered Mist / Fog bands -->
        <ellipse cx="200" cy="110" rx="140" ry="25" fill="#2dd4bf" fill-opacity="0.22" filter="blur(6px)" />
        <ellipse cx="180" cy="135" rx="150" ry="20" fill="#99f6e4" fill-opacity="0.3" filter="blur(8px)" />
        <text x="200" y="172" text-anchor="middle" fill="#2dd4bf" font-size="11" font-family="monospace">VOLUMETRIC FOG / DENSE MIST</text>
      `;
    } else if (val.includes("chuva")) {
      graphic = `
        <!-- Rain Streaks against dark asphalt -->
        <rect x="40" y="30" width="320" height="150" rx="8" fill="#040d12" stroke="#1e293b" />
        <!-- Streetlamp glow -->
        <circle cx="280" cy="65" r="22" fill="#fbbf24" fill-opacity="0.4" filter="drop-shadow(0 0 14px #fbbf24)" />
        <line x1="280" y1="65" x2="280" y2="160" stroke="#64748b" stroke-width="2" />
        <!-- Diagonal Raindrops -->
        <g stroke="#38bdf8" stroke-width="1.6" stroke-linecap="round" opacity="0.8">
          <line x1="60" y1="40" x2="45" y2="70" />
          <line x1="120" y1="50" x2="105" y2="80" />
          <line x1="180" y1="45" x2="165" y2="75" />
          <line x1="240" y1="55" x2="225" y2="85" />
          <line x1="90" y1="100" x2="75" y2="130" />
          <line x1="150" y1="95" x2="135" y2="125" />
          <line x1="210" y1="105" x2="195" y2="135" />
          <line x1="300" y1="90" x2="285" y2="120" />
        </g>
        <text x="200" y="172" text-anchor="middle" fill="#2dd4bf" font-size="11" font-family="monospace">CINEMATIC RAIN & WET SURFACE REFLECTIONS</text>
      `;
    } else if (val.includes("poeira") || val.includes("haze")) {
      graphic = `
        <!-- God Rays & Floating Dust Motes -->
        <rect x="40" y="30" width="320" height="150" rx="8" fill="#041214" stroke="#1e293b" />
        <!-- Diagonal Volumetric God Ray Shaft -->
        <polygon points="60,30 110,30 330,175 240,175" fill="#2dd4bf" fill-opacity="0.2" />
        <!-- Floating illuminated dust particles -->
        <circle cx="140" cy="80" r="3" fill="#fef08a" filter="drop-shadow(0 0 4px #fef08a)" />
        <circle cx="170" cy="110" r="2" fill="#ffffff" />
        <circle cx="210" cy="95" r="3.5" fill="#fef08a" filter="drop-shadow(0 0 5px #fef08a)" />
        <circle cx="250" cy="130" r="2" fill="#ffffff" />
        <text x="200" y="172" text-anchor="middle" fill="#2dd4bf" font-size="11" font-family="monospace">VOLUMETRIC GOD RAYS & DUST PARTICLES</text>
      `;
    } else {
      graphic = `
        <rect x="40" y="30" width="320" height="150" rx="8" fill="#041214" stroke="#1e293b" />
        <circle cx="200" cy="105" r="40" fill="#14b8a6" fill-opacity="0.3" />
        <text x="200" y="172" text-anchor="middle" fill="#2dd4bf" font-size="11" font-family="monospace">${option.label.toUpperCase()}</text>
      `;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240" width="100%" height="100%">
  <defs>
    <linearGradient id="bgGrad_${val}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#070a12" />
      <stop offset="100%" stop-color="#0f172a" />
    </linearGradient>
  </defs>

  <!-- Cinema Base Background -->
  <rect width="400" height="240" rx="16" fill="url(#bgGrad_${val})" stroke="#1e293b" stroke-width="2"/>

  <!-- Illustrative Graphic Zone -->
  ${graphic}

  <!-- Header Category Badge -->
  <g transform="translate(16, 22)">
    <rect x="0" y="-12" width="170" height="20" rx="5" fill="${style.primary}" fill-opacity="0.18" stroke="${style.primary}" stroke-width="1.2"/>
    <text x="8" y="2" fill="${style.secondary}" font-size="9" font-family="monospace" font-weight="bold">${style.badge}</text>
  </g>

  <!-- Footer Title and Code -->
  <rect x="0" y="196" width="400" height="44" fill="#04060b" fill-opacity="0.95" />
  <line x1="0" y1="196" x2="400" y2="196" stroke="#1e293b" stroke-width="1.2"/>
  
  <text x="16" y="215" fill="#f8fafc" font-size="11" font-family="sans-serif" font-weight="bold">${option.label.length > 42 ? option.label.substring(0, 40) + "..." : option.label}</text>
  <text x="16" y="229" fill="#94a3b8" font-size="9" font-family="monospace">${option.originalName || option.value}</text>
  
  <rect x="310" y="206" width="74" height="20" rx="4" fill="${style.primary}" fill-opacity="0.2" stroke="${style.primary}" stroke-width="0.8"/>
  <text x="347" y="220" text-anchor="middle" fill="${style.secondary}" font-size="9" font-family="monospace" font-weight="bold">REF V2.0</text>
</svg>`;
}

async function main() {
  console.log("Gerando ilustrações cinematográficas ricas para todas as 175 opções...");

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

  console.log(`Concluído com sucesso! ${count} referências visuais atualizadas.`);
}

main().catch(console.error);
