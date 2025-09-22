"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type AnalyticsTrackerProps = {
  measurementId?: string;
};

export function AnalyticsTracker({ measurementId }: AnalyticsTrackerProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!measurementId || typeof window === "undefined" || typeof window.gtag !== "function") {
      return;
    }

    const path = searchParams?.toString()
      ? `${pathname}?${searchParams.toString()}`
      : pathname;

    window.gtag("config", measurementId, {
      page_path: path,
    });
  }, [measurementId, pathname, searchParams]);

  return null;
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}
