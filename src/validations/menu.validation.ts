import { z } from "zod";
import {
  emptyToNull,
  zRequiredString,
  zOptionalString,
  zOptionalUrl,
  zBooleanLoose,
} from "./emptyspaces"; // ajustá el path si hace falta

// HEX #RRGGBB
const hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Usá HEX #RRGGBB");

const colorObj = z.object({
  primary: hex,
  secondary: hex,
});

/* ===========================
 * Preprocess común (create + update)
 * =========================== */

function normalizeBody(input: unknown) {
  const body = (input ?? {}) as any;

  // payload como string JSON (por si viene dentro de multipart)
  if (typeof body.payload === "string") {
    try {
      const parsed = JSON.parse(body.payload);
      Object.assign(body, parsed);
    } catch {
      // ignoramos error de parseo
    }
    delete body.payload;
  }

  // payload como objeto
  if (body.payload && typeof body.payload === "object") {
    Object.assign(body, body.payload);
    delete body.payload;
  }

  // active string -> boolean (alineado con zBooleanLoose)
  if (typeof body.active === "string") {
    body.active = body.active === "true";
  }

  // normalizar pos: matar espacios
  if (typeof body.pos === "string") {
    body.pos = emptyToNull(body.pos); // "   " -> null, " hola " -> "hola"
  }

  // Unificar color desde colorPrimary/colorSecondary o color.primary/secondary
  const cp = body.colorPrimary ?? body.color?.primary;
  const cs = body.colorSecondary ?? body.color?.secondary;

  if (cp || cs) {
    body.color = {
      primary: (cp ?? "#000000").trim(),
      secondary: (cs ?? "#FFFFFF").trim(),
    };
  }

  delete body.colorPrimary;
  delete body.colorSecondary;

  const shouldDropFileField = (value: unknown) => {
    if (value === null || typeof value === "undefined") return true;
    if (typeof value !== "string") return false;
    const trimmed = value.trim();
    return trimmed === "" || trimmed.toLowerCase() === "null" || trimmed.toLowerCase() === "undefined";
  };

  if (shouldDropFileField(body.logo)) {
    delete body.logo;
  }

  if (shouldDropFileField(body.backgroundImage)) {
    delete body.backgroundImage;
  }

  return body;
}

/* ===========================
 * CREATE
 * =========================== */

const createBase = z.object({
  title: zRequiredString("El título del menú", 120),

  active: zBooleanLoose,

  logo: zOptionalUrl(),
  backgroundImage: zOptionalUrl(),

  // color solo puede ser objeto HEX o null
  color: z.union([colorObj, z.null()]).optional(),

  // "" o espacios -> null
  pos: zOptionalString(255),
});

export const createMenuSchema = z.preprocess(normalizeBody, createBase);

/* ===========================
 * UPDATE
 * =========================== */

const updateBase = z.object({
  // si viene, no puede ser vacío ni solo espacios
  title: zRequiredString("El título del menú", 120).optional(),

  active: zBooleanLoose,

  logo: zOptionalUrl(),
  backgroundImage: zOptionalUrl(),

  color: z.union([colorObj, z.null()]).optional(),

  // "" o espacios -> null
  pos: zOptionalString(255),
});

export const updateMenuSchema = z.preprocess(normalizeBody, updateBase);
