import { JwtPayload } from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import { RequestLogger } from "../utils/requestLogger";

declare module "express-serve-static-core" {
  interface Request {
    user?: JwtPayload & {
      sub?: string;
      roleId?: number;
      role?: string;
      email?: string;
      accountType?: "free" | "standard";
    };
  }
}

export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  const reqLogger = new RequestLogger(req);
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    reqLogger.warn("Authentication rejected", { reason: "missing_bearer_token" });
    return res.status(401).json({ message: "No token provided" });
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
    reqLogger.warn("Authentication rejected", { reason: "empty_bearer_token" });
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = verifyToken(token) as JwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    reqLogger.warn("Authentication rejected", {
      reason: "invalid_or_expired_token",
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
