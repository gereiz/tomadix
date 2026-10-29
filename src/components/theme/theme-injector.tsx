"use client";

import { useEffect } from "react";
import { CustomizationSettings } from "@/modules/admin/platform-settings.service";
import { generateThemeCss } from "@/lib/theme-utils";

interface ThemeInjectorProps {
  initialCustomization: CustomizationSettings;
}

export function ThemeInjector({ initialCustomization }: ThemeInjectorProps) {
  useEffect(() => {
    const applyTheme = (customization: CustomizationSettings) => {
      let styleTag = document.getElementById("tomadix-custom-theme");
      if (!styleTag) {
        styleTag = document.createElement("style");
        styleTag.id = "tomadix-custom-theme";
        document.head.appendChild(styleTag);
      }
      styleTag.innerHTML = generateThemeCss(customization);
    };

    // Aplica no carregamento inicial
    if (initialCustomization) {
      applyTheme(initialCustomization);
    }

    // Escuta atualizações disparadas pela tela de personalização
    const handleCustomizationUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<CustomizationSettings>;
      if (customEvent.detail) {
        applyTheme(customEvent.detail);
      }
    };

    window.addEventListener("tomadix:customization-updated", handleCustomizationUpdate);

    return () => {
      window.removeEventListener("tomadix:customization-updated", handleCustomizationUpdate);
    };
  }, [initialCustomization]);

  return null;
}
