# Console Administrativo: Personalização Visual e Temas

O módulo de **Personalização da Plataforma** (`/admin/customization`) permite que administradores configurem a identidade visual, logotipo, paleta de cores e tipografia do Tomadix sem necessidade de novos builds ou deploys de código.

---

## 1. Identidade & Logotipo

- **Nome da Plataforma (`brandName`):** Utilizado na barra de título e navegação principal.
- **Sigla / Nome Curto (`shortName`):** Utilizado em favicons e badges compactos.
- **Slogan / Tagline (`tagline`):** Frase institucional exibida em cabeçalhos e telas de boas-vindas.
- **URLs de Logotipo:** Suporte a logotipo completo horizontal, logotipo compacto e favicon dinâmico.

---

## 2. Paleta de Cores Dinâmica

As cores configuradas são transformadas em variáveis CSS nativas (`--brand-*` e `--color-*`) injetadas no documento raiz (`:root`):

| Parâmetro | Descrição | Variável CSS Gerada |
| :--- | :--- | :--- |
| **Cor Primária** (`primaryColor`) | Acentos principais, botões de ação e estados de foco | `--brand-primary`, `--color-primary` |
| **Cor Secundária** (`secondaryColor`) | Elementos de apoio, ícones e contrastes suaves | `--brand-secondary`, `--color-secondary` |
| **Destaque (Accent)** (`accentColor`) | Alertas operacionais, selos PRO e indicadores de status | `--brand-accent`, `--color-tertiary` |
| **Bordas** (`borderColor`) | Contornos de cartões, divisores e inputs | `--brand-border`, `--color-outline` |
| **Fundo Principal** (`backgroundColor`) | Canvas de fundo da aplicação | `--brand-background`, `--color-background` |
| **Superfícies / Cards** (`surfaceColor`) | Painéis elevados, cards de projetos e modais | `--brand-surface`, `--color-surface` |
| **Texto Primário** (`textPrimaryColor`) | Títulos, rótulos e tipografia de alta ênfase | `--brand-text-primary`, `--color-on-surface` |
| **Texto Secundário** (`textSecondaryColor`) | Legendas, metadados e notas de rodapé | `--brand-text-secondary`, `--color-on-surface-variant` |

---

## 3. Controle Dedicado de Cores para Badges e Selos

Para solucionar problemas de legibilidade quando temas com cores personalizadas são aplicados (por exemplo, texto azul sobre fundo azul escuro nos selos de gênero como *CYBERPUNK*), foram adicionados controles dedicados:

- **Texto dos Badges (`badgeTextColor`):** Define a cor exata da fonte de todos os badges e tags da plataforma. Padrão: `#ffffff` (branco nítido para máximo contraste).
- **Fundo dos Badges (`badgeBgColor`):** Define o preenchimento padrão dos selos e etiquetas de categoria.
- **Seletores Visuais Interativos:** Cada campo de cor possui um seletor visual nativo (color picker) acoplado diretamente ao quadrado (swatch) de exibição da cor. Ao clicar no quadrado, o seletor nativo de cores do navegador é aberto instantaneamente, atualizando o valor hexadecimal e o live preview sem a necessidade de digitação manual de código HEX.
- **Aplicação Global:** As variáveis `--brand-badge-text` e `--brand-badge-bg` alimentam automaticamente os cards de projetos em `/projects`, presets cinematográficos e selos de metadados.

---

## 4. Injeção de Tema e Live Preview

1. **Injeção Server-Side:** No carregamento inicial do aplicativo, o servidor consulta as preferências em `CommercialPolicy` com a chave `PLATFORM_CUSTOMIZATION` e injeta a tag `<style id="tomadix-custom-theme">` diretamente no `<head>` do `RootLayout` (`src/app/layout.tsx`).
2. **Injeção Client-Side em Tempo Real:** O componente `ThemeInjector` escuta o evento global `tomadix:customization-updated` e aplica as alterações instantaneamente sem recarregar a página.
3. **Pré-visualização em Tempo Real (Live Preview):** O painel lateral direito de `/admin/customization` simula cards cinematográficos, botões e selos de categoria (*CYBERPUNK*) conforme o administrador digita as cores, permitindo avaliar o contraste antes de salvar.

