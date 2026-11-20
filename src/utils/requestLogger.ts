import { Request } from "express";
import { logger } from "./logger";
import { getErrorCode, getHttpStatusForError } from "./errorClassification";

type Meta = Record<string, unknown>;

declare global {
  namespace Express {
    interface Request {
      failureLogged?: boolean;
      logRoute?: string;
    }
  }
}

export class RequestLogger {
  private baseMeta: Meta;

  constructor(private req: Request) {
    const route = req.route?.path
      ? `${req.baseUrl}${req.route.path}`
      : req.path;
    if (req.route?.path || !req.logRoute) {
      req.logRoute = route;
    }

    this.baseMeta = {
      requestId: req.requestId,
      tenantId: req.tenant?.id,
      userId: req.user?.sub,
      role: req.user?.role,
      method: req.method,
      route: req.logRoute,
    };
  }

  private combine(meta?: Meta): Meta {
    return { ...this.baseMeta, ...(meta ?? {}) };
  }

  info(message: string, meta?: Meta) {
    logger.info(message, this.combine(meta));
  }

  error(message: string, meta?: Meta) {
    if (meta && Object.prototype.hasOwnProperty.call(meta, "error")) {
      const { error, ...rest } = meta;
      this.failure(message, error, rest);
      return;
    }
    logger.error(message, this.combine(meta));
  }

  failure(message: string, error: unknown, meta?: Meta) {
    const statusCode = getHttpStatusForError(error);
    const errorCode = getErrorCode(error);
    const payload = this.combine({
      ...(meta ?? {}),
      statusCode,
      errorCode,
      error,
    });

    this.req.failureLogged = true;
    if (statusCode >= 400 && statusCode < 500) {
      logger.warn(message, payload);
    } else {
      logger.error(message, payload);
    }
  }

  warn(message: string, meta?: Meta) {
    logger.warn(message, this.combine(meta));
  }

  debug(message: string, meta?: Meta) {
    logger.debug(message, this.combine(meta));
  }
}
