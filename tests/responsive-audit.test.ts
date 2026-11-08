import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Auditoria estática de responsividade (celulares e tablets).
 * Lê o código-fonte de src/ e falha se reaparecerem padrões que quebram telas pequenas.
 * As regras estão descritas na seção "Frontend e desempenho" do CLAUDE.md.
 */

const SRC = path.join(process.cwd(), "src");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.tsx$/.test(entry.name)) out.push(full);
  }
  return out;
}

const files = walk(SRC).map((file) => ({
  file: path.relative(process.cwd(), file).replace(/\\/g, "/"),
  lines: fs.readFileSync(file, "utf-8").split(/\r?\n/),
}));

/** Retorna "arquivo:linha" de cada linha que casa com a expressão e não é exceção. */
function find(re: RegExp, except: (file: string, line: string) => boolean = () => false): string[] {
  const hits: string[] = [];
  for (const { file, lines } of files) {
    lines.forEach((line, i) => {
      if (re.test(line) && !except(file, line)) hits.push(`${file}:${i + 1}`);
    });
  }
  return hits;
}

describe("Auditoria de responsividade (mobile e tablet)", () => {
  it("não usa 100vh/h-screen/min-h-screen (usar dvh por causa da barra de endereço do celular)", () => {
    const hits = find(/\bmin-h-screen\b|\bh-screen\b|\d+vh\b(?!\w)/, (_f, l) => /dvh/.test(l) && !/[^d]vh\b/.test(l.replace(/dvh/g, "")));
    expect(hits).toEqual([]);
  });

  it("não usa backdrop-blur nem brilhos blur-2xl/3xl (custo de GPU em celulares)", () => {
    expect(find(/\bbackdrop-blur\b|\bbackdrop-blur-/)).toEqual([]);
    expect(find(/\bblur-(2xl|3xl)\b/)).toEqual([]);
  });

  it("overlays de modal centralizados rolam e usam items-center-safe", () => {
    const hits = find(
      /className="[^"]*\bfixed inset-0\b[^"]*"/,
      (_f, l) =>
        !/\bbg-black\//.test(l) ||
        !/\bjustify-center\b/.test(l) ||
        // bottom sheets e overlays já tratados
        (/\bitems-end\b/.test(l) || (/\boverflow-y-auto\b/.test(l) && /\bitems-center-safe\b/.test(l)))
    );
    expect(hits).toEqual([]);
  });

  it("toda <table> declara largura mínima para rolar em vez de espremer colunas", () => {
    const hits = find(/<table\b/, (file, l) => file.endsWith("ui/table-scroll.tsx") || /min-w-/.test(l));
    expect(hits).toEqual([]);
  });

  it("grades de 3 a 6 colunas têm base menor em telas pequenas", () => {
    const hits = find(
      /className="[^"]*\bgrid-cols-[3-6]\b[^"]*"/,
      (_f, l) => /\b(sm|md|lg|xl|min-\[\d+px\]):grid-cols-/.test(l) || /\bgrid-cols-[1-2]\b/.test(l)
    );
    // Exceções conscientes: métricas e botões curtos que cabem em 3 colunas no celular.
    const allowed = [
      "src/app/admin/billing/components/credit-lots-tab.tsx",
      "src/components/video-generation/direct-video-modal.tsx",
      "src/components/prompts/prompt-generator-panel.tsx",
    ];
    expect(hits.filter((h) => !allowed.some((a) => h.startsWith(a)))).toEqual([]);
  });

  it("ícones são SVG inline: a fonte Material Symbols não é usada", () => {
    expect(find(/material-symbols-outlined/)).toEqual([]);
  });

  it("o layout raiz habilita viewport-fit=cover e a navbar usa breakpoint xl com menu mobile", () => {
    const layout = fs.readFileSync(path.join(SRC, "app/layout.tsx"), "utf-8");
    const navbar = fs.readFileSync(path.join(SRC, "components/navigation/navbar.tsx"), "utf-8");
    expect(layout).toContain('viewportFit: "cover"');
    expect(navbar).toContain("(min-width: 1280px)");
    expect(navbar).toContain("max-h-[calc(100dvh-var(--navbar-h))]");
  });

  it("componentes base de responsividade existem", () => {
    for (const name of ["modal", "drawer", "table-scroll", "touch-icon-button"]) {
      expect(fs.existsSync(path.join(SRC, `components/ui/${name}.tsx`))).toBe(true);
    }
  });
});
