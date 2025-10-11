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

const OPS_ALERT_ENDPOINT = "/api/analytics/exception";

function notifyOpsOfError(
  normalized: { name: string; message: string; stack?: string },
  properties?: Record<string, unknown>,
  url?: string,
  userAgent?: string,
): void {
  if (typeof window === "undefined") {
    return;
  }

  const payload = JSON.stringify({
    ...normalized,
    url,
    userAgent,
    properties,
  });

  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.debug("[analytics] forwarding exception to Slack ops channel", normalized);
  }

  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([payload], { type: "application/json" });
      const sent = navigator.sendBeacon(OPS_ALERT_ENDPOINT, blob);
      if (sent) {
        return;
      }
    }
  } catch {
    // Ignore sendBeacon failures and fall back to fetch.
  }

  if (typeof fetch !== "function") {
    return;
  }

  fetch(OPS_ALERT_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: payload,
    keepalive: true,
  }).catch(() => {});
}

export function captureFrontendError(error: unknown, properties?: Record<string, unknown>): void {
  const normalized = normalizeError(error);
  const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : undefined;
  const url = typeof window !== "undefined" ? window.location.href : undefined;

  notifyOpsOfError(normalized, properties, url, userAgent);

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
