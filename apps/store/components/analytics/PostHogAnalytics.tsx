"use client";

import { PropsWithChildren, useEffect } from "react";
import posthog from "posthog-js";
import { usePathname, useSearchParams } from "next/navigation";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

interface AnalyticsWindow extends Window {
  __POSTHOG_INITIALIZED__?: boolean;
  posthog?: typeof posthog;
}

const isPostHogEnabled = typeof POSTHOG_KEY === "string" && POSTHOG_KEY.length > 0;

function initializePostHog() {
  if (!isPostHogEnabled || typeof window === "undefined") {
    return;
  }

  const analyticsWindow = window as AnalyticsWindow;

  if (analyticsWindow.__POSTHOG_INITIALIZED__) {
    return;
  }

  posthog.init(POSTHOG_KEY!, {
    api_host: POSTHOG_HOST,
    capture_pageview: false,
    autocapture: true,
    session_recording: {
      // Respect PostHog masking defaults while allowing overrides from the dashboard
      maskAllInputs: false,
    },
    loaded: (client) => {
      client.capture("$pageview");
      client.startSessionRecording();
    },
  });

  if (process.env.NODE_ENV === "development") {
    analyticsWindow.posthog = posthog;
  }

  analyticsWindow.__POSTHOG_INITIALIZED__ = true;
}

export function PostHogAnalytics({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    initializePostHog();
  }, []);

  useEffect(() => {
    if (!isPostHogEnabled || typeof window === "undefined") {
      return;
    }

    const analyticsWindow = window as AnalyticsWindow;

    if (!analyticsWindow.__POSTHOG_INITIALIZED__) {
      return;
    }

    posthog.capture("$pageview", {
      pathname,
      search: searchParams.toString(),
    });
  }, [pathname, searchParams]);

  return children;
}
