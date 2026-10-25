import { VISUAL_CATEGORIES, VISUAL_REFERENCE_OPTIONS } from "./visual-reference.catalog";
import {
  VisualCategory,
  VisualCategoryMeta,
  VisualReferenceOption,
} from "./visual-reference.types";

/**
 * Utilitário seguro para execução tanto no Cliente (Browser) quanto no Servidor (Node.js).
 * Não depende de módulos do Node (fs, path) nem de banco de dados (Prisma).
 */
export class VisualReferenceResolver {
  /**
   * Retorna todas as categorias visuais disponíveis no sistema.
   */
  static getCategories(): VisualCategoryMeta[] {
    return [...VISUAL_CATEGORIES];
  }

  /**
   * Retorna todas as opções do catálogo mestre ou filtradas por categoria.
   */
  static getCatalogOptions(category?: VisualCategory): VisualReferenceOption[] {
    if (!category) return [...VISUAL_REFERENCE_OPTIONS];
    return VISUAL_REFERENCE_OPTIONS.filter((opt) => opt.category === category);
  }

  /**
   * Encontra a referência visual de uma opção pelo código técnico, rótulo ou nome em inglês.
   */
  static findOption(value: string): VisualReferenceOption | null {
    if (!value) return null;
    const clean = value.trim().toLowerCase();

    // 1. Correspondência exata por código técnico (value)
    let found = VISUAL_REFERENCE_OPTIONS.find(
      (opt) => opt.value.toLowerCase() === clean
    );
    if (found) return found;

    // 2. Correspondência exata por rótulo em português (label)
    found = VISUAL_REFERENCE_OPTIONS.find(
      (opt) => opt.label.toLowerCase() === clean
    );
    if (found) return found;

    // 3. Correspondência exata por nome em inglês (originalName)
    found = VISUAL_REFERENCE_OPTIONS.find(
      (opt) => opt.originalName?.toLowerCase() === clean
    );
    if (found) return found;

    // 4. Correspondência inteligente para strings compostas existentes (ex: "Plano Médio (Medium Shot)")
    found = VISUAL_REFERENCE_OPTIONS.find((opt) => {
      const optVal = opt.value.toLowerCase();
      const optLabel = opt.label.toLowerCase();
      const optOrig = opt.originalName?.toLowerCase() || "";
      return (
        clean.includes(optVal) ||
        clean.includes(optLabel) ||
        (optOrig && clean.includes(optOrig)) ||
        optLabel.includes(clean)
      );
    });

    return found || null;
  }

  /**
   * Resolve a referência visual de um parâmetro (por chave e valor).
   * Se o parâmetro tiver opções personalizadas, utiliza a customizada;
   * caso contrário, busca no catálogo mestre com fallback para placeholder.
   */
  static resolveVisualReference(
    paramKeyOrCategory: string,
    optionValue: string,
    customOptions?: any[]
  ): VisualReferenceOption {
    // 1. Procura no catálogo mestre oficial primeiro
    const catalogMatch = this.findOption(optionValue);

    // 2. Procura nas opções customizadas da definição se existirem
    let matchCustom: any = null;
    if (customOptions && Array.isArray(customOptions)) {
      matchCustom = customOptions.find(
        (o) => String(o.value).toLowerCase() === String(optionValue).toLowerCase()
      );
    }

    if (catalogMatch) {
      if (matchCustom) {
        return {
          ...catalogMatch,
          label: matchCustom.label || catalogMatch.label,
          originalName: matchCustom.originalName || catalogMatch.originalName,
          description: matchCustom.description || catalogMatch.description,
          whatToLookFor: matchCustom.whatToLookFor || catalogMatch.whatToLookFor,
          comparisonNotes: matchCustom.comparisonNotes || catalogMatch.comparisonNotes,
          imageUrl: (matchCustom.imageUrl && !matchCustom.imageUrl.includes("placeholder"))
            ? matchCustom.imageUrl
            : catalogMatch.imageUrl,
          altText: matchCustom.altText || catalogMatch.altText,
        };
      }
      return catalogMatch;
    }

    if (matchCustom && (matchCustom.imageUrl || matchCustom.label)) {
      return {
        value: matchCustom.value,
        label: matchCustom.label || optionValue,
        originalName: matchCustom.originalName || null,
        category: (matchCustom.category as VisualCategory) || "FRAMING",
        categoryLabel: matchCustom.categoryLabel || "Parâmetro Visual",
        description: matchCustom.description || "Opção configurada no estúdio.",
        whatToLookFor: matchCustom.whatToLookFor || null,
        comparisonNotes: matchCustom.comparisonNotes || null,
        imageUrl: matchCustom.imageUrl || "/visual-references/placeholder.svg",
        altText: matchCustom.altText || `Referência visual para ${matchCustom.label || optionValue}`,
        order: matchCustom.order || 1,
        isActive: matchCustom.isActive !== undefined ? matchCustom.isActive : true,
        isApproved: Boolean(matchCustom.imageUrl && !matchCustom.imageUrl.includes("placeholder")),
        license: matchCustom.license || null,
        tags: matchCustom.tags || [],
      };
    }

    // 3. Fallback controlado com placeholder seguro
    return {
      value: optionValue,
      label: optionValue.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      originalName: optionValue,
      category: "FRAMING",
      categoryLabel: "Referência Geral",
      description: "Opção visual registrada. Imagem de referência específica em processo de curadoria.",
      whatToLookFor: "Observe as características técnicas descritas para esta opção.",
      comparisonNotes: null,
      imageUrl: "/visual-references/placeholder.svg",
      altText: `Referência visual pendente para ${optionValue}`,
      order: 99,
      isActive: true,
      isApproved: false,
      license: "Tomadix Studio Asset",
      tags: [],
    };
  }
}
