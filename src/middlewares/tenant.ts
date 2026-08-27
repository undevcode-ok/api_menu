import { Request, Response, NextFunction } from "express";
import User from "../models/User";
import { isAdminRequest } from "./requireAdmin";

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
  try {
    let subdomain: string | null =
      (req.get("x-tenant-subdomain") as string) ||
      ((req.query.tenant as string) ?? null);

    if (!subdomain) {
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
      return res.status(404).json({ error: "User not found or inactive" });
    }

    const authenticatedUserId = Number(req.user?.sub);
    if (
      !Number.isInteger(authenticatedUserId) ||
      (!isAdminRequest(req) && authenticatedUserId !== user.id)
    ) {
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

    next();
  } catch (error) {
    console.error("Tenant middleware error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
