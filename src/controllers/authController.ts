import { Request, Response, NextFunction } from "express";
import * as userService from "../services/userService";
import * as jwt from "jsonwebtoken";
import { RequestLogger } from "../utils/requestLogger";

const JWT_SECRET: jwt.Secret = process.env.JWT_SECRET ?? "super_secret_key";
const EXPIRES_IN: jwt.SignOptions["expiresIn"] = "2h";

type AuthTokenPayload = {
  sub: string; // JWT spec: string
  email: string;
  roleId: number;
  name: string;
  lastName: string;
  subdomain: string | null; // ✔ ahora permite null
};

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "unknown";

export const googleSync = async (req: Request, res: Response, next: NextFunction) => {
  const reqLogger = new RequestLogger(req);
  try {
    const { firebaseUid, name, lastName, email, cel } = req.body;

    if (!email || !name || !lastName) {
      reqLogger.warn("Google sync missing required fields");
      return res.status(400).json({ message: "Email, name and lastName are required" });
    }

    reqLogger.info("Google sync payload received", { email, firebaseUid });

    // Buscar usuario existente por email
    let user = await userService.getUserByEmailForAuth(email);

    if (user) {
      reqLogger.info("Google sync found existing user", { email });
    } else {
      // Crear nuevo usuario desde Google
      reqLogger.info("Google sync creating new user", { email });

      try {
        user = await userService.createGoogleUser({
          name,
          lastName,
          email,
          cel: cel || "",
          roleId: 2,
        });
      } catch (createError) {
        reqLogger.error("Error creating Google user", {
          email,
          error: errorMessage(createError),
        });
        return res.status(500).json({ message: "Error creating Google user" });
      }
    }

    // Generar token
    const payload: AuthTokenPayload = {
      sub: String(user.id),
      email: user.email,
      roleId: user.roleId,
      name: user.name,
      lastName: user.lastName,
      subdomain: user.subdomain ?? null, // ✔ FIX
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: EXPIRES_IN });
    reqLogger.info("Google login successful", { userId: user.id });

    return res.json({
      message: "Google login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        lastName: user.lastName,
        email: user.email,
        cel: user.cel,
        roleId: user.roleId,
        active: user.active,
      },
    });
  } catch (err) {
    reqLogger.error("Google sync failed", { error: errorMessage(err) });
    next(err);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  const reqLogger = new RequestLogger(req);
  try {
    let { email, password } = req.body as { email: string; password: string };
    if (!email || !password) {
      reqLogger.warn("Login attempt missing credentials");
      return res.status(400).json({ message: "Email and password are required" });
    }

    email = email.trim().toLowerCase();
    const pwd = password.trim();

    reqLogger.info("Login attempt", { email });
    const user = await userService.getUserByEmailForAuth(email);
    if (!user) {
      reqLogger.warn("Login invalid credentials", { email });
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!user.active) {
      reqLogger.warn("Login rejected inactive user", { email, userId: user.id });
      return res.status(403).json({ message: "USER_INACTIVE" });
    }

    const valid = await user.validatePassword(pwd);
    if (!valid) {
      reqLogger.warn("Login invalid credentials", { email, userId: user.id });
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const payload: AuthTokenPayload = {
      sub: String(user.id),
      email: user.email,
      roleId: user.roleId,
      name: user.name,
      lastName: user.lastName,
      subdomain: user.subdomain ?? null, // ✔ FIX
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: EXPIRES_IN });

    reqLogger.info("Login successful", { userId: user.id, email });
    return res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        lastName: user.lastName,
        email: user.email,
        cel: user.cel,
        roleId: user.roleId,
        active: user.active,
        subdomain: user.subdomain,
      },
    });
  } catch (err) {
    reqLogger.error("Login failed", { error: errorMessage(err) });
    next(err);
  }
};
