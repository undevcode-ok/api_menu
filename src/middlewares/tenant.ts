import { Request, Response, NextFunction } from "express";
import User from "../models/User";
import { isAdminRequest } from "./requireAdmin";
import { RequestLogger } from "../utils/requestLogger";

declare global {
  namespace Express {
    interface Request {
      tenant?: {
        id: number;
        subdomain: string | null;   // ✔ ahora acepta null
        user: User;
      };
    }
  }
}

export const tenantMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const reqLogger = new RequestLogger(req);
  try {
    let subdomain: string | null =
      (req.get("x-tenant-subdomain") as string) ||
      ((req.query.tenant as string) ?? null);

    if (!subdomain) {
      reqLogger.warn("Tenant resolution rejected", {
        reason: "tenant_not_specified",
      });
      return res.status(400).json({
        error: "Tenant not specified. Use x-tenant-subdomain header or ?tenant= param",
      });
    }

    subdomain = subdomain.toLowerCase();

    // Buscamos usuario dueño del tenant (solo activos)
    const user = await User.findOne({
      where: { subdomain, active: true }, // este match sí exige string real
    });

    if (!user) {
      reqLogger.warn("Tenant resolution rejected", {
        reason: "tenant_not_found_or_inactive",
        subdomain,
      });
      return res.status(404).json({ error: "User not found or inactive" });
    }

    const authenticatedUserId = Number(req.user?.sub);
    if (
      !Number.isInteger(authenticatedUserId) ||
      (!isAdminRequest(req) && authenticatedUserId !== user.id)
    ) {
      reqLogger.warn("Cross-tenant access rejected", {
        reason: "tenant_owner_mismatch",
        authenticatedUserId: Number.isInteger(authenticatedUserId)
          ? authenticatedUserId
          : undefined,
        requestedTenantId: user.id,
        requestedSubdomain: subdomain,
      });
      return res.status(403).json({
        error: "No tenés permiso para operar sobre este tenant",
        details: { code: "TENANT_ACCESS_DENIED" },
      });
    }
    
    req.tenant = {
      id: user.id,
      subdomain: user.subdomain ?? null,  // ✔ FIX (puede ser null)
      user,
    };

    reqLogger.debug("Tenant resolved", {
      tenantId: user.id,
      subdomain: user.subdomain,
      adminOverride: isAdminRequest(req) && authenticatedUserId !== user.id,
    });

    next();
  } catch (error) {
    reqLogger.failure("Tenant resolution failed", error);
    next(error);
  }
};
