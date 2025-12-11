import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError";
import {
  UniqueConstraintError,
  ValidationError,
  ForeignKeyConstraintError,
} from "sequelize";

export const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("❌ Error atrapado:", err);

  /* ============================
   * 1) ApiError personalizado
   * ============================ */
  if (err instanceof ApiError) {
    const json = err.toJSON();

    // 🚫 Nunca enviamos el "cause" al cliente
    if (json.cause) delete json.cause;

    return res.status(err.statusCode).json(json);
  }

  /* ============================
   * 2) Errores ZOD
   * ============================ */
  if (err?.name === "ZodError") {
    return res.status(400).json({
      message: "Datos inválidos",
      details: err.issues?.map((i: any) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    });
  }

  /* ============================
   * 3) Sequelize: Valor muy largo
   * ============================ */
  if (err?.original?.code === "ER_DATA_TOO_LONG") {
    const col =
      /for column '(.+?)'/.exec(err?.original?.sqlMessage || "")?.[1] ?? "campo";
    return res.status(400).json({
      message: `El valor es demasiado largo para '${col}'`,
    });
  }

  /* ============================
   * 4) Sequelize: Unique constraint
   * ============================ */
  if (
    err instanceof UniqueConstraintError ||
    err?.name === "SequelizeUniqueConstraintError" ||
    err?.original?.code === "ER_DUP_ENTRY"
  ) {
    const field =
      err?.errors?.[0]?.path ||
      /for key '(.+?)'/.exec(err?.original?.sqlMessage || "")?.[1] ||
      "campo";
    return res.status(409).json({ message: `El valor '${field}' ya está en uso` });
  }

  /* ============================
   * 5) Foreign key inválida
   * ============================ */
  if (err instanceof ForeignKeyConstraintError) {
    return res.status(400).json({ message: "Referencia inválida" });
  }

  /* ============================
   * 6) Validaciones de Sequelize
   * ============================ */
  if (err instanceof ValidationError || err?.name === "SequelizeValidationError") {
    return res.status(400).json({
      message: "Datos inválidos",
      details: err.errors?.map((e: any) => e.message),
    });
  }

  /* ============================
   * 7) Error desconocido
   * ============================ */
  return res.status(500).json({
    message: "Error interno del servidor",
  });
};
