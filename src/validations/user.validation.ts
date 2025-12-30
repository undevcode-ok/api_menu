import { z } from "zod";
import { zOptionalString } from "./emptyspaces"; // ajustá el path si hace falta

export const createUserSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  lastName: z.string().trim().min(1, "El apellido es obligatorio"),
  email: z.string().email("Email inválido"),

  // cel opcional: "" -> null
  cel: zOptionalString(50),

  roleId: z.coerce.number({ invalid_type_error: "roleId debe ser numérico" }),
});

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    lastName: z.string().trim().min(1).optional(),
    email: z.string().email().optional(),

    // cel opcional y normalizado
    cel: zOptionalString(50),

    roleId: z.coerce.number({ invalid_type_error: "roleId debe ser numérico" }).optional(),

    password: z.string().trim().min(8).max(16).optional(),
  })
  .strict();

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
  resetUrl: z.string().url().optional(),
});

export const restorePasswordSchema = z
  .object({
    token: z.string().trim().min(1, "token requerido"),
    password: z.string().trim().min(8).max(16),
    confirmationPassword: z.string().trim().min(8).max(16),
  })
  .refine((v) => v.password === v.confirmationPassword, {
    path: ["confirmationPassword"],
    message: "Passwords do not match",
  });

export type RestorePasswordDto = z.infer<typeof restorePasswordSchema>;
