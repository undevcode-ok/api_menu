import { NextFunction, Request, Response } from "express";

export const ADMIN_ROLE_ID = Number(process.env.ADMIN_ROLE_ID ?? "1");

export const isAdminRequest = (req: Request) =>
  req.user?.roleId === ADMIN_ROLE_ID;

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const roleId = req.user?.roleId;
  if (!roleId) {
    return res.status(403).json({ message: "User role not found" });
  }

  if (!isAdminRequest(req)) {
    return res.status(403).json({ message: "Admin role required" });
  }

  next();
};
