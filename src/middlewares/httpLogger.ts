import { NextFunction, Request, Response } from "express";
import { randomUUID } from "crypto";
import {
  isHttpLoggingEnabled,
  logger,
  slowRequestThresholdMs,
} from "../utils/logger";

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

export const httpLogger = (req: Request, res: Response, next: NextFunction) => {
  const requestId = randomUUID();
  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);

  if (!isHttpLoggingEnabled) {
    return next();
  }

  const startedAt = Date.now();
  let finished = false;

  res.once("finish", () => {
    finished = true;
    const durationMs = Date.now() - startedAt;
    const meta = {
      requestId,
      method: req.method,
      route: req.logRoute ??
        (req.route?.path ? `${req.baseUrl}${req.route.path}` : req.path),
      statusCode: res.statusCode,
      durationMs,
      userId: req.user?.sub,
      role: req.user?.role,
      tenantId: req.tenant?.id,
    };

    if (res.statusCode >= 500) {
      logger.error("HTTP request completed", meta);
    } else if (res.statusCode >= 400 || durationMs >= slowRequestThresholdMs) {
      logger.warn("HTTP request completed", {
        ...meta,
        ...(durationMs >= slowRequestThresholdMs ? { slowRequest: true } : {}),
      });
    } else {
      logger.info("HTTP request completed", meta);
    }
  });

  res.once("close", () => {
    if (finished) return;
    logger.warn("HTTP request aborted before response completed", {
      requestId,
      method: req.method,
      route: req.logRoute ??
        (req.route?.path ? `${req.baseUrl}${req.route.path}` : req.path),
      durationMs: Date.now() - startedAt,
      userId: req.user?.sub,
      tenantId: req.tenant?.id,
    });
  });

  next();
};
