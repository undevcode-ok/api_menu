// src/validation/shared.ts
import { z } from "zod";

/**
 * Convierte strings vacíos o con solo espacios en null.
 * Cualquier otro tipo lo deja igual.
 *
 * ""      -> null
 * "   "   -> null
 * " hola" -> "hola"
 */
export const emptyToNull = (value: unknown) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

/**
 * String REQUERIDO:
 * - aplica trim
 * - no permite vacío
 * - permite configurar longitud máxima
 */
export const zRequiredString = (fieldName: string, max = 120) =>
  z.preprocess(
    emptyToNull,
    z
      .string()
      .min(1, `${fieldName} es obligatorio`)
      .max(max)
  );

/**
 * String OPCIONAL:
 * - aplica trim
 * - "" o "   " -> null
 * - devuelve string | null | undefined
 */
export const zOptionalString = (max = 255) =>
  z.preprocess(
    emptyToNull,
    z.string().max(max).nullable().optional()
  );

/**
 * URL opcional nullable:
 * string URL válida o null o undefined.
 */
export const zOptionalUrl = (max = 255) =>
  z.union([z.string().url().max(max), z.null()]).optional();

/**
 * Boolean tolerante:
 * - "true"  -> true
 * - "false" -> false
 * - boolean  -> se respeta
 */
export const zBooleanLoose = z.preprocess(
  (value) => {
    if (typeof value === "string") {
      if (value === "true") return true;
      if (value === "false") return false;
    }
    return value;
  },
  z.boolean()
).optional();
