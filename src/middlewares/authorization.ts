import { NextFunction, Request, Response } from "express";
import { isAdminRequest } from "./requireAdmin";

export const requireSelfOrAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const requestedId = Number(req.params.id);
  const authenticatedId = Number(req.user?.sub);

  if (!Number.isInteger(requestedId) || requestedId <= 0) {
    return res.status(400).json({ message: "Invalid id" });
  }

  if (!isAdminRequest(req) && requestedId !== authenticatedId) {
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
    return res.status(403).json({
      message: "Solo un administrador puede cambiar roles",
      details: { code: "ROLE_CHANGE_DENIED" },
    });
  }

  next();
};
