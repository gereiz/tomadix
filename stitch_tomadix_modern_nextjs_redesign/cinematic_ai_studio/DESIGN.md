---
name: Cinematic AI Studio
colors:
  surface: '#101418'
  surface-dim: '#101418'
  surface-bright: '#363a3e'
  surface-container-lowest: '#0b0f13'
  surface-container-low: '#181c20'
  surface-container: '#1c2024'
  surface-container-high: '#262a2f'
  surface-container-highest: '#31353a'
  on-surface: '#e0e3e8'
  on-surface-variant: '#bbcabf'
  inverse-surface: '#e0e3e8'
  inverse-on-surface: '#2d3135'
  outline: '#86948a'
  outline-variant: '#3c4a42'
  surface-tint: '#4edea3'
  primary: '#4edea3'
  on-primary: '#003824'
  primary-container: '#10b981'
  on-primary-container: '#00422b'
  inverse-primary: '#006c49'
  secondary: '#95d3ba'
  on-secondary: '#003829'
  secondary-container: '#0b513d'
  on-secondary-container: '#83c2a9'
  tertiary: '#62dcad'
  on-tertiary: '#003827'
  tertiary-container: '#37b78a'
  on-tertiary-container: '#00422e'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#6ffbbe'
  primary-fixed-dim: '#4edea3'
  on-primary-fixed: '#002113'
  on-primary-fixed-variant: '#005236'
  secondary-fixed: '#b0f0d6'
  secondary-fixed-dim: '#95d3ba'
  on-secondary-fixed: '#002117'
  on-secondary-fixed-variant: '#0b513d'
  tertiary-fixed: '#80f9c8'
  tertiary-fixed-dim: '#62dcad'
  on-tertiary-fixed: '#002115'
  on-tertiary-fixed-variant: '#00513a'
  background: '#101418'
  on-background: '#e0e3e8'
  surface-variant: '#31353a'
typography:
  display-hero:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.03em
  display-hero-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: -0.005em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  label-code:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.04em
  label-caps:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.08em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.25rem
  gutter-lg: 1.75rem
  margin: 1.5rem
  margin-desktop: 3rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.875rem
  space-lg: 1.5rem
  space-xl: 2.25rem
  space-2xl: 3.5rem
---

## Brand & Style

This design system is engineered for premier generative AI cinema, creative direction, and cinematic pre-production. Rooted in the visual precision of modern studio workbenches (such as Linear, Raycast, and Runway), it eliminates the visual noise of amateur production suites in favor of calm, high-focus craft. 

The aesthetic is precision dark minimalism elevated by subtle glassmorphism, whisper-thin translucencies, deep slate-zinc blacks, and an electrifying emerald accent that denotes AI intelligence, action, and production readiness. 

The UI must evoke the feeling of a high-end film editing console crossed with an intelligent creative hub: focused, silent, profoundly capable, and aesthetically inspiring. It prioritizes expansive breathing room, ultra-refined typographic contrast, razor-thin luminous borders (`rgba(255, 255, 255, 0.08)`), and soft backdrop diffusion over opaque, heavy UI containers.

## Colors

The palette is anchored in abyssal slate blacks and velvety zinc tones, steering clear of flat neutral grays.

- **Primary (`#10B981`) & Tertiary (`#6EE7B7`)**: Emerald & cyber-mint tones. Used sparingly for critical action buttons, active project states, glowing indicators, and brand keystones. Never over-saturated or blocky.
- **Secondary (`#064E3B`)**: Deep emerald shadow for state active backdrops and tinted badges.
- **Canvas & Surface Tier (`neutral`)**:
  - `bg-base`: `#07090D` (the canvas void, deep charcoal slate).
  - `bg-surface`: `rgba(15, 20, 26, 0.70)` with `backdrop-filter: blur(16px)`.
  - `bg-surface-elevated`: `rgba(23, 30, 40, 0.80)`.
  - `border-subtle`: `rgba(255, 255, 255, 0.07)` to `rgba(255, 255, 255, 0.12)`.
- **Semantic Project Taxonomy Badges**:
  - *Personagem / Characters*: Tinted violet/iris (`#A78BFA` on `rgba(167, 139, 250, 0.10)`).
  - *Ambiente / Scenery*: Soft cyan/azure (`#38BDF8` on `rgba(56, 189, 248, 0.10)`).
  - *Cenas / Scenes*: Warm amber (`#FBBF24` on `rgba(251, 191, 36, 0.10)`).
  - *Prompts & Models*: Electric emerald (`#34D399` on `rgba(52, 211, 153, 0.10)`).

## Typography

The typographic hierarchy is crafted with geometric clarity and structural discipline. 

- **Plus Jakarta Sans** provides structural elegance to section headers, brand titles, and hero prompts, infusing the cinematic interface with modern, human geometric presence.
- **Inter** handles narrative descriptions, context blurbs, metadata panels, and body parameters with neutral, frictionless legibility.
- **JetBrains Mono** is introduced specifically for camera meta, timecodes, JSON parameters, tokens, aspect ratios (e.g., `16:9`, `2.39:1`), and generative prompt technical badges.

Upper-case metadata labels (`label-caps`) are styled with wide tracking (`0.08em`) and emerald or muted slate colorings to denote categorizations with editorial prestige.

## Layout & Spacing

The layout philosophy follows a fluid 12-column modular grid with generous negative space, mirroring the expansive canvas of film editing suites. 

- **Structure**: Breakpoints are segmented at `640px` (Mobile, single column, fluid stack), `1024px` (Tablet / Laptop, 2 to 3 column cards), and `1440px+` (Studio Display, multi-column modular workspace with sticky prompt bar and contextual inspector panels).
- **Rhythm**: Internal card padding is intentionally airy (`1.5rem` / `space-lg`), abandoning dense, claustrophobic dashboard tables. Gaps between project modules provide clear visual separation without relying on solid divide rules.
- **Fixed Floating AI Bar**: The generative bar floats anchored at the bottom with safe margins (`margin-desktop`), mirroring modern creative tools (Midjourney, Runway, Raycast), elevating prompt interaction into an effortless persistent action.

## Elevation & Depth

Visual hierarchy is constructed through tonal light layering, glassmorphism, and subtle ambient glows rather than aggressive drop shadows or thick outlines.

- **Surface Tiers**:
  - **Tier 0 (Canvas)**: Background deep void (`#07090D`) with a faint radial gradient spotlight at the top center (`radial-gradient(ellipse at top, rgba(16, 185, 129, 0.05), transparent 70%)`).
  - **Tier 1 (Cards & Modules)**: Glass cards with `background: rgba(14, 18, 24, 0.65)`, `backdrop-filter: blur(20px)`, and a hairline border of `1px solid rgba(255, 255, 255, 0.07)`.
  - **Tier 2 (Modals & Floating Command Bar)**: `background: rgba(18, 24, 32, 0.88)`, `backdrop-filter: blur(28px)`, with border `1px solid rgba(255, 255, 255, 0.12)` and shadow `0 20px 48px -12px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(16, 185, 129, 0.15)`.
- **Interactive State Elevation**: On card hover, surfaces elevate by increasing top border luminance (`border-color: rgba(255, 255, 255, 0.16)`) and activating a subtle inner light wash (`box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.08), 0 12px 32px -8px rgba(0, 0, 0, 0.6)`).

## Shapes

The shape system employs level `2` roundedness (0.5rem base radius, with containers scaling between 0.75rem and 1rem). 

- **Interactive Elements (Buttons, Inputs, Selectors)**: Master radius of `0.625rem` (10px) to balance friendly approachability with modern tool precision.
- **Cards and Viewport Containers**: Styled with `0.875rem` (14px) to `1rem` (16px) corner radiuses, producing soft silhouette boundaries that look sharp on high-DPI displays.
- **Pills and Badges**: Fully rounded (`9999px`) reserved specifically for categorization tags, status indicators, and micro avatar pills.

## Components

### Buttons
- **Primary (Action / Create)**: Electric emerald base (`#10B981`), dark slate text (`#02140D`, bold), with a subtle top sheen (`inset 0 1px 0 rgba(255, 255, 255, 0.3)`). Hover: `#34D399` with `box-shadow: 0 0 20px -2px rgba(16, 185, 129, 0.45)`.
- **Secondary (Ghost Glass)**: `rgba(255, 255, 255, 0.04)` fill with `1px solid rgba(255, 255, 255, 0.08)`. Foreground is high-contrast off-white (`#F1F5F9`). Hover: `rgba(255, 255, 255, 0.08)` and `border-color: rgba(255, 255, 255, 0.16)`.
- **Icon Actions**: 32x32px or 36x36px clickable surfaces, muted monochrome icons (`#94A3B8`) shifting to pure white (`#FFFFFF`) with emerald hover accents.

### Project & Media Cards
- Spacious padding (`space-lg`), divided internally not by hard lines, but by tonal shifts and micro-margins.
- Cinematic preview container: 16:9 ratio, subtle inner bevel, fallback ambient gradient placeholder featuring a film slate or camera icon at low opacity.
- Metrics footer: Pill counters showing character count, scenes, and parameters formatted in clean mono-spaced typography.

### Input Fields & Prompt Hub Bar
- **Prompt Input Console**: Bottom-anchored pill container featuring an integrated category selector, multi-line auto-expanding prompt input (`rgba(0, 0, 0, 0.3)` inner depth), and an icon-driven generate trigger.
- **Standard Search & Filters**: Search field with low-contrast glass inset (`rgba(255, 255, 255, 0.03)`), leading search icon, subtle keyboard shortcut badge (`⌘K` in `JetBrains Mono`), and clear focus states glowing with `0 0 0 2px rgba(16, 185, 129, 0.3)`.

### Filter Chips & Badges
- Category chips utilize 50% opacity translucent tints with glowing color-matched dot indicators (e.g., violet for character, amber for scene, green for active prompt).
- Active chips feature an emerald hairline outline and crisp white typography.

### Checkboxes & Segmented Controls
- Minimal switch and segmented controls housed inside a unified dark capsule (`rgba(255, 255, 255, 0.05)`). Selected items slide with smooth ease-out curves and an elevated glass tab effect.