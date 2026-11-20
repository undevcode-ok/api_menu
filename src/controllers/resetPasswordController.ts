import { Request, Response, NextFunction } from "express";
import argon2 from "argon2";
import { passwordReset } from "../services/passwordResetService";
import { User } from "../models/User";
import { ApiError } from "../utils/ApiError";
import { RequestLogger } from "../utils/requestLogger";

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "unknown";

export const resetPasswordController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const reqLogger = new RequestLogger(req);
  try {
    const { token, password } = req.body as { token: string; password: string };
    const trimmedPassword = password.trim();

    if (trimmedPassword.length < 8 || trimmedPassword.length > 16) {
      reqLogger.warn("Password reset rejected", {
        reason: "invalid_password_length",
      });
      return res
        .status(422)
        .json({ message: "La contraseña debe tener entre 8 y 16 caracteres." });
    }

    const matchedUser = await passwordReset.verifyAndConsumeToken(token);
    const user = await User.scope("withHash").findByPk(matchedUser.id);

    if (!user || !user.active) {
      throw new ApiError("Usuario no encontrado", 404);
    }

    user.passwordHash = await argon2.hash(trimmedPassword);
    await user.save({ hooks: false });

    reqLogger.info("Password reset completed", { userId: user.id });
    res.json({ message: "Contraseña actualizada correctamente" });
  } catch (error) {
    if (error instanceof ApiError) {
      reqLogger.warn("Password reset rejected", {
        statusCode: error.statusCode,
        errorCode: error.details?.code,
        error: errorMessage(error),
      });
      return res.status(error.statusCode).json({ message: error.message });
    }

    if (error instanceof Error) {
      reqLogger.error("Password reset failed", {
        error,
      });
      return res.status(400).json({ message: error.message });
    }

    reqLogger.error("Password reset failed", { error: "unknown" });
    next(error);
  }
};
