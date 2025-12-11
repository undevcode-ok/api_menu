import { z } from "zod";
import {
  zRequiredString,
  zOptionalString,
  zBooleanLoose,
} from "./emptyspaces"; // ajustá el path según tu estructura

/* ===========================
 * Create Category
 * =========================== */
export const createCategorySchema = z.object({
  menuId: z
    .coerce.number({ invalid_type_error: "menuId debe ser numérico" })
    .int("menuId debe ser entero")
    .positive("menuId debe ser mayor que 0"),

  // NO permite " " ni "", aplica trim
  title: zRequiredString("El título de la categoría"),

  // acepta true/false/"true"/"false"
  active: zBooleanLoose,
});

/* ===========================
 * Update Category
 * =========================== */
export const updateCategorySchema = z.object({
  // si viene, NO puede ser vacío (" ") — se valida igual que en create
  title: zRequiredString("El título de la categoría").optional(),

  active: zBooleanLoose,
  newPosition: z
    .coerce.number({ invalid_type_error: "newPosition debe ser numérico" })
    .int("newPosition debe ser entero")
    .min(0, "newPosition debe ser mayor o igual a 0")
    .optional(),
});
