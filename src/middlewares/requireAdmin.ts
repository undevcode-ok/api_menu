import { NextFunction, Request, Response } from "express";
import { RequestLogger } from "../utils/requestLogger";

export const isAdminRequest = (req: Request) =>
  req.user?.role?.trim().toLowerCase() === "admin";

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const role = req.user?.role;
  if (!role) {
    new RequestLogger(req).warn("Admin authorization rejected", {
      reason: "role_missing_from_token",
    });
    return res.status(403).json({ message: "User role not found" });
  }

  if (!isAdminRequest(req)) {
    new RequestLogger(req).warn("Admin authorization rejected", {
      reason: "admin_role_required",
    });
    return res.status(403).json({ message: "Admin role required" });
  }

  next();
};
