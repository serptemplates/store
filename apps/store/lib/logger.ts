export type LogLevel = "debug" | "info" | "warn" | "error";

// PII patterns to redact
const PII_PATTERNS = [
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: '[EMAIL_REDACTED]' },
  { pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, replacement: '[PHONE_REDACTED]' },
  { pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, replacement: '[CARD_REDACTED]' },
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[SSN_REDACTED]' },
  { pattern: /"password"\s*:\s*"[^"]*"/gi, replacement: '"password":"[REDACTED]"' },
  { pattern: /"token"\s*:\s*"[^"]*"/gi, replacement: '"token":"[REDACTED]"' },
  { pattern: /"secret"\s*:\s*"[^"]*"/gi, replacement: '"secret":"[REDACTED]"' },
  { pattern: /"api_key"\s*:\s*"[^"]*"/gi, replacement: '"api_key":"[REDACTED]"' },
  { pattern: /Bearer\s+[A-Za-z0-9\-._~+/]+/g, replacement: 'Bearer [REDACTED]' },
];

// Sensitive field names to redact
const SENSITIVE_FIELDS = new Set([
  'email',
  'password',
  'token',
  'secret',
  'apiKey',
  'api_key',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'creditCard',
  'credit_card',
  'ssn',
  'phone',
  'phoneNumber',
  'phone_number',
]);

/**
 * Redact PII from a string value
 */
function redactString(value: string): string {
  let redacted = value;
  for (const { pattern, replacement } of PII_PATTERNS) {
    redacted = redacted.replace(pattern, replacement);
  }
  return redacted;
}

/**
 * Recursively redact sensitive data from objects
 */
function redactObject(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return redactString(obj);
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => redactObject(item));
  }

  if (typeof obj === 'object') {
    const redacted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (SENSITIVE_FIELDS.has(key)) {
        redacted[key] = '[REDACTED]';
      } else {
        redacted[key] = redactObject(value);
      }
    }
    return redacted;
  }

  return obj;
}

function emit(level: LogLevel, event: string, context?: Record<string, unknown>) {
  const payload: Record<string, unknown> = {
    level,
    event,
    timestamp: new Date().toISOString(),
  };

  if (context && Object.keys(context).length > 0) {
    // Redact PII from context in production
    const shouldRedact = process.env.NODE_ENV === 'production' || process.env.REDACT_LOGS === 'true';
    payload.context = shouldRedact ? redactObject(context) : context;
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
