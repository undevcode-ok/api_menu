import { Request } from "express";
import { logger } from "./logger";

type Meta = Record<string, unknown>;

export class RequestLogger {
  private baseMeta: Meta;

  constructor(private req: Request) {
    this.baseMeta = {
      requestId: req.requestId,
      tenantId: req.tenant?.id,
    };
  }

  private combine(meta?: Meta): Meta {
    return { ...this.baseMeta, ...(meta ?? {}) };
  }

  info(message: string, meta?: Meta) {
    logger.info(message, this.combine(meta));
  }

  error(message: string, meta?: Meta) {
    logger.error(message, this.combine(meta));
  }

  warn(message: string, meta?: Meta) {
    logger.warn(message, this.combine(meta));
  }

  debug(message: string, meta?: Meta) {
    logger.debug(message, this.combine(meta));
  }
}
