import { NextFunction, Request, Response } from "express";

export const isAdminRequest = (req: Request) =>
  req.user?.role?.trim().toLowerCase() === "admin";

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const role = req.user?.role;
  if (!role) {
    return res.status(403).json({ message: "User role not found" });
  }

  if (!isAdminRequest(req)) {
    return res.status(403).json({ message: "Admin role required" });
  }

  next();
};
