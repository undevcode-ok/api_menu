import { User, UserCreationAttributes } from "../models/User";
import { Menu } from "../models/Menu";
import { PasswordResetToken } from "../models/PasswordResetToken";
import { CreateUserDto, UpdateUserDto } from "../dtos/user.dto";
import { ApiError } from "../utils/ApiError";
import { Op, UniqueConstraintError, ValidationError } from "sequelize";
import argon2 from "argon2";
import crypto from "crypto";
import {
  PaginationParams,
  PaginatedResult,
  buildPaginatedResult,
} from "../utils/pagination";
import sequelize from "../utils/databaseService";
import { passwordReset } from "./passwordResetService";
import { emailService } from "./emailService";
import { generateUserSubdomain } from "../utils/subdomain";

const RESET_TTL_MIN = parseInt(process.env.PASSWORD_RESET_TTL_MINUTES ?? "1440", 10);
const FRONTEND_INVITE_URL = (process.env.FRONTEND_INVITE_URL ?? "https://frontend.local/create").trim();
const FRONTEND_RECOVER_URL = (process.env.FRONTEND_RECOVER_URL ?? "https://frontend.local/recover").trim();

const buildLinkWithToken = (baseUrl: string, token: string) => {
  const sanitized = baseUrl.replace(/\/+$/, "");
  const separator = sanitized.includes("?") ? "&" : "?";
  return `${sanitized}${separator}token=${encodeURIComponent(token)}`;
};

const buildInviteLink = (token: string) => buildLinkWithToken(FRONTEND_INVITE_URL, token);
const buildRecoverLink = (token: string) => buildLinkWithToken(FRONTEND_RECOVER_URL, token);

const buildCustomResetLink = (baseUrl: string, token: string) => {
  const sanitized = baseUrl.trim().replace(/\/+$/, "");
  return `${sanitized}/${encodeURIComponent(token)}`;
};

/* ================================
   QUERIES BÁSICAS
================================ */

export const getAllUsers = async (
  pg: PaginationParams
): Promise<PaginatedResult<User>> => {
  const { limit, offset, order } = pg;

  const { rows, count } = await User.findAndCountAll({
    where: { active: true },
    limit,
    offset,
    order,
    distinct: true,
  });

  return buildPaginatedResult(rows, count, pg);
};

export const getUserById = async (id: number) => {
  const user = await User.findOne({ where: { id, active: true } });
  if (!user) throw new ApiError("User not found", 404);
  return user;
};

/* ================================
   CREATE USER (FINAL OPCIONAL)
================================ */

export const createUser = async (data: CreateUserDto) => {
  try {
    // Email único
    const emailTaken = await User.findOne({ where: { email: data.email } });
    if (emailTaken) throw new ApiError("Email already in use", 409);

    const subdomain = await generateUserSubdomain(data.name, data.lastName);

    const tempPassword = crypto.randomBytes(8).toString("hex"); // 16 chars
    const passwordHash = await argon2.hash(tempPassword);

    // Crear usuario
    const created = await User.create({
      name: data.name,
      lastName: data.lastName,
      email: data.email,
      cel: data.cel ?? null,
      roleId: data.roleId,
      password: tempPassword,
      passwordHash,
      active: true,
      subdomain,
    } as UserCreationAttributes);

    const token = await passwordReset.createInviteTokenForUser(created);
    const link = buildInviteLink(token);
    await emailService.sendPasswordInviteEmail(created.email, created.name, link);

    return created;
  } catch (err: any) {
    if (err instanceof UniqueConstraintError || err?.name === "SequelizeUniqueConstraintError") {
      throw new ApiError("Email or subdomain already in use", 409);
    }
    if (err instanceof ValidationError) {
      throw new ApiError(err.errors.map((e) => e.message).join(", "), 400);
    }
    throw err;
  }
};

/* ================================
   CREATE USER GOOGLE (OPCIONAL SD)
================================ */

export const createGoogleUser = async (userData: {
  name: string;
  lastName: string;
  email: string;
  cel?: string | null;
  roleId: number;
}) => {
  try {
    const tempPassword = "google" + Math.random().toString(36).substring(2, 8);
    const passwordHash = await argon2.hash(tempPassword);

    const subdomain = await generateUserSubdomain(userData.name, userData.lastName);

    const user = await User.create({
      name: userData.name,
      lastName: userData.lastName,
      email: userData.email,
      cel: userData.cel ?? null,
      roleId: userData.roleId,
      password: tempPassword,
      passwordHash,
      active: true,
      subdomain,
    } as UserCreationAttributes);

    return user;
  } catch (error: any) {
    if (error instanceof UniqueConstraintError || error?.name === "SequelizeUniqueConstraintError") {
      throw new ApiError("Email or subdomain already in use", 409);
    }
    if (error instanceof ValidationError) {
      throw new ApiError(error.errors.map((e) => e.message).join(", "), 400);
    }
    throw error;
  }
};

/* ================================
   UPDATE USER — SOPORTA NULL
================================ */

export const updateUser = async (id: number, data: UpdateUserDto) => {
  const user = await User.unscoped().findOne({ where: { id, active: true } });
  if (!user) throw new ApiError("User not found", 404);

  // Email único si cambia
  if (data.email && data.email !== user.email) {
    const taken = await User.findOne({
      where: { email: data.email, id: { [Op.ne]: id } },
    });
    if (taken) throw new ApiError("Email already in use", 409);
  }

  // Password opcional
  if ("password" in data) {
    if (typeof data.password !== "string") {
      throw new ApiError("Password must be a string", 400);
    }
    const pwd = data.password.trim();
    if (pwd.length < 8 || pwd.length > 16) {
      throw new ApiError("Password must be between 8 and 16 characters.", 400);
    }
    user.set("password", pwd);
  }

  // Aplicar patch — acepta null
  user.set({
    name: data.name ?? user.name,
    lastName: data.lastName ?? user.lastName,
    email: data.email ?? user.email,
    cel: data.cel !== undefined ? data.cel : user.cel, // ✔ FIX: null permitido
    roleId: data.roleId ?? user.roleId,
    // subdomain no se toca por política
  });

  try {
    await user.save();
  } catch (err: any) {
    if (err instanceof UniqueConstraintError || err?.name === "SequelizeUniqueConstraintError") {
      throw new ApiError("Email or subdomain already in use", 409);
    }
    if (err instanceof ValidationError) {
      throw new ApiError(err.errors.map((e) => e.message).join(", "), 400);
    }
    throw err;
  }

  // Invalidar tokens reset si cambió la pass
  if ("password" in data && typeof data.password === "string" && data.password.trim().length >= 8) {
    const fresh = await User.scope("withHash").findByPk(user.id);
    if (!fresh) throw new ApiError("User not found after update", 500);
    const ok = await fresh.validatePassword(data.password.trim());
    if (!ok) throw new ApiError("Password update failed", 500);

    await PasswordResetToken.update(
      { isUsed: true },
      { where: { userId: user.id, isUsed: false } }
    );
  }

  return await User.findByPk(id);
};

/* ================================
   DELETE USER (soft delete)
================================ */

export const deleteUser = async (id: number) => {
  return await sequelize.transaction(async (t) => {
    const user = await User.findOne({
      where: { id },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!user) throw new ApiError("User not found", 404);

    await user.update({ active: false }, { transaction: t });

    await Menu.update(
      { active: false },
      {
        where: { userId: user.id, active: true },
        transaction: t,
      }
    );

    return { message: "User disabled successfully" };
  });
};

export const activateUser = async (id: number) => {
  return await sequelize.transaction(async (t) => {
    const user = await User.findOne({
      where: { id },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!user) throw new ApiError("User not found", 404);

    if (!user.active) {
      await user.update({ active: true }, { transaction: t });
    }

    await Menu.update(
      { active: true },
      {
        where: { userId: user.id },
        transaction: t,
      }
    );

    return { message: "User enabled successfully" };
  });
};

/* ================================
   AUTH HELPERS
================================ */

export const getUserByEmailForAuth = async (email: string) => {
  const normalized = email.trim().toLowerCase();
  return await User.unscoped().findOne({ where: { email: normalized } });
};

/* ================================
   PASSWORD RESET LOGIC
================================ */

export const requestPasswordReset = async (email: string, resetUrl?: string) => {
  const user = await User.findOne({ where: { email, active: true } });
  if (!user) throw new ApiError("No se encontró una cuenta con este email.", 404);

  const rawToken = await passwordReset.createInviteTokenForUser(user);
  const completeResetUrl = resetUrl
    ? buildCustomResetLink(resetUrl, rawToken)
    : buildRecoverLink(rawToken);

  await emailService.sendPasswordRecoveryEmail(user.email, user.name, completeResetUrl);
  const ttlHours = Math.round(RESET_TTL_MIN / 60);
  return {
    message: `Enviamos un enlace de recuperación. Caduca en ${ttlHours || 1} hora${ttlHours === 1 ? "" : "s"}.`,
  };
};

export const verifyResetToken = async (token: string): Promise<boolean> => {
  try {
    return await passwordReset.isTokenValid(token);
  } catch (e) {
    console.error("Error verificando token:", e);
    return false;
  }
};

export const resetPasswordWithToken = async (token: string, newPassword: string) => {
  const pwd = newPassword.trim();
  if (pwd.length < 8 || pwd.length > 16) {
    throw new ApiError("La contraseña debe tener entre 8 y 16 caracteres.", 422);
  }

  const matchedUser = await passwordReset.verifyAndConsumeToken(token);
  const user = await User.scope("withHash").findByPk(matchedUser.id);
  if (!user || !user.active) throw new ApiError("Usuario no encontrado", 404);

  user.passwordHash = await argon2.hash(pwd);
  await user.save({ hooks: false });

  return { message: "Contraseña cambiada exitosamente" };
};
