import { Request, Response, NextFunction } from "express";
import * as userService from "../services/userService";
import { buildPagination } from "../utils/pagination";
import { RequestLogger } from "../utils/requestLogger";

const parseId = (req: Request) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id))
    throw Object.assign(new Error("Invalid id"), { status: 400 });
  return id;
};

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "unknown";

export const getAllUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const reqLogger = new RequestLogger(req);
  try {
    // Campos permitidos para ordenar en User
    const pg = buildPagination(req.query, [
      "id",
      "name",
      "lastName",
      "email",
      "createdAt",
    ]);
    reqLogger.info("Listing users", { pagination: pg });
    const result = await userService.getAllUsers(pg);
    reqLogger.info("Users listed successfully");
    res.json(result);
  } catch (error) {
    reqLogger.error("Failed to list users", { error: errorMessage(error) });
    next(error);
  }
};

export const getUserById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const reqLogger = new RequestLogger(req);
  try {
    const id = parseId(req);
    reqLogger.info("Fetching user", { userId: id });
    const user = await userService.getUserById(id);
    reqLogger.info("User fetched successfully", { userId: id });
    res.json(user);
  } catch (error) {
    reqLogger.error("Failed to fetch user", { error: errorMessage(error) });
    next(error);
  }
};

export const createUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const reqLogger = new RequestLogger(req);
  try {
    reqLogger.info("Creating user");
    const user = await userService.createUser(req.body); // password requerido en DTO
    const payload = user.toJSON();
    reqLogger.info("User created", { userId: user.id });
    res.status(201).json({ ...payload, subdomain: user.subdomain });
  } catch (error) {
    reqLogger.error("Failed to create user", { error: errorMessage(error) });
    next(error);
  }
};

export const updateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const reqLogger = new RequestLogger(req);
  try {
    const id = parseId(req);
    reqLogger.info("Updating user", { userId: id });
    const user = await userService.updateUser(id, req.body);
    reqLogger.info("User updated", { userId: id });
    res.json(user);
  } catch (error) {
    reqLogger.error("Failed to update user", { error: errorMessage(error) });
    next(error);
  }
};

export const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const reqLogger = new RequestLogger(req);
  try {
    const id = parseId(req);
    reqLogger.info("Deleting user", { userId: id });
    const result = await userService.deleteUser(id);
    reqLogger.info("User deleted", { userId: id });
    res.json(result);
  } catch (error) {
    reqLogger.error("Failed to delete user", { error: errorMessage(error) });
    next(error);
  }
};

export const activateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const reqLogger = new RequestLogger(req);
  try {
    const id = parseId(req);
    reqLogger.info("Activating user", { userId: id });
    const result = await userService.activateUser(id);
    reqLogger.info("User activated", { userId: id });
    res.json(result);
  } catch (error) {
    reqLogger.error("Failed to activate user", { error: errorMessage(error) });
    next(error);
  }
};

export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const reqLogger = new RequestLogger(req);
  try {
    const { email, resetUrl } = req.body as {
      email: string;
      resetUrl?: string;
    };
    reqLogger.info("Password reset requested", { email });
    const result = await userService.requestPasswordReset(email, resetUrl);
    reqLogger.info("Password reset email triggered", { email });
    res.status(202).json(result);
  } catch (err) {
    reqLogger.error("Failed to process password reset request", {
      error: errorMessage(err),
    });
    next(err);
  }
};
export const restorePassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const reqLogger = new RequestLogger(req);
  try {
    const { token, password, confirmationPassword } = req.body as {
      token: string;
      password: string;
      confirmationPassword?: string;
    };

    if (!token || !password) {
      reqLogger.warn("Password restore missing token/password");
      return res
        .status(400)
        .json({ message: "token and password are required" });
    }
    if (confirmationPassword && confirmationPassword !== password) {
      reqLogger.warn("Password restore mismatch", { token });
      return res.status(422).json({ message: "Passwords do not match" });
    }

    reqLogger.info("Restoring password", { token });
    const result = await userService.resetPasswordWithToken(token, password);
    reqLogger.info("Password restored successfully", { token });
    res.json(result);
  } catch (err) {
    reqLogger.error("Failed to restore password", {
      error: errorMessage(err),
    });
    next(err);
  }
};

export const verifyResetToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const reqLogger = new RequestLogger(req);
  try {
    const { token } = req.params;

    if (!token) {
      reqLogger.warn("Verify reset token missing token");
      return res.status(400).json({
        valid: false,
        message: "Token requerido",
      });
    }

    reqLogger.info("Verifying reset token", { token });
    const isValid = await userService.verifyResetToken(token);

    if (!isValid) {
      reqLogger.warn("Reset token invalid or expired", { token });
      return res.status(404).json({
        valid: false,
        message: "Token inválido o expirado",
      });
    }

    reqLogger.info("Reset token valid", { token });
    res.json({ valid: true });
  } catch (error) {
    reqLogger.error("Failed to verify reset token", {
      error: errorMessage(error),
    });
    next(error);
  }
};
