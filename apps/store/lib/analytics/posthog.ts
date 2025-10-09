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

function normaliseError(error: unknown): { name: string; message: string; stack?: string } {
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

export function captureFrontendError(error: unknown, properties?: Record<string, unknown>): void {
  if (!isPostHogReady()) {
    return;
  }

  const normalised = normaliseError(error);
  const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : undefined;
  const url = typeof window !== "undefined" ? window.location.href : undefined;

  if (typeof (posthog as unknown as { captureException?: Function }).captureException === "function") {
    (posthog as unknown as { captureException: (error: unknown, props?: Record<string, unknown>) => void }).captureException(
      error instanceof Error ? error : normalised,
      {
        url,
        userAgent,
        ...properties,
      },
    );
    return;
  }

  captureEvent("$exception", {
    ...normalised,
    url,
    userAgent,
    ...properties,
  });
}

export function wireGlobalErrorListeners(): void {
  const analyticsWindow = getAnalyticsWindow();
  if (!analyticsWindow || analyticsWindow.__POSTHOG_ERRORS_WIRED__) {
    return;
  }

  const errorHandler = (event: ErrorEvent) => {
    if (!isPostHogReady()) {
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
    if (!isPostHogReady()) {
      return;
    }

    captureFrontendError(event.reason, {
      source: "unhandled-rejection",
    });
  };

  window.addEventListener("error", errorHandler);
  window.addEventListener("unhandledrejection", rejectionHandler);

  analyticsWindow.__POSTHOG_ERRORS_WIRED__ = true;
}
