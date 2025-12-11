// src/middlewares/validate.ts
import { ZodError, ZodTypeAny } from "zod";
import { Request, Response, NextFunction } from "express";

const formatZod = (err: ZodError) => ({
  message: "Datos inválidos",
  errors: err.errors.map(e => ({
    path: e.path.join("."),
    code: e.code,
    message: e.message,
  })),
});

export const validate = (schema: ZodTypeAny) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // 💡 SOLO validamos req.body
      const parsed = schema.parse(req.body);

      // 📌 GUARDA el body validado + normalizado
      req.body = parsed;

      next();
    } catch (e) {
      if (e instanceof ZodError) {
        return res.status(400).json(formatZod(e));
      }
      next(e);
    }
  };
};
