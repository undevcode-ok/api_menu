import type { Model, ModelStatic } from "sequelize";
import { getTableLimits } from "./schemaLimits";
import { ApiError } from "../utils/ApiError";

export function attachDbLengthValidator<M extends Model>(
  ModelClass: ModelStatic<M>,
  tableName: string
) {
  ModelClass.addHook("beforeValidate", (instance: M) => {
    const limits = getTableLimits(tableName);
    const messages: string[] = [];

    for (const [col, max] of Object.entries(limits)) {
      const val: unknown =
        (typeof (instance as any).get === "function" ? (instance as any).get(col) : undefined) ??
        (instance as any)[col];

      if (typeof val === "string" && val.length > max) {
        messages.push(`${col} exceeds maximum length of ${max} characters`);
      }
    }

    if (messages.length) {
      // => tu error handler ya devuelve 400 para ApiError
      throw new ApiError(messages.join(", "), 400);
    }
  });
}