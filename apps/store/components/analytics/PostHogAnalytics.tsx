"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { PropsWithChildren, Suspense, useEffect } from "react";
import posthog from "posthog-js";
import { wireGlobalErrorListeners } from "@/lib/analytics/posthog";
import { resolvePostHogConfig } from "@/lib/analytics/runtime-config";

const posthogConfig = resolvePostHogConfig();

interface AnalyticsWindow extends Window {
  __POSTHOG_INITIALIZED__?: boolean;
  posthog?: typeof posthog;
}

function initializePostHog() {
  if (!posthogConfig.enabled || typeof window === "undefined") {
    return;
  }

  const analyticsWindow = window as AnalyticsWindow;

  if (analyticsWindow.__POSTHOG_INITIALIZED__) {
    return;
  }

  posthog.init(posthogConfig.key!, {
    api_host: posthogConfig.host,
    capture_pageview: false,
    autocapture: false,
    disable_surveys: true,
    disable_surveys_automatic_display: true,
    // PostHog types don’t yet expose this flag; we want to avoid feature flag requests.
    // @ts-expect-error unsupported in current type definitions
    disable_feature_flags: true,
    advanced_disable_feature_flags: true,
    advanced_disable_feature_flags_on_first_load: true,
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
  wireGlobalErrorListeners();
}

export function PostHogAnalytics({ children }: PropsWithChildren) {
  return (
    <>
      {children}
      <Suspense fallback={null}>
        <PostHogClient />
      </Suspense>
    </>
  );
}

function PostHogClient() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    initializePostHog();
  }, []);

  useEffect(() => {
    if (!posthogConfig.enabled || typeof window === "undefined") {
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

  return null;
}
