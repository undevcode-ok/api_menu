import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("invalid email"),
  password: z.string().min(8, "password must be at least 8 chars").max(16, "password must be at most 16 chars"),
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(1, "token requerido"),
  password: z.string().trim().min(8, "password must be at least 8 chars").max(16, "password must be at most 16 chars"),
});

export const registerFreeSchema = z
  .object({
    name: z.string().trim().min(1, "El nombre es obligatorio").max(100),
    lastName: z.string().trim().min(1, "El apellido es obligatorio").max(100),
    email: z
      .string()
      .trim()
      .email("Email inválido")
      .max(254)
      .transform((email) => email.toLowerCase()),
    cel: z.preprocess(
      (value) =>
        typeof value === "string" && value.trim() === "" ? null : value,
      z.string().trim().max(50).nullable().optional()
    ),
    password: z.string().trim().min(8).max(16),
    confirmationPassword: z.string().trim().min(8).max(16),
  })
  .strict()
  .refine((data) => data.password === data.confirmationPassword, {
    path: ["confirmationPassword"],
    message: "Las contraseñas no coinciden",
  });
