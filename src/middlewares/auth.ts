import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";

export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }
  const token = authHeader.split(" ")[1];

  try {
    const decoded = verifyToken(token);
    // @ts-ignore
    req.user = decoded; // así podés acceder a los datos del usuario en los endpoints
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
