import { CustomizationSettings } from "@/modules/admin/platform-settings.service";

export function getContrastTextColor(hexColor: string): string {
  if (!hexColor || !hexColor.startsWith("#") || hexColor.length < 7) return "#ffffff";
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 160 ? "#090d16" : "#ffffff";
}

export function generateThemeCss(customization: CustomizationSettings): string {
  const onPrimary = getContrastTextColor(customization.primaryColor);
  const onSecondary = getContrastTextColor(customization.secondaryColor);
  const badgeText = customization.badgeTextColor || "#ffffff";
  const badgeBg = customization.badgeBgColor || customization.primaryColor;

  return `
    :root {
      /* Brand Color Variables */
      --brand-primary: ${customization.primaryColor};
      --brand-on-primary: ${onPrimary};
      --brand-secondary: ${customization.secondaryColor};
      --brand-on-secondary: ${onSecondary};
      --brand-accent: ${customization.accentColor};
      --brand-background: ${customization.backgroundColor};
      --brand-surface: ${customization.surfaceColor};
      --brand-card: ${customization.cardColor};
      --brand-text-primary: ${customization.textPrimaryColor};
      --brand-text-secondary: ${customization.textSecondaryColor};
      --brand-border: ${customization.borderColor};
      --brand-badge-text: ${badgeText};
      --brand-badge-bg: ${badgeBg};

      /* Tailwind CSS Theme Mapping */
      --color-primary: ${customization.primaryColor};
      --color-on-primary: ${onPrimary};
      --color-primary-container: ${customization.primaryColor};
      --color-primary-fixed: ${customization.primaryColor};
      --color-primary-fixed-dim: ${customization.primaryColor};
      --color-surface-tint: ${customization.primaryColor};

      --color-secondary: ${customization.secondaryColor};
      --color-on-secondary: ${onSecondary};
      --color-secondary-container: ${customization.secondaryColor};
      --color-secondary-fixed: ${customization.secondaryColor};
      --color-secondary-fixed-dim: ${customization.secondaryColor};

      --color-tertiary: ${customization.accentColor};
      --color-tertiary-fixed: ${customization.accentColor};
      --color-tertiary-fixed-dim: ${customization.accentColor};

      --color-badge-text: ${badgeText};
      --color-badge-bg: ${badgeBg};

      --color-background: ${customization.backgroundColor};
      --color-surface: ${customization.surfaceColor};
      --color-surface-dim: ${customization.surfaceColor};
      --color-surface-container: ${customization.cardColor};
      --color-surface-container-low: ${customization.cardColor};
      --color-surface-container-high: ${customization.cardColor};
      --color-surface-container-highest: ${customization.cardColor};

      --color-on-surface: ${customization.textPrimaryColor};
      --color-on-background: ${customization.textPrimaryColor};
      --color-on-surface-variant: ${customization.textSecondaryColor};

      --color-outline: ${customization.borderColor};
      --color-outline-variant: ${customization.borderColor};

      /* Aliases automáticos de Tailwind para que classes como text-emerald-400 / bg-emerald-500 / text-lime-400 herdem a personalização da marca */
      --color-emerald-50: color-mix(in srgb, ${customization.primaryColor} 10%, white);
      --color-emerald-100: color-mix(in srgb, ${customization.primaryColor} 20%, white);
      --color-emerald-200: color-mix(in srgb, ${customization.secondaryColor} 80%, white);
      --color-emerald-300: ${customization.secondaryColor};
      --color-emerald-400: ${customization.primaryColor};
      --color-emerald-500: ${customization.primaryColor};
      --color-emerald-600: ${customization.primaryColor};
      --color-emerald-700: color-mix(in srgb, ${customization.primaryColor} 80%, black);
      --color-emerald-800: color-mix(in srgb, ${customization.primaryColor} 60%, black);
      --color-emerald-900: color-mix(in srgb, ${customization.primaryColor} 40%, black);
      --color-emerald-950: ${customization.surfaceColor};

      --color-lime-50: color-mix(in srgb, ${customization.primaryColor} 10%, white);
      --color-lime-100: color-mix(in srgb, ${customization.primaryColor} 20%, white);
      --color-lime-200: color-mix(in srgb, ${customization.secondaryColor} 80%, white);
      --color-lime-300: ${customization.secondaryColor};
      --color-lime-400: ${customization.primaryColor};
      --color-lime-500: ${customization.primaryColor};
      --color-lime-600: ${customization.primaryColor};
      --color-lime-700: color-mix(in srgb, ${customization.primaryColor} 80%, black);
      --color-lime-800: color-mix(in srgb, ${customization.primaryColor} 60%, black);
      --color-lime-900: color-mix(in srgb, ${customization.primaryColor} 40%, black);
      --color-lime-950: ${customization.surfaceColor};
    }

    /* Regras de compatibilidade para garantir contraste legível em botões legados */
    .bg-emerald-400.text-black,
    .bg-emerald-500.text-white,
    .bg-emerald-500.text-black,
    .bg-lime-400.text-black,
    .bg-lime-500.text-white,
    .bg-lime-500.text-black,
    .bg-primary.text-black,
    .bg-primary.text-white {
      color: ${onPrimary} !important;
    }

    body {
      background-color: var(--color-background, ${customization.backgroundColor}) !important;
      color: var(--color-on-surface, ${customization.textPrimaryColor}) !important;
    }
  `;
}

