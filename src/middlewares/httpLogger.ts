import { NextFunction, Request, Response } from "express";
import { randomUUID } from "crypto";
import { isHttpLoggingEnabled, logger } from "../utils/logger";

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
  logger.info("HTTP request started", {
    requestId,
    method: req.method,
    url: req.originalUrl,
  });

  res.on("finish", () => {
    logger.info("HTTP request completed", {
      requestId,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
    });
  });

  next();
};
