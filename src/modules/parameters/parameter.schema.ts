import { z } from "zod";

export const parameterTypeEnum = z.enum([
  "TEXT",
  "TEXTAREA",
  "NUMBER",
  "BOOLEAN",
  "SELECT",
  "MULTISELECT",
  "RANGE",
  "DURATION",
  "JSON",
  "DATE",
]);

export const parameterScopeEnum = z.enum([
  "GLOBAL",
  "CHARACTER",
  "ENVIRONMENT",
  "SCENE",
  "OUTPUT",
]);

export const parameterOptionSchema = z.object({
  value: z.string().min(1, "O valor da opção não pode ser vazio."),
  label: z.string().min(1, "O rótulo da opção não pode ser vazio."),
  originalName: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  categoryLabel: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  whatToLookFor: z.string().optional().nullable(),
  comparisonNotes: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  thumbnailUrl: z.string().optional().nullable(),
  secondaryImages: z.array(z.string()).optional().nullable(),
  videoUrl: z.string().optional().nullable(),
  altText: z.string().optional().nullable(),
  order: z.number().int().optional().nullable(),
  isActive: z.boolean().optional(),
  isApproved: z.boolean().optional(),
  license: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  updatedAt: z.string().optional().nullable(),
});

export const validationRulesSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  isInteger: z.boolean().optional(),
  minLength: z.number().int().nonnegative().optional(),
  maxLength: z.number().int().nonnegative().optional(),
  pattern: z.string().optional(),
  step: z.number().optional(),
}).optional();

export const visibilityRuleSchema = z.object({
  dependsOn: z.string().min(1, "Informe a chave do parâmetro de dependência."),
  operator: z.enum(["equals", "notEquals", "in", "contains", "truthy", "falsy"]).default("equals"),
  value: z.unknown().optional(),
}).optional();

export const promptMappingSchema = z.object({
  target: z.string().min(1, "Informe a seção ou destino no prompt.").default("visual_bible"),
  instruction: z.string().min(1, "Instrução de composição para IA.").max(1000),
  prefix: z.string().optional(),
  suffix: z.string().optional(),
}).optional();

export const baseParameterDefinitionSchema = z.object({
  key: z
    .string()
    .trim()
    .regex(/^[a-z][a-z0-9_]*$/, "A chave deve estar em formato snake_case (letras minúsculas e underscores, iniciando por letra).")
    .max(64, "A chave deve ter no máximo 64 caracteres."),
  label: z.string().trim().min(1, "O nome de exibição é obrigatório.").max(100),
  description: z.string().max(500, "A descrição deve ter no máximo 500 caracteres.").optional().nullable(),
  type: parameterTypeEnum,
  scope: parameterScopeEnum.default("GLOBAL"),
  scopes: z.array(z.string()).optional().nullable(),
  required: z.boolean().default(false),
  defaultValue: z.unknown().optional().nullable(),
  options: z.array(parameterOptionSchema).optional().nullable(),
  validationRules: validationRulesSchema.nullable(),
  visibilityRules: visibilityRuleSchema.nullable(),
  promptMapping: promptMappingSchema.nullable(),
  order: z.number().int().default(0),
  enabled: z.boolean().default(true),
  visualReferenceEnabled: z.boolean().optional(),
  visualReferenceCategory: z.string().optional().nullable(),
  referenceImage: z.string().optional().nullable(),
  referenceMedia: z.string().optional().nullable(),
  referenceDescription: z.string().optional().nullable(),
  referenceAlt: z.string().optional().nullable(),
});

export const parameterDefinitionSchema = baseParameterDefinitionSchema.superRefine((val, ctx) => {
  if (["SELECT", "MULTISELECT"].includes(val.type)) {
    if (!val.options || val.options.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["options"],
        message: "Parâmetros do tipo Seleção exigem pelo menos uma opção configurada.",
      });
    }
  }
  if (val.type === "RANGE" && val.validationRules) {
    if (val.validationRules.min !== undefined && val.validationRules.max !== undefined) {
      if (val.validationRules.min >= val.validationRules.max) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["validationRules", "min"],
          message: "O valor mínimo deve ser menor que o valor máximo.",
        });
      }
    }
  }
});

export const updateParameterDefinitionSchema = baseParameterDefinitionSchema.partial();

export const saveParameterValuesSchema = z.object({
  projectId: z.string().min(1),
  values: z.array(
    z.object({
      parameterDefinitionId: z.string().min(1),
      targetType: z.enum(["PROJECT", "CHARACTER", "ENVIRONMENT", "SCENE", "OUTPUT"]).default("PROJECT"),
      targetId: z.string().optional().nullable(),
      value: z.unknown(),
    })
  ),
});

export const reorderParametersSchema = z.object({
  orderedIds: z.array(z.string().min(1)),
});

export type ParameterType = z.infer<typeof parameterTypeEnum>;
export type ParameterScope = z.infer<typeof parameterScopeEnum>;
export type ParameterOption = z.infer<typeof parameterOptionSchema>;
export type ParameterDefinitionInput = z.infer<typeof parameterDefinitionSchema>;
export type UpdateParameterDefinitionInput = z.infer<typeof updateParameterDefinitionSchema>;
export type SaveParameterValuesInput = z.infer<typeof saveParameterValuesSchema>;
