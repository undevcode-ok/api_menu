import { NextFunction, Request, Response } from "express";
import { isAdminRequest } from "./requireAdmin";
import { RequestLogger } from "../utils/requestLogger";

export const requireSelfOrAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const requestedId = Number(req.params.id);
  const authenticatedId = Number(req.user?.sub);

  if (!Number.isInteger(requestedId) || requestedId <= 0) {
    new RequestLogger(req).warn("User authorization rejected", {
      reason: "invalid_requested_user_id",
      requestedId: req.params.id,
    });
    return res.status(400).json({ message: "Invalid id" });
  }

  if (!isAdminRequest(req) && requestedId !== authenticatedId) {
    new RequestLogger(req).warn("User authorization rejected", {
      reason: "user_owner_mismatch",
      requestedUserId: requestedId,
      authenticatedUserId: authenticatedId,
    });
    return res.status(403).json({
      message: "No tenés permiso para acceder a otro usuario",
      details: { code: "USER_ACCESS_DENIED" },
    });
  }

  next();
};

export const requireAdminForRoleChange = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.body?.roleId !== undefined && !isAdminRequest(req)) {
    new RequestLogger(req).warn("Role change rejected", {
      reason: "admin_required",
      requestedRoleId: req.body.roleId,
    });
    return res.status(403).json({
      message: "Solo un administrador puede cambiar roles",
      details: { code: "ROLE_CHANGE_DENIED" },
    });
  }

  next();
};
