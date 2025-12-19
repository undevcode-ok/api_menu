type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const envLevel = (process.env.LOG_LEVEL ?? "info").toLowerCase() as LogLevel;
const ACTIVE_LEVEL = LEVEL_PRIORITY[envLevel] ? LEVEL_PRIORITY[envLevel] : LEVEL_PRIORITY.info;

function shouldLog(level: LogLevel) {
  return LEVEL_PRIORITY[level] >= ACTIVE_LEVEL;
}

function formatMeta(meta?: Record<string, unknown>) {
  if (!meta || Object.keys(meta).length === 0) return "";
  try {
    return ` ${JSON.stringify(meta)}`;
  } catch {
    return ` ${meta}`;
  }
}

function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
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
  debug: (message: string, meta?: Record<string, unknown>) => log("debug", message, meta),
  info: (message: string, meta?: Record<string, unknown>) => log("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => log("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) => log("error", message, meta),
};

export const isHttpLoggingEnabled = (process.env.HTTP_LOGGING_ENABLED ?? "false").toLowerCase() === "true";
