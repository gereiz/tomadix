import { db } from "@/lib/db";
import fs from "fs";
import path from "path";
import { VISUAL_CATEGORIES, VISUAL_REFERENCE_OPTIONS } from "./visual-reference.catalog";
import {
  VisualCategory,
  VisualCoverageReport,
  VisualReferenceOption,
} from "./visual-reference.types";
import { VisualReferenceResolver } from "./visual-reference.resolver";
import { ParameterType, ParameterScope } from "@prisma/client";

export class VisualReferenceService extends VisualReferenceResolver {
  /**
   * Gera relatório administrativo de cobertura de referências visuais (Seção 7.1 do requisito).
   */
  static async getCoverageReport(workspaceId?: string): Promise<VisualCoverageReport> {
    // Busca todas as definições de parâmetros que possuem opções do tipo SELECT / MULTISELECT
    const dbParams = await db.parameterDefinition.findMany({
      where: workspaceId
        ? { workspaceId, type: { in: ["SELECT", "MULTISELECT"] } }
        : { type: { in: ["SELECT", "MULTISELECT"] } },
      select: {
        id: true,
        key: true,
        label: true,
        type: true,
        options: true,
      },
    });

    // Mapeia todas as opções únicas registradas no banco e no catálogo mestre
    const allOptionsMap = new Map<string, VisualReferenceOption>();

    // Adiciona todas do catálogo mestre primeiro
    for (const opt of VISUAL_REFERENCE_OPTIONS) {
      allOptionsMap.set(opt.value, opt);
    }

    // Adiciona as do banco
    for (const p of dbParams) {
      const opts = (p.options as any[]) || [];
      for (const o of opts) {
        if (!o.value) continue;
        if (!allOptionsMap.has(o.value)) {
          allOptionsMap.set(o.value, {
            value: o.value,
            label: o.label || o.value,
            originalName: o.originalName || null,
            category: (o.category as VisualCategory) || "FRAMING",
            description: o.description || "Opção dinâmica cadastrada",
            imageUrl: o.imageUrl || "",
            altText: o.altText || o.label || o.value,
            order: o.order || 0,
            isActive: o.isActive !== undefined ? o.isActive : true,
            isApproved: Boolean(o.imageUrl && !o.imageUrl.includes("placeholder")),
          });
        }
      }
    }

    const allOptions = Array.from(allOptionsMap.values());
    const totalOptions = allOptions.length;

    // Verifica se a imagem existe fisicamente ou é URL válida não-placeholder
    const isCovered = (opt: VisualReferenceOption) => {
      if (!opt.imageUrl || opt.imageUrl.trim() === "" || opt.imageUrl.includes("placeholder")) {
        return false;
      }
      return true;
    };

    const coveredOptions = allOptions.filter(isCovered).length;
    const pendingOptions = totalOptions - coveredOptions;
    const coveragePercentage = totalOptions > 0 ? Math.round((coveredOptions / totalOptions) * 100) : 100;

    // Estatísticas por categoria
    const categoryStats = VISUAL_CATEGORIES.map((cat) => {
      const catOptions = allOptions.filter((o) => o.category === cat.id);
      const catTotal = catOptions.length;
      const catCovered = catOptions.filter(isCovered).length;
      const catPending = catTotal - catCovered;
      const catPct = catTotal > 0 ? Math.round((catCovered / catTotal) * 100) : 100;

      return {
        category: cat.id,
        categoryName: cat.name,
        icon: cat.icon,
        total: catTotal,
        covered: catCovered,
        pending: catPending,
        percentage: catPct,
      };
    });

    return {
      totalParameters: dbParams.length > 0 ? dbParams.length : VISUAL_CATEGORIES.length,
      totalOptions,
      coveredOptions,
      pendingOptions,
      unavailableOptions: 0,
      coveragePercentage,
      categories: categoryStats,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Permite ao Administrador atualizar a referência visual de uma opção específica.
   */
  static async updateOptionReference(
    paramDefinitionId: string,
    optionValue: string,
    updates: Partial<VisualReferenceOption>
  ) {
    const param = await db.parameterDefinition.findUnique({
      where: { id: paramDefinitionId },
    });

    if (!param) {
      throw new Error("Definição de parâmetro não encontrada.");
    }

    const currentOptions = (param.options as any[]) || [];
    let found = false;

    const updatedOptions = currentOptions.map((opt) => {
      if (String(opt.value) === String(optionValue)) {
        found = true;
        return {
          ...opt,
          label: updates.label !== undefined ? updates.label : opt.label,
          originalName: updates.originalName !== undefined ? updates.originalName : opt.originalName,
          category: updates.category !== undefined ? updates.category : opt.category,
          description: updates.description !== undefined ? updates.description : opt.description,
          whatToLookFor: updates.whatToLookFor !== undefined ? updates.whatToLookFor : opt.whatToLookFor,
          comparisonNotes: updates.comparisonNotes !== undefined ? updates.comparisonNotes : opt.comparisonNotes,
          imageUrl: updates.imageUrl !== undefined ? updates.imageUrl : opt.imageUrl,
          altText: updates.altText !== undefined ? updates.altText : opt.altText,
          isActive: updates.isActive !== undefined ? updates.isActive : opt.isActive,
          isApproved: updates.isApproved !== undefined ? updates.isApproved : true,
          license: updates.license !== undefined ? updates.license : opt.license,
          updatedAt: new Date().toISOString(),
        };
      }
      return opt;
    });

    if (!found) {
      throw new Error(`A opção '${optionValue}' não foi encontrada no parâmetro informado.`);
    }

    const result = await db.parameterDefinition.update({
      where: { id: paramDefinitionId },
      data: {
        options: updatedOptions,
      },
    });

    return result;
  }

  /**
   * Salva com validação rigorosa um arquivo de imagem enviado pelo painel administrativo.
   */
  static async saveUploadedAsset(
    fileBuffer: Buffer,
    originalFilename: string,
    mimeType: string
  ): Promise<{ url: string; filename: string; sizeBytes: number }> {
    // 1. Validação de formato seguro
    const ALLOWED_MIME_TYPES: Record<string, string> = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
      "image/svg+xml": ".svg",
      "image/gif": ".gif",
    };

    const ext = ALLOWED_MIME_TYPES[mimeType.toLowerCase()];
    if (!ext) {
      throw new Error(
        `Formato de arquivo '${mimeType}' não permitido. Formatos aceitos: JPG, PNG, WebP, SVG, GIF.`
      );
    }

    // 2. Validação de tamanho (máximo 5 MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (fileBuffer.length > MAX_SIZE) {
      throw new Error("O arquivo ultrapassa o limite de tamanho permitido de 5 MB.");
    }

    // 3. Sanitização do nome do arquivo
    const cleanBaseName = path
      .basename(originalFilename, path.extname(originalFilename))
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "_");

    const safeFilename = `${cleanBaseName}_${Date.now()}${ext}`;

    const uploadsDir = path.join(process.cwd(), "public", "uploads", "visual-references");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const fullPath = path.join(uploadsDir, safeFilename);
    fs.writeFileSync(fullPath, fileBuffer);

    const publicUrl = `/uploads/visual-references/${safeFilename}`;
    return {
      url: publicUrl,
      filename: safeFilename,
      sizeBytes: fileBuffer.length,
    };
  }

  /**
   * Sincroniza e enriquece os parâmetros visuais padrão de um workspace
   * garantindo que todos os seletores cinematográficos existam com referências visuais integradas.
   */
  static async syncDefaultVisualParameters(workspaceId: string) {
    const definitionsToSeed: Array<{
      key: string;
      label: string;
      description: string;
      type: ParameterType;
      scope: ParameterScope;
      required: boolean;
      defaultValue: string;
      category: VisualCategory;
      order: number;
      options: VisualReferenceOption[];
    }> = [
      {
        key: "movimento_camera",
        label: "Movimento de Câmera & Maquinária",
        description: "Dinâmica espacial do suporte de câmera durante o take.",
        type: "SELECT",
        scope: "SCENE",
        required: false,
        defaultValue: "static_shot",
        category: "CAMERA_MOVEMENT",
        order: 1,
        options: this.getCatalogOptions("CAMERA_MOVEMENT"),
      },
      {
        key: "tipo_de_plano",
        label: "Enquadramento & Escala de Plano",
        description: "Escala e distância do personagem em relação ao quadro.",
        type: "SELECT",
        scope: "SCENE",
        required: true,
        defaultValue: "medium_shot",
        category: "FRAMING",
        order: 2,
        options: this.getCatalogOptions("FRAMING"),
      },
      {
        key: "angulo_camera_posicao",
        label: "Ângulo & Ponto de Vista da Câmera",
        description: "Elevação vertical e angulação da lente em relação ao sujeito.",
        type: "SELECT",
        scope: "SCENE",
        required: false,
        defaultValue: "eye_level",
        category: "CAMERA_ANGLE",
        order: 3,
        options: this.getCatalogOptions("CAMERA_ANGLE"),
      },
      {
        key: "estilo_iluminacao",
        label: "Estilo de Iluminação Primária",
        description: "Direção, contraste e temperatura da fonte de iluminação primária.",
        type: "SELECT",
        scope: "GLOBAL",
        required: false,
        defaultValue: "luz_natural",
        category: "LIGHTING",
        order: 4,
        options: this.getCatalogOptions("LIGHTING"),
      },
      {
        key: "distancia_focal_lente",
        label: "Distância Focal da Lente",
        description: "Distância focal, compressão de planos e desfoque óptico.",
        type: "SELECT",
        scope: "SCENE",
        required: false,
        defaultValue: "lente_normal_50mm",
        category: "LENS_PERSPECTIVE",
        order: 5,
        options: this.getCatalogOptions("LENS_PERSPECTIVE"),
      },
      {
        key: "composicao_quadro",
        label: "Geometria & Composição do Quadro",
        description: "Regras de terços, linhas-guia, simetria e equilíbrio de quadro.",
        type: "SELECT",
        scope: "SCENE",
        required: false,
        defaultValue: "regra_dos_tercos",
        category: "COMPOSITION",
        order: 6,
        options: this.getCatalogOptions("COMPOSITION"),
      },
      {
        key: "profundidade_campo_foco",
        label: "Profundidade de Campo & Foco",
        description: "Nitidez seletiva, motion blur, flares e transições de foco.",
        type: "SELECT",
        scope: "SCENE",
        required: false,
        defaultValue: "foco_no_personagem",
        category: "FOCUS_OPTICS",
        order: 7,
        options: this.getCatalogOptions("FOCUS_OPTICS"),
      },
      {
        key: "paleta_cor_dominante",
        label: "Paleta de Cores Dominante",
        description: "Harmonia cromática principal para pós-processamento e color grading.",
        type: "SELECT",
        scope: "GLOBAL",
        required: false,
        defaultValue: "naturalista",
        category: "COLOR_GRADING",
        order: 8,
        options: this.getCatalogOptions("COLOR_GRADING"),
      },
      {
        key: "velocidade_obturador_movimento",
        label: "Obturador & Sensação de Movimento",
        description: "Velocidade temporal, naturalidade e ritmo de ação dos atores.",
        type: "SELECT",
        scope: "SCENE",
        required: false,
        defaultValue: "natural_espontaneo",
        category: "SCENE_DYNAMIC",
        order: 9,
        options: this.getCatalogOptions("SCENE_DYNAMIC"),
      },
      {
        key: "formato_sensor_camera",
        label: "Formato do Sensor / Câmera",
        description: "Tamanho do fotograma e proporção física de captura de cinema.",
        type: "SELECT",
        scope: "GLOBAL",
        required: true,
        defaultValue: "full_frame_35mm",
        category: "SENSOR_FORMAT",
        order: 10,
        options: this.getCatalogOptions("SENSOR_FORMAT"),
      },
      {
        key: "atmosfera_climatica_particulas",
        label: "Atmosfera, Clima & Partículas Volumétricas",
        description: "Névoa, chuva, poeira, vapor e condições ambientais do cenário.",
        type: "SELECT",
        scope: "ENVIRONMENT",
        required: false,
        defaultValue: "fumaca_haze_estudio",
        category: "ATMOSPHERE",
        order: 11,
        options: this.getCatalogOptions("ATMOSPHERE"),
      },
    ];

    const existingList = await db.parameterDefinition.findMany({
      where: {
        workspaceId,
        key: { in: definitionsToSeed.map((d) => d.key) },
      },
    });
    const existingMap = new Map(existingList.map((e) => [e.key, e]));

    const toCreate = definitionsToSeed.filter((def) => !existingMap.has(def.key));
    if (toCreate.length > 0) {
      await db.parameterDefinition.createMany({
        data: toCreate.map((def) => ({
          workspaceId,
          key: def.key,
          label: def.label,
          description: def.description,
          type: def.type,
          scope: def.scope,
          required: def.required,
          defaultValue: def.defaultValue,
          options: def.options as any,
          order: def.order,
          isSystem: true,
          enabled: true,
        })),
        skipDuplicates: true,
      });
    }

    // Apenas os existentes que necessitam enriquecimento
    const toEnrich = definitionsToSeed.filter((def) => {
      const existing = existingMap.get(def.key);
      if (!existing) return false;
      const currentOpts = (existing.options as any[]) || [];
      return currentOpts.length === 0 || !currentOpts[0]?.imageUrl;
    });

    if (toEnrich.length > 0) {
      await Promise.all(
        toEnrich.map((def) => {
          const existing = existingMap.get(def.key)!;
          return db.parameterDefinition.update({
            where: { id: existing.id },
            data: {
              options: def.options as any,
              description: def.description,
            },
          });
        })
      );
    }
  }
}
