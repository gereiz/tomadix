import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("Endereço de e-mail inválido.").trim().toLowerCase(),
  password: z
    .string()
    .min(8, "A senha deve conter no mínimo 8 caracteres.")
    .regex(/[0-9]|[^a-zA-Z0-9]/, "A senha deve conter ao menos um número ou símbolo."),
  displayName: z.string().min(2, "O nome deve ter no mínimo 2 caracteres.").trim(),
  workspaceName: z.string().min(2, "O nome do estúdio deve ter no mínimo 2 caracteres.").trim().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Endereço de e-mail inválido.").trim().toLowerCase(),
  password: z.string().min(1, "A senha é obrigatória."),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Endereço de e-mail inválido.").trim().toLowerCase(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10, "Token de recuperação inválido."),
  password: z
    .string()
    .min(8, "A nova senha deve conter no mínimo 8 caracteres.")
    .regex(/[0-9]|[^a-zA-Z0-9]/, "A senha deve conter ao menos um número ou símbolo."),
});

export const confirmEmailSchema = z.object({
  token: z.string().min(10, "Token de confirmação inválido."),
});

export const updateProfileSchema = z.object({
  displayName: z.string().min(2, "O nome deve ter no mínimo 2 caracteres.").trim().optional(),
  currentPassword: z.string().optional(),
  newPassword: z
    .string()
    .min(8, "A nova senha deve conter no mínimo 8 caracteres.")
    .regex(/[0-9]|[^a-zA-Z0-9]/, "A nova senha deve conter ao menos um número ou símbolo.")
    .optional(),
});

export const createWorkspaceSchema = z.object({
  name: z.string().min(2, "O nome do workspace deve ter no mínimo 2 caracteres.").trim(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email("Endereço de e-mail inválido.").trim().toLowerCase(),
  role: z.enum(["ADMIN", "MEMBER", "VIEWER"]),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(["OWNER", "ADMIN", "MEMBER", "VIEWER"]),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
