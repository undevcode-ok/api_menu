import multer from "multer";
import {
  ForeignKeyConstraintError,
  UniqueConstraintError,
  ValidationError,
} from "sequelize";
import { ApiError } from "./ApiError";

export function getHttpStatusForError(error: any): number {
  if (error instanceof ApiError) return error.statusCode;
  if (error?.name === "ZodError") return 400;
  if (error instanceof multer.MulterError) return 400;
  if (
    typeof error?.message === "string" &&
    (error.message.startsWith("Tipo de archivo no permitido") ||
      error.message.startsWith("Extensión de archivo no permitida") ||
      error.message.startsWith("Formato inválido"))
  ) return 400;
  if (error?.original?.code === "ER_DATA_TOO_LONG") return 400;
  if (
    error instanceof UniqueConstraintError ||
    error?.name === "SequelizeUniqueConstraintError" ||
    error?.original?.code === "ER_DUP_ENTRY"
  ) return 409;
  if (error instanceof ForeignKeyConstraintError) return 400;
  if (
    error instanceof ValidationError ||
    error?.name === "SequelizeValidationError"
  ) return 400;
  return 500;
}

export function getErrorCode(error: any): unknown {
  return error?.details?.code ?? error?.original?.code ?? error?.code;
}
