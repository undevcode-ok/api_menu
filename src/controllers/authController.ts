import { Request, Response, NextFunction } from "express";
import * as userService from "../services/userService";
import { RequestLogger } from "../utils/requestLogger";
import { generateToken } from "../utils/jwt";
import {
  getAccountAuthorization,
  getAccountEntitlements,
} from "../services/accountPolicyService";
import { User } from "../models/User";

type AuthTokenPayload = {
  sub: string; // JWT spec: string
  email: string;
  roleId: number;
  role: string;
  name: string;
  lastName: string;
  subdomain: string | null;
  accountType: "free" | "standard";
};

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "unknown";

async function buildAuthResult(user: User) {
  const authorization = await getAccountAuthorization(user.id);
  const account = authorization.account;
  const payload: AuthTokenPayload = {
    sub: String(user.id),
    email: user.email,
    roleId: user.roleId,
    role: authorization.role,
    name: user.name,
    lastName: user.lastName,
    subdomain: user.subdomain ?? null,
    accountType: account.plan,
  };

  return { token: generateToken(payload), account };
}

function publicUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    lastName: user.lastName,
    email: user.email,
    cel: user.cel,
    roleId: user.roleId,
    active: user.active,
    subdomain: user.subdomain,
  };
}

export const googleSync = async (req: Request, res: Response, next: NextFunction) => {
  const reqLogger = new RequestLogger(req);
  try {
    const { firebaseUid, name, lastName, email, cel } = req.body;

    if (!email || !name || !lastName) {
      reqLogger.warn("Google sync missing required fields");
      return res.status(400).json({ message: "Email, name and lastName are required" });
    }

    const authenticatedEmail = req.user?.email?.trim().toLowerCase();
    const requestedEmail = String(email).trim().toLowerCase();
    if (!authenticatedEmail || authenticatedEmail !== requestedEmail) {
      return res.status(403).json({
        message: "No podés sincronizar la identidad de otro usuario",
        details: { code: "GOOGLE_SYNC_IDENTITY_MISMATCH" },
      });
    }

    reqLogger.info("Google sync payload received", { email, firebaseUid });

    const user = await userService.getUserByEmailForAuth(requestedEmail);
    if (!user || String(user.id) !== req.user?.sub) {
      return res.status(403).json({
        message: "La identidad autenticada no coincide con el usuario",
        details: { code: "GOOGLE_SYNC_IDENTITY_MISMATCH" },
      });
    }

    const { token, account } = await buildAuthResult(user);
    reqLogger.info("Google login successful", { userId: user.id });

    return res.json({
      message: "Google login successful",
      token,
      user: publicUser(user),
      account,
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

    const { token, account } = await buildAuthResult(user);

    reqLogger.info("Login successful", { userId: user.id, email });
    return res.json({
      message: "Login successful",
      token,
      user: publicUser(user),
      account,
    });
  } catch (err) {
    reqLogger.error("Login failed", { error: errorMessage(err) });
    next(err);
  }
};

export const registerFree = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const reqLogger = new RequestLogger(req);
  try {
    const user = await userService.registerFreeUser(req.body);
    const { token, account } = await buildAuthResult(user);

    reqLogger.info("Free account registered", { userId: user.id });
    return res.status(201).json({
      message: "Cuenta Free creada correctamente",
      token,
      user: publicUser(user),
      account,
    });
  } catch (error) {
    reqLogger.error("Free account registration failed", {
      error: errorMessage(error),
    });
    next(error);
  }
};

export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = Number(req.user?.sub);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({ message: "Invalid token subject" });
    }

    const user = await userService.getUserById(userId);
    const account = await getAccountEntitlements(user.id);
    return res.json({ user: publicUser(user), account });
  } catch (error) {
    next(error);
  }
};
