import { z } from "zod";
import {
  zRequiredString,
  zOptionalString,
  zBooleanLoose,
} from "./emptyspaces"; // ajustá el path según tu estructura

const priceSchema = z
  .coerce.number({ invalid_type_error: "price debe ser numérico" })
  .nonnegative("price no puede ser negativo");

const categoryIdSchema = z
  .coerce.number({ invalid_type_error: "categoryId debe ser numérico" })
  .int("categoryId debe ser entero")
  .positive("categoryId debe ser mayor que 0");

export const createItemSchema = z.object({
  categoryId: categoryIdSchema,

  // NO permite "   " ni "" – aplica trim
  title: zRequiredString("El título del ítem", 160),

  // "" o "   " -> null; respeta máximo 10_000 chars
  description: zOptionalString(10_000),

  // tolerante a "123.45" como string, pero opcional
  price: priceSchema.nullable().optional(),

  // acepta true/false/"true"/"false"
  active: zBooleanLoose,

  // 👉 Nada de images acá: las imágenes se manejan en /images/items/:itemId
});

export const updateItemSchema = z.object({
  categoryId: categoryIdSchema.optional(),
  // opcional, pero si viene NO puede ser vacío
  title: zRequiredString("El título del ítem", 160).optional(),

  // opcional, "" -> null
  description: zOptionalString(10_000),

  price: priceSchema.nullable().optional(),

  active: zBooleanLoose,

  newPosition: z
    .coerce.number({ invalid_type_error: "newPosition debe ser numérico" })
    .int("newPosition debe ser entero")
    .min(0, "newPosition debe ser mayor o igual a 0")
    .optional(),

  // 👉 Tampoco images acá
});
