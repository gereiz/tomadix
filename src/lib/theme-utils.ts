import { CustomizationSettings } from "@/modules/admin/platform-settings.service";

export function getContrastTextColor(hexColor: string): string {
  if (!hexColor || !hexColor.startsWith("#") || hexColor.length < 7) return "#ffffff";
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 160 ? "#002014" : "#ffffff";
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
    }

    body {
      background-color: var(--color-background, ${customization.backgroundColor}) !important;
      color: var(--color-on-surface, ${customization.textPrimaryColor}) !important;
    }
  `;
}

