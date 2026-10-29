import { z } from "zod";

export const projectConfigurationSchema = z.object({
  aspectRatio: z.enum(["16:9", "9:16", "2.39:1", "4:3", "1:1"]).default("16:9"),
  targetPlatform: z.string().trim().max(80).default("Google Flow"),
  colorGrade: z.string().max(200).optional(),
  pacing: z.string().max(100).optional(),
  soundDesign: z.string().max(500).optional(),
  customNotes: z.string().max(2000).optional(),
}).default({
  aspectRatio: "16:9",
  targetPlatform: "Google Flow",
});

export const createProjectSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Informe o nome do projeto cinematográfico.")
    .max(120, "O nome do projeto deve ter no máximo 120 caracteres."),
  description: z.string().max(5000, "A descrição deve ter no máximo 5000 caracteres.").default(""),
  genre: z.string().trim().max(80).optional(),
  language: z.string().trim().default("pt-BR"),
  durationSeconds: z.coerce.number().int().positive("A duração deve ser positiva.").max(86400).optional().nullable(),
  configuration: projectConfigurationSchema.optional(),
});

export const updateProjectSchema = createProjectSchema.partial().extend({
  isArchived: z.boolean().optional(),
});

export const duplicateProjectSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
});

export const listProjectsQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(["active", "archived", "all"]).default("active"),
  sort: z
    .enum(["updatedAt_desc", "updatedAt_asc", "title_asc", "title_desc", "createdAt_desc"])
    .default("updatedAt_desc"),
  genre: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export type ProjectConfiguration = z.infer<typeof projectConfigurationSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type DuplicateProjectInput = z.infer<typeof duplicateProjectSchema>;
export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;
