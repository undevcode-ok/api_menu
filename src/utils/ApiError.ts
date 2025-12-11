export class ApiError extends Error {
  public statusCode: number;
  public details?: any;
  public cause?: any;

  constructor(message: string, statusCode = 400, details?: any, cause?: any) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.cause = cause;

    Object.setPrototypeOf(this, ApiError.prototype);
  }

  toJSON() {
    return {
      message: this.message,
      statusCode: this.statusCode,
      ...(this.details ? { details: this.details } : {}),
      ...(this.cause ? { cause: this.cause } : {}),
    };
  }
}