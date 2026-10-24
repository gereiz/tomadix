type LogLevel = "debug" | "info" | "warn" | "error";

interface LogPayload {
  level: LogLevel;
  message: string;
  timestamp: string;
  correlationId?: string;
  context?: Record<string, any>;
  error?: {
    name?: string;
    message: string;
    stack?: string;
  };
}

const SENSITIVE_PATTERNS = [
  "password",
  "secret",
  "token",
  "apikey",
  "api_key",
  "hash",
  "cookie",
  "authorization",
  "credential",
  "cardnumber",
  "cvv",
];

function sanitize(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sanitize);

  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    const isSensitive = SENSITIVE_PATTERNS.some((p) => key.toLowerCase().includes(p));
    if (isSensitive) {
      clean[key] = "[REDACTED]";
    } else if (typeof val === "object" && val !== null) {
      clean[key] = sanitize(val);
    } else {
      clean[key] = val;
    }
  }
  return clean;
}

export class Logger {
  private static formatLog(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    error?: Error,
    correlationId?: string
  ): LogPayload {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      correlationId,
      context: context ? sanitize(context) : undefined,
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
          }
        : undefined,
    };
  }

  static info(message: string, context?: Record<string, any>, correlationId?: string) {
    const log = this.formatLog("info", message, context, undefined, correlationId);
    console.log(JSON.stringify(log));
  }

  static warn(message: string, context?: Record<string, any>, correlationId?: string) {
    const log = this.formatLog("warn", message, context, undefined, correlationId);
    console.warn(JSON.stringify(log));
  }

  static error(message: string, error?: Error, context?: Record<string, any>, correlationId?: string) {
    const log = this.formatLog("error", message, context, error, correlationId);
    console.error(JSON.stringify(log));
  }

  static sanitize(obj: any): any {
    return sanitize(obj);
  }

  static debug(message: string, context?: Record<string, any>, correlationId?: string) {
    if (process.env.NODE_ENV === "development" || process.env.LOG_LEVEL === "debug") {
      const log = this.formatLog("debug", message, context, undefined, correlationId);
      console.debug(JSON.stringify(log));
    }
  }
}

export const logger = Logger;
export { sanitize };
