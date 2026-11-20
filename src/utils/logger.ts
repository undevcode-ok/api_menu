type LogLevel = "debug" | "info" | "warn" | "error";
type LogMeta = Record<string, unknown>;

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const envLevel = (process.env.LOG_LEVEL ?? "info").toLowerCase() as LogLevel;
const ACTIVE_LEVEL = LEVEL_PRIORITY[envLevel] ? LEVEL_PRIORITY[envLevel] : LEVEL_PRIORITY.info;
const SENSITIVE_KEY = /password|passphrase|token|authorization|cookie|secret|api[-_]?key|credential|reset.*url|invite.*url|recovery.*url|link/i;
const EMAIL_KEY = /email/i;
const MAX_STRING_LENGTH = 2_000;

function sanitizeText(value: string) {
  return value
    .replace(
      /\b([a-z0-9._%+-]{1,64})@([a-z0-9.-]+\.[a-z]{2,})\b/gi,
      (_match, localPart: string, domain: string) =>
        `${localPart.slice(0, Math.min(2, localPart.length))}***@${domain}`
    )
    .replace(/\bBearer\s+[^\s,;]+/gi, "Bearer [REDACTED]")
    .replace(
      /([?&](?:token|password|passphrase|secret|api[-_]?key|authorization|credential)[^=&#\s]*=)[^&#\s]*/gi,
      "$1[REDACTED]"
    );
}

function shouldLog(level: LogLevel) {
  return LEVEL_PRIORITY[level] >= ACTIVE_LEVEL;
}

function sanitizeValue(value: unknown, key = "", seen = new WeakSet<object>()): unknown {
  if (SENSITIVE_KEY.test(key)) return "[REDACTED]";
  if (EMAIL_KEY.test(key) && typeof value === "string") {
    const [localPart, domain] = value.split("@");
    if (!domain) return "[REDACTED_EMAIL]";
    const visible = localPart.slice(0, Math.min(2, localPart.length));
    return `${visible}***@${domain}`;
  }
  if (value === null || value === undefined) return value;

  if (value instanceof Error) {
    const error: LogMeta = {
      name: value.name,
      message: sanitizeText(value.message),
    };
    const code = (value as Error & { code?: unknown }).code;
    if (code !== undefined) error.code = code;
    if (
      value.stack &&
      ((process.env.LOG_STACKS ?? "").toLowerCase() === "true" ||
        process.env.NODE_ENV !== "production")
    ) {
      error.stack = sanitizeText(value.stack);
    }
    return error;
  }

  if (typeof value === "string") {
    const sanitized = sanitizeText(value);
    return sanitized.length > MAX_STRING_LENGTH
      ? `${sanitized.slice(0, MAX_STRING_LENGTH)}…[truncated]`
      : sanitized;
  }
  if (typeof value !== "object") return value;
  if (seen.has(value)) return "[Circular]";
  seen.add(value);

  if (Array.isArray(value)) {
    return value.slice(0, 50).map((entry) => sanitizeValue(entry, key, seen));
  }

  const sanitized: LogMeta = {};
  for (const [entryKey, entryValue] of Object.entries(value)) {
    sanitized[entryKey] = sanitizeValue(entryValue, entryKey, seen);
  }
  return sanitized;
}

function formatMeta(meta?: LogMeta) {
  if (!meta || Object.keys(meta).length === 0) return "";
  try {
    return ` ${JSON.stringify(sanitizeValue(meta))}`;
  } catch {
    return " {\"meta\":\"[Unserializable]\"}";
  }
}

function log(level: LogLevel, message: string, meta?: LogMeta) {
  if (!shouldLog(level)) return;

  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] [${level.toUpperCase()}] ${message}${formatMeta(meta)}`;

  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug: (message: string, meta?: LogMeta) => log("debug", message, meta),
  info: (message: string, meta?: LogMeta) => log("info", message, meta),
  warn: (message: string, meta?: LogMeta) => log("warn", message, meta),
  error: (message: string, meta?: LogMeta) => log("error", message, meta),
};

export const isHttpLoggingEnabled =
  (process.env.HTTP_LOGGING_ENABLED ?? "true").toLowerCase() === "true";

export const slowRequestThresholdMs = Math.max(
  0,
  Number(process.env.SLOW_REQUEST_MS ?? "1500") || 1500
);
