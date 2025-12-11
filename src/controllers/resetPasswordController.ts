import { Request, Response, NextFunction } from "express";
import argon2 from "argon2";
import { passwordReset } from "../services/passwordResetService";
import { User } from "../models/User";
import { ApiError } from "../utils/ApiError";

export const resetPasswordController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token, password } = req.body as { token: string; password: string };
    const trimmedPassword = password.trim();

    if (trimmedPassword.length < 8 || trimmedPassword.length > 16) {
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

    res.json({ message: "Contraseña actualizada correctamente" });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }

    next(error);
  }
};
