import { z } from "zod";
import { emptyToNull } from "./emptyspaces"; // solo usamos esto; el resto lo dejamos directo

/* ============================================================
 * Imagen genérica de menú (no item)
 * ============================================================ */

export const createImageSchema = z.object({
  menuId: z
    .coerce.number({ invalid_type_error: "menuId debe ser numérico" })
    .int("menuId debe ser entero")
    .positive("menuId debe ser mayor que 0"),

  url: z
    .string({ required_error: "La URL es obligatoria" })
    .url("La URL no es válida"),
});

export const updateImageSchema = z.object({
  url: z.string().url("La URL no es válida").optional(),
  active: z.boolean().optional(),
});

/* ============================================================
 * ITEM IMAGES (upsert / delete)
 * ============================================================ */

// alt: limpiamos espacios, "" -> null
const altSchema = z.preprocess(
  emptyToNull,
  z.string().max(255, "El alt no puede superar 255 caracteres").nullable().optional()
);

export const upsertItemImageSchema = z
  .object({
    id: z.number().int().positive().optional(),

    url: z.string().url("La URL no es válida").optional(),

    // para multipart: nombre del campo del archivo (ej: "file")
    fileField: z
      .string()
      .min(1, "fileField no puede ser vacío")
      .optional(),

    alt: altSchema,

    sortOrder: z
      .coerce
      .number({ invalid_type_error: "sortOrder debe ser numérico" })
      .int("sortOrder debe ser entero")
      .min(0, "sortOrder no puede ser negativo")
      .optional(),

    active: z.boolean().optional(),

    _delete: z.boolean().optional(),
  })
  .superRefine((img, ctx) => {
    const isUpdate = img.id != null;
    const isDelete = img._delete === true;

    const hasFile =
      typeof img.fileField === "string" && img.fileField.length > 0;
    const hasUrl =
      typeof img.url === "string" && img.url.length > 0;

    const hasMetaChanges =
      img.alt !== undefined ||
      img.sortOrder !== undefined ||
      img.active !== undefined;

    /* ============================
     * 1) DELETE
     * ============================ */
    if (isDelete) {
      if (!isUpdate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Para borrar una imagen debés enviar el 'id' de la imagen",
          path: ["id"],
        });
      }
      return;
    }

    /* ============================
     * 2) UPDATE
     * ============================ */
    if (isUpdate) {
      if (!hasFile && !hasUrl && !hasMetaChanges) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Para actualizar una imagen debés cambiar al menos 'url', 'fileField', 'alt', 'sortOrder' o 'active'",
          path: ["id"],
        });
      }
      return;
    }

    /* ============================
     * 3) CREATE
     * ============================ */
    if (!hasFile && !hasUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Para crear una imagen nueva debés enviar 'fileField' con un archivo o una 'url' válida",
        path: ["fileField"],
      });
    }
  });

export const upsertItemImagesBodySchema = z.object({
  images: z.preprocess(
    (raw) => {
      // En multipart/form-data, "images" llega como string JSON: "[{...}, {...}]"
      if (typeof raw === "string") {
        try {
          return JSON.parse(raw);
        } catch {
          return raw;
        }
      }
      return raw;
    },
    z
      .array(upsertItemImageSchema)
      .min(1, "Debe enviar al menos una imagen")
  ),
});
