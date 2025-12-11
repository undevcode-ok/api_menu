import jwt, { JwtPayload, Secret } from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

const JWT_SECRET: Secret = process.env.JWT_SECRET ?? "super_secret_key";

declare module "express-serve-static-core" {
  interface Request {
    user?: JwtPayload & { sub?: string; roleId?: number; email?: string };
  }
}

export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }
  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};