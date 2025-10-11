"use client";

import posthog from "posthog-js";

type AnalyticsWindow = Window & {
  __POSTHOG_INITIALIZED__?: boolean;
  __POSTHOG_ERRORS_WIRED__?: boolean;
};

function getAnalyticsWindow(): AnalyticsWindow | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window as AnalyticsWindow;
}

export function isPostHogReady(): boolean {
  const analyticsWindow = getAnalyticsWindow();
  return Boolean(analyticsWindow?.__POSTHOG_INITIALIZED__);
}

export function captureEvent(event: string, properties?: Record<string, unknown>): void {
  if (!isPostHogReady()) {
    return;
  }

  posthog.capture(event, {
    path: typeof window !== "undefined" ? window.location.pathname : undefined,
    ...properties,
  });
}

function normalizeError(error: unknown): { name: string; message: string; stack?: string } {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  if (typeof error === "string") {
    return {
      name: "Error",
      message: error,
      stack: undefined,
    };
  }

  return {
    name: "UnknownError",
    message: JSON.stringify(error),
    stack: undefined,
  };
}

type NormalizedError = ReturnType<typeof normalizeError>;

type IgnoreContext = {
  url?: string;
  properties?: Record<string, unknown>;
};

const THIRD_PARTY_STACK_PATTERNS = [
  /googletagmanager\.com\/gtm\.js/i,
  /\bgtm\.js\b/i,
];

const THIRD_PARTY_MESSAGE_PATTERNS = [
  /getConsole/i,
  /Cannot read properties of undefined \(reading ['"]trigger['"]\)/i,
  /Cannot read properties of undefined \(reading ['"]events['"]\)/i,
];

const MAX_INSPECTED_PROPERTY_VALUES = 10;

export function shouldIgnoreThirdPartyError(normalized: NormalizedError, context: IgnoreContext): boolean {
  const candidates: string[] = [];

  if (normalized.stack) {
    candidates.push(normalized.stack);
  }

  if (normalized.message) {
    candidates.push(normalized.message);
  }

  if (context.url) {
    candidates.push(context.url);
  }

  if (context.properties) {
    const propertyValues = Object.values(context.properties)
      .slice(0, MAX_INSPECTED_PROPERTY_VALUES)
      .map((value) => {
        if (value == null) {
          return "";
        }
        return typeof value === "string" ? value : JSON.stringify(value);
      });

    candidates.push(...propertyValues);
  }

  if (candidates.length === 0) {
    return false;
  }

  if (THIRD_PARTY_STACK_PATTERNS.some((pattern) => candidates.some((value) => pattern.test(value)))) {
    return true;
  }

  if (THIRD_PARTY_MESSAGE_PATTERNS.some((pattern) => candidates.some((value) => pattern.test(value)))) {
    return true;
  }

  return false;
}

export function captureFrontendError(error: unknown, properties?: Record<string, unknown>): void {
  const normalized = normalizeError(error);
  const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : undefined;
  const url = typeof window !== "undefined" ? window.location.href : undefined;

  if (shouldIgnoreThirdPartyError(normalized, { url, properties })) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.debug("[analytics] ignored third-party error", normalized);
    }
    return;
  }

  if (!isPostHogReady()) {
    return;
  }

  if (typeof (posthog as unknown as { captureException?: Function }).captureException === "function") {
    (posthog as unknown as { captureException: (error: unknown, props?: Record<string, unknown>) => void }).captureException(
      error instanceof Error ? error : normalized,
      {
        url,
        userAgent,
        ...properties,
      },
    );
    return;
  }

  captureEvent("$exception", {
    ...normalized,
    url,
    userAgent,
    ...properties,
  });
}

type ErrorEventLike = {
  message?: string;
  filename?: string | null;
  lineno?: number | null;
  colno?: number | null;
};

export function isOpaqueScriptErrorEvent(event: ErrorEventLike): boolean {
  return (
    event.message === "Script error." &&
    (!event.filename || event.filename.length === 0) &&
    (event.lineno ?? 0) === 0 &&
    (event.colno ?? 0) === 0
  );
}

export function wireGlobalErrorListeners(): void {
  const analyticsWindow = getAnalyticsWindow();
  if (!analyticsWindow || analyticsWindow.__POSTHOG_ERRORS_WIRED__) {
    return;
  }

  const errorHandler = (event: ErrorEvent) => {
    if (isOpaqueScriptErrorEvent(event)) {
      // Ignore cross-origin script errors that provide no actionable context.
      return;
    }

    captureFrontendError(event.error ?? event.message, {
      source: "window-error",
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  };

  const rejectionHandler = (event: PromiseRejectionEvent) => {
    captureFrontendError(event.reason, {
      source: "unhandled-rejection",
    });
  };

  window.addEventListener("error", errorHandler);
  window.addEventListener("unhandledrejection", rejectionHandler);

  analyticsWindow.__POSTHOG_ERRORS_WIRED__ = true;
}
