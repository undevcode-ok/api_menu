import { NextFunction, Request, Response } from "express";

const ADMIN_ROLE_ID = Number(process.env.ADMIN_ROLE_ID ?? "1");

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const roleId = req.user?.roleId;
  if (!roleId) {
    return res.status(403).json({ message: "User role not found" });
  }

  if (roleId !== ADMIN_ROLE_ID) {
    return res.status(403).json({ message: "Admin role required" });
  }

  next();
};
