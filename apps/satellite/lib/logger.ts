const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;

export type LogLevel = (typeof LOG_LEVELS)[number];

function emit(level: LogLevel, event: string, context?: Record<string, unknown>) {
  const payload: Record<string, unknown> = {
    level,
    event,
    timestamp: new Date().toISOString(),
  };

  if (context && Object.keys(context).length > 0) {
    payload.context = context;
  }

  const line = JSON.stringify(payload);

  switch (level) {
    case "debug":
      console.debug(line);
      break;
    case "info":
      console.info(line);
      break;
    case "warn":
      console.warn(line);
      break;
    case "error":
    default:
      console.error(line);
      break;
  }
}

export const logger = {
  debug(event: string, context?: Record<string, unknown>) {
    emit("debug", event, context);
  },
  info(event: string, context?: Record<string, unknown>) {
    emit("info", event, context);
  },
  warn(event: string, context?: Record<string, unknown>) {
    emit("warn", event, context);
  },
  error(event: string, context?: Record<string, unknown>) {
    emit("error", event, context);
  },
};

export default logger;
